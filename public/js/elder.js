'use strict';

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const numberFormatter = new Intl.NumberFormat('zh-TW');

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

    function todayText() {
      return new Intl.DateTimeFormat('zh-TW', {
        month: 'long', day: 'numeric', weekday: 'long'
      }).format(new Date());
    }

    function greetingForNow() {
      const hour = new Date().getHours();
      if (hour < 11) return '早安';
      if (hour < 17) return '午安';
      return '晚安';
    }

    function formatTime(value) {
      if (!value || !value.includes(':')) return '時間未定';
      const [hourString, minute] = value.split(':');
      const hour = Number(hourString);
      const period = hour < 12 ? '上午' : hour < 18 ? '下午' : '晚上';
      let displayHour = hour % 12;
      if (displayHour === 0) displayHour = 12;
      return `${period} ${displayHour}:${minute}`;
    }

    function spokenTime(value) {
      if (!value || !value.includes(':')) return '稍後';
      const [hourString, minute] = value.split(':');
      const hour = Number(hourString);
      const period = hour < 12 ? '上午' : hour < 18 ? '下午' : '晚上';
      let displayHour = hour % 12;
      if (displayHour === 0) displayHour = 12;
      return `${period}${displayHour}點${Number(minute) === 0 ? '' : `${Number(minute)}分`}`;
    }

    function formatDuration(totalSeconds) {
      const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
      const seconds = (totalSeconds % 60).toString().padStart(2, '0');
      return `${minutes}:${seconds}`;
    }

    function makeSvg(svg) {
      return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    }

    /* 內建溫馨範例圖，全部以 SVG 產生，不依賴外部圖片。 */
    const SAMPLE_IMAGES = {
      sunrise: makeSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#FCA5A5"/><stop offset=".45" stop-color="#FDBA74"/><stop offset="1" stop-color="#FEF3C7"/>
          </linearGradient>
          <linearGradient id="hillA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4D7C0F"/><stop offset="1" stop-color="#365314"/></linearGradient>
          <linearGradient id="hillB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#365314"/><stop offset="1" stop-color="#1A2E05"/></linearGradient>
        </defs>
        <rect width="800" height="600" fill="url(#sky)"/>
        <circle cx="585" cy="178" r="126" fill="#FDE68A" opacity=".32"/>
        <circle cx="585" cy="178" r="76" fill="#FEF08A"/>
        <path d="M0 372 Q140 292 280 354 T560 342 T800 388 V600 H0Z" fill="url(#hillA)"/>
        <path d="M0 445 Q180 355 350 425 T800 410 V600 H0Z" fill="url(#hillB)"/>
        <path d="M0 516 Q210 455 420 508 T800 496 V600 H0Z" fill="#14280B"/>
        <g fill="none" stroke="#1F2937" stroke-width="6" stroke-linecap="round">
          <path d="M125 170 q20 -18 40 0 q20 -18 40 0"/>
          <path d="M222 127 q15 -14 30 0 q15 -14 30 0"/>
        </g>
        <g>
          <path d="M110 600 Q120 520 95 470" fill="none" stroke="#365314" stroke-width="9"/>
          <path d="M188 600 Q180 520 210 470" fill="none" stroke="#365314" stroke-width="9"/>
          <g fill="#FDE68A"><circle cx="93" cy="465" r="17"/><circle cx="76" cy="450" r="15"/><circle cx="111" cy="449" r="15"/><circle cx="92" cy="437" r="14"/><circle cx="95" cy="460" r="9" fill="#C2410C"/></g>
          <g fill="#FCA5A5"><circle cx="212" cy="465" r="18"/><circle cx="194" cy="450" r="15"/><circle cx="230" cy="449" r="15"/><circle cx="211" cy="436" r="14"/><circle cx="214" cy="460" r="9" fill="#854D0E"/></g>
        </g>
        <g opacity=".85" fill="#FEF3C7">
          <circle cx="660" cy="452" r="4"/><circle cx="690" cy="488" r="5"/><circle cx="720" cy="430" r="3"/><circle cx="620" cy="500" r="4"/>
        </g>
      </svg>`),
      flowers: makeSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
        <defs>
          <linearGradient id="skyF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFDBFE"/><stop offset=".62" stop-color="#E0F2FE"/><stop offset="1" stop-color="#FCE7F3"/></linearGradient>
          <linearGradient id="leaf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4ADE80"/><stop offset="1" stop-color="#166534"/></linearGradient>
        </defs>
        <rect width="800" height="600" fill="url(#skyF)"/>
        <circle cx="655" cy="116" r="64" fill="#FEF08A"/>
        <circle cx="655" cy="116" r="96" fill="#FDE68A" opacity=".32"/>
        <g fill="#93C5FD" opacity=".75">
          <ellipse cx="150" cy="135" rx="76" ry="30"/><circle cx="118" cy="118" r="32"/><circle cx="173" cy="111" r="40"/>
        </g>
        <path d="M0 500 Q130 440 280 480 T560 462 T800 495 V600 H0Z" fill="#86EFAC"/>
        <g>
          <path d="M405 600 Q392 500 372 420" fill="none" stroke="#166534" stroke-width="13"/>
          <path d="M392 520 Q315 490 278 438" fill="none" stroke="#166534" stroke-width="11"/>
          <path d="M399 476 Q475 440 508 387" fill="none" stroke="#166534" stroke-width="11"/>
          <g fill="url(#leaf)">
            <ellipse cx="318" cy="472" rx="51" ry="24" transform="rotate(-31 318 472)"/>
            <ellipse cx="469" cy="438" rx="52" ry="24" transform="rotate(27 469 438)"/>
            <ellipse cx="359" cy="552" rx="55" ry="23" transform="rotate(-19 359 552)"/>
          </g>
          <g fill="#F9A8D4">
            <circle cx="372" cy="403" r="48"/><circle cx="315" cy="376" r="44"/><circle cx="430" cy="374" r="44"/>
            <circle cx="336" cy="322" r="40"/><circle cx="404" cy="316" r="42"/><circle cx="370" cy="350" r="39"/>
          </g>
          <circle cx="370" cy="355" r="34" fill="#FDE68A"/>
          <circle cx="370" cy="355" r="17" fill="#CA8A04"/>
          <g fill="#FCA5A5">
            <circle cx="518" cy="383" r="32"/><circle cx="486" cy="358" r="28"/><circle cx="548" cy="356" r="28"/><circle cx="517" cy="340" r="25"/>
          </g>
          <circle cx="517" cy="360" r="22" fill="#FDE68A"/>
          <g fill="#FBCFE8">
            <circle cx="278" cy="439" r="26"/><circle cx="252" cy="418" r="23"/><circle cx="302" cy="415" r="23"/><circle cx="277" cy="402" r="21"/>
          </g>
          <circle cx="277" cy="420" r="18" fill="#FDE68A"/>
        </g>
        <g fill="#FDE68A" opacity=".9">
          <circle cx="110" cy="310" r="5"/><circle cx="155" cy="245" r="4"/><circle cx="660" cy="300" r="5"/><circle cx="706" cy="230" r="4"/>
        </g>
      </svg>`),
      field: makeSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
        <defs>
          <linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7DD3FC"/><stop offset=".7" stop-color="#E0F2FE"/><stop offset="1" stop-color="#FEF9C3"/></linearGradient>
          <linearGradient id="rice" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#84CC16"/><stop offset="1" stop-color="#3F6212"/></linearGradient>
        </defs>
        <rect width="800" height="600" fill="url(#skyG)"/>
        <circle cx="645" cy="112" r="58" fill="#FEF08A"/>
        <g fill="#fff" opacity=".9">
          <ellipse cx="170" cy="140" rx="90" ry="31"/><circle cx="122" cy="124" r="36"/><circle cx="182" cy="111" r="45"/><circle cx="225" cy="132" r="29"/>
          <ellipse cx="492" cy="188" rx="67" ry="24"/><circle cx="460" cy="176" r="27"/><circle cx="509" cy="168" r="31"/>
        </g>
        <path d="M0 350 L150 250 L275 338 L420 232 L590 350 L705 280 L800 345 V600 H0Z" fill="#4D7C0F"/>
        <path d="M0 402 Q130 350 265 394 T540 385 T800 404 V600 H0Z" fill="url(#rice)"/>
        <g stroke="#365314" stroke-width="4" opacity=".55">
          <path d="M0 450 Q210 413 430 452 T800 445"/>
          <path d="M0 500 Q190 466 400 505 T800 498"/>
          <path d="M0 550 Q180 520 390 555 T800 548"/>
          <path d="M120 600 Q160 490 190 415"/><path d="M280 600 Q300 500 290 410"/><path d="M470 600 Q455 505 440 420"/><path d="M650 600 Q610 510 570 430"/>
        </g>
        <g fill="#FEF08A" opacity=".9"><circle cx="120" cy="428" r="5"/><circle cx="250" cy="438" r="4"/><circle cx="410" cy="470" r="5"/><circle cx="540" cy="452" r="4"/><circle cx="690" cy="480" r="5"/></g>
        <path d="M90 352 q20 -18 40 0 q20 -18 40 0" fill="none" stroke="#1F2937" stroke-width="5" stroke-linecap="round"/>
      </svg>`)
    };

    const SAMPLE_META = [
      { key: 'sunrise', title: '金色晨曦', note: '溫暖日出' },
      { key: 'flowers', title: '花開富貴', note: '粉紅花朵' },
      { key: 'field', title: '幸福稻田', note: '在地風景' }
    ];

    const GROUPS = {
      '全體長輩': ['林阿公', '陳阿嬤', '王奶奶', '李阿伯'],
      '長青A班': ['林阿公', '陳阿嬤'],
      '長青B班': ['王奶奶', '李阿伯']
    };

    const CURRENT_ELDER = { name: '林阿公', group: '長青A班' };

    const TYPE_META = {
      pill: { icon: 'pill', label: '吃藥', background: '#FEE2E2', color: '#991B1B' },
      clinic: { icon: 'stethoscope', label: '健康檢查', background: '#DCFCE7', color: '#166534' },
      activity: { icon: 'users', label: '社區活動', background: '#DBEAFE', color: '#1E40AF' },
      other: { icon: 'bell-ring', label: '提醒', background: '#FEF3C7', color: '#92400E' }
    };

    const state = {
      font: 'large',
      view: 'home',
      revision: 0,
      reminders: [],
      photos: [],
      steps: 0,
      goal: 5000,
      coins: 0,
      coinBuffer: 0,
      goalBonusClaimed: false,
      timer: { running: false, seconds: 0, intervalId: null },
      rewards: [],
      mealCount: 0,
      mealSignedUp: false,
      helpRequest: null,
      sosAlerts: [],
      medBag: { selected: 0 },
      teaGroups: [],
      brainQuiz: { index: 0, solved: [], lastChoice: null },
      shuttles: {
        hospital: { eta: 5, booked: false, members: [] },
        market: { eta: 14, booked: false, members: [] }
      },
      notices: [],
      offline: false
    };

    const MED_BAGS = [
      {
        tabLabel: '💊 高血壓藥',
        name: '高血壓用藥',
        patient: '林阿公',
        hospital: '幸福診所',
        medicine: '脈優錠 5 毫克',
        time: '每天早上 7:00，飯後服用',
        dose: '每次 1 顆',
        effect: '幫助控制血壓，讓血管放鬆。',
        sideEffects: '少數人可能頭暈或腳踝水腫；若很不舒服，請告訴佳儒或醫師。',
        warning: '請照時間吃，不要自己停藥。',
        speech: '這是林阿公的高血壓藥，藥名是脈優錠五毫克。每天早上七點，飯後吃一顆。它會幫助控制血壓。如果頭暈或腳踝水腫，請告訴佳儒或醫師。'
      },
      {
        tabLabel: '💊 糖尿病藥',
        name: '糖尿病用藥',
        patient: '林阿公',
        hospital: '幸福診所',
        medicine: '伏糖錠 500 毫克',
        time: '每天早晚 7:00，飯後服用',
        dose: '每次 1 顆',
        effect: '幫助控制血糖，讓身體好好利用能量。',
        sideEffects: '可能會有腸胃不適；若持續拉肚子或頭暈，請找醫師。',
        warning: '要配合吃飯，不要空腹吃。',
        speech: '這是林阿公的糖尿病藥，藥名是伏糖錠五百毫克。每天早晚七點，飯後各吃一顆。它會幫助控制血糖。如果腸胃不舒服或頭暈，請找醫師。'
      }
    ];

    const QUIZ_QUESTIONS = [
      {
        id: 'quiz-greeting',
        question: '台灣長輩見面常說「呷飽未？」，這句話是在問什麼？',
        options: ['問吃飽了沒', '問要去哪裡', '問現在幾點'],
        answer: 0,
        fact: '「呷飽未？」是台灣很有人情味的問候，意思是「吃飽了嗎？」',
        speech: '第一題。台灣長輩見面常說「呷飽未？」，這句話是在問什麼？有三個選項：第一，問吃飽了沒；第二，問要去哪裡；第三，問現在幾點。'
      },
      {
        id: 'quiz-store',
        question: '早期台灣的「柑仔店」最常賣什麼？',
        options: ['汽車零件', '糖果餅乾與日常用品', '大型家具'],
        answer: 1,
        fact: '柑仔店是早年的雜貨店，糖果、餅乾、醬油和日常用品都買得到。',
        speech: '第二題。早期台灣的柑仔店最常賣什麼？有三個選項：第一，汽車零件；第二，糖果餅乾與日常用品；第三，大型家具。'
      },
      {
        id: 'quiz-banquet',
        question: '台灣傳統的「辦桌」最常出現在哪一種場合？',
        options: ['出國旅行', '上班開會', '婚喪喜慶與廟會'],
        answer: 2,
        fact: '辦桌是台灣很有人情味的宴客方式，婚喪喜慶和廟會都常看到。',
        speech: '第三題。台灣傳統的辦桌，最常出現在哪一種場合？有三個選項：第一，出國旅行；第二，上班開會；第三，婚喪喜慶與廟會。'
      }
    ];

    const SHUTTLE_META = {
      hospital: {
        title: '🏥 往醫院巡迴車',
        shortTitle: '醫院巡迴車',
        route: '福安宮廟口 → 幸福醫院',
        status: '即將進站',
        speech: '往醫院的巡迴車，請在福安宮廟口等候。'
      },
      market: {
        title: '🥬 往傳統市場接駁車',
        shortTitle: '市場接駁車',
        route: '社區活動中心 → 幸福市場',
        status: '下一班',
        speech: '往傳統市場的接駁車，請在社區活動中心前面等候。'
      }
    };

    let audioContext = null;

    function playChime(kind = 'success') {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        if (!audioContext) audioContext = new AudioContextClass();
        if (audioContext.state === 'suspended') audioContext.resume();
        const notes = kind === 'goal'
          ? [523.25, 659.25, 783.99, 1046.5]
          : kind === 'tap'
            ? [659.25]
            : [523.25, 659.25, 783.99];
        const startAt = audioContext.currentTime + 0.02;
        notes.forEach((frequency, index) => {
          const oscillator = audioContext.createOscillator();
          const gain = audioContext.createGain();
          const noteStart = startAt + index * 0.13;
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(frequency, noteStart);
          gain.gain.setValueAtTime(0.0001, noteStart);
          gain.gain.exponentialRampToValueAtTime(0.16, noteStart + 0.025);
          gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.46);
          oscillator.connect(gain);
          gain.connect(audioContext.destination);
          oscillator.start(noteStart);
          oscillator.stop(noteStart + 0.5);
        });
      } catch (error) {
        // 音效不是必要功能，瀏覽器阻擋時仍可完成所有操作。
      }
    }

    function launchConfetti(count = 70) {
      if (reduceMotion) return;
      const host = $('#confettiHost');
      if (!host) return;
      const colors = ['#15803D', '#FEF08A', '#C2410C', '#1D4ED8', '#F472B6', '#FACC15', '#22C55E'];
      for (let index = 0; index < count; index += 1) {
        const piece = document.createElement('span');
        piece.className = 'confetti-piece';
        piece.style.left = `${Math.random() * 100}%`;
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.setProperty('--dx', `${Math.round(Math.random() * 240 - 120)}px`);
        piece.style.animationDelay = `${Math.random() * 0.45}s`;
        piece.style.animationDuration = `${1.8 + Math.random() * 1.2}s`;
        piece.style.width = `${8 + Math.random() * 10}px`;
        piece.style.height = `${12 + Math.random() * 14}px`;
        host.appendChild(piece);
        window.setTimeout(() => piece.remove(), 3400);
      }
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
      }, 3600);
    }

    function updateFontUI() {
      document.body.dataset.mode = 'elder';
      document.documentElement.dataset.font = state.font;
      $$('.font-control [data-font-size]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.fontSize === state.font));
      });
    }

    function setFont(size, announce = true) {
      if (!['large', 'xlarge'].includes(size)) return;
      state.font = size;
      if (window.LohasAPI) window.LohasAPI.setFont(size);
      updateFontUI();
      refreshIcons();
      if (announce) showToast(`字體已切換為${size === 'xlarge' ? '特大' : '大字'}。`);
    }

    function setOfflineNotice(offline) {
      state.offline = Boolean(offline);
      const notice = $('#offlineNotice');
      if (notice) notice.hidden = !state.offline;
      document.body.classList.toggle('is-offline', state.offline);
    }

    function applyServerState(snapshot, options = {}) {
      if (!snapshot || typeof snapshot !== 'object') return;
      const incomingRevision = Number(snapshot.revision) || 0;
      const force = options.force === true || Boolean(snapshot.__offline);
      if (!force && incomingRevision && state.revision && incomingRevision === state.revision) {
        setOfflineNotice(Boolean(snapshot.__offline));
        return;
      }

      state.reminders = Array.isArray(snapshot.reminders) ? snapshot.reminders : [];
      state.photos = Array.isArray(snapshot.photos) ? snapshot.photos : [];
      state.steps = Math.max(0, Number(snapshot.steps) || 0);
      state.goal = Math.max(1, Number(snapshot.goal) || 5000);
      state.coins = Math.max(0, Number(snapshot.coins) || 0);
      state.coinBuffer = Math.max(0, Number(snapshot.coinBuffer) || 0);
      state.goalBonusClaimed = Boolean(snapshot.goalBonusClaimed);
      state.rewards = Array.isArray(snapshot.rewards) ? snapshot.rewards : [];
      state.mealCount = Math.max(0, Number(snapshot.mealCount) || 0);
      state.mealSignedUp = Boolean(snapshot.mealSignedUp);
      state.sosAlerts = Array.isArray(snapshot.sosAlerts) ? snapshot.sosAlerts : [];
      state.helpRequest = snapshot.helpRequest
        || state.sosAlerts.find((alert) => alert && alert.status === 'pending')
        || null;
      state.medBag = snapshot.medBag && Number.isInteger(snapshot.medBag.selected)
        ? { selected: snapshot.medBag.selected }
        : state.medBag;
      state.teaGroups = Array.isArray(snapshot.teaGroups)
        ? snapshot.teaGroups
        : (Array.isArray(snapshot.gatherings) ? snapshot.gatherings : []);
      state.brainQuiz = snapshot.quiz
        ? {
            index: Number.isInteger(snapshot.quiz.index) ? snapshot.quiz.index : 0,
            solved: Array.isArray(snapshot.quiz.solved) ? snapshot.quiz.solved : [],
            lastChoice: Number.isInteger(snapshot.quiz.lastChoice) ? snapshot.quiz.lastChoice : null
          }
        : (snapshot.brainQuiz || state.brainQuiz);
      const incomingShuttles = snapshot.shuttles || {};
      state.shuttles = {
        hospital: {
          eta: Math.max(1, Number(incomingShuttles.hospital && incomingShuttles.hospital.eta) || 5),
          booked: Boolean(incomingShuttles.hospital && incomingShuttles.hospital.booked),
          members: Array.isArray(incomingShuttles.hospital && incomingShuttles.hospital.members)
            ? incomingShuttles.hospital.members
            : []
        },
        market: {
          eta: Math.max(1, Number(incomingShuttles.market && incomingShuttles.market.eta) || 14),
          booked: Boolean(incomingShuttles.market && incomingShuttles.market.booked),
          members: Array.isArray(incomingShuttles.market && incomingShuttles.market.members)
            ? incomingShuttles.market.members
            : []
        }
      };
      state.notices = Array.isArray(snapshot.notices) ? snapshot.notices : [];
      state.revision = incomingRevision || state.revision;
      state.offline = Boolean(snapshot.__offline);
      setOfflineNotice(state.offline);

      if (options.render !== false) renderCurrentView();
    }

    function renderCurrentView() {
      if (state.view === 'home') renderHome();
      if (state.view === 'reminders') renderReminders();
      if (state.view === 'photos') renderPhotos();
      if (state.view === 'health') updateHealthUI();
      if (state.view === 'radio') renderRadio();
      refreshIcons();
    }

    function getVisibleReminders() {
      return state.reminders.filter((reminder) => (
        reminder.group === '全體長輩' || reminder.group === CURRENT_ELDER.group
      ));
    }

    function getPendingCount() {
      return getVisibleReminders().filter((reminder) => !reminder.doneBy.includes(CURRENT_ELDER.name)).length;
    }

    function featureCard({ view, tone, iconName, kicker, title, sub }) {
      return `
        <button type="button" class="feature-card ${tone}" data-nav-view="${view}" aria-label="${esc(title)}，${esc(sub)}">
          <span class="feature-icon">${icon(iconName)}</span>
          <span class="feature-kicker">${esc(kicker)}</span>
          <span class="feature-title">${esc(title)}</span>
          <span class="feature-sub">${esc(sub)}</span>
          <span class="feature-link">點我查看 ${icon('arrow-right')}</span>
        </button>`;
    }

    function renderHome() {
      const container = $('#homeContent');
      if (!container) return;
      const pending = getPendingCount();
      const heroTitle = `${greetingForNow()}，${CURRENT_ELDER.name}！`;
      const heroSub = `今天也要慢慢走、好好吃飯。佳儒留了 ${pending} 件提醒，我們一件一件完成。`;
      const heroStats = `
          <div class="hero-stat"><span class="hero-stat-value">${pending}</span><span class="hero-stat-label">待完成</span></div>
          <div class="hero-stat"><span class="hero-stat-value">${formatNumber(state.steps)}</span><span class="hero-stat-label">步數</span></div>
          <div class="hero-stat"><span class="hero-stat-value">${state.coins}</span><span class="hero-stat-label">金幣</span></div>`;

      container.innerHTML = `
        <div class="hero-panel">
          <div class="hero-inner">
            <span class="hero-date">${icon('calendar-days')}${esc(todayText())}</span>
            <h1 id="homeTitle" class="hero-title" tabindex="-1">${esc(heroTitle)}</h1>
            <p class="hero-sub">${esc(heroSub)}</p>
            <div class="hero-stats">${heroStats}</div>
          </div>
        </div>

        <div class="section-block">
          <div class="section-heading">
            <div>
              <h2 class="section-title">今天想做什麼？</h2>
              <p class="section-desc" style="margin:4px 0 0;">點一下大卡片，就能進入各項功能。</p>
            </div>
          </div>
          <div class="feature-grid">
            ${featureCard({
              view: 'reminders',
              tone: 'feature-green',
              iconName: 'bell-ring',
              kicker: '功能一',
              title: '佳儒的叮嚀',
              sub: `${pending} 件待完成`
            })}
            ${featureCard({
              view: 'photos',
              tone: 'feature-orange',
              iconName: 'camera',
              kicker: '功能二',
              title: '老友照片牆',
              sub: `${state.photos.length} 張照片，向大家說早安`
            })}
            ${featureCard({
              view: 'health',
              tone: 'feature-blue',
              iconName: 'footprints',
              kicker: '功能三',
              title: '健康步數',
              sub: `${formatNumber(state.steps)} / ${formatNumber(state.goal)} 步`
            })}
            ${featureCard({
              view: 'radio',
              tone: 'feature-yellow',
              iconName: 'radio',
              kicker: '功能四',
              title: '社區廣播站',
              sub: state.mealSignedUp ? '共餐已報名，還有在地消息' : `${state.notices.length} 則最新通知`
            })}
          </div>
        </div>

        <div class="tip-card">
          ${icon('lightbulb')}
          <span>覺得字太小嗎？點最上方的「特大」，全站字體會再放大。所有按鈕都很大，慢慢按、不用急。</span>
        </div>
      `;
      refreshIcons();
    }

    function renderReminders() {
      const intro = $('#reminderIntro');
      const elderPanel = $('#elderReminderPanel');
      if (!intro || !elderPanel) return;
      elderPanel.hidden = false;
      intro.textContent = '佳儒今天留了貼心提醒，慢慢來，一件一件完成。';
      renderElderReminders();
      refreshIcons();
    }

    async function triggerSosHelp() {
      const location = '幸福里福安宮前';
      let queued = false;
      try {
        const result = await window.LohasAPI.triggerSos({
          elderName: CURRENT_ELDER.name,
          location
        });
        queued = Boolean(result && result.queued);
        if (result && result.state) applyServerState(result.state, { force: true });
      } catch (error) {
        showToast('求助送出失敗，請直接請旁邊的人幫忙打 119。', 'warn');
        return;
      }

      openModal(`
        <div class="modal-center">
          <div class="success-seal sos">${icon('siren')}</div>
          <p class="eyebrow" style="text-align:center;color:#B91C1C;">求助已送出</p>
          <h2 id="modalTitle" class="section-title">佳儒收到您的求助了</h2>
          <p class="body-text">${queued ? '目前網路不穩，已先記錄您的求助，恢復連線後會立即通知佳儒。' : '已將您的位置（幸福里福安宮前）傳送給佳儒！請在原地稍等。'}</p>
          <div class="sos-location-box">${icon('map-pin')}<span>幸福里福安宮前</span></div>
          <p class="body-text">佳儒會盡快過去找您。若身體很不舒服，也可以請旁邊的人幫忙打 119。</p>
          <button type="button" class="big-btn btn-green" style="width:100%;margin-top:18px;" data-close-modal>我在這裡等佳儒</button>
        </div>`, 'modal-sm');

      speakText(
        `${CURRENT_ELDER.name}，佳儒已經收到您的求助。您的位置在幸福里福安宮前。請在原地稍等，佳儒會盡快過去找您。不要緊張，慢慢呼吸。`,
        '求助已送出'
      );
    }

    function medBagModalContent() {
      const selected = Math.min(Math.max(0, Number(state.medBag.selected) || 0), MED_BAGS.length - 1);
      const med = MED_BAGS[selected];
      return `
        <div class="modal-heading">
          <p class="eyebrow">AI 藥袋辨識（課堂模擬）</p>
          <h2 id="modalTitle" class="section-title">💊 ${esc(med.name)}大字卡</h2>
          <p class="body-text">已把藥袋上的小字變大，也整理成好讀的用藥說明。</p>
        </div>

        <div class="med-switcher" role="group" aria-label="切換慢性病藥袋範例">
          ${MED_BAGS.map((item, index) => `
            <button type="button" class="med-tab" data-med-bag="${index}" aria-pressed="${index === selected}">
              ${esc(item.tabLabel)}
            </button>`).join('')}
        </div>

        <div class="med-sheet">
          <div class="med-sheet-head">
            <div class="med-sheet-icon" aria-hidden="true">${icon('pill')}</div>
            <div>
              <h3 class="med-sheet-title">${esc(med.medicine)}</h3>
              <p class="med-sheet-sub">${esc(med.patient)} · ${esc(med.hospital)}</p>
            </div>
          </div>

          <div class="med-grid">
            <div class="med-item time">
              <span class="med-label">${icon('clock')}服用時間</span>
              <p class="med-value">${esc(med.time)}</p>
            </div>
            <div class="med-item">
              <span class="med-label">${icon('pill')}每次顆數</span>
              <p class="med-value">${esc(med.dose)}</p>
            </div>
            <div class="med-item">
              <span class="med-label">${icon('heart-pulse')}藥物作用</span>
              <p class="med-value">${esc(med.effect)}</p>
            </div>
            <div class="med-item">
              <span class="med-label">${icon('alert-triangle')}副作用注意</span>
              <p class="med-value">${esc(med.sideEffects)}</p>
            </div>
          </div>

          <div class="med-warning">${icon('circle-alert')}<span>${esc(med.warning)}</span></div>
        </div>

        <div class="med-actions">
          <button type="button" class="big-btn btn-blue" data-speak-medbag>🔊 朗讀用藥說明</button>
          <button type="button" class="big-btn btn-white" data-close-modal>關閉</button>
        </div>
        <p class="medbag-note">此為課堂模擬辨識，實際用藥請依照藥袋、藥師與醫師指示。</p>`;
    }

    function openMedBagModal() {
      openModal(medBagModalContent(), 'modal-md');
    }

    function switchMedBag(index) {
      if (!MED_BAGS[index]) return;
      state.medBag.selected = index;
      const content = $('#modalContent');
      const modal = $('#modal');
      if (!content || !modal || modal.hidden) return;
      content.innerHTML = medBagModalContent();
      refreshIcons();
      window.requestAnimationFrame(() => {
        const tab = document.querySelector(`[data-med-bag="${index}"]`);
        if (tab) tab.focus({ preventScroll: true });
      });
    }

    function speakMedBag() {
      const med = MED_BAGS[state.medBag.selected];
      if (!med) return;
      speakText(med.speech, '藥袋用藥說明');
    }

    function renderElderReminders() {
      const container = $('#elderReminderList');
      const count = $('#elderReminderCount');
      if (!container || !count) return;
      const reminders = getVisibleReminders();
      const pending = getPendingCount();
      count.innerHTML = `${icon('bell-ring')}${pending} 件待完成`;

      if (reminders.length === 0) {
        container.innerHTML = `
          <div class="empty-card">
            ${icon('bell-off')}
            <h3>目前沒有提醒</h3>
            <p>佳儒還沒有留下新叮嚀，您可以先到照片牆看看老友。</p>
          </div>`;
        return;
      }

      container.innerHTML = reminders.map((reminder) => {
        const type = TYPE_META[reminder.type] || TYPE_META.other;
        const done = reminder.doneBy.includes(CURRENT_ELDER.name);
        return `
          <article class="reminder-card${done ? ' is-done' : ''}">
            <div class="reminder-head">
              <div class="reminder-icon" style="background:${type.background};color:${type.color};" aria-hidden="true">
                ${icon(type.icon)}
              </div>
              <div class="reminder-content">
                <div class="pill-row">
                  <span class="time-pill">${icon('clock')}${esc(formatTime(reminder.time))}</span>
                  <span class="group-pill">${esc(reminder.group)}</span>
                  ${done ? `<span class="done-pill">${icon('badge-check')}已回報</span>` : ''}
                </div>
                <h3 class="reminder-title">${esc(reminder.content)}</h3>
                <p class="reminder-note">${esc(reminder.note)}</p>
              </div>
            </div>
            <div class="reminder-actions">
              <button type="button" class="big-btn btn-blue" data-speak-reminder="${esc(reminder.id)}">
                ${icon('volume-2')}聽佳儒語音
              </button>
              <button type="button" class="big-btn ${done ? 'btn-done' : 'btn-green'}" data-complete-reminder="${esc(reminder.id)}" aria-pressed="${done}">
                ${icon(done ? 'badge-check' : 'check')}${done ? '已回報給佳儒！' : '我做完了'}
              </button>
            </div>
          </article>`;
      }).join('');
    }

    async function markReminderDone(reminderId) {
      const reminder = state.reminders.find((item) => item.id === reminderId);
      if (!reminder) return;
      if (reminder.doneBy.includes(CURRENT_ELDER.name)) {
        showToast('這件提醒您已經回報給佳儒了，做得很好！');
        return;
      }
      try {
        const result = await window.LohasAPI.completeReminder(reminderId, CURRENT_ELDER.name);
        if (result && result.state) applyServerState(result.state, { force: true });
      } catch (error) {
        showToast('回報失敗，請稍後再試一次。', 'warn');
        return;
      }
      playChime('success');
      launchConfetti(44);
      showToast('太棒了！已回報給佳儒，您今天真用心！');
      if (state.view === 'reminders') {
        window.requestAnimationFrame(() => {
          const doneButton = document.querySelector(`[data-complete-reminder="${reminderId}"]`);
          if (doneButton) doneButton.focus({ preventScroll: true });
        });
      }
    }

    function renderPhotos() {
      renderSamplePhotos();
      renderTeaGroups();
      renderPhotoWall();
    }

    function renderTeaGroups() {
      const container = $('#teaGroupList');
      if (!container) return;
      container.innerHTML = state.teaGroups.map((group) => {
        const joined = group.members.includes(CURRENT_ELDER.name);
        const count = group.members.length;
        return `
          <article class="tea-card">
            <div class="tea-host">
              <div class="tea-avatar" aria-hidden="true">${esc(group.host.slice(0, 1))}</div>
              <div class="tea-host-copy">
                <p class="tea-host-name">${esc(group.host)} 揪團</p>
                <p class="tea-host-role">${icon('map-pin')}${esc(group.place)}</p>
              </div>
              <span class="tea-count">${icon('users')}${count} 人</span>
            </div>
            <h3 class="tea-activity">${esc(group.activity)}</h3>
            <p class="tea-meta">${icon('clock')}${esc(group.time)} · ${esc(group.note)}</p>
            <div class="tea-members" aria-label="目前已參加名單">
              ${group.members.map((name) => `<span class="tea-chip">${icon('user-round')}${esc(name)}</span>`).join('')}
            </div>
            <button type="button" class="big-btn ${joined ? 'btn-done' : 'btn-green'}" data-join-tea="${esc(group.id)}" aria-pressed="${joined}" ${joined ? 'disabled' : ''}>
              ${joined ? `${icon('badge-check')}已加入，當天見` : '🙋‍♂️ 我也要去'}
            </button>
            ${joined ? `<p class="signed-note">${icon('circle-check')}${CURRENT_ELDER.name}已加入，作伙出門不孤單。</p>` : ''}
          </article>`;
      }).join('');
      refreshIcons();
    }

    async function joinTeaGroup(groupId) {
      const group = state.teaGroups.find((item) => item.id === groupId);
      if (!group) return;
      if (group.members.includes(CURRENT_ELDER.name)) {
        showToast('您已經加入這個揪團了，當天見！');
        return;
      }
      try {
        const result = await window.LohasAPI.joinGathering(groupId, CURRENT_ELDER.name);
        if (result && result.state) applyServerState(result.state, { force: true });
      } catch (error) {
        showToast('加入失敗，請稍後再試一次。', 'warn');
        return;
      }
      playChime('success');
      showToast(`已加入${group.host}的揪團！${group.time}，${group.place}見。`);
    }

    function renderSamplePhotos() {
      const container = $('#samplePhotos');
      if (!container) return;
      container.innerHTML = SAMPLE_META.map((sample) => `
        <button type="button" class="sample-btn" data-sample-key="${sample.key}" aria-label="選擇${esc(sample.title)}照片來製作早安圖">
          <img src="${SAMPLE_IMAGES[sample.key]}" alt="${esc(sample.title)}範例照片" />
          <span class="sample-btn-text">
            <strong>${esc(sample.title)}</strong>
            <span>${icon('sparkles')}${esc(sample.note)}</span>
          </span>
        </button>`).join('');
      refreshIcons();
    }

    function renderPhotoWall() {
      const container = $('#photoWall');
      const count = $('#photoCount');
      if (!container || !count) return;
      count.innerHTML = `${icon('images')}${state.photos.length} 張`;
      if (state.photos.length === 0) {
        container.innerHTML = `
          <div class="empty-card">
            ${icon('images')}
            <h3>照片牆還空空的</h3>
            <p>拍一張照片，加上祝福語，成為第一位分享的長輩。</p>
          </div>`;
        return;
      }
      container.innerHTML = state.photos.map((photo) => `
        <article class="photo-card" data-photo-card="${esc(photo.id)}">
          <div class="photo-media">
            <img src="${photo.image}" alt="${esc(photo.author)}分享的早安圖，祝福語：${esc(photo.title)}" />
            <div class="blessing-overlay">${esc(photo.title)}</div>
          </div>
          <div class="photo-body">
            <div class="photo-meta">
              <span class="photo-author">${icon('user-round')}${esc(photo.author)}</span>
              <span class="photo-time">${esc(photo.time)}</span>
            </div>
            <div class="photo-actions">
              <button type="button" class="big-btn btn-yellow record-btn" data-record-hold="${esc(photo.id)}" aria-label="${esc(photo.author)}的照片，按住麥克風錄音介紹">
                ${icon('mic')}<span class="record-label">${photo.hasVoice ? '按住可重錄' : '按住錄音介紹'}</span>
              </button>
              <button type="button" class="big-btn btn-blue" data-speak-photo="${esc(photo.id)}">
                ${icon('volume-2')}聽老友聲音
              </button>
              <button type="button" class="big-btn like-btn${photo.liked ? ' liked' : ''}" data-like-photo="${esc(photo.id)}" aria-pressed="${photo.liked}" aria-label="給${esc(photo.author)}一個讚，目前${photo.likes}個讚">
                ${icon('heart')}<span>讚</span><span class="like-count">${photo.likes}</span>
              </button>
            </div>
          </div>
        </article>`).join('');
      refreshIcons();
    }

    async function togglePhotoLike(photoId) {
      const photo = state.photos.find((item) => item.id === photoId);
      if (!photo) return;
      let result;
      try {
        result = await window.LohasAPI.likePhoto(photoId);
        if (result && result.state) applyServerState(result.state, { force: true });
      } catch (error) {
        showToast('按讚失敗，請稍後再試一次。', 'warn');
        return;
      }
      const updated = state.photos.find((item) => item.id === photoId) || photo;
      window.requestAnimationFrame(() => {
        const card = document.querySelector(`[data-photo-card="${photoId}"]`);
        const heart = card ? card.querySelector('.like-btn svg') : null;
        if (updated.liked && heart) heart.classList.add('heart-pop');
      });
      if (updated.liked) {
        playChime('tap');
        showToast(`已送出愛心讚給${updated.author}！`);
      } else {
        showToast('已取消讚。');
      }
    }

    let photoDraft = null;
    let recordingState = null;

    function openComposer(imageSrc) {
      if (!imageSrc) return;
      photoDraft = { image: imageSrc, blessing: '平安喜樂' };
      const content = `
        <div class="modal-heading">
          <p class="eyebrow">早安圖合成器</p>
          <h2 id="modalTitle" class="section-title">加上一句祝福</h2>
          <p class="body-text muted">選一句喜歡的祝福，會直接壓在照片上。</p>
        </div>
        <div class="composer-preview">
          <img id="composerImage" src="${imageSrc}" alt="要分享的照片預覽" />
          <div id="blessingOverlay" class="blessing-overlay">${esc(photoDraft.blessing)}</div>
        </div>
        <h3 class="section-title" style="font-size:var(--fs-btn-lg);margin:0 0 2px;">選一句祝福</h3>
        <div class="blessing-choice-grid" role="group" aria-label="選擇早安圖祝福語">
          ${['平安喜樂', '早安吉祥', '身體健康'].map((text) => `
            <button type="button" class="blessing-choice" data-blessing="${text}" aria-pressed="${text === photoDraft.blessing}">${text}</button>
          `).join('')}
        </div>
        <div class="composer-actions">
          <button type="button" class="big-btn btn-yellow" data-open-photo-picker>${icon('refresh-cw')}換一張照片</button>
          <button type="button" class="big-btn btn-green" data-publish-photo>${icon('send')}發布到照片牆</button>
        </div>`;
      openModal(content, 'modal-lg');
    }

    function chooseBlessing(text) {
      if (!photoDraft) return;
      photoDraft.blessing = text;
      const overlay = $('#blessingOverlay');
      if (overlay) overlay.textContent = text;
      $$('.blessing-choice').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.blessing === text));
      });
      playChime('tap');
    }

    async function publishPhoto() {
      if (!photoDraft) return;
      const draft = { ...photoDraft };
      try {
        const result = await window.LohasAPI.createPhoto({
          author: CURRENT_ELDER.name,
          title: draft.blessing,
          image: draft.image
        });
        if (result && result.state) applyServerState(result.state, { force: true });
      } catch (error) {
        showToast('照片發布失敗，請稍後再試一次。', 'warn');
        return;
      }
      photoDraft = null;
      closeModal();
      navigate('photos');
      playChime('success');
      launchConfetti(55);
      showToast('早安圖已發布！等老友來按讚、聽您的介紹。');
    }

    function startRecording(photoId, button) {
      if (recordingState) finishRecording(true);
      const photo = state.photos.find((item) => item.id === photoId);
      if (!photo || !button) return;
      const label = button.querySelector('.record-label');
      recordingState = {
        photoId,
        button,
        label,
        startedAt: Date.now(),
        intervalId: null
      };
      button.classList.add('recording');
      button.setAttribute('aria-pressed', 'true');
      if (label) label.textContent = '錄音中 0.0 秒';
      if (navigator.vibrate) navigator.vibrate(40);
      recordingState.intervalId = window.setInterval(() => {
        if (!recordingState || !recordingState.label) return;
        const seconds = ((Date.now() - recordingState.startedAt) / 1000).toFixed(1);
        recordingState.label.textContent = `錄音中 ${seconds} 秒`;
      }, 160);
    }

    async function finishRecording(cancelled = false) {
      if (!recordingState) return;
      const active = recordingState;
      recordingState = null;
      window.clearInterval(active.intervalId);
      const duration = Date.now() - active.startedAt;
      if (active.button) {
        active.button.classList.remove('recording');
        active.button.setAttribute('aria-pressed', 'false');
      }
      if (cancelled) {
        renderPhotoWall();
        return;
      }
      if (duration < 600) {
        showToast('請按住麥克風久一點，再放開喔！', 'warn');
        renderPhotoWall();
        return;
      }
      const photo = state.photos.find((item) => item.id === active.photoId);
      if (!photo) return;
      const voiceText = `這是${photo.author}的介紹。${photo.title}！希望大家平安健康，有空來幸福里社區走走。`;
      try {
        const result = await window.LohasAPI.savePhotoVoice(photo.id, voiceText);
        if (result && result.state) applyServerState(result.state, { force: true });
      } catch (error) {
        showToast('語音儲存失敗，請稍後再試一次。', 'warn');
        return;
      }
      playChime('success');
      showToast(`已錄下 ${(duration / 1000).toFixed(1)} 秒語音介紹，可以按「聽老友聲音」播放。`);
    }

    function updateHealthUI() {
      const stepsValue = $('#stepsValue');
      if (!stepsValue) return;
      const rawPercent = (state.steps / state.goal) * 100;
      const percent = Math.min(100, Math.round(rawPercent));
      const remaining = Math.max(0, state.goal - state.steps);
      const achieved = state.steps >= state.goal;
      const message = achieved
        ? '今天目標達成了！您真棒，記得補充水分、休息一下。'
        : remaining <= 500
          ? `只剩 ${formatNumber(remaining)} 步，就達成今天的目標了！`
          : `再走 ${formatNumber(remaining)} 步，就能達成今天的目標！`;

      stepsValue.textContent = formatNumber(state.steps);
      $('#stepsBar').style.width = `${Math.min(100, rawPercent)}%`;
      $('#stepsBar').classList.toggle('goal', achieved);
      $('#stepsPercent').textContent = `${percent}%`;
      $('#coinsValue').textContent = String(state.coins);
      $('#stepsMessage').textContent = message;
      const progress = $('#stepsProgress');
      progress.setAttribute('aria-valuenow', String(Math.min(state.steps, state.goal)));
      progress.setAttribute('aria-valuetext', `今日已走 ${formatNumber(state.steps)} 步，目標 ${formatNumber(state.goal)} 步，完成 ${percent}%`);
      $('#goalBanner').hidden = !state.goalBonusClaimed;

      const timerButton = $('#timerBtn');
      if (state.timer.running) {
        timerButton.innerHTML = `${icon('pause')}暫停計時`;
        $('#timerStatus').textContent = '運動計時中，每 5 秒自動加 20 步';
      } else if (state.timer.seconds > 0) {
        timerButton.innerHTML = `${icon('play')}繼續計時`;
        $('#timerStatus').textContent = `已暫停，目前運動 ${formatDuration(state.timer.seconds)}`;
      } else {
        timerButton.innerHTML = `${icon('timer')}運動計時開始`;
        $('#timerStatus').textContent = '計時器尚未開始';
      }
      $('#timerDisplay').textContent = formatDuration(state.timer.seconds);
      const balance = $('#rewardCoinBalance');
      if (balance) balance.innerHTML = `${icon('coins')}${state.coins} 枚`;
      renderRewards();
      renderBrainQuiz();
      refreshIcons();
    }

    function renderBrainQuiz() {
      const container = $('#brainQuizContent');
      if (!container) return;
      const question = QUIZ_QUESTIONS[state.brainQuiz.index];
      if (!question) return;

      const solved = state.brainQuiz.solved.includes(question.id);
      const selected = state.brainQuiz.lastChoice;
      const allSolved = state.brainQuiz.solved.length === QUIZ_QUESTIONS.length;
      const feedback = solved
        ? `答對了！${question.fact}`
        : selected !== null
          ? '這個答案不對喔，再想一下，答對就送 10 枚金幣。'
          : '選一個答案，答對就送 10 枚金幣。';
      const feedbackTone = solved ? 'success' : selected !== null ? 'warn' : '';
      const feedbackIcon = solved ? 'circle-check' : selected !== null ? 'circle-alert' : 'lightbulb';

      container.innerHTML = `
        <div class="brain-head">
          <div class="brain-icon" aria-hidden="true">${icon('brain')}</div>
          <div class="brain-copy">
            <h2 id="brainTitle" class="brain-title">🧠 每日動動腦</h2>
            <p class="brain-sub">答對送 10 枚金幣，動動腦也能賺好康。</p>
          </div>
          <span class="count-pill">${icon('badge-check')}已答對 ${state.brainQuiz.solved.length} / ${QUIZ_QUESTIONS.length}</span>
        </div>

        <div class="quiz-progress">
          <span class="quiz-index">第 ${state.brainQuiz.index + 1} / ${QUIZ_QUESTIONS.length} 題</span>
          <div class="quiz-dots" aria-hidden="true">
            ${QUIZ_QUESTIONS.map((item, index) => {
              const dotClass = state.brainQuiz.solved.includes(item.id) ? 'done' : '';
              return `<span class="quiz-dot ${dotClass}${index === state.brainQuiz.index ? ' current' : ''}"></span>`;
            }).join('')}
          </div>
        </div>

        <p id="quizQuestion" class="quiz-question" tabindex="-1">${esc(question.question)}</p>

        <div class="quiz-options" role="group" aria-label="答案選項">
          ${question.options.map((option, index) => {
            const isCorrect = solved && index === question.answer;
            const isWrong = !solved && selected === index && index !== question.answer;
            return `
              <button type="button" class="quiz-option${isCorrect ? ' is-correct' : ''}${isWrong ? ' is-wrong' : ''}" data-quiz-option="${index}" ${solved ? 'disabled' : ''} aria-label="選項 ${index + 1}：${esc(option)}">
                <span class="quiz-letter" aria-hidden="true">${['A', 'B', 'C'][index]}</span>
                <span>${esc(option)}</span>
              </button>`;
          }).join('')}
        </div>

        <p class="quiz-feedback ${feedbackTone}" role="status" aria-live="polite">
          ${icon(feedbackIcon)}<span>${esc(feedback)}</span>
        </p>

        <div class="quiz-actions">
          <button type="button" class="big-btn btn-blue" data-speak-quiz>🔊 聽題目</button>
          <button type="button" class="big-btn btn-yellow" data-next-quiz>下一題 ${icon('arrow-right')}</button>
        </div>

        ${allSolved ? `<p class="quiz-complete">${icon('trophy')}<span>今天 ${QUIZ_QUESTIONS.length} 題都答對了！共獲得 ${QUIZ_QUESTIONS.length * 10} 枚金幣，明天再來動動腦。</span></p>` : ''}
      `;
      refreshIcons();
    }

    async function answerQuiz(optionIndex) {
      const question = QUIZ_QUESTIONS[state.brainQuiz.index];
      if (!question || state.brainQuiz.solved.includes(question.id)) return;
      let result;
      try {
        result = await window.LohasAPI.answerQuiz(question.id, optionIndex);
        if (result && result.state) applyServerState(result.state, { force: true });
      } catch (error) {
        showToast('答案送出失敗，請稍後再試一次。', 'warn');
        return;
      }

      if (result && result.correct) {
        playChime('goal');
        launchConfetti(90);
        showToast(result.awarded > 0 ? '答對了！獲得 10 枚樂活金幣。' : '答對了！這題已經領過金幣了。');
        window.requestAnimationFrame(() => {
          const nextButton = document.querySelector('[data-next-quiz]');
          if (nextButton) nextButton.focus({ preventScroll: true });
        });
      } else {
        playChime('tap');
        showToast('再想一想，答對就送 10 枚金幣。', 'warn');
        window.requestAnimationFrame(() => {
          const wrongOption = document.querySelector(`[data-quiz-option="${optionIndex}"]`);
          if (wrongOption) wrongOption.focus({ preventScroll: true });
        });
      }
    }

    async function nextQuizQuestion() {
      const nextIndex = (state.brainQuiz.index + 1) % QUIZ_QUESTIONS.length;
      try {
        const result = await window.LohasAPI.nextQuiz(nextIndex);
        if (result && result.state) applyServerState(result.state, { force: true });
      } catch (error) {
        state.brainQuiz.index = nextIndex;
        state.brainQuiz.lastChoice = null;
        renderBrainQuiz();
      }
      playChime('tap');
      window.requestAnimationFrame(() => {
        const question = $('#quizQuestion');
        if (question) question.focus({ preventScroll: true });
      });
    }

    function speakQuizQuestion() {
      const question = QUIZ_QUESTIONS[state.brainQuiz.index];
      if (!question) return;
      speakText(question.speech, '每日動動腦');
    }

    let stepsRequestPending = false;

    async function addSteps(amount, options = {}) {
      const safeAmount = Math.max(0, Number(amount) || 0);
      if (safeAmount === 0 || stepsRequestPending) return;
      stepsRequestPending = true;
      let result;
      try {
        result = await window.LohasAPI.addSteps(safeAmount);
        if (result && result.state) applyServerState(result.state, { force: true });
      } catch (error) {
        showToast('步數更新失敗，請稍後再試一次。', 'warn');
        return;
      } finally {
        stepsRequestPending = false;
      }

      const earnedCoins = Number(result && result.earnedCoins) || 0;
      const goalBonus = Number(result && result.goalBonus) || 0;

      if (goalBonus > 0) {
        if (state.timer.running) pauseExerciseTimer(false);
        playChime('goal');
        launchConfetti(110);
        openGoalModal(goalBonus);
        return;
      }

      if (!options.silent) {
        const rewardText = earnedCoins > 0 ? ` 獲得 ${earnedCoins} 枚樂活金幣！` : '';
        const offlineText = result && result.offline ? '（離線暫存，連線後同步）' : '';
        showToast(`走了 ${formatNumber(safeAmount)} 步！${rewardText}${offlineText}`.trim());
        if (earnedCoins > 0) playChime('success');
        else playChime('tap');
      }
    }

    function toggleExerciseTimer() {
      if (state.timer.running) {
        pauseExerciseTimer(true);
      } else {
        startExerciseTimer();
      }
    }

    function startExerciseTimer() {
      if (state.timer.running) return;
      state.timer.running = true;
      if (state.timer.intervalId) window.clearInterval(state.timer.intervalId);
      state.timer.intervalId = window.setInterval(() => {
        if (!state.timer.running) return;
        state.timer.seconds += 1;
        $('#timerDisplay').textContent = formatDuration(state.timer.seconds);
        if (state.timer.seconds % 5 === 0) addSteps(20, { fromTimer: true, silent: true });
      }, 1000);
      updateHealthUI();
      playChime('tap');
      showToast('運動計時開始！每 5 秒會自動加 20 步。');
    }

    function pauseExerciseTimer(announce = true) {
      state.timer.running = false;
      if (state.timer.intervalId) {
        window.clearInterval(state.timer.intervalId);
        state.timer.intervalId = null;
      }
      updateHealthUI();
      if (announce) showToast('運動計時已暫停，休息一下再繼續。');
    }

    function renderRewards() {
      const container = $('#rewardsGrid');
      if (!container) return;
      container.innerHTML = state.rewards.map((reward) => {
        const affordable = state.coins >= reward.cost;
        const cta = reward.redeemed
          ? '已兌換，查看憑證'
          : affordable
            ? '點我兌換'
            : `還差 ${reward.cost - state.coins} 點`;
        return `
          <button type="button" class="reward-card${reward.redeemed ? ' redeemed' : ''}" data-reward-id="${esc(reward.id)}" aria-label="${esc(reward.title)}，需要${reward.cost}枚樂活金幣，${esc(cta)}">
            <span class="reward-head">
              <span class="reward-icon">${icon(reward.icon)}</span>
              <span class="coin-pill">${icon('coins')}${reward.cost} 點</span>
            </span>
            <span class="reward-title">${esc(reward.title)}</span>
            <span class="reward-desc">${esc(reward.description)}</span>
            <span class="reward-location">${icon('map-pin')}${esc(reward.location)}</span>
            <span class="reward-cta">${esc(cta)} ${icon('chevron-right')}</span>
          </button>`;
      }).join('');
      refreshIcons();
    }

    function openVoucher(reward, isNew) {
      const content = `
        <div class="modal-center">
          <div class="success-seal${isNew ? '' : ' gold'}">${icon(isNew ? 'ticket-check' : 'ticket')}</div>
          <p class="eyebrow" style="text-align:center;">${isNew ? '兌換成功' : '已兌換憑證'}</p>
          <h2 id="modalTitle" class="section-title">${esc(reward.title)}</h2>
          <p class="body-text">請出示下方兌換編號給店家或社區志工查看。</p>
          <div class="voucher-box">
            <span class="voucher-label">兌換編號</span>
            <span class="voucher-code">${esc(reward.voucherCode)}</span>
          </div>
          <div class="voucher-info" style="text-align:left;">
            <div class="voucher-info-row">${icon('map-pin')}<span>兌換地點：${esc(reward.location)}</span></div>
            <div class="voucher-info-row">${icon('calendar-days')}<span>有效期限：${esc(reward.expiry)}</span></div>
            <div class="voucher-info-row">${icon('badge-check')}<span>已扣抵 ${reward.cost} 枚樂活金幣</span></div>
          </div>
          <button type="button" class="big-btn btn-green" style="width:100%;" data-close-modal>完成，謝謝</button>
        </div>`;
      openModal(content, 'modal-sm');
    }

    function openInsufficientCoinsModal(reward, coins) {
      const shortage = Math.max(0, reward.cost - coins);
      openModal(`
        <div class="modal-center">
          <div class="success-seal orange">${icon('coins')}</div>
          <h2 id="modalTitle" class="section-title">樂活金幣還不夠</h2>
          <p class="body-text">這項獎勵需要 <strong>${reward.cost} 點</strong>，您目前有 <strong>${coins} 點</strong>，還差 <strong>${shortage} 點</strong>。</p>
          <p class="body-text">按一下「模擬走路」或開始運動計時，就能繼續累積步數與金幣。</p>
          <button type="button" class="big-btn btn-green" style="width:100%;margin-top:18px;" data-close-modal>我知道了</button>
        </div>`, 'modal-sm');
      playChime('tap');
    }

    async function redeemReward(rewardId) {
      const reward = state.rewards.find((item) => item.id === rewardId);
      if (!reward) return;
      if (reward.redeemed) {
        openVoucher(reward, false);
        return;
      }
      if (state.coins < reward.cost) {
        openInsufficientCoinsModal(reward, state.coins);
        return;
      }

      let result;
      try {
        result = await window.LohasAPI.redeemReward(rewardId);
        if (result && result.state) applyServerState(result.state, { force: true });
      } catch (error) {
        showToast('兌換失敗，請稍後再試一次。', 'warn');
        return;
      }

      if (result && result.ok === false && result.reason === 'insufficient') {
        openInsufficientCoinsModal(result.reward || reward, state.coins);
        return;
      }

      const updated = state.rewards.find((item) => item.id === rewardId) || reward;
      playChime('success');
      launchConfetti(55);
      openVoucher(updated, !(result && result.alreadyRedeemed));
    }

    function openGoalModal(bonusCoins) {
      openModal(`
        <div class="modal-center">
          <div class="success-seal gold">${icon('trophy')}</div>
          <p class="eyebrow" style="text-align:center;">今日目標達成</p>
          <h2 id="modalTitle" class="section-title">太棒了！您走了 ${formatNumber(state.steps)} 步</h2>
          <p class="body-text">一步一步累積，就是最實在的健康。今天已經達成 ${formatNumber(state.goal)} 步目標！</p>
          <div class="coin-big">+${bonusCoins}<span>樂活金幣</span></div>
          <p class="body-text">可以到下方的在地好康區，兌換幸福里的專屬獎勵。</p>
          <button type="button" class="big-btn btn-green" style="width:100%;margin-top:18px;" data-close-modal>繼續保持好體力</button>
        </div>`, 'modal-sm');
    }

    function renderRadio() {
      const container = $('#radioContent');
      if (!container) return;
      container.innerHTML = `
        <div class="radio-hero">
          <div class="radio-hero-icon" aria-hidden="true">${icon('megaphone')}</div>
          <div>
            <h2>里長伯的社區廣播</h2>
            <p>所有通知都可以用聽的，點藍色按鈕就能播放語音。</p>
          </div>
        </div>
        <div class="notice-list">
          ${state.notices.map((notice) => {
            const isMeal = notice.id === 'meal';
            return `
              <article class="notice-card">
                <div class="notice-head">
                  <div class="notice-icon" style="${isMeal ? 'background:#FFEDD5;color:#9A3412;' : notice.id === 'fraud' ? 'background:#FEF9C3;color:#854D0E;' : ''}" aria-hidden="true">${icon(notice.icon)}</div>
                  <div class="notice-copy">
                    <div class="notice-meta-row">
                      <span class="notice-category">${esc(notice.category)}</span>
                      <span class="notice-meta">${esc(notice.meta)}</span>
                    </div>
                    <h2 class="notice-title">${esc(notice.title)}</h2>
                    <p class="notice-body">${esc(notice.body)}</p>
                    ${isMeal ? `<span class="meal-count">${icon('users')}目前已報名 ${state.mealCount} 位長輩</span>` : ''}
                  </div>
                </div>
                <div class="notice-actions">
                  <button type="button" class="big-btn btn-blue" data-speak-notice="${esc(notice.id)}">${icon('volume-2')}點擊聽廣播</button>
                  ${isMeal ? `<button type="button" class="big-btn ${state.mealSignedUp ? 'btn-done' : 'btn-green'}" data-meal-signup>${icon(state.mealSignedUp ? 'badge-check' : 'hand-heart')}${state.mealSignedUp ? '已完成共餐報名' : '我要報名共餐'}</button>` : ''}
                </div>
                ${isMeal && state.mealSignedUp ? `<div class="signed-note">${icon('circle-check')}${CURRENT_ELDER.name}已報名，每週五中午 11:30 活動中心見。</div>` : ''}
              </article>`;
          }).join('')}
        </div>`;
      renderShuttles();
      refreshIcons();
    }

    function renderShuttles() {
      const container = $('#shuttleCards');
      if (!container) return;
      const shuttleKeys = ['hospital', 'market'];

      container.innerHTML = shuttleKeys.map((key) => {
        const meta = SHUTTLE_META[key];
        const shuttle = state.shuttles[key];
        if (!meta || !shuttle) return '';
        const booked = Boolean(shuttle.booked);
        return `
          <article class="shuttle-card">
            <div class="shuttle-top">
              <div class="shuttle-icon" aria-hidden="true">${icon(key === 'hospital' ? 'hospital' : 'shopping-basket')}</div>
              <div class="shuttle-card-copy">
                <h3 class="shuttle-card-title">${esc(meta.title)}</h3>
                <p class="shuttle-route">${icon('map-pin')}${esc(meta.route)}</p>
              </div>
            </div>

            <div class="shuttle-eta" aria-label="${esc(meta.status)}，約 ${shuttle.eta} 分鐘">
              <span class="shuttle-eta-label">${esc(meta.status)}</span>
              <span class="shuttle-eta-value">約 ${shuttle.eta} <small>分鐘</small></span>
            </div>

            <div class="shuttle-actions">
              <button type="button" class="big-btn btn-blue" data-speak-shuttle="${key}">🔊 聽到站時間</button>
              <button type="button" class="big-btn ${booked ? 'btn-done' : 'btn-green'}" data-book-shuttle="${key}" aria-pressed="${booked}" aria-label="${booked ? `已為${CURRENT_ELDER.name}保留座位，再按一次可取消` : `預約明日的${meta.shortTitle}座位`}">
                ${booked ? `✅ 已為${CURRENT_ELDER.name}保留座位` : '🙋 預約明日座位'}
              </button>
            </div>

            ${booked ? `<p class="signed-note">${icon('circle-check')}已為${CURRENT_ELDER.name}保留明日座位，再按一次可取消。</p>` : ''}
          </article>`;
      }).join('');
      refreshIcons();
    }

    function speakShuttle(key) {
      const meta = SHUTTLE_META[key];
      const shuttle = state.shuttles[key];
      if (!meta || !shuttle) return;
      speakText(`${meta.speech}大約 ${shuttle.eta} 分鐘後到站。`, `接駁車｜${meta.shortTitle}`);
    }

    async function toggleShuttleBooking(key) {
      const meta = SHUTTLE_META[key];
      const shuttle = state.shuttles[key];
      if (!meta || !shuttle) return;
      try {
        const result = await window.LohasAPI.toggleShuttle(key, CURRENT_ELDER.name);
        if (result && result.state) applyServerState(result.state, { force: true });
      } catch (error) {
        showToast('接駁車預約更新失敗，請稍後再試一次。', 'warn');
        return;
      }
      if (state.shuttles[key] && state.shuttles[key].booked) {
        playChime('success');
        showToast(`已為${CURRENT_ELDER.name}保留明日的${meta.shortTitle}座位。`);
      } else {
        playChime('tap');
        showToast('已取消明日的接駁車座位。', 'warn');
      }
    }

    async function signUpForMeal() {
      if (state.mealSignedUp) {
        openMealModal(false);
        return;
      }
      try {
        const result = await window.LohasAPI.signUpMeal(CURRENT_ELDER.name);
        if (result && result.state) applyServerState(result.state, { force: true });
      } catch (error) {
        showToast('共餐報名失敗，請稍後再試一次。', 'warn');
        return;
      }
      playChime('success');
      launchConfetti(60);
      openMealModal(true);
      showToast('共餐報名成功！已幫您留下一個位置。');
    }

    function openMealModal(isNew) {
      openModal(`
        <div class="modal-center">
          <div class="success-seal${isNew ? '' : ' gold'}">${icon(isNew ? 'badge-check' : 'utensils')}</div>
          <p class="eyebrow" style="text-align:center;">${isNew ? '報名成功' : '共餐報名資訊'}</p>
          <h2 id="modalTitle" class="section-title">${isNew ? '歡迎作伙來吃飯！' : '您已完成共餐報名'}</h2>
          <p class="body-text">${isNew ? `${CURRENT_ELDER.name}，社區已經幫您保留位置。` : '社區志工已經把您的名字記下來了。'}</p>
          <div class="voucher-info" style="text-align:left;margin-top:20px;">
            <div class="voucher-info-row">${icon('calendar-days')}<span>時間：每週五中午 11:30</span></div>
            <div class="voucher-info-row">${icon('map-pin')}<span>地點：幸福里社區活動中心</span></div>
            <div class="voucher-info-row">${icon('utensils')}<span>菜色：滷肉飯、排骨湯、時令青菜</span></div>
            <div class="voucher-info-row">${icon('users')}<span>目前共 ${state.mealCount} 位長輩報名</span></div>
          </div>
          <button type="button" class="big-btn btn-green" style="width:100%;" data-close-modal>太好了</button>
        </div>`, 'modal-sm');
    }

    let currentSpeech = null;
    let lastFocusedElement = null;

    function getChineseVoice() {
      if (!('speechSynthesis' in window)) return null;
      const voices = window.speechSynthesis.getVoices();
      return voices.find((voice) => /^zh[-_]TW/i.test(voice.lang))
        || voices.find((voice) => /^zh/i.test(voice.lang))
        || null;
    }

    function showSpeechBar(label) {
      const bar = $('#speechBar');
      const labelElement = $('#speechBarLabel');
      if (!bar || !labelElement) return;
      labelElement.textContent = `正在播放：${label}`;
      bar.hidden = false;
      document.body.classList.add('is-speaking');
    }

    function hideSpeechBar() {
      const bar = $('#speechBar');
      if (bar) bar.hidden = true;
      document.body.classList.remove('is-speaking');
    }

    function stopSpeech() {
      currentSpeech = null;
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      hideSpeechBar();
    }

    function speakText(text, label = '語音') {
      if (!('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance !== 'function') {
        showToast('這個瀏覽器不支援語音朗讀，請使用 Chrome、Edge 或 Safari。', 'warn');
        return;
      }
      if (!text) {
        showToast('目前沒有可以朗讀的內容。', 'warn');
        return;
      }
      stopSpeech();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-TW';
      utterance.rate = 0.82;
      utterance.pitch = 1;
      utterance.volume = 1;
      const voice = getChineseVoice();
      if (voice) utterance.voice = voice;
      currentSpeech = utterance;
      utterance.onend = () => {
        if (currentSpeech === utterance) {
          currentSpeech = null;
          hideSpeechBar();
        }
      };
      utterance.onerror = (event) => {
        if (currentSpeech !== utterance) return;
        currentSpeech = null;
        hideSpeechBar();
        if (!['interrupted', 'canceled'].includes(event.error)) {
          showToast('語音播放中斷，請再點一次按鈕。', 'warn');
        }
      };
      showSpeechBar(label);
      window.speechSynthesis.speak(utterance);
      playChime('tap');
    }

    function speakReminder(reminderId) {
      const reminder = state.reminders.find((item) => item.id === reminderId);
      if (!reminder) return;
      speakText(reminder.speech, '佳儒的叮嚀');
    }

    function speakPhoto(photoId) {
      const photo = state.photos.find((item) => item.id === photoId);
      if (!photo) return;
      if (!photo.hasVoice || !photo.voiceText) {
        showToast('這張照片還沒有語音介紹，先按住「錄音介紹」說幾句話吧！', 'warn');
        return;
      }
      speakText(photo.voiceText, `${photo.author}的語音介紹`);
    }

    function speakNotice(noticeId) {
      const notice = state.notices.find((item) => item.id === noticeId);
      if (!notice) return;
      speakText(notice.speech, `社區廣播｜${notice.title}`);
    }

    function openModal(content, size = 'modal-md') {
      const modal = $('#modal');
      const modalCard = $('#modalCard');
      const modalContent = $('#modalContent');
      if (!modal || !modalCard || !modalContent) return;
      if (modal.hidden) lastFocusedElement = document.activeElement;
      modalCard.className = `modal-card ${size}`;
      modalContent.innerHTML = content;
      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      refreshIcons();
      window.requestAnimationFrame(() => {
        const closeButton = $('#modalClose');
        if (closeButton) closeButton.focus({ preventScroll: true });
      });
    }

    function closeModal() {
      const modal = $('#modal');
      const modalContent = $('#modalContent');
      if (!modal || modal.hidden) return;
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      if (modalContent) modalContent.innerHTML = '';
      document.body.classList.remove('modal-open');
      if (lastFocusedElement && lastFocusedElement.isConnected) {
        const focusTarget = lastFocusedElement;
        window.requestAnimationFrame(() => focusTarget.focus({ preventScroll: true }));
      }
      lastFocusedElement = null;
    }

    function trapModalFocus(event) {
      const modal = $('#modal');
      if (!modal || modal.hidden || event.key !== 'Tab') return;
      const modalCard = $('#modalCard');
      const focusable = $$('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', modalCard)
        .filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    const VIEW_TITLES = {
      home: '首頁',
      reminders: '佳儒的叮嚀',
      photos: '老友照片牆',
      health: '健康步數與在地獎勵',
      radio: '社區語音廣播站'
    };

    function navigate(view, options = {}) {
      if (!VIEW_TITLES[view]) return;
      if (state.view === 'health' && view !== 'health' && state.timer.running) {
        pauseExerciseTimer(false);
      }
      if (recordingState) finishRecording(true);
      stopSpeech();
      state.view = view;

      $$('.app-view').forEach((section) => {
        section.hidden = section.id !== `view-${view}`;
      });
      const activeView = $(`#view-${view}`);
      if (activeView) {
        activeView.classList.remove('view-enter');
        void activeView.offsetWidth;
        activeView.classList.add('view-enter');
      }

      if (view === 'home') renderHome();
      if (view === 'reminders') renderReminders();
      if (view === 'photos') renderPhotos();
      if (view === 'health') updateHealthUI();
      if (view === 'radio') renderRadio();

      $$('.nav-btn').forEach((button) => {
        if (button.dataset.navView === view) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
      });

      document.title = `${VIEW_TITLES[view]}｜樂活在地通`;
      if (options.scroll !== false) window.scrollTo({ top: 0, behavior: 'auto' });
      if (options.focus !== false) {
        window.requestAnimationFrame(() => {
          const heading = activeView ? activeView.querySelector('h1') : null;
          if (heading) heading.focus({ preventScroll: true });
        });
      }
      refreshIcons();
    }

    async function readAndResizePhoto(file) {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      return new Promise((resolve) => {
        const image = new Image();
        image.onload = () => {
          const maxSide = 1600;
          const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
          if (scale === 1 && file.size < 2.5 * 1024 * 1024) {
            resolve(dataUrl);
            return;
          }
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          const context = canvas.getContext('2d');
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.86));
        };
        image.onerror = () => resolve(dataUrl);
        image.src = dataUrl;
      });
    }

    async function handlePhotoFile(file) {
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        showToast('請選擇照片檔（JPG、PNG 都可以）。', 'warn');
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        showToast('照片超過 15 MB，請選小一點的照片。', 'warn');
        return;
      }
      try {
        const imageData = await readAndResizePhoto(file);
        openComposer(imageData);
      } catch (error) {
        showToast('照片讀取失敗，請再試一次。', 'warn');
      }
    }

    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;

      const closeButton = target.closest('[data-close-modal]');
      if (closeButton) {
        closeModal();
        return;
      }

      const navButton = target.closest('[data-nav-view]');
      if (navButton) {
        navigate(navButton.dataset.navView);
        return;
      }

      const fontButton = target.closest('.control-btn[data-font-size]');
      if (fontButton) {
        setFont(fontButton.dataset.fontSize);
        return;
      }

      if (target.closest('#brandHome')) {
        navigate('home');
        return;
      }

      if (target.closest('#simulateSteps')) {
        addSteps(500);
        return;
      }

      if (target.closest('#timerBtn')) {
        toggleExerciseTimer();
        return;
      }

      if (target.closest('#stopSpeechBtn')) {
        stopSpeech();
        return;
      }

      if (target.closest('[data-sos]')) {
        triggerSosHelp();
        return;
      }

      if (target.closest('[data-open-medbag]')) {
        openMedBagModal();
        return;
      }

      const medBagTab = target.closest('[data-med-bag]');
      if (medBagTab) {
        switchMedBag(Number(medBagTab.dataset.medBag));
        return;
      }

      if (target.closest('[data-speak-medbag]')) {
        speakMedBag();
        return;
      }

      const teaJoinButton = target.closest('[data-join-tea]');
      if (teaJoinButton) {
        joinTeaGroup(teaJoinButton.dataset.joinTea);
        return;
      }

      const quizOption = target.closest('[data-quiz-option]');
      if (quizOption) {
        answerQuiz(Number(quizOption.dataset.quizOption));
        return;
      }

      if (target.closest('[data-next-quiz]')) {
        nextQuizQuestion();
        return;
      }

      if (target.closest('[data-speak-quiz]')) {
        speakQuizQuestion();
        return;
      }

      const shuttleSpeakButton = target.closest('[data-speak-shuttle]');
      if (shuttleSpeakButton) {
        speakShuttle(shuttleSpeakButton.dataset.speakShuttle);
        return;
      }

      const shuttleBookButton = target.closest('[data-book-shuttle]');
      if (shuttleBookButton) {
        toggleShuttleBooking(shuttleBookButton.dataset.bookShuttle);
        return;
      }

      const completeButton = target.closest('[data-complete-reminder]');
      if (completeButton) {
        markReminderDone(completeButton.dataset.completeReminder);
        return;
      }

      const reminderSpeakButton = target.closest('[data-speak-reminder]');
      if (reminderSpeakButton) {
        speakReminder(reminderSpeakButton.dataset.speakReminder);
        return;
      }

      const likeButton = target.closest('[data-like-photo]');
      if (likeButton) {
        togglePhotoLike(likeButton.dataset.likePhoto);
        return;
      }

      const photoSpeakButton = target.closest('[data-speak-photo]');
      if (photoSpeakButton) {
        speakPhoto(photoSpeakButton.dataset.speakPhoto);
        return;
      }

      const sampleButton = target.closest('[data-sample-key]');
      if (sampleButton) {
        openComposer(SAMPLE_IMAGES[sampleButton.dataset.sampleKey]);
        return;
      }

      if (target.closest('[data-open-photo-picker]')) {
        const photoInput = $('#photoInput');
        if (photoInput) photoInput.click();
        return;
      }

      const blessingButton = target.closest('[data-blessing]');
      if (blessingButton) {
        chooseBlessing(blessingButton.dataset.blessing);
        return;
      }

      if (target.closest('[data-publish-photo]')) {
        publishPhoto();
        return;
      }

      const rewardButton = target.closest('[data-reward-id]');
      if (rewardButton) {
        redeemReward(rewardButton.dataset.rewardId);
        return;
      }

      const noticeButton = target.closest('[data-speak-notice]');
      if (noticeButton) {
        speakNotice(noticeButton.dataset.speakNotice);
        return;
      }

      if (target.closest('[data-meal-signup]')) {
        signUpForMeal();
      }
    });

    document.addEventListener('change', (event) => {
      if (event.target && event.target.id === 'photoInput') {
        const file = event.target.files && event.target.files[0];
        handlePhotoFile(file);
        event.target.value = '';
      }
    });

    document.addEventListener('pointerdown', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const recordButton = target ? target.closest('[data-record-hold]') : null;
      if (!recordButton) return;
      event.preventDefault();
      recordButton.focus({ preventScroll: true });
      startRecording(recordButton.dataset.recordHold, recordButton);
    });

    document.addEventListener('pointerup', () => {
      if (recordingState) finishRecording(false);
    });

    document.addEventListener('pointercancel', () => {
      if (recordingState) finishRecording(true);
    });

    document.addEventListener('keydown', (event) => {
      const modal = $('#modal');
      if (!modal || modal.hidden) {
        const active = event.target instanceof Element ? event.target : null;
        const recordButton = active ? active.closest('[data-record-hold]') : null;
        if (recordButton && (event.key === ' ' || event.key === 'Enter') && !event.repeat) {
          event.preventDefault();
          startRecording(recordButton.dataset.recordHold, recordButton);
        }
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
        return;
      }
      trapModalFocus(event);
    });

    document.addEventListener('keyup', (event) => {
      if (recordingState && (event.key === ' ' || event.key === 'Enter')) {
        event.preventDefault();
        finishRecording(false);
      }
    });

    /* PWA：安裝提示與離線快取 */
    const INSTALL_DISMISS_KEY = 'lohas-install-dismissed';
    const IS_HTTP = location.protocol === 'http:' || location.protocol === 'https:';
    let deferredInstallPrompt = null;
    let installBannerMode = null;

    function isStandaloneMode() {
      return window.matchMedia('(display-mode: standalone)').matches
        || window.matchMedia('(display-mode: minimal-ui)').matches
        || window.matchMedia('(display-mode: fullscreen)').matches
        || window.navigator.standalone === true;
    }

    function isIosDevice() {
      return /iphone|ipad|ipod/i.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }

    function installWasDismissed() {
      try {
        return window.localStorage.getItem(INSTALL_DISMISS_KEY) === '1';
      } catch (error) {
        return false;
      }
    }

    function rememberInstallDismissed() {
      try {
        window.localStorage.setItem(INSTALL_DISMISS_KEY, '1');
      } catch (error) {
        // 無痕模式可能不允許儲存，忽略即可。
      }
    }

    function updateInstallPadding() {
      const banner = $('#installBanner');
      if (!banner || banner.hidden) {
        document.body.classList.remove('has-install-banner');
        document.body.style.removeProperty('--install-h');
        return;
      }
      document.body.classList.add('has-install-banner');
      document.body.style.setProperty('--install-h', `${banner.offsetHeight + 24}px`);
    }

    function showInstallBanner(kind) {
      const banner = $('#installBanner');
      if (!banner || isStandaloneMode() || installWasDismissed()) return;

      installBannerMode = kind;
      const title = $('#installTitle');
      const text = $('#installText');
      const action = $('#installAction');
      const dismiss = $('#installDismiss');
      const bannerIcon = $('#installIconBox');
      if (!title || !text || !action || !dismiss || !bannerIcon) return;

      if (kind === 'ios') {
        title.textContent = '加到 iPhone 主畫面';
        text.textContent = '用 Safari 點分享鈕，再選「加入主畫面」。';
        action.textContent = '我知道了';
        dismiss.hidden = true;
        banner.classList.add('ios');
        bannerIcon.innerHTML = icon('share');
      } else {
        title.textContent = '安裝到手機';
        text.textContent = '從桌面直接打開。';
        action.textContent = '安裝到手機';
        dismiss.hidden = false;
        banner.classList.remove('ios');
        bannerIcon.innerHTML = icon('download');
      }

      banner.hidden = false;
      refreshIcons();
      updateInstallPadding();
    }

    function hideInstallBanner(remember = true) {
      const banner = $('#installBanner');
      if (banner) banner.hidden = true;
      document.body.classList.remove('has-install-banner');
      document.body.style.removeProperty('--install-h');
      if (remember) rememberInstallDismissed();
    }

    async function handleInstallAction() {
      if (installBannerMode === 'ios') {
        hideInstallBanner(true);
        return;
      }

      if (!deferredInstallPrompt) {
        hideInstallBanner(true);
        showToast('請用瀏覽器選單選擇「安裝應用程式」或「加入主畫面」。', 'warn');
        return;
      }

      const promptEvent = deferredInstallPrompt;
      deferredInstallPrompt = null;
      hideInstallBanner(false);

      try {
        promptEvent.prompt();
        const result = await promptEvent.userChoice;
        rememberInstallDismissed();
        if (result.outcome === 'accepted') {
          playChime('success');
          showToast('已開始安裝，完成後就能從手機桌面打開。');
        } else {
          showToast('已取消安裝，您仍可繼續使用。', 'warn');
        }
      } catch (error) {
        rememberInstallDismissed();
        showToast('安裝沒有完成，請用瀏覽器選單再試一次。', 'warn');
      }
    }

    function setupPwa() {
      const banner = $('#installBanner');
      const action = $('#installAction');
      const dismiss = $('#installDismiss');
      if (!banner || !action || !dismiss) return;

      action.addEventListener('click', handleInstallAction);
      dismiss.addEventListener('click', () => hideInstallBanner(true));

      window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredInstallPrompt = event;
        if (!isStandaloneMode() && !installWasDismissed()) showInstallBanner('prompt');
      });

      window.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        hideInstallBanner(false);
        rememberInstallDismissed();
        playChime('success');
        showToast('安裝完成！之後可從手機桌面直接打開。');
      });

      window.addEventListener('resize', updateInstallPadding);

      if ('ResizeObserver' in window) {
        new ResizeObserver(updateInstallPadding).observe(banner);
      }

      if (isIosDevice() && IS_HTTP && !isStandaloneMode() && !installWasDismissed()) {
        window.setTimeout(() => showInstallBanner('ios'), 1400);
      }
    }

    function registerServiceWorker() {
      if (!('serviceWorker' in navigator) || !IS_HTTP) return;

      const startRegistration = async () => {
        try {
          const registration = await navigator.serviceWorker.register('./sw.js');
          registration.addEventListener('updatefound', () => {
            const worker = registration.installing;
            if (!worker) return;
            worker.addEventListener('statechange', () => {
              if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                showToast('已有新版本，下次開啟會自動更新。');
              }
            });
          });
        } catch (error) {
          // 不支援 Service Worker 時仍可正常使用，只是沒有離線快取。
        }
      };

      if (document.readyState === 'complete') {
        startRegistration();
      } else {
        window.addEventListener('load', startRegistration, { once: true });
      }
    }

    async function init() {
      setupPwa();
      state.font = window.LohasAPI ? window.LohasAPI.getFont() : 'large';
      updateFontUI();

      const cached = window.LohasAPI ? window.LohasAPI.getCachedState() : null;
      if (cached) applyServerState(cached, { force: true, render: false });

      renderHome();
      renderReminders();
      renderPhotos();
      updateHealthUI();
      renderRadio();

      const requestedView = new URLSearchParams(window.location.search).get('view');
      const initialView = ['home', 'reminders', 'photos', 'health', 'radio'].includes(requestedView)
        ? requestedView
        : 'home';
      navigate(initialView, { focus: false, scroll: false });
      refreshIcons();

      if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.addEventListener?.('voiceschanged', () => {
          window.speechSynthesis.getVoices();
        });
      }

      if (window.LohasAPI) {
        window.LohasAPI.startSync((snapshot, meta) => {
          if (!snapshot) return;
          const source = meta && meta.source;
          const force = source === 'offline' || source === 'mutation' || source === 'queue-flushed' || !state.revision;
          applyServerState(snapshot, { force, render: true });
        });

        const fresh = await window.LohasAPI.getState();
        if (fresh) applyServerState(fresh, { force: true, render: true });
      }

      window.addEventListener('pagehide', () => {
        stopSpeech();
        if (state.timer.intervalId) window.clearInterval(state.timer.intervalId);
        if (window.LohasAPI) window.LohasAPI.stopSync();
      });
      registerServiceWorker();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
