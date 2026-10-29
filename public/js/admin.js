/* 樂活在地通｜佳儒管理後台邏輯 */
'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const numberFormatter = new Intl.NumberFormat('zh-TW');

const TYPE_META = {
  pill: { icon: 'pill', label: '吃藥', background: '#FEE2E2', color: '#991B1B' },
  clinic: { icon: 'stethoscope', label: '健康檢查', background: '#DCFCE7', color: '#166534' },
  activity: { icon: 'users', label: '社區活動', background: '#DBEAFE', color: '#1E40AF' },
  other: { icon: 'bell-ring', label: '提醒', background: '#FEF3C7', color: '#92400E' }
};

const SHUTTLE_META = {
  hospital: { title: '🏥 往醫院巡迴車', shortTitle: '醫院巡迴車', route: '福安宮廟口 → 幸福醫院' },
  market: { title: '🥬 往傳統市場接駁車', shortTitle: '市場接駁車', route: '社區活動中心 → 幸福市場' }
};

const state = {
  revision: 0,
  reminders: [],
  photos: [],
  sosAlerts: [],
  helpRequest: null,
  mealMembers: [],
  mealCount: 0,
  shuttles: {
    hospital: { eta: 5, members: [], booked: false },
    market: { eta: 14, members: [], booked: false }
  },
  gatherings: [],
  notices: [],
  groups: {},
  steps: 0,
  coins: 0
};

function icon(name) {
  return `<i data-lucide="${name}" aria-hidden="true"></i>`;
}

function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons({ attrs: { 'stroke-width': 2.25 } });
  }
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function formatNumber(value) {
  return numberFormatter.format(Number(value) || 0);
}

function formatTime(value) {
  if (!value || !String(value).includes(':')) return '時間未定';
  const [hourString, minute] = String(value).split(':');
  const hour = Number(hourString);
  const period = hour < 12 ? '上午' : hour < 18 ? '下午' : '晚上';
  let displayHour = hour % 12;
  if (displayHour === 0) displayHour = 12;
  return `${period} ${displayHour}:${minute}`;
}

function showToast(message, type = 'success') {
  const host = $('#toastHost');
  if (!host) return;
  const toast = document.createElement('div');
  toast.className = `toast${type === 'warn' ? ' warn' : ''}`;
  toast.innerHTML = `${icon(type === 'warn' ? 'alert-triangle' : 'circle-check')}<span>${esc(message)}</span>`;
  host.appendChild(toast);
  refreshIcons();
  while (host.children.length > 3) host.firstElementChild.remove();
  window.setTimeout(() => {
    toast.classList.add('leaving');
    window.setTimeout(() => toast.remove(), 240);
  }, 3800);
}

function setOfflineNotice(offline) {
  const notice = $('#offlineNotice');
  if (notice) notice.hidden = !offline;
  document.body.classList.toggle('is-offline', Boolean(offline));
}

function updateSyncStatus(online, source) {
  const status = $('#syncStatus');
  const text = $('#syncText');
  const time = $('#syncTime');
  if (!status || !text) return;
  status.dataset.state = online ? 'online' : 'offline';
  text.textContent = online ? '即時同步中' : '離線／重試中';
  if (time) {
    const now = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    time.textContent = `最後更新 ${now}`;
  }
  setOfflineNotice(!online);
}

function applyServerState(snapshot, force = false) {
  if (!snapshot || typeof snapshot !== 'object') return;
  const incomingRevision = Number(snapshot.revision) || 0;
  if (!force && incomingRevision && state.revision && incomingRevision === state.revision) {
    return;
  }

  state.reminders = Array.isArray(snapshot.reminders) ? snapshot.reminders : [];
  state.photos = Array.isArray(snapshot.photos) ? snapshot.photos : [];
  state.sosAlerts = Array.isArray(snapshot.sosAlerts) ? snapshot.sosAlerts : [];
  state.helpRequest = snapshot.helpRequest
    || state.sosAlerts.find((alert) => alert && alert.status === 'pending')
    || null;
  state.mealMembers = Array.isArray(snapshot.mealMembers) ? snapshot.mealMembers : [];
  state.mealCount = Math.max(0, Number(snapshot.mealCount) || state.mealMembers.length || 0);
  state.gatherings = Array.isArray(snapshot.gatherings)
    ? snapshot.gatherings
    : (Array.isArray(snapshot.teaGroups) ? snapshot.teaGroups : []);
  state.notices = Array.isArray(snapshot.notices) ? snapshot.notices : [];
  state.groups = snapshot.groups && typeof snapshot.groups === 'object' ? snapshot.groups : {};
  state.steps = Math.max(0, Number(snapshot.steps) || 0);
  state.coins = Math.max(0, Number(snapshot.coins) || 0);
  state.revision = incomingRevision || state.revision;

  const incomingShuttles = snapshot.shuttles || {};
  for (const key of ['hospital', 'market']) {
    const incoming = incomingShuttles[key] || {};
    state.shuttles[key] = {
      eta: Math.max(1, Number(incoming.eta) || (key === 'hospital' ? 5 : 14)),
      members: Array.isArray(incoming.members) ? incoming.members : [],
      booked: Boolean(incoming.booked)
    };
  }

  setOfflineNotice(Boolean(snapshot.__offline));
  renderAll();
}

function renderAll() {
  renderSos();
  renderStats();
  renderTracking();
  renderMeal();
  renderShuttles();
  renderGatherings();
  renderNotices();
  refreshIcons();
}

function pendingSos() {
  return state.sosAlerts.find((alert) => alert && alert.status === 'pending') || null;
}

function renderSos() {
  const container = $('#adminSosAlert');
  const count = $('#sosCount');
  const history = $('#sosHistory');
  if (!container) return;

  const pending = pendingSos();
  if (count) {
    count.innerHTML = `${icon('siren')}${pending ? 1 : 0} 件待處理`;
  }

  if (!pending) {
    container.innerHTML = `
      <div class="admin-empty admin-empty-green">
        ${icon('shield-check')}
        <div>
          <h3>目前沒有緊急求助</h3>
          <p>長輩按下求助後，這裡會立即出現位置與聯絡提醒。</p>
        </div>
      </div>`;
  } else {
    container.innerHTML = `
      <article class="sos-alert-card" role="alert">
        <div class="sos-alert-head">
          <div class="sos-alert-icon" aria-hidden="true">${icon('siren')}</div>
          <div>
            <p class="sos-alert-kicker">緊急求助</p>
            <h2 class="sos-alert-title">⚠️ ${esc(pending.elderName)}於${esc(pending.createdAt)}發送了位置求助（地點：${esc(pending.location)}）</h2>
            <p class="sos-alert-location">${icon('phone-call')}請先打電話確認長輩安全，再前往現場。</p>
          </div>
        </div>
        <button type="button" class="big-btn btn-green" data-resolve-sos="${esc(pending.id)}">📞 已聯繫並解除警報</button>
      </article>`;
  }

  if (history) {
    const resolved = state.sosAlerts
      .filter((alert) => alert && alert.status === 'resolved')
      .slice(0, 3);
    history.innerHTML = resolved.length
      ? `<p class="admin-history-title">最近已解除</p>${resolved.map((alert) => `
          <div class="admin-history-row">
            ${icon('circle-check')}
            <span>${esc(alert.elderName)} · ${esc(alert.location)} · ${esc(alert.resolvedAt || '已解除')}</span>
          </div>`).join('')}`
      : '';
  }
}

function renderStats() {
  const set = (selector, value) => {
    const element = $(selector);
    if (element) element.textContent = String(value);
  };
  set('#statSos', pendingSos() ? 1 : 0);
  set('#statReminders', state.reminders.length);
  set('#statReports', state.reminders.reduce((total, reminder) => total + (Array.isArray(reminder.doneBy) ? reminder.doneBy.length : 0), 0));
  set('#statMeal', state.mealCount);
  set('#statShuttles', ['hospital', 'market'].reduce((total, key) => {
    return total + (state.shuttles[key] && Array.isArray(state.shuttles[key].members) ? state.shuttles[key].members.length : 0);
  }, 0));
}

function renderTracking() {
  const container = $('#adminTrackingList');
  if (!container) return;
  if (state.reminders.length === 0) {
    container.innerHTML = `
      <div class="admin-empty">
        ${icon('megaphone')}
        <div>
          <h3>還沒有發布提醒</h3>
          <p>填寫左側表單，送出第一則叮嚀給長輩吧。</p>
        </div>
      </div>`;
    return;
  }

  container.innerHTML = state.reminders.map((reminder) => {
    const members = Array.isArray(state.groups[reminder.group]) ? state.groups[reminder.group] : [];
    const doneBy = Array.isArray(reminder.doneBy) ? reminder.doneBy : [];
    const completed = members.filter((member) => doneBy.includes(member));
    const percent = members.length ? Math.round((completed.length / members.length) * 100) : 0;
    const type = TYPE_META[reminder.type] || TYPE_META.other;
    return `
      <article class="tracking-card">
        <div class="tracking-top">
          <div>
            <div class="pill-row">
              <span class="time-pill">${icon('clock')}${esc(formatTime(reminder.time))}</span>
              <span class="group-pill">${esc(reminder.group)}</span>
              <span class="group-pill" style="background:${type.background};color:${type.color};border-color:${type.color};">${esc(type.label)}</span>
            </div>
            <h3 class="tracking-title">${esc(reminder.content)}</h3>
            <p class="tracking-meta">${esc(reminder.note)}</p>
          </div>
          <span class="tracking-summary">${icon('badge-check')}${completed.length} / ${members.length} 位已回報</span>
        </div>
        <div class="mini-progress" role="progressbar" aria-label="${esc(reminder.content)}回報進度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}">
          <div class="mini-progress-fill" style="width:${percent}%"></div>
        </div>
        <div class="member-chips">
          ${members.map((member) => {
            const isDone = doneBy.includes(member);
            return `<span class="member-chip${isDone ? ' done' : ''}">${icon(isDone ? 'circle-check' : 'clock-3')}${esc(member)} · ${isDone ? '已回報' : '尚未回報'}</span>`;
          }).join('')}
        </div>
      </article>`;
  }).join('');
}

function renderMeal() {
  const container = $('#mealAdminList');
  const count = $('#mealAdminCount');
  if (!container) return;
  if (count) count.innerHTML = `${icon('users')}${state.mealCount} 位`;
  if (state.mealMembers.length === 0) {
    container.innerHTML = `<p class="body-text muted">目前尚無報名資料。</p>`;
    return;
  }
  container.innerHTML = state.mealMembers.map((name) => `
    <span class="admin-member-chip">${icon('user-round')}${esc(name)}</span>`).join('');
}

function renderShuttles() {
  const container = $('#shuttleAdminLists');
  if (!container) return;
  container.innerHTML = ['hospital', 'market'].map((key) => {
    const meta = SHUTTLE_META[key];
    const shuttle = state.shuttles[key] || { eta: 5, members: [] };
    const members = Array.isArray(shuttle.members) ? shuttle.members : [];
    return `
      <article class="admin-shuttle-card">
        <div class="admin-shuttle-head">
          <div>
            <h3>${esc(meta.title)}</h3>
            <p class="body-text muted">${icon('map-pin')}${esc(meta.route)} · 約 ${shuttle.eta} 分鐘</p>
          </div>
          <span class="count-pill">${icon('users')}${members.length} 位</span>
        </div>
        <div class="admin-member-list">
          ${members.length
            ? members.map((name) => `<span class="admin-member-chip">${icon('user-round')}${esc(name)}</span>`).join('')
            : '<span class="body-text muted">目前還沒有人預約。</span>'}
        </div>
      </article>`;
  }).join('');
}

function renderGatherings() {
  const container = $('#gatheringAdminList');
  if (!container) return;
  if (state.gatherings.length === 0) {
    container.innerHTML = `<p class="body-text muted">目前沒有老友湊咖行程。</p>`;
    return;
  }
  container.innerHTML = state.gatherings.map((group) => {
    const members = Array.isArray(group.members) ? group.members : [];
    return `
      <article class="admin-gathering-card">
        <div class="admin-gathering-head">
          <div>
            <h3>${esc(group.host)} 揪團 · ${esc(group.activity)}</h3>
            <p class="body-text muted">${icon('clock')}${esc(group.time)} · ${icon('map-pin')}${esc(group.place)}</p>
          </div>
          <span class="count-pill">${icon('users')}${members.length} 人</span>
        </div>
        <div class="admin-member-list">
          ${members.map((name) => `<span class="admin-member-chip">${icon('user-round')}${esc(name)}</span>`).join('')}
        </div>
      </article>`;
  }).join('');
}

function renderNotices() {
  const container = $('#noticeAdminList');
  const count = $('#noticeAdminCount');
  if (!container) return;
  if (count) count.innerHTML = `${icon('radio')}${state.notices.length} 則`;
  if (state.notices.length === 0) {
    container.innerHTML = `<p class="body-text muted">目前沒有社區廣播。</p>`;
    return;
  }
  container.innerHTML = state.notices.map((notice) => `
    <article class="admin-notice-card">
      <div class="admin-notice-icon" aria-hidden="true">${icon(notice.icon || 'megaphone')}</div>
      <div>
        <div class="pill-row">
          <span class="group-pill">${esc(notice.category)}</span>
          <span class="notice-meta">${esc(notice.meta)}</span>
        </div>
        <h3>${esc(notice.title)}</h3>
        <p class="body-text">${esc(notice.body)}</p>
      </div>
    </article>`).join('');
}

async function resolveSos(alertId) {
  try {
    const result = await window.LohasAPI.resolveSos(alertId);
    if (result && result.state) applyServerState(result.state, true);
    showToast('已聯繫長輩並解除警報。');
  } catch (error) {
    showToast(error.message || '解除警報失敗，請稍後再試一次。', 'warn');
  }
}

async function handleReminderSubmit(event) {
  event.preventDefault();
  const contentInput = $('#reminderContent');
  const timeInput = $('#reminderTime');
  const groupInput = $('#reminderGroup');
  const typeInput = $('#reminderType');
  const errorBox = $('#reminderFormError');
  if (!contentInput || !timeInput || !groupInput || !typeInput || !errorBox) return;

  const content = contentInput.value.trim().replace(/\s+/g, ' ');
  const time = timeInput.value;
  const group = groupInput.value;
  const type = typeInput.value;
  errorBox.hidden = true;

  if (!content) {
    errorBox.textContent = '請先輸入提醒內容，例如：下午兩點記得吃降血壓藥。';
    errorBox.hidden = false;
    contentInput.focus();
    return;
  }
  if (!time) {
    errorBox.textContent = '請選擇提醒時間。';
    errorBox.hidden = false;
    timeInput.focus();
    return;
  }

  const submitButton = event.target.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = true;
  try {
    const result = await window.LohasAPI.createReminder({ content, time, group, type });
    if (result && result.state) applyServerState(result.state, true);
    contentInput.value = '';
    typeInput.value = 'other';
    showToast(result && result.queued
      ? '目前離線，提醒已先排入佇列，恢復連線後會自動送出。'
      : `已發送提醒給「${group}」，長輩端已即時更新！`, result && result.queued ? 'warn' : 'success');
  } catch (error) {
    errorBox.textContent = error.message || '發送失敗，請稍後再試一次。';
    errorBox.hidden = false;
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

async function handleNoticeSubmit(event) {
  event.preventDefault();
  const titleInput = $('#noticeTitle');
  const categoryInput = $('#noticeCategory');
  const iconInput = $('#noticeIcon');
  const bodyInput = $('#noticeBody');
  const errorBox = $('#noticeFormError');
  if (!titleInput || !categoryInput || !iconInput || !bodyInput || !errorBox) return;

  const title = titleInput.value.trim();
  const category = categoryInput.value;
  const iconName = iconInput.value;
  const body = bodyInput.value.trim();
  errorBox.hidden = true;

  if (!title) {
    errorBox.textContent = '請填寫廣播標題。';
    errorBox.hidden = false;
    titleInput.focus();
    return;
  }
  if (!body) {
    errorBox.textContent = '請填寫廣播內容。';
    errorBox.hidden = false;
    bodyInput.focus();
    return;
  }

  const submitButton = event.target.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = true;
  try {
    const result = await window.LohasAPI.createNotice({
      title,
      category,
      icon: iconName,
      body,
      meta: '佳儒 · 剛剛發布'
    });
    if (result && result.state) applyServerState(result.state, true);
    titleInput.value = '';
    bodyInput.value = '';
    showToast(result && result.queued
      ? '目前離線，廣播已先排入佇列，恢復連線後會自動送出。'
      : '社區廣播已發布，長輩端會即時看到。', result && result.queued ? 'warn' : 'success');
  } catch (error) {
    errorBox.textContent = error.message || '發布失敗，請稍後再試一次。';
    errorBox.hidden = false;
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

async function handleReset() {
  const confirmed = window.confirm('確定要重置回課堂 Demo 預設資料嗎？所有新增的提醒、照片、求助、共餐與接駁車預約都會恢復成預設值。');
  if (!confirmed) return;
  const button = $('#resetDemoBtn');
  if (button) button.disabled = true;
  try {
    const result = await window.LohasAPI.reset();
    if (result && result.state) applyServerState(result.state, true);
    showToast('已重置為課堂 Demo 預設資料。');
  } catch (error) {
    showToast('重置失敗，請確認伺服器已啟動。', 'warn');
  } finally {
    if (button) button.disabled = false;
  }
}

document.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  const resolveButton = target.closest('[data-resolve-sos]');
  if (resolveButton) {
    resolveSos(resolveButton.dataset.resolveSos);
    return;
  }

  if (target.closest('#resetDemoBtn')) {
    handleReset();
  }
});

document.addEventListener('submit', (event) => {
  if (event.target && event.target.id === 'reminderForm') handleReminderSubmit(event);
  if (event.target && event.target.id === 'noticeForm') handleNoticeSubmit(event);
});

document.addEventListener('input', (event) => {
  if (!event.target) return;
  if (event.target.id === 'reminderContent') {
    const errorBox = $('#reminderFormError');
    if (errorBox) errorBox.hidden = true;
  }
  if (event.target.id === 'noticeTitle' || event.target.id === 'noticeBody') {
    const errorBox = $('#noticeFormError');
    if (errorBox) errorBox.hidden = true;
  }
});

window.addEventListener('lohas:connection', (event) => {
  const detail = event.detail || {};
  updateSyncStatus(Boolean(detail.online), detail.source);
});

async function initAdmin() {
  const cached = window.LohasAPI ? window.LohasAPI.getCachedState() : null;
  if (cached) applyServerState(cached, true);

  if (window.LohasAPI) {
    window.LohasAPI.startSync((snapshot, meta) => {
      if (!snapshot) return;
      const source = meta && meta.source;
      applyServerState(snapshot, source === 'offline' || source === 'mutation' || !state.revision);
    });
    const fresh = await window.LohasAPI.getState();
    if (fresh) applyServerState(fresh, true);
  }

  refreshIcons();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdmin);
} else {
  initAdmin();
}
