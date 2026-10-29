/* 樂活在地通｜前端 API 模組
 * - 封裝 fetch，集中處理 JSON、錯誤與 localStorage 快取
 * - 離線時讀取上次快取，並把寫入操作排入佇列，恢復連線後自動補送
 * - 提供 SSE 即時同步，SSE 中斷時自動改用每 3 秒輪詢
 */
(function attachLohasApi(global) {
  'use strict';

  const BASE = '';
  const STATE_KEY = 'lohas-state-v2';
  const QUEUE_KEY = 'lohas-pending-actions-v2';
  const FONT_KEY = 'lohas-font-v2';
  const CURRENT_ELDER = { name: '林阿公', group: '長青A班' };
  const QUIZ_ANSWERS = {
    'quiz-greeting': 0,
    'quiz-store': 1,
    'quiz-banquet': 2
  };

  let syncCallback = null;
  let eventSource = null;
  let pollTimer = null;
  let reconnectTimer = null;
  let flushing = false;
  let stopped = true;

  function safeParse(value, fallback) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readCachedState() {
    try {
      const raw = global.localStorage.getItem(STATE_KEY);
      return raw ? safeParse(raw, null) : null;
    } catch (error) {
      return null;
    }
  }

  function cacheState(state) {
    if (!state || typeof state !== 'object') return;
    try {
      global.localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch (error) {
      // 照片較大時可能超過 localStorage 配額；仍以記憶體中的狀態運作。
    }
  }

  function getCachedState() {
    return readCachedState();
  }

  function readQueue() {
    try {
      const raw = global.localStorage.getItem(QUEUE_KEY);
      const queue = raw ? safeParse(raw, []) : [];
      return Array.isArray(queue) ? queue : [];
    } catch (error) {
      return [];
    }
  }

  function writeQueue(queue) {
    try {
      global.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      // 忽略儲存失敗。
    }
  }

  function enqueue(action) {
    const queue = readQueue();
    queue.push({ ...action, queuedAt: Date.now() });
    writeQueue(queue);
  }

  function setFont(font) {
    const safeFont = font === 'xlarge' ? 'xlarge' : 'large';
    try {
      global.localStorage.setItem(FONT_KEY, safeFont);
    } catch (error) {
      // 忽略儲存失敗。
    }
    return safeFont;
  }

  function getFont() {
    try {
      return global.localStorage.getItem(FONT_KEY) === 'xlarge' ? 'xlarge' : 'large';
    } catch (error) {
      return 'large';
    }
  }

  function emit(state, meta) {
    if (typeof syncCallback === 'function') {
      try {
        syncCallback(state, meta || {});
      } catch (error) {
        console.error('同步回呼發生錯誤：', error);
      }
    }
    try {
      global.dispatchEvent(new CustomEvent('lohas:state', { detail: { state, meta: meta || {} } }));
    } catch (error) {
      // 舊瀏覽器沒有 CustomEvent 時不影響主要流程。
    }
  }

  function emitConnection(online, meta) {
    try {
      global.dispatchEvent(new CustomEvent('lohas:connection', {
        detail: { online, ...(meta || {}) }
      }));
    } catch (error) {
      // 忽略。
    }
  }

  async function request(path, options = {}) {
    const method = options.method || 'GET';
    const headers = { 'Accept': 'application/json', ...(options.headers || {}) };
    let body;
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }

    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeout = global.setTimeout(() => {
      if (controller) controller.abort();
    }, options.timeout || 12000);

    try {
      const response = await fetch(`${BASE}${path}`, {
        method,
        headers,
        body,
        cache: 'no-store',
        signal: controller ? controller.signal : undefined
      });
      const text = await response.text();
      const payload = text ? safeParse(text, null) : null;
      if (!response.ok) {
        const error = new Error((payload && payload.error) || `請求失敗（${response.status}）`);
        error.status = response.status;
        error.payload = payload;
        throw error;
      }
      return payload;
    } finally {
      global.clearTimeout(timeout);
    }
  }

  async function getState() {
    try {
      const state = await request('/api/state');
      if (state && state.revision) {
        cacheState(state);
        emitConnection(true, { source: 'state' });
      }
      return state;
    } catch (error) {
      const cached = getCachedState();
      emitConnection(false, { source: 'cache', error: error.message });
      return cached ? { ...cached, __offline: true } : null;
    }
  }

  /**
   * 寫入 API。若離線或請求失敗，會：
   * 1. 把操作排入 localStorage 佇列
   * 2. 用 localUpdater 更新快取狀態，讓畫面仍有回饋
   * 3. 恢復連線後自動補送
   */
  async function mutate(path, body, localUpdater) {
    try {
      const result = await request(path, { method: 'POST', body });
      if (result && result.state) {
        cacheState(result.state);
        emit(result.state, { source: 'mutation' });
      }
      emitConnection(true, { source: 'mutation' });
      return { ...(result || {}), __offline: false };
    } catch (error) {
      if (error.status && error.status < 500) {
        throw error;
      }

      enqueue({ path, body });
      let cached = getCachedState();
      if (cached && typeof localUpdater === 'function') {
        try {
          const updated = localUpdater(clone(cached));
          if (updated) {
            cached = updated;
            cacheState(updated);
            emit(updated, { source: 'offline', queued: true });
          }
        } catch (updateError) {
          console.warn('離線樂觀更新失敗：', updateError);
        }
      }
      emitConnection(false, { source: 'queue', error: error.message });
      return {
        ok: true,
        queued: true,
        offline: true,
        error: error.message,
        state: cached
      };
    }
  }

  async function flushQueue() {
    if (flushing || !global.navigator.onLine) return;
    const queue = readQueue();
    if (queue.length === 0) return;

    flushing = true;
    const remaining = [];
    for (const action of queue) {
      try {
        const result = await request(action.path, { method: 'POST', body: action.body });
        if (result && result.state) cacheState(result.state);
      } catch (error) {
        remaining.push(action);
      }
    }
    writeQueue(remaining);
    flushing = false;

    if (remaining.length === 0) {
      const state = await getState();
      if (state) emit(state, { source: 'queue-flushed' });
    } else {
      emitConnection(false, { source: 'queue', pending: remaining.length });
    }
  }

  function stopPolling() {
    if (pollTimer) {
      global.clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  async function pollOnce() {
    // 若瀏覽器沒有觸發 online 事件，輪詢也會補送離線佇列。
    if (global.navigator.onLine) await flushQueue();
    const state = await getState();
    if (state) emit(state, { source: 'poll', offline: Boolean(state.__offline) });
  }

  function startPolling() {
    if (pollTimer) return;
    pollOnce();
    pollTimer = global.setInterval(pollOnce, 3000);
  }

  function closeEvents() {
    if (eventSource) {
      try {
        eventSource.close();
      } catch (error) {
        // 忽略。
      }
      eventSource = null;
    }
  }

  function scheduleReconnect() {
    if (reconnectTimer || stopped) return;
    reconnectTimer = global.setTimeout(() => {
      reconnectTimer = null;
      if (!stopped) connectEvents();
    }, 10000);
  }

  function connectEvents() {
    closeEvents();
    if (stopped) return;

    if (!('EventSource' in global)) {
      startPolling();
      return;
    }

    try {
      eventSource = new global.EventSource(`${BASE}/api/events`);
      eventSource.addEventListener('state', (event) => {
        const payload = safeParse(event.data, null);
        if (!payload) return;
        const state = payload.state || payload;
        if (!state || typeof state !== 'object') return;
        cacheState(state);
        stopPolling();
        emit(state, { source: 'sse' });
        emitConnection(true, { source: 'sse' });
      });
      eventSource.addEventListener('open', () => {
        stopPolling();
        emitConnection(true, { source: 'sse' });
        flushQueue();
      });
      eventSource.addEventListener('error', () => {
        closeEvents();
        startPolling();
        emitConnection(false, { source: 'sse' });
        scheduleReconnect();
      });
    } catch (error) {
      startPolling();
      scheduleReconnect();
    }
  }

  function startSync(callback) {
    syncCallback = callback;
    stopped = false;
    connectEvents();
    startPolling();
    global.addEventListener('online', () => {
      emitConnection(true, { source: 'browser' });
      flushQueue();
      connectEvents();
    });
    global.addEventListener('offline', () => {
      emitConnection(false, { source: 'browser' });
      startPolling();
    });
    global.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        pollOnce();
        flushQueue();
        if (!eventSource) connectEvents();
      }
    });
  }

  function stopSync() {
    stopped = true;
    syncCallback = null;
    closeEvents();
    stopPolling();
    if (reconnectTimer) {
      global.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function localAddSteps(state, amount) {
    state.steps = (Number(state.steps) || 0) + amount;
    state.coinBuffer = (Number(state.coinBuffer) || 0) + amount;
    let earnedCoins = 0;
    while (state.coinBuffer >= 500) {
      state.coinBuffer -= 500;
      state.coins = (Number(state.coins) || 0) + 2;
      earnedCoins += 2;
    }
    let goalBonus = 0;
    if (!state.goalBonusClaimed && state.steps >= state.goal) {
      state.goalBonusClaimed = true;
      state.coins = (Number(state.coins) || 0) + 20;
      goalBonus = 20;
    }
    return { earnedCoins, goalBonus };
  }

  const API = {
    getState,
    getCachedState,
    cacheState,
    getFont,
    setFont,
    startSync,
    stopSync,
    flushQueue,

    createReminder(data) {
      return mutate('/api/reminders', data, (state) => {
        const content = String(data.content || '').trim();
        state.reminders.unshift({
          id: `offline-reminder-${Date.now()}`,
          content,
          note: `佳儒提醒：${content}。有需要可以找社區志工幫忙。`,
          time: data.time || '14:00',
          group: data.group || '長青A班',
          type: data.type || 'other',
          speech: `阿公阿嬤，佳儒提醒您，${content}。`,
          doneBy: [],
          createdAt: '剛剛'
        });
        return state;
      });
    },

    completeReminder(reminderId, elderName) {
      return mutate(`/api/reminders/${encodeURIComponent(reminderId)}/complete`, {
        elderName: elderName || CURRENT_ELDER.name
      }, (state) => {
        const reminder = state.reminders.find((item) => item.id === reminderId);
        if (reminder) {
          reminder.doneBy = Array.isArray(reminder.doneBy) ? reminder.doneBy : [];
          if (!reminder.doneBy.includes(elderName || CURRENT_ELDER.name)) {
            reminder.doneBy.push(elderName || CURRENT_ELDER.name);
          }
        }
        return state;
      });
    },

    triggerSos(data) {
      return mutate('/api/sos', data || {}, (state) => {
        const alert = {
          id: `offline-sos-${Date.now()}`,
          elderName: (data && data.elderName) || CURRENT_ELDER.name,
          location: (data && data.location) || '幸福里福安宮前',
          createdAt: '剛剛',
          status: 'pending'
        };
        state.sosAlerts = Array.isArray(state.sosAlerts) ? state.sosAlerts : [];
        state.sosAlerts.unshift(alert);
        state.helpRequest = alert;
        return state;
      });
    },

    resolveSos(id) {
      return mutate('/api/sos/resolve', id ? { id } : {}, (state) => {
        const alert = (state.sosAlerts || []).find((item) => item.status === 'pending');
        if (alert) {
          alert.status = 'resolved';
          alert.resolvedAt = '剛剛';
        }
        state.helpRequest = null;
        return state;
      });
    },

    createPhoto(data) {
      return mutate('/api/photos', data, (state) => {
        state.photos.unshift({
          id: `offline-photo-${Date.now()}`,
          author: data.author || CURRENT_ELDER.name,
          title: data.title || '平安喜樂',
          image: data.image,
          likes: 0,
          liked: false,
          hasVoice: false,
          voiceText: '',
          time: '剛剛'
        });
        return state;
      });
    },

    likePhoto(photoId) {
      return mutate(`/api/photos/${encodeURIComponent(photoId)}/like`, {}, (state) => {
        const photo = state.photos.find((item) => item.id === photoId);
        if (photo) {
          photo.liked = !photo.liked;
          photo.likes = Math.max(0, (Number(photo.likes) || 0) + (photo.liked ? 1 : -1));
        }
        return state;
      });
    },

    savePhotoVoice(photoId, voiceText) {
      return mutate(`/api/photos/${encodeURIComponent(photoId)}/voice`, { voiceText }, (state) => {
        const photo = state.photos.find((item) => item.id === photoId);
        if (photo) {
          photo.hasVoice = true;
          photo.voiceText = voiceText;
        }
        return state;
      });
    },

    async addSteps(amount) {
      let localExtra = { earnedCoins: 0, goalBonus: 0 };
      const result = await mutate('/api/health/steps', { amount }, (state) => {
        localExtra = localAddSteps(state, Math.max(0, Number(amount) || 0));
        return state;
      });
      if (result.__offline) {
        result.earnedCoins = localExtra.earnedCoins;
        result.goalBonus = localExtra.goalBonus;
      }
      return result;
    },

    redeemReward(rewardId) {
      return mutate('/api/health/redeem', { rewardId }, (state) => {
        const reward = state.rewards.find((item) => item.id === rewardId);
        if (!reward || reward.redeemed || state.coins < reward.cost) return state;
        state.coins -= reward.cost;
        reward.redeemed = true;
        reward.voucherCode = `LOHAS-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        return state;
      });
    },

    async answerQuiz(questionId, optionIndex) {
      const answer = QUIZ_ANSWERS[questionId];
      let localExtra = { correct: optionIndex === answer, awarded: 0 };
      const result = await mutate('/api/health/quiz', { questionId, optionIndex }, (state) => {
        state.quiz = state.quiz || { index: 0, solved: [], lastChoice: null };
        state.quiz.lastChoice = optionIndex;
        if (optionIndex === answer && !state.quiz.solved.includes(questionId)) {
          state.quiz.solved.push(questionId);
          state.coins = (Number(state.coins) || 0) + 10;
          localExtra.awarded = 10;
        }
        return state;
      });
      if (result.__offline) {
        result.correct = localExtra.correct;
        result.awarded = localExtra.awarded;
      }
      return result;
    },

    nextQuiz(index) {
      return mutate('/api/health/quiz', { action: 'next', index }, (state) => {
        state.quiz = state.quiz || { index: 0, solved: [], lastChoice: null };
        state.quiz.index = Number.isInteger(index) ? index : ((state.quiz.index + 1) % 3);
        state.quiz.lastChoice = null;
        return state;
      });
    },

    signUpMeal(elderName) {
      return mutate('/api/community/meal', { elderName: elderName || CURRENT_ELDER.name }, (state) => {
        const name = elderName || CURRENT_ELDER.name;
        state.mealMembers = Array.isArray(state.mealMembers) ? state.mealMembers : [];
        if (!state.mealMembers.includes(name)) state.mealMembers.push(name);
        state.mealCount = state.mealMembers.length;
        state.mealSignedUp = true;
        return state;
      });
    },

    joinGathering(gatheringId, elderName) {
      return mutate('/api/community/gathering', {
        gatheringId,
        elderName: elderName || CURRENT_ELDER.name
      }, (state) => {
        const group = (state.gatherings || state.teaGroups || []).find((item) => item.id === gatheringId);
        if (group) {
          group.members = Array.isArray(group.members) ? group.members : [];
          const name = elderName || CURRENT_ELDER.name;
          if (!group.members.includes(name)) group.members.push(name);
        }
        state.teaGroups = state.gatherings;
        return state;
      });
    },

    toggleShuttle(key, elderName) {
      return mutate('/api/community/shuttle', { key, elderName: elderName || CURRENT_ELDER.name }, (state) => {
        const shuttle = state.shuttles && state.shuttles[key];
        if (!shuttle) return state;
        const name = elderName || CURRENT_ELDER.name;
        shuttle.members = Array.isArray(shuttle.members) ? shuttle.members : [];
        const index = shuttle.members.indexOf(name);
        if (index >= 0) shuttle.members.splice(index, 1);
        else shuttle.members.push(name);
        shuttle.booked = shuttle.members.includes(name);
        return state;
      });
    },

    createNotice(data) {
      return mutate('/api/notices', data, (state) => {
        state.notices.unshift({
          id: `offline-notice-${Date.now()}`,
          icon: data.icon || 'megaphone',
          category: data.category || '社區消息',
          title: data.title,
          meta: data.meta || '佳儒 · 剛剛發布',
          body: data.body,
          speech: data.speech || `里長伯廣播：${data.title}。${data.body}`
        });
        return state;
      });
    },

    async reset() {
      const result = await request('/api/reset', { method: 'POST', body: {} });
      if (result && result.state) {
        cacheState(result.state);
        emit(result.state, { source: 'reset' });
      }
      return result;
    }
  };

  global.LohasAPI = API;
})(window);
