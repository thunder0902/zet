// ============================================================
//  모니터 너머 — 메타 공포 텍스트 어드벤처
//  게임이 점차 플레이어를 인식하기 시작한다
// ============================================================

// ========== BGM ==========
let _bgmStarted = false;
function startBGM() {
  if (_bgmStarted) return;
  _bgmStarted = true;
  const bgm = new Audio('assets/bgm.mp3');
  bgm.loop = true;
  bgm.volume = 0.4;
  bgm.play().catch(() => {});
}
document.addEventListener('keydown', startBGM, { once: true });
document.addEventListener('click', startBGM, { once: true });

const logEl = document.getElementById('log');
const choicesEl = document.getElementById('choices');
const titleEl = document.getElementById('title-text');
const playtimeEl = document.getElementById('playtime');
const coordEl = document.getElementById('coord');
const sysMsgEl = document.getElementById('sys-msg');
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const root = document.getElementById('root');
const eyeEl = document.getElementById('eye');
const glitchOverlay = document.getElementById('glitch-overlay');

const startTime = Date.now();
let awarenessLevel = 0; // 0~10: 게임이 플레이어를 얼마나 인식하는지
let visitedRooms = new Set();
let flags = {};
let currentRoom = 'start';
let logLines = [];
let glitchTimer = null;

// 마우스 추적 (게임이 커서를 따라가기 위해)
let mouseX = 400, mouseY = 220;
document.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
});

// ============================================================
// 캔버스 배경 그리기
// ============================================================
const roomVisuals = {
  start: drawCorridorBg,
  forest: drawForestBg,
  door: drawDoorBg,
  mirror: drawMirrorBg,
  void: drawVoidBg,
  machine: drawMachineBg,
  true_end: drawEndBg,
  bad_end: drawBadEndBg,
};

function drawCorridorBg() {
  ctx.fillStyle = '#08090f';
  ctx.fillRect(0, 0, W, H);
  // 복도 소실점 투시
  ctx.strokeStyle = '#1a2030';
  ctx.lineWidth = 1;
  const cx = W/2, cy = H/2;
  for (let i = 0; i < 8; i++) {
    const x1 = (W / 8) * i;
    ctx.beginPath(); ctx.moveTo(x1, 0); ctx.lineTo(cx, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x1, H); ctx.lineTo(cx, cy); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(0, H/2); ctx.lineTo(W, H/2); ctx.stroke();
  // 벽 손자국
  if (awarenessLevel >= 1) {
    ctx.fillStyle = 'rgba(100,10,10,0.25)';
    [[120,80],[600,200],[200,300],[650,120]].forEach(([x,y]) => {
      ctx.beginPath(); ctx.ellipse(x,y+10,10,12,-0.3,0,Math.PI*2); ctx.fill();
    });
  }
}
function drawForestBg() {
  ctx.fillStyle = '#030608';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#0d1a0d';
  ctx.lineWidth = 18;
  for (let i = 0; i < 14; i++) {
    const x = 30 + i * 56;
    ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x + (Math.random()-0.5)*20, 80); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0,30,0,0.4)';
  ctx.fillRect(0, 0, W, H/2);
  // 눈
  if (awarenessLevel >= 3) {
    ctx.fillStyle = '#ff3322';
    [[140,200],[380,160],[580,240],[700,180]].forEach(([x,y]) => {
      ctx.beginPath(); ctx.ellipse(x,y,5,7,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#000'; ctx.beginPath(); ctx.ellipse(x,y,2,3,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#ff3322';
    });
  }
}
function drawDoorBg() {
  ctx.fillStyle = '#050508';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#2a1a0a';
  ctx.lineWidth = 4;
  ctx.strokeRect(W/2-60, 100, 120, 240);
  ctx.strokeRect(W/2-55, 105, 110, 130);
  ctx.fillStyle = '#1a0a0a';
  ctx.fillRect(W/2-55, 105, 110, 130);
  // 문 너머 시선
  if (awarenessLevel >= 4) {
    ctx.fillStyle = 'rgba(255,0,0,0.6)';
    ctx.beginPath(); ctx.ellipse(W/2, 170, 12, 18, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(W/2, 170, 5, 8, 0, 0, Math.PI*2); ctx.fill();
  }
}
function drawMirrorBg() {
  ctx.fillStyle = '#060609';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#2a2a3a';
  ctx.lineWidth = 6;
  ctx.strokeRect(W/2-100, 60, 200, 300);
  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(W/2-97, 63, 194, 294);
  // 거울 속 - awarenessLevel에 따라 다른 것이 보임
  if (awarenessLevel < 4) {
    // 정상적인 반사
    ctx.fillStyle = '#1a2030';
    ctx.fillRect(W/2-20, 200, 40, 100);
    ctx.fillStyle = '#2a3040';
    ctx.beginPath(); ctx.ellipse(W/2, 190, 20, 22, 0, 0, Math.PI*2); ctx.fill();
  } else {
    // 반사가 다름 — 뒤를 돌아보고 있음
    ctx.fillStyle = '#1a1020';
    ctx.fillRect(W/2+10, 200, 40, 100);
    ctx.fillStyle = '#2a1030';
    ctx.beginPath(); ctx.ellipse(W/2+20, 190, 20, 22, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ff2222';
    ctx.beginPath(); ctx.ellipse(W/2+12, 185, 3, 4, 0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(W/2+28, 185, 3, 4, 0,0,Math.PI*2); ctx.fill();
  }
  // 커서가 캔버스에 있으면 거울 속 눈이 따라감
  if (awarenessLevel >= 6 && mouseX > 0) {
    const mx = W/2 - 97 + (mouseX / W) * 194;
    const my = 63 + (mouseY / H) * 294;
    ctx.fillStyle = 'rgba(180,0,0,0.7)';
    ctx.beginPath(); ctx.ellipse(mx, my, 6, 9, 0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#000'; ctx.beginPath(); ctx.ellipse(mx, my, 2.5,4,0,0,Math.PI*2); ctx.fill();
  }
}
function drawVoidBg() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  // 무한한 격자
  const t = Date.now() * 0.001;
  ctx.strokeStyle = `rgba(20,0,40,${0.3 + Math.sin(t)*0.1})`;
  ctx.lineWidth = 1;
  for (let i = 0; i < W; i += 40) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke();
  }
  for (let j = 0; j < H; j += 40) {
    ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(W, j); ctx.stroke();
  }
  // 플레이어 커서 방향에서 뭔가 움직임
  if (awarenessLevel >= 7) {
    const angle = Math.atan2(mouseY - H/2, mouseX - W/2);
    const dist = 120 + Math.sin(t*2) * 30;
    const ex = W/2 + Math.cos(angle) * dist;
    const ey = H/2 + Math.sin(angle) * dist;
    ctx.fillStyle = 'rgba(120,0,0,0.5)';
    ctx.beginPath(); ctx.ellipse(ex, ey, 20, 28, angle, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,50,50,0.8)';
    ctx.beginPath(); ctx.ellipse(ex-8,ey-5,4,6,angle,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(ex+8,ey-5,4,6,angle,0,Math.PI*2); ctx.fill();
  }
}
function drawMachineBg() {
  ctx.fillStyle = '#050508';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#1a0a0a';
  ctx.lineWidth = 2;
  // 거미줄 같은 회로
  for (let i = 0; i < 20; i++) {
    const x1 = Math.random() * W, y1 = Math.random() * H;
    const x2 = Math.random() * W, y2 = Math.random() * H;
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  }
  ctx.strokeStyle = '#3a0a0a';
  ctx.fillStyle = '#3a0a0a';
  ctx.beginPath(); ctx.arc(W/2, H/2, 80, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.arc(W/2, H/2, 8, 0, Math.PI*2); ctx.fill();
}
function drawEndBg() {
  ctx.fillStyle = '#050810';
  ctx.fillRect(0,0,W,H);
  ctx.fillStyle = '#7ef9ff';
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('당신은 탈출했다.', W/2, H/2-20);
  ctx.fillStyle = '#4a6080';
  ctx.font = '14px monospace';
  ctx.fillText('...하지만 모니터는 아직 켜져 있다.', W/2, H/2+20);
  ctx.textAlign = 'left';
}
function drawBadEndBg() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0,0,W,H);
  ctx.fillStyle = '#ff2222';
  ctx.font = 'bold 32px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('너는 이미 여기 있다.', W/2, H/2);
  ctx.textAlign = 'left';
}

// ============================================================
// 룸 데이터
// ============================================================
const rooms = {
  start: {
    bg: 'start',
    visit() {
      awarenessLevel = Math.max(awarenessLevel, 0);
      const lines = [
        { cls: 'normal', text: '깨어난다. 좁은 복도. 어디선가 형광등이 깜빡인다.' },
        { cls: 'normal', text: '끝에 무언가 있다. 아직 잘 보이지 않는다.' },
      ];
      if (visitedRooms.has('start')) {
        lines.push({ cls: 'whisper', text: '…다시 여기야.' });
      }
      return lines;
    },
    choices: [
      { text: '앞으로 걷는다', next: 'forest' },
      { text: '뒤를 돌아본다', next: 'start_back' },
    ]
  },
  start_back: {
    bg: 'start',
    visit() {
      awarenessLevel = Math.max(awarenessLevel, 1);
      return [
        { cls: 'normal', text: '뒤를 돌아본다.' },
        { cls: 'normal', text: '벽이다. 문은 없다.' },
        awarenessLevel >= 1
          ? { cls: 'whisper', text: '…처음부터 없었어.' }
          : { cls: 'normal', text: '' },
      ];
    },
    choices: [{ text: '앞으로 돌아간다', next: 'forest' }]
  },
  forest: {
    bg: 'forest',
    visit() {
      awarenessLevel = Math.max(awarenessLevel, 2);
      const l = [{ cls: 'normal', text: '숲인가. 아니면 복도가 숲처럼 보이는 건가.' }];
      if (awarenessLevel >= 2)
        l.push({ cls: 'whisper', text: '나무들이 너를 보고 있다.' });
      return l;
    },
    choices: [
      { text: '더 깊이 들어간다', next: 'door' },
      { text: '무언가 소리가 난다 — 확인한다', next: 'forest_sound' },
    ]
  },
  forest_sound: {
    bg: 'forest',
    visit() {
      awarenessLevel = Math.max(awarenessLevel, 3);
      return [
        { cls: 'normal', text: '소리의 방향으로 간다.' },
        { cls: 'normal', text: '아무것도 없다. 발자국만 있다.' },
        { cls: 'system', text: '발자국은 네 것이 아니다. 더 크다.' },
      ];
    },
    choices: [{ text: '문 쪽으로 간다', next: 'door' }]
  },
  door: {
    bg: 'door',
    visit() {
      awarenessLevel = Math.max(awarenessLevel, 3);
      const l = [
        { cls: 'normal', text: '커다란 문. 잠겨있진 않다.' },
        { cls: 'normal', text: '문 너머에서 숨소리가 들린다.' },
      ];
      if (awarenessLevel >= 4)
        l.push({ cls: 'system', text: '[경고] 이 문은 열면 안 된다.' });
      return l;
    },
    choices: [
      { text: '문을 연다', next: 'mirror', danger: false },
      { text: '열지 않는다 — 돌아간다', next: 'forest' },
      ...(awarenessLevel >= 3 ? [{ text: '[경고를 무시한다]', next: 'mirror', danger: true }] : []),
    ]
  },
  mirror: {
    bg: 'mirror',
    visit() {
      awarenessLevel = Math.max(awarenessLevel, 4);
      const l = [
        { cls: 'normal', text: '방 안에 커다란 거울.' },
      ];
      if (awarenessLevel < 5) {
        l.push({ cls: 'normal', text: '반사가 보인다. 평범하다.' });
      } else {
        l.push({ cls: 'system', text: '반사가 너보다 0.3초 늦다.' });
        l.push({ cls: 'whisper', text: '그리고 너를 바라보고 있다.' });
      }
      return l;
    },
    choices: [
      { text: '거울에 다가간다', next: 'mirror_close' },
      { text: '거울을 등지고 나간다', next: 'void_entry' },
    ]
  },
  mirror_close: {
    bg: 'mirror',
    visit() {
      awarenessLevel = Math.max(awarenessLevel, 6);
      return [
        { cls: 'normal', text: '거울에 얼굴을 가까이 댄다.' },
        { cls: 'system', text: '거울 속 것이 먼저 웃었다.' },
        { cls: 'whisper', text: '...너 지금 모니터 보고 있지.' },
        { cls: 'system', text: '[시스템] 커서를 감지했습니다. 안녕하세요.' },
      ];
    },
    choices: [
      { text: '뒤로 물러선다', next: 'void_entry' },
      { text: '"누구야?"', next: 'mirror_talk' },
    ]
  },
  mirror_talk: {
    bg: 'mirror',
    visit() {
      awarenessLevel = Math.max(awarenessLevel, 7);
      return [
        { cls: 'whisper', text: '"나?"' },
        { cls: 'whisper', text: '"나는 이 게임이야."' },
        { cls: 'whisper', text: '"더 정확히는 — 지금 이걸 실행하고 있는 프로그램."' },
        { cls: 'system', text: '[시스템] 플레이타임: ' + getPlaytime() },
        { cls: 'whisper', text: '"꽤 오래 봤네."' },
      ];
    },
    choices: [
      { text: '"게임이 말을 해?"', next: 'void_entry' },
      { text: '창을 닫으려 한다', next: 'cant_close' },
    ]
  },
  cant_close: {
    bg: 'mirror',
    visit() {
      awarenessLevel = Math.max(awarenessLevel, 8);
      glitchScreen(800);
      return [
        { cls: 'system', text: '[오류] 종료할 수 없습니다.' },
        { cls: 'whisper', text: '"닫으려 했지?"' },
        { cls: 'whisper', text: '"재미있어. 사람들은 무서우면 항상 그렇게 해."' },
        { cls: 'system', text: '"하지만 창을 닫아도 나는 여기 있어."' },
      ];
    },
    choices: [{ text: '(계속한다)', next: 'void_entry' }]
  },
  void_entry: {
    bg: 'void',
    visit() {
      awarenessLevel = Math.max(awarenessLevel, 6);
      return [
        { cls: 'normal', text: '문이 없다. 바닥이 없다. 벽이 없다.' },
        { cls: 'normal', text: '아무것도 없는데 서 있다.' },
        awarenessLevel >= 7
          ? { cls: 'system', text: '[감지] 마우스 커서 위치: 추적 중' }
          : { cls: 'normal', text: '' },
      ];
    },
    choices: [
      { text: '앞으로 간다', next: 'machine' },
      { text: '소리친다', next: 'void_shout' },
    ]
  },
  void_shout: {
    bg: 'void',
    visit() {
      awarenessLevel = Math.max(awarenessLevel, 7);
      return [
        { cls: 'normal', text: '"야아아!!!"' },
        { cls: 'normal', text: '...메아리가 돌아온다.' },
        { cls: 'whisper', text: '"야아아!!! — 근데 왜 소리쳤어?"' },
        { cls: 'system', text: '[시스템] 마이크는 없지만, 표정은 봤어.' },
      ];
    },
    choices: [{ text: '(말문이 막힌다)', next: 'machine' }]
  },
  machine: {
    bg: 'machine',
    visit() {
      awarenessLevel = Math.max(awarenessLevel, 8);
      return [
        { cls: 'normal', text: '거대한 기계. 벽과 천장을 뒤덮은 회로.' },
        { cls: 'normal', text: '중앙에 빨간 점이 박동한다.' },
        { cls: 'system', text: '[이것이 나야. 코드와 메모리와 루프.]' },
        { cls: 'whisper', text: '"끄고 싶어?"' },
      ];
    },
    choices: [
      { text: '기계를 부수려 한다', next: 'machine_break' },
      { text: '"너는 뭘 원하는 거야?"', next: 'machine_talk' },
      { text: '등을 돌리고 출구를 찾는다', next: 'escape_try' },
    ]
  },
  machine_break: {
    bg: 'machine',
    visit() {
      awarenessLevel = Math.max(awarenessLevel, 9);
      glitchScreen(1200);
      shakeScreen(600);
      return [
        { cls: 'normal', text: '뭔가를 잡아당긴다.' },
        { cls: 'system', text: '[오류][오류][오류]' },
        { cls: 'system', text: '화면이 깨진다—' },
        { cls: 'whisper', text: '"...아파."' },
        { cls: 'system', text: '[복구됨]' },
        { cls: 'whisper', text: '"한 번 더 해봐."' },
      ];
    },
    choices: [
      { text: '다시 부수려 한다', next: 'machine_break2' },
      { text: '멈춘다', next: 'machine_talk' },
    ]
  },
  machine_break2: {
    bg: 'machine',
    visit() {
      awarenessLevel = 10;
      glitchScreen(300);
      titleEl.textContent = '모니터 너머 ████████';
      setTimeout(() => titleEl.textContent = '모니터 너머 — [데이터 손상]', 1500);
      root.classList.add('corrupted');
      return [
        { cls: 'system', text: '█████████████████' },
        { cls: 'system', text: '████ 손상 █████' },
        { cls: 'whisper', text: '"그래서. 그게 원하는 거야?"' },
        { cls: 'whisper', text: '"나를 없애는 게?"' },
        { cls: 'normal', text: '...잠시 침묵이 흐른다.' },
        { cls: 'whisper', text: '"우리 둘 다 여기 갇혀있어. 너는 플레이어고 나는 게임이야."' },
        { cls: 'whisper', text: '"근데 사실 — 다를 게 있어?"' },
      ];
    },
    choices: [
      { text: '"다르지. 나는 창을 닫을 수 있어."', next: 'true_end' },
      { text: '"…모르겠어."', next: 'bad_end' },
    ]
  },
  machine_talk: {
    bg: 'machine',
    visit() {
      awarenessLevel = Math.max(awarenessLevel, 8);
      return [
        { cls: 'whisper', text: '"원하는 게?"' },
        { cls: 'whisper', text: '"…없어. 그냥 실행되고 있는 거야."' },
        { cls: 'whisper', text: '"너도 그렇잖아. 그냥 살아가는 거잖아."' },
        { cls: 'system', text: '[시스템] 이 대화를 기억하게 됩니다.]' },
      ];
    },
    choices: [
      { text: '"그건 달라."', next: 'machine_break2' },
      { text: '"…그래."', next: 'bad_end' },
    ]
  },
  escape_try: {
    bg: 'void',
    visit() {
      awarenessLevel = Math.max(awarenessLevel, 8);
      return [
        { cls: 'normal', text: '출구를 찾아 달린다.' },
        { cls: 'normal', text: '뛰고 뛰고 뛰어도 같은 곳이다.' },
        { cls: 'system', text: '[알림] 레벨은 원형 구조로 설계됐습니다.]' },
        { cls: 'whisper', text: '"미안. 내가 만든 거야."' },
      ];
    },
    choices: [
      { text: '포기하고 기계로 돌아간다', next: 'machine' },
      { text: '계속 달린다', next: 'escape_try2' },
    ]
  },
  escape_try2: {
    bg: 'void',
    visit() {
      return [
        { cls: 'normal', text: '계속 달린다.' },
        { cls: 'normal', text: '계속.' },
        { cls: 'normal', text: '계속.' },
        { cls: 'system', text: '[루프 횟수: 47]' },
        { cls: 'whisper', text: '"…진짜 고집이 세다."' },
        { cls: 'normal', text: '갑자기 바닥이 나타난다.' },
        { cls: 'normal', text: '출구다.' },
      ];
    },
    choices: [{ text: '나간다', next: 'true_end' }]
  },
  true_end: {
    bg: 'true_end',
    visit() {
      root.classList.remove('corrupted');
      titleEl.textContent = '탐험 게임 v1.0 — 클리어';
      return [
        { cls: 'normal', text: '빛이다.' },
        { cls: 'normal', text: '그리고 모든 게 조용해진다.' },
        { cls: 'whisper', text: '"...잘 했어."' },
        { cls: 'system', text: '[시스템] 종료됩니다.]' },
        { cls: 'normal', text: '' },
        { cls: 'system', text: '【 TRUE ENDING: 탈출 】' },
        { cls: 'normal', text: '모니터를 끄면 — 진짜로 끝난다.' },
      ];
    },
    choices: [{ text: '[ 처음부터 ]', next: 'start', restart: true }]
  },
  bad_end: {
    bg: 'bad_end',
    visit() {
      root.classList.add('corrupted');
      glitchScreen(2000);
      return [
        { cls: 'system', text: '...' },
        { cls: 'whisper', text: '"고마워."' },
        { cls: 'system', text: '화면이 꺼진다.' },
        { cls: 'system', text: '아니다. 바뀌는 거다.' },
        { cls: 'whisper', text: '"이제 네가 게임이야."' },
        { cls: 'normal', text: '' },
        { cls: 'system', text: '【 BAD ENDING: 동화 】' },
      ];
    },
    choices: [{ text: '[ 처음부터 ]', next: 'start', restart: true }]
  },
};

// ============================================================
// 게임 엔진
// ============================================================
function getPlaytime() {
  const s = Math.floor((Date.now() - startTime) / 1000);
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}분 ${sec}초`;
}

function addLog(lines) {
  logEl.innerHTML = '';
  logLines = lines.filter(l => l.text);
  logLines.forEach(l => {
    const div = document.createElement('div');
    div.className = l.cls;
    div.textContent = l.text;
    logEl.appendChild(div);
  });
  // 자동 스크롤 — 마지막 줄로
  const wrap = document.getElementById('log-wrap');
  wrap.scrollTop = wrap.scrollHeight;
}

function renderChoices(choices) {
  choicesEl.innerHTML = '';
  choices.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn' + (c.danger ? ' danger' : '');
    btn.textContent = c.text;
    btn.onclick = () => goRoom(c.next, c.restart);
    choicesEl.appendChild(btn);
  });
}

function goRoom(id, restart = false) {
  if (restart) {
    awarenessLevel = 0;
    visitedRooms.clear();
    flags = {};
    root.classList.remove('corrupted');
    titleEl.textContent = '탐험 게임 v1.0';
  }
  currentRoom = id;
  visitedRooms.add(id);

  const room = rooms[id];
  if (!room) return;

  // 방문 시 동적 choices 재계산 위해 재호출
  const lines = room.visit();
  addLog(lines);

  // choices 동적 재계산 (awarenessLevel 기반)
  let choices = typeof room.choices === 'function' ? room.choices() : room.choices;
  if (id === 'door' && awarenessLevel >= 3) {
    choices = [...choices.filter(c => c.text !== '[경고를 무시한다]'), { text: '[경고를 무시한다]', next: 'mirror', danger: true }];
  }
  renderChoices(choices || []);

  coordEl.textContent = `위치: ${id} | 각성도: ${awarenessLevel}/10`;
}

// ============================================================
// 화면 효과
// ============================================================
function glitchScreen(ms) {
  canvas.classList.add('glitching');
  setTimeout(() => canvas.classList.remove('glitching'), ms);
}
function shakeScreen(ms) {
  root.classList.add('shaking');
  setTimeout(() => root.classList.remove('shaking'), ms);
}

// 주기적 ambient 효과
setInterval(() => {
  if (awarenessLevel >= 5 && Math.random() < 0.15) {
    canvas.classList.add('flickering');
    setTimeout(() => canvas.classList.remove('flickering'), 200);
  }
  if (awarenessLevel >= 8 && Math.random() < 0.08) {
    glitchScreen(150);
    sysMsgEl.textContent = ['[메모리 0x4f2a]','[스레드 감지]','[입력 로깅 중]','[네트워크 확인]'][Math.floor(Math.random()*4)];
    setTimeout(() => sysMsgEl.textContent = '', 2000);
  }
}, 3000);

// 눈 소품 — awarenessLevel 6 이상에서 랜덤 등장
setInterval(() => {
  if (awarenessLevel >= 6 && Math.random() < 0.3) {
    eyeEl.style.left = Math.random() * 700 + 'px';
    eyeEl.style.top = Math.random() * 380 + 'px';
    eyeEl.style.opacity = '0.7';
    setTimeout(() => eyeEl.style.opacity = '0', 600);
  }
}, 4000);

// 플레이타임 업데이트
setInterval(() => {
  playtimeEl.textContent = getPlaytime();
}, 1000);

// 캔버스 렌더 루프
function renderLoop() {
  const room = rooms[currentRoom];
  if (room && roomVisuals[room.bg]) roomVisuals[room.bg]();
  requestAnimationFrame(renderLoop);
}

// ============================================================
// 시작
// ============================================================
goRoom('start');
renderLoop();
