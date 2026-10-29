'use strict';

/**
 * 樂活在地通｜前後端分離示範伺服器
 *
 * 零外部依賴（純 Node.js http 模組）：
 * - 提供 public/ 靜態檔案（長輩端 elder.html、佳儒後台 admin.html）
 * - 提供 RESTful API，所有資料持久化到 data/db.json
 * - 提供 SSE（/api/events），讓長輩端與後台跨視窗、跨裝置即時同步
 */

const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const SEED_PATH = path.join(DATA_DIR, 'seed.json');
const PORT = Number(process.env.PORT || 8080);

const CURRENT_ELDER = { name: '林阿公', group: '長青A班' };

const GROUPS = {
  '全體長輩': ['林阿公', '陳阿嬤', '王奶奶', '李阿伯'],
  '長青A班': ['林阿公', '陳阿嬤'],
  '長青B班': ['王奶奶', '李阿伯']
};

const TYPE_META = {
  pill: { label: '吃藥' },
  clinic: { label: '健康檢查' },
  activity: { label: '社區活動' },
  other: { label: '提醒' }
};

const QUIZ_QUESTIONS = [
  { id: 'quiz-greeting', answer: 0 },
  { id: 'quiz-store', answer: 1 },
  { id: 'quiz-banquet', answer: 2 }
];

const SHUTTLE_KEYS = ['hospital', 'market'];
const MAX_BODY_BYTES = 12 * 1024 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const NO_CACHE_EXTENSIONS = new Set(['.html', '.js', '.mjs', '.css', '.json', '.webmanifest']);

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return null;
  }
}

const SEED = readJsonFile(SEED_PATH);
if (!SEED) {
  console.error('找不到 data/seed.json，請確認種子資料檔存在。');
  process.exit(1);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeDb(value) {
  const base = clone(SEED);
  const source = value && typeof value === 'object' ? value : {};
  const merged = {
    ...base,
    ...source,
    version: 2,
    revision: Number(source.revision) || Number(base.revision) || 1,
    reminders: Array.isArray(source.reminders) ? source.reminders : base.reminders,
    photos: Array.isArray(source.photos) ? source.photos : base.photos,
    rewards: Array.isArray(source.rewards) ? source.rewards : base.rewards,
    notices: Array.isArray(source.notices) ? source.notices : base.notices,
    gatherings: Array.isArray(source.gatherings) ? source.gatherings : base.gatherings,
    mealMembers: Array.isArray(source.mealMembers) ? source.mealMembers : base.mealMembers,
    sosAlerts: Array.isArray(source.sosAlerts) ? source.sosAlerts : [],
    steps: Math.max(0, Number(source.steps) || 0),
    goal: Math.max(1, Number(source.goal) || 5000),
    coins: Math.max(0, Number(source.coins) || 0),
    coinBuffer: Math.max(0, Number(source.coinBuffer) || 0),
    goalBonusClaimed: Boolean(source.goalBonusClaimed),
    quiz: {
      index: Number.isInteger(source.quiz && source.quiz.index) ? source.quiz.index : 0,
      solved: Array.isArray(source.quiz && source.quiz.solved) ? source.quiz.solved : [],
      lastChoice: source.quiz && Number.isInteger(source.quiz.lastChoice) ? source.quiz.lastChoice : null
    },
    medBag: {
      selected: Number.isInteger(source.medBag && source.medBag.selected) ? source.medBag.selected : 0
    },
    shuttles: {}
  };

  for (const key of SHUTTLE_KEYS) {
    const incoming = source.shuttles && source.shuttles[key] ? source.shuttles[key] : {};
    const fallback = base.shuttles[key] || {};
    merged.shuttles[key] = {
      eta: Math.max(1, Number(incoming.eta) || Number(fallback.eta) || 5),
      members: Array.isArray(incoming.members)
        ? incoming.members
        : Array.isArray(fallback.members) ? fallback.members : []
    };
  }

  if (!merged.createdAt) merged.createdAt = new Date().toISOString();
  if (!merged.updatedAt) merged.updatedAt = new Date().toISOString();
  return merged;
}

let db = normalizeDb(readJsonFile(DB_PATH) || clone(SEED));
let writeChain = Promise.resolve();
const sseClients = new Set();

function latestPendingSos() {
  return db.sosAlerts.find((alert) => alert && alert.status === 'pending') || null;
}

function getSnapshot() {
  const mealMembers = Array.isArray(db.mealMembers) ? db.mealMembers : [];
  const shuttles = {};
  for (const key of SHUTTLE_KEYS) {
    const raw = db.shuttles[key] || {};
    const members = Array.isArray(raw.members) ? raw.members : [];
    shuttles[key] = {
      eta: Math.max(1, Number(raw.eta) || 5),
      members,
      booked: members.includes(CURRENT_ELDER.name)
    };
  }

  return {
    ...db,
    version: 2,
    revision: db.revision,
    currentElder: CURRENT_ELDER,
    groups: GROUPS,
    mealMembers,
    mealCount: mealMembers.length,
    mealSignedUp: mealMembers.includes(CURRENT_ELDER.name),
    teaGroups: db.gatherings,
    helpRequest: latestPendingSos(),
    shuttles
  };
}

function persist() {
  const serialized = JSON.stringify(db, null, 2) + '\n';
  writeChain = writeChain
    .catch(() => undefined)
    .then(async () => {
      await fsp.mkdir(DATA_DIR, { recursive: true });
      const temporary = `${DB_PATH}.tmp`;
      await fsp.writeFile(temporary, serialized, 'utf8');
      await fsp.rename(temporary, DB_PATH);
    })
    .catch((error) => {
      console.error('寫入 data/db.json 失敗：', error);
    });
  return writeChain;
}

function broadcastState() {
  const state = getSnapshot();
  const payload = `event: state\ndata: ${JSON.stringify({ type: 'state', state })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (error) {
      sseClients.delete(client);
    }
  }
  return state;
}

function commit() {
  db.revision = (Number(db.revision) || 0) + 1;
  db.updatedAt = new Date().toISOString();
  persist();
  return broadcastState();
}

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  response.end(body);
}

function sendError(response, status, message) {
  sendJson(response, status, { ok: false, error: message });
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let tooLarge = false;
    const chunks = [];

    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        tooLarge = true;
        return;
      }
      chunks.push(chunk);
    });

    request.on('end', () => {
      if (tooLarge) {
        reject(Object.assign(new Error('送出的資料太大。'), { statusCode: 413 }));
        return;
      }
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (error) {
        reject(Object.assign(new Error('JSON 格式不正確。'), { statusCode: 400 }));
      }
    });

    request.on('error', reject);
  });
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

function spokenTime(value) {
  if (!value || !String(value).includes(':')) return '稍後';
  const [hourString, minute] = String(value).split(':');
  const hour = Number(hourString);
  const period = hour < 12 ? '上午' : hour < 18 ? '下午' : '晚上';
  let displayHour = hour % 12;
  if (displayHour === 0) displayHour = 12;
  return `${period}${displayHour}點${Number(minute) === 0 ? '' : `${Number(minute)}分`}`;
}

function buildReminderSpeech(content, time, type) {
  const typeOpeners = {
    pill: '阿公阿嬤，吃藥的時間到了，佳儒提醒您',
    clinic: '阿公阿嬤，健康檢查的時間到了，佳儒提醒您',
    activity: '阿公阿嬤，社區有活動，佳儒提醒您',
    other: '阿公阿嬤，佳儒有事情提醒您'
  };
  const typeClosers = {
    pill: '請記得按時吃藥，身體才會勇健喔！',
    clinic: '請記得帶健保卡，準時來檢查喔！',
    activity: '歡迎作伙來參加，出門要小心喔！',
    other: '請記得完成，有問題可以找社區志工幫忙喔！'
  };
  const spokenContent = content.replace(/[。！!?？]+$/g, '');
  const mentionsTime = /(上午|下午|晚上|早上|中午|點|半)/.test(spokenContent);
  const timeLead = mentionsTime ? '' : `${spokenTime(time)}，`;
  return `${typeOpeners[type] || typeOpeners.other}，${timeLead}${spokenContent}。${typeClosers[type] || typeClosers.other}`;
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function handleApi(request, response, pathname) {
  const method = request.method || 'GET';

  if (pathname === '/api/state' && method === 'GET') {
    sendJson(response, 200, getSnapshot());
    return;
  }

  if (pathname === '/api/events' && method === 'GET') {
    response.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Content-Type-Options': 'nosniff'
    });
    response.write('retry: 3000\n\n');
    response.write(`event: state\ndata: ${JSON.stringify({ type: 'state', state: getSnapshot() })}\n\n`);
    sseClients.add(response);

    const heartbeat = setInterval(() => {
      try {
        response.write(`: heartbeat ${Date.now()}\n\n`);
      } catch (error) {
        clearInterval(heartbeat);
        sseClients.delete(response);
      }
    }, 25000);

    request.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(response);
    });
    return;
  }

  if (pathname === '/api/reset' && method === 'POST') {
    const previousRevision = Number(db.revision) || 0;
    db = normalizeDb(clone(SEED));
    db.revision = previousRevision + 1;
    db.createdAt = new Date().toISOString();
    db.updatedAt = new Date().toISOString();
    await persist();
    const state = broadcastState();
    sendJson(response, 200, { ok: true, state });
    return;
  }

  if (pathname === '/api/reminders' && method === 'POST') {
    const body = await readBody(request);
    const content = String(body.content || '').trim().replace(/\s+/g, ' ');
    if (!content) {
      sendError(response, 400, '請輸入提醒內容。');
      return;
    }
    const time = /^\d{2}:\d{2}$/.test(String(body.time || '')) ? String(body.time) : '14:00';
    const group = GROUPS[body.group] ? body.group : '長青A班';
    const type = TYPE_META[body.type] ? body.type : 'other';
    const reminder = {
      id: makeId('reminder'),
      content: content.slice(0, 80),
      note: String(body.note || '').trim() || `佳儒提醒：${content.slice(0, 80)}。有需要可以找社區志工幫忙。`,
      time,
      group,
      type,
      speech: buildReminderSpeech(content.slice(0, 80), time, type),
      doneBy: [],
      createdAt: '剛剛',
      createdAtISO: new Date().toISOString()
    };
    db.reminders.unshift(reminder);
    const state = commit();
    sendJson(response, 201, { ok: true, reminder, state });
    return;
  }

  const completeMatch = pathname.match(/^\/api\/reminders\/([^/]+)\/complete$/);
  if (completeMatch && method === 'POST') {
    const body = await readBody(request);
    const reminder = db.reminders.find((item) => item.id === completeMatch[1]);
    if (!reminder) {
      sendError(response, 404, '找不到這則提醒。');
      return;
    }
    const elderName = String(body.elderName || CURRENT_ELDER.name);
    if (!Array.isArray(reminder.doneBy)) reminder.doneBy = [];
    if (!reminder.doneBy.includes(elderName)) reminder.doneBy.push(elderName);
    const state = commit();
    sendJson(response, 200, { ok: true, reminder, state });
    return;
  }

  if (pathname === '/api/sos' && method === 'POST') {
    const body = await readBody(request);
    const alert = {
      id: makeId('sos'),
      elderName: String(body.elderName || CURRENT_ELDER.name),
      location: String(body.location || '幸福里福安宮前'),
      createdAt: '剛剛',
      createdAtISO: new Date().toISOString(),
      status: 'pending',
      resolvedAt: null
    };
    db.sosAlerts.unshift(alert);
    const state = commit();
    sendJson(response, 201, { ok: true, alert, state });
    return;
  }

  if (pathname === '/api/sos/resolve' && method === 'POST') {
    const body = await readBody(request);
    const alert = body.id
      ? db.sosAlerts.find((item) => item.id === body.id)
      : db.sosAlerts.find((item) => item.status === 'pending');
    if (!alert) {
      sendJson(response, 404, { ok: false, error: '目前沒有未處理的求助。', state: getSnapshot() });
      return;
    }
    alert.status = 'resolved';
    alert.resolvedAt = '剛剛';
    alert.resolvedAtISO = new Date().toISOString();
    const state = commit();
    sendJson(response, 200, { ok: true, alert, state });
    return;
  }

  if (pathname === '/api/photos' && method === 'POST') {
    const body = await readBody(request);
    const image = String(body.image || '');
    if (!/^data:image\/(png|jpe?g|webp|gif|svg\+xml)/i.test(image)) {
      sendError(response, 400, '照片格式不正確。');
      return;
    }
    const photo = {
      id: makeId('photo'),
      author: String(body.author || CURRENT_ELDER.name),
      title: String(body.title || '平安喜樂').trim().slice(0, 20) || '平安喜樂',
      image,
      likes: 0,
      liked: false,
      hasVoice: false,
      voiceText: '',
      time: '剛剛',
      createdAtISO: new Date().toISOString()
    };
    db.photos.unshift(photo);
    const state = commit();
    sendJson(response, 201, { ok: true, photo, state });
    return;
  }

  const likeMatch = pathname.match(/^\/api\/photos\/([^/]+)\/like$/);
  if (likeMatch && method === 'POST') {
    const photo = db.photos.find((item) => item.id === likeMatch[1]);
    if (!photo) {
      sendError(response, 404, '找不到這張照片。');
      return;
    }
    photo.liked = !photo.liked;
    photo.likes = Math.max(0, (Number(photo.likes) || 0) + (photo.liked ? 1 : -1));
    const state = commit();
    sendJson(response, 200, { ok: true, photo, state });
    return;
  }

  const voiceMatch = pathname.match(/^\/api\/photos\/([^/]+)\/voice$/);
  if (voiceMatch && method === 'POST') {
    const body = await readBody(request);
    const photo = db.photos.find((item) => item.id === voiceMatch[1]);
    if (!photo) {
      sendError(response, 404, '找不到這張照片。');
      return;
    }
    const voiceText = String(body.voiceText || '').trim();
    if (!voiceText) {
      sendError(response, 400, '語音介紹內容是空的。');
      return;
    }
    photo.hasVoice = true;
    photo.voiceText = voiceText.slice(0, 500);
    photo.voiceUpdatedAt = new Date().toISOString();
    const state = commit();
    sendJson(response, 200, { ok: true, photo, state });
    return;
  }

  if (pathname === '/api/health/steps' && method === 'POST') {
    const body = await readBody(request);
    const amount = Math.max(0, Math.min(100000, Number(body.amount) || 0));
    if (!amount) {
      sendError(response, 400, '步數必須大於 0。');
      return;
    }
    db.steps += amount;
    db.coinBuffer += amount;
    let earnedCoins = 0;
    while (db.coinBuffer >= 500) {
      db.coinBuffer -= 500;
      db.coins += 2;
      earnedCoins += 2;
    }
    let goalBonus = 0;
    if (!db.goalBonusClaimed && db.steps >= db.goal) {
      db.goalBonusClaimed = true;
      db.coins += 20;
      goalBonus = 20;
    }
    const state = commit();
    sendJson(response, 200, { ok: true, amount, earnedCoins, goalBonus, state });
    return;
  }

  if (pathname === '/api/health/redeem' && method === 'POST') {
    const body = await readBody(request);
    const reward = db.rewards.find((item) => item.id === body.rewardId);
    if (!reward) {
      sendError(response, 404, '找不到這項獎勵。');
      return;
    }
    if (reward.redeemed) {
      sendJson(response, 200, { ok: true, alreadyRedeemed: true, reward, state: getSnapshot() });
      return;
    }
    if (db.coins < reward.cost) {
      sendJson(response, 200, {
        ok: false,
        reason: 'insufficient',
        shortage: reward.cost - db.coins,
        reward,
        state: getSnapshot()
      });
      return;
    }
    db.coins -= reward.cost;
    reward.redeemed = true;
    reward.voucherCode = `LOHAS-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const state = commit();
    sendJson(response, 200, { ok: true, reward, state });
    return;
  }

  if (pathname === '/api/health/quiz' && method === 'POST') {
    const body = await readBody(request);
    if (body.action === 'next') {
      const requestedIndex = Number(body.index);
      db.quiz.index = Number.isInteger(requestedIndex)
        ? Math.max(0, requestedIndex) % QUIZ_QUESTIONS.length
        : (db.quiz.index + 1) % QUIZ_QUESTIONS.length;
      db.quiz.lastChoice = null;
      const state = commit();
      sendJson(response, 200, { ok: true, state });
      return;
    }

    const question = QUIZ_QUESTIONS.find((item) => item.id === body.questionId)
      || QUIZ_QUESTIONS[db.quiz.index];
    if (!question) {
      sendError(response, 404, '找不到題目。');
      return;
    }
    const optionIndex = Number(body.optionIndex);
    if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex > 2) {
      sendError(response, 400, '答案選項不正確。');
      return;
    }
    db.quiz.lastChoice = optionIndex;
    const correct = optionIndex === question.answer;
    let awarded = 0;
    const alreadySolved = db.quiz.solved.includes(question.id);
    if (correct && !alreadySolved) {
      db.quiz.solved.push(question.id);
      db.coins += 10;
      awarded = 10;
    }
    const state = commit();
    sendJson(response, 200, {
      ok: true,
      correct,
      awarded,
      alreadySolved,
      questionId: question.id,
      state
    });
    return;
  }

  if (pathname === '/api/community/meal' && method === 'POST') {
    const body = await readBody(request);
    const elderName = String(body.elderName || CURRENT_ELDER.name);
    if (!db.mealMembers.includes(elderName)) db.mealMembers.push(elderName);
    const state = commit();
    sendJson(response, 200, {
      ok: true,
      signedUp: true,
      elderName,
      mealCount: state.mealCount,
      state
    });
    return;
  }

  if (pathname === '/api/community/gathering' && method === 'POST') {
    const body = await readBody(request);
    const gathering = db.gatherings.find((item) => item.id === (body.gatheringId || body.id));
    if (!gathering) {
      sendError(response, 404, '找不到這個老友湊咖。');
      return;
    }
    const elderName = String(body.elderName || CURRENT_ELDER.name);
    if (!Array.isArray(gathering.members)) gathering.members = [];
    if (!gathering.members.includes(elderName)) gathering.members.push(elderName);
    const state = commit();
    sendJson(response, 200, { ok: true, gathering, state });
    return;
  }

  if (pathname === '/api/community/shuttle' && method === 'POST') {
    const body = await readBody(request);
    const key = String(body.key || '');
    if (!SHUTTLE_KEYS.includes(key)) {
      sendError(response, 400, '接駁車路線不正確。');
      return;
    }
    const shuttle = db.shuttles[key];
    if (!Array.isArray(shuttle.members)) shuttle.members = [];
    const elderName = String(body.elderName || CURRENT_ELDER.name);
    const index = shuttle.members.indexOf(elderName);
    if (index >= 0) shuttle.members.splice(index, 1);
    else shuttle.members.push(elderName);
    const booked = shuttle.members.includes(elderName);
    const state = commit();
    sendJson(response, 200, { ok: true, key, booked, state });
    return;
  }

  if (pathname === '/api/notices' && method === 'POST') {
    const body = await readBody(request);
    const title = String(body.title || '').trim();
    const bodyText = String(body.body || '').trim();
    if (!title || !bodyText) {
      sendError(response, 400, '請填寫廣播標題與內容。');
      return;
    }
    const notice = {
      id: makeId('notice'),
      icon: String(body.icon || 'megaphone'),
      category: String(body.category || '社區消息').trim() || '社區消息',
      title: title.slice(0, 40),
      meta: String(body.meta || '佳儒 · 剛剛發布').trim(),
      body: bodyText.slice(0, 300),
      speech: String(body.speech || `里長伯廣播：${title.slice(0, 40)}。${bodyText.slice(0, 300)}`),
      createdAtISO: new Date().toISOString()
    };
    db.notices.unshift(notice);
    const state = commit();
    sendJson(response, 201, { ok: true, notice, state });
    return;
  }

  sendError(response, 404, '找不到這個 API。');
}

function serveStatic(request, response, pathname) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8', 'Allow': 'GET, HEAD' });
    response.end('405 Method Not Allowed');
    return;
  }

  if (pathname === '/' || pathname === '/index.html') pathname = '/elder.html';
  if (pathname === '/elder') pathname = '/elder.html';
  if (pathname === '/admin') pathname = '/admin.html';

  const relative = pathname.replace(/^\/+/, '');
  const filePath = path.resolve(PUBLIC_DIR, relative);
  if (!filePath.startsWith(PUBLIC_DIR + path.sep) && filePath !== PUBLIC_DIR) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end('<!doctype html><meta charset="utf-8"><title>404</title><p style="font:24px/1.6 sans-serif;padding:40px;">找不到頁面。請開啟 <a href="/elder.html">長輩端</a> 或 <a href="/admin.html">佳儒後台</a>。</p>');
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const headers = {
      'Content-Type': MIME[extension] || 'application/octet-stream',
      'Content-Length': stats.size,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': NO_CACHE_EXTENSIONS.has(extension) ? 'no-cache' : 'public, max-age=3600'
    };
    if (path.basename(filePath) === 'sw.js') {
      headers['Service-Worker-Allowed'] = '/';
      headers['Cache-Control'] = 'no-cache';
    }
    response.writeHead(200, headers);
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    fs.createReadStream(filePath)
      .on('error', () => {
        if (!response.headersSent) response.writeHead(500);
        response.end();
      })
      .pipe(response);
  });
}

const server = http.createServer((request, response) => {
  let pathname;
  try {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    pathname = decodeURIComponent(url.pathname);
  } catch (error) {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('400 Bad Request');
    return;
  }

  if (pathname.startsWith('/api/')) {
    handleApi(request, response, pathname).catch((error) => {
      console.error('API error:', error);
      if (!response.headersSent) {
        sendError(response, error.statusCode || 500, error.message || '伺服器發生錯誤。');
      } else {
        response.end();
      }
    });
    return;
  }

  serveStatic(request, response, pathname);
});

server.listen(PORT, '0.0.0.0', () => {
  persist();
  console.log('');
  console.log('樂活在地通｜前後端分離版已啟動');
  console.log(`  長輩端：http://localhost:${PORT}/elder.html`);
  console.log(`  佳儒後台：http://localhost:${PORT}/admin.html`);
  console.log(`  資料檔：${DB_PATH}`);
  console.log('');
  const interfaces = os.networkInterfaces();
  Object.values(interfaces).flat().forEach((item) => {
    if (item && item.family === 'IPv4' && !item.internal) {
      console.log(`  同網段裝置：http://${item.address}:${PORT}/elder.html`);
    }
  });
});

process.on('SIGINT', () => {
  console.log('\n正在關閉伺服器…');
  server.close(() => process.exit(0));
});
