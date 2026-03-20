// ============================================================
//  병원 CCTV — 야간 경비
//  새벽 6시까지 버텨라. 하지만 카메라가 거짓말을 시작한다.
// ============================================================

// ========== BGM ==========
let _bgmStarted = false;
function startBGM() {
  if (_bgmStarted) return;
  _bgmStarted = true;
  const bgm = new Audio('../psycho-prince/assets/bgm.mp3');
  bgm.loop = true; bgm.volume = 0.35;
  bgm.play().catch(() => {});
}
document.addEventListener('click', startBGM, { once: true });
document.addEventListener('keydown', startBGM, { once: true });

// ========== 상태 ==========
const CAMS = [
  { id: 0, label: 'CAM 01 — 로비',      img: 'assets/lobby.jpg' },
  { id: 1, label: 'CAM 02 — 복도',      img: 'assets/corridor.jpg' },
  { id: 2, label: 'CAM 03 — 병실',      img: 'assets/ward.jpg' },
  { id: 3, label: 'CAM 04 — 계단',      img: 'assets/stairs.jpg' },
  { id: 4, label: 'CAM 05 — 지하',      img: 'assets/basement.jpg' },
  { id: 5, label: 'CAM 06 — 옥상',      img: 'assets/rooftop.jpg' },
];

let state = {};

function initState() {
  state = {
    hour: 0, min: 0,          // 게임 시작: 자정
    currentCam: 0,
    sanity: 100,               // 정신력 0이면 배드엔딩
    battery: 100,
    phase: 1,                  // 1~5 단계 (시간대별)
    anomalyCam: -1,            // 현재 이상 발생 카메라
    anomalyTimer: 0,           // 이상 지속 타이머
    anomalyMissed: 0,          // 놓친 이상 횟수
    anomalyFound: 0,           // 발견한 이상 횟수
    reportedCams: new Set(),   // 신고한 카메라
    phoneQueue: [],            // 전화 큐
    phoneActive: false,
    events: new Set(),         // 발생한 이벤트 ID
    paused: false,
    tick: 0,
    gameOver: false,
  };
}

// ========== 이벤트 데이터 ==========
const ANOMALY_EVENTS = [
  { cam: 1, phase: 1, desc: '복도 끝에 사람 실루엣이 서 있다. 움직이지 않는다.' },
  { cam: 2, phase: 1, desc: '병실 침대 위 환자가 앉아있다. 병원엔 환자가 없어야 하는데.' },
  { cam: 0, phase: 2, desc: '로비 CCTV가 2초간 정지했다가 재개됐다. 재개 후 의자 위치가 달라졌다.' },
  { cam: 3, phase: 2, desc: '계단에 혈흔처럼 보이는 자국이 올라오고 있다.' },
  { cam: 4, phase: 2, desc: '지하 구석에 뭔가 쭈그리고 앉아있다. 카메라가 가까이 당겨진다.' },
  { cam: 5, phase: 3, desc: '옥상에 사람이 서 있다. 이 시각에 옥상 출입은 불가능하다.' },
  { cam: 1, phase: 3, desc: '복도 조명이 차례로 꺼지더니 하나만 남았다. 그 아래 누군가 있다.' },
  { cam: 2, phase: 3, desc: '병실 문이 혼자 열리고 닫힌다. 10초 간격으로.' },
  { cam: 0, phase: 4, desc: '로비 카메라가 180도 회전했다. 네가 제어하지 않았는데.' },
  { cam: 4, phase: 4, desc: '지하 구석의 것이 카메라를 바라보고 있다. 눈이 있다.' },
  { cam: 3, phase: 4, desc: '계단에 발소리가 들린다. 올라오는 중이다.' },
  { cam: 5, phase: 5, desc: '옥상의 사람이 사라졌다. 비상구가 열려있다.' },
  { cam: 1, phase: 5, desc: '복도에 그것이 있다. 카메라를 향해 걷기 시작한다.' },
  { cam: 0, phase: 5, desc: '로비 카메라에 손자국이 생겼다. 안쪽에서 만진 것 같다.' },
];

const PHONE_EVENTS = [
  { phase: 1, text: '여기 원무과인데요... 3층 병실에서 이상한 소리가 난다고 민원이 들어왔습니다. 확인해주세요.', options: ['알겠습니다', '지금 확인 중입니다'] },
  { phase: 2, text: '...당신 거기 있어요?\n(잡음)\n...도망쳐요. 지하에 있는 게 깨어났어요.', options: ['누구세요?', '전화 끊기'] },
  { phase: 3, text: '수위실이에요? 4층 비상구 문이 열려있다는 알림이 떴는데... 이상하게도 카메라엔 아무것도 안 잡히네요.', options: ['확인해보겠습니다', '카메라 이상인 것 같습니다'] },
  { phase: 4, text: '(숨소리만 들린다)\n(긴 침묵)\n...나야.\n(전화가 끊긴다)', options: ['...?'] },
  { phase: 5, text: '경비님. 새벽 2시 이후로 연락이 안 된다고 경찰에 신고 들어왔습니다. 지금 괜찮으세요?', options: ['네 괜찮습니다', '도움이 필요합니다'] },
];

// ========== DOM ==========
const camImg     = document.getElementById('cam-img');
const camLabel   = document.getElementById('cam-label');
const camNoise   = document.getElementById('cam-noise');
const camMain    = document.getElementById('cam-main');
const anomalyMarker = document.getElementById('anomaly-marker');
const logWrap    = document.getElementById('log-wrap');
const actionBtns = document.getElementById('action-buttons');
const timeDisp   = document.getElementById('time-display');
const locDisp    = document.getElementById('location-display');
const statusDisp = document.getElementById('status-display');
const batteryDisp= document.getElementById('battery');
const phoneOverlay = document.getElementById('phone-overlay');
const phoneText  = document.getElementById('phone-text');
const phoneBtns  = document.getElementById('phone-buttons');
const reportOverlay = document.getElementById('report-overlay');
const reportText = document.getElementById('report-text');
const reportClose= document.getElementById('report-close');
const endingOverlay = document.getElementById('ending-overlay');
const endingTitle= document.getElementById('ending-title');
const endingText = document.getElementById('ending-text');
const endingRestart = document.getElementById('ending-restart');

reportClose.addEventListener('click', () => {
  reportOverlay.style.display = 'none';
  state.paused = false;
});
endingRestart.addEventListener('click', () => {
  endingOverlay.style.display = 'none';
  initState(); startGame();
});

// ========== 로그 ==========
function log(msg, type = '') {
  const el = document.createElement('div');
  el.className = 'log-entry' + (type ? ' ' + type : '');
  const now = formatTime();
  el.textContent = `[${now}] ${msg}`;
  logWrap.appendChild(el);
  logWrap.scrollTop = logWrap.scrollHeight;
  // 로그 최대 50줄
  while (logWrap.children.length > 50) logWrap.removeChild(logWrap.firstChild);
}

// ========== 시간 ==========
function formatTime() {
  const h = String(state.hour).padStart(2, '0');
  const m = String(state.min).padStart(2, '0');
  return `${h}:${m}`;
}

function advanceTime() {
  state.min += 3;
  if (state.min >= 60) { state.min -= 60; state.hour++; }
  if (state.hour >= 24) state.hour = 0;
  updatePhase();
}

function updatePhase() {
  const h = state.hour;
  if (h >= 0 && h < 1) state.phase = 1;
  else if (h >= 1 && h < 2) state.phase = 2;
  else if (h >= 2 && h < 3) state.phase = 3;
  else if (h >= 3 && h < 4) state.phase = 4;
  else if (h >= 4 && h < 6) state.phase = 5;
}

// ========== 카메라 전환 ==========
function switchCam(idx) {
  state.currentCam = idx;
  const cam = CAMS[idx];
  camImg.src = cam.img;
  camLabel.textContent = cam.label;
  locDisp.textContent = '📍 ' + cam.label.replace('CAM 0' + (idx+1) + ' — ', '');

  document.querySelectorAll('.cam-thumb').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });

  // 현재 보고 있는 카메라에 이상이 있으면 발견 처리
  if (state.anomalyCam === idx) {
    discoverAnomaly();
  }

  renderActions();
}

// ========== 이상 시스템 ==========
let currentAnomalyData = null;

function spawnAnomaly() {
  if (state.anomalyCam >= 0) return; // 이미 이상 있음
  const available = ANOMALY_EVENTS.filter(e => e.phase <= state.phase && !state.events.has(e.desc));
  if (available.length === 0) return;
  const ev = available[Math.floor(Math.random() * available.length)];
  currentAnomalyData = ev;
  state.anomalyCam = ev.cam;
  state.anomalyTimer = 180 + Math.floor(Math.random() * 120); // 약 18~30초

  // 썸네일 경고
  const ts = document.getElementById('ts' + ev.cam);
  if (ts) ts.classList.add('alert');
  document.querySelectorAll('.cam-thumb')[ev.cam]?.classList.add('anomaly');

  if (state.currentCam === ev.cam) {
    showAnomalyOnMain();
    discoverAnomaly();
  }
  log(`[경고] CAM 0${ev.cam + 1} 이상 감지`, 'warn');
}

function showAnomalyOnMain() {
  anomalyMarker.style.display = 'block';
  camMain.classList.add('alert');
  camNoise.style.opacity = '0.18';
}

function hideAnomaly() {
  anomalyMarker.style.display = 'none';
  camMain.classList.remove('alert');
  camNoise.style.opacity = '0';
  const ts = document.getElementById('ts' + state.anomalyCam);
  if (ts) ts.classList.remove('alert');
  document.querySelectorAll('.cam-thumb')[state.anomalyCam]?.classList.remove('anomaly');
  state.anomalyCam = -1;
  currentAnomalyData = null;
}

function discoverAnomaly() {
  showAnomalyOnMain();
}

function missAnomaly() {
  state.anomalyMissed++;
  state.sanity -= 12;
  log(`[경고] CAM 0${state.anomalyCam + 1} 이상이 사라졌습니다. 확인되지 않음.`, 'danger');
  hideAnomaly();
  renderStatus();
}

// ========== 신고 ==========
function reportAnomaly() {
  if (state.anomalyCam < 0) return;
  const ev = currentAnomalyData;
  if (!ev) return;
  state.events.add(ev.desc);
  state.anomalyFound++;
  state.reportedCams.add(ev.cam);

  state.paused = true;
  reportText.textContent = `📷 CAM 0${ev.cam + 1} 이상 확인\n\n${ev.desc}\n\n상황실에 보고 완료.`;
  reportOverlay.style.display = 'flex';

  log(`[보고] CAM 0${ev.cam + 1} 이상 신고 완료`, '');
  hideAnomaly();
  renderStatus();
}

// ========== 전화 ==========
function triggerPhone(phoneEv) {
  if (state.phoneActive) { state.phoneQueue.push(phoneEv); return; }
  state.phoneActive = true;
  state.paused = true;

  phoneText.style.opacity = '0';
  phoneOverlay.style.display = 'flex';
  phoneBtns.innerHTML = '';

  // 타이핑 효과
  let i = 0;
  const txt = phoneEv.text;
  phoneText.textContent = '';
  phoneText.style.opacity = '1';
  const typ = setInterval(() => {
    phoneText.textContent += txt[i++];
    if (i >= txt.length) {
      clearInterval(typ);
      phoneEv.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'action-btn';
        btn.textContent = opt;
        btn.addEventListener('click', () => {
          phoneOverlay.style.display = 'none';
          state.phoneActive = false;
          state.paused = false;
          log(`[전화] "${opt}"`, 'system');
          if (state.phoneQueue.length > 0) {
            setTimeout(() => triggerPhone(state.phoneQueue.shift()), 5000);
          }
        });
        phoneBtns.appendChild(btn);
      });
    }
  }, 30);
}

// ========== 액션 버튼 ==========
function renderActions() {
  actionBtns.innerHTML = '';

  const btns = [
    { label: '🔎 이상 신고', action: () => reportAnomaly(), disabled: state.anomalyCam < 0 || state.currentCam !== state.anomalyCam },
    { label: '💡 조명 점검', action: () => { log('조명 시스템 정상.', 'system'); state.battery -= 2; renderStatus(); } },
    { label: '📻 무전', action: () => { log('무전 송신 — 이상 없음.'); } },
    { label: '☕ 커피 마시기', action: () => { state.sanity = Math.min(100, state.sanity + 5); log('커피를 마셨다. 정신이 조금 든다.'); renderStatus(); } },
  ];

  btns.forEach(b => {
    const btn = document.createElement('button');
    btn.className = 'action-btn' + (b.disabled ? ' danger' : '');
    btn.textContent = b.label;
    btn.disabled = b.disabled || false;
    btn.addEventListener('click', () => { startBGM(); b.action(); });
    actionBtns.appendChild(btn);
  });
}

// ========== 상태 표시 ==========
function renderStatus() {
  timeDisp.textContent = formatTime();
  batteryDisp.textContent = `🔋 ${state.battery}%`;

  if (state.sanity >= 70) statusDisp.textContent = '🟢 정상';
  else if (state.sanity >= 40) statusDisp.textContent = '🟡 불안';
  else if (state.sanity >= 20) statusDisp.textContent = '🟠 공포';
  else statusDisp.textContent = '🔴 위험';
}

// ========== 엔딩 ==========
function triggerEnding(type) {
  state.gameOver = true;
  endingOverlay.style.display = 'flex';

  if (type === 'survive') {
    endingTitle.style.color = '#7fff7f';
    endingTitle.textContent = '🌅 엔딩 A — 생존';
    endingText.textContent = `오전 6시. 교대 근무자가 도착했다.\n당신은 밤을 버텼다.\n${state.anomalyFound}건의 이상을 보고했고, ${state.anomalyMissed}건을 놓쳤다.\n\n다음날 신문에는 이 병원의 폐쇄 소식이 실렸다.`;
  } else if (type === 'insane') {
    endingTitle.style.color = '#ff6666';
    endingTitle.textContent = '💀 엔딩 B — 잠식';
    endingText.textContent = `당신은 카메라 속에서 그것을 너무 오래 바라봤다.\n정신력이 한계를 넘었다.\n\n다음날 아침, 수위실에서 당신이 발견됐다.\n눈을 뜨고, 모니터를 바라보고 있었다.\n모니터엔 아무것도 없었다.`;
  } else if (type === 'discovered') {
    endingTitle.style.color = '#ff4444';
    endingTitle.textContent = '👁 엔딩 C — 발각';
    endingText.textContent = `CAM 01이 혼자 회전하더니 당신을 향했다.\n그것이 당신의 위치를 알아냈다.\n\n화면이 꺼졌다.\n아무도 당신을 찾지 못했다.`;
  }
}

// ========== 메인 루프 ==========
let gameInterval = null;
let anomalyInterval = null;
let phoneIdx = 0;

function startGame() {
  initState();
  phoneIdx = 0;

  document.querySelectorAll('.cam-thumb').forEach((el, i) => {
    el.addEventListener('click', () => { startBGM(); switchCam(i); });
  });

  switchCam(0);
  renderStatus();
  renderActions();
  log('오전 00:00. 야간 근무 시작.', 'system');
  log('카메라 6대를 모니터링하고, 이상 발생 시 신고하세요.', 'system');
  log('새벽 6시까지 버티면 됩니다.', 'system');

  // 시간 진행 (3초 = 게임 내 3분)
  if (gameInterval) clearInterval(gameInterval);
  gameInterval = setInterval(() => {
    if (state.paused || state.gameOver) return;
    state.tick++;
    advanceTime();
    state.battery = Math.max(0, state.battery - 0.3);
    renderStatus();

    // 이상 타이머
    if (state.anomalyCam >= 0) {
      state.anomalyTimer--;
      if (state.anomalyTimer <= 0) missAnomaly();
    }

    // 단계별 정신력 감소
    if (state.phase >= 3) state.sanity = Math.max(0, state.sanity - 0.2);
    if (state.phase >= 4) state.sanity = Math.max(0, state.sanity - 0.3);

    // 정신력 체크
    if (state.sanity <= 0) { triggerEnding('insane'); return; }

    // 이상 발생 확률 (단계 높을수록 자주)
    const spawnChance = [0, 0.08, 0.13, 0.18, 0.22, 0.28][state.phase];
    if (Math.random() < spawnChance && state.anomalyCam < 0) spawnAnomaly();

    // 전화 이벤트
    const nextPhone = PHONE_EVENTS[phoneIdx];
    if (nextPhone && state.phase >= nextPhone.phase && Math.random() < 0.05) {
      phoneIdx++;
      setTimeout(() => triggerPhone(nextPhone), 500);
    }

    // 페이즈 4 이상: 카메라 노이즈
    if (state.phase >= 4) camNoise.style.opacity = String(0.04 + Math.random() * 0.06);
    else camNoise.style.opacity = '0';

    // 엔딩 체크
    if (state.hour === 6 && state.min === 0) { triggerEnding('survive'); return; }

    // 이상 너무 많이 놓치면 발각
    if (state.anomalyMissed >= 5) { triggerEnding('discovered'); return; }

    renderActions();
  }, 3000);
}

startGame();
