const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const storyEl = document.getElementById('story');
const hpEl = document.getElementById('hp');
const cpEl = document.getElementById('cp');
const stateEl = document.getElementById('state');

const W = canvas.width, H = canvas.height;

const keys = {};
const keysPressed = {};
window.addEventListener('keydown', (e) => {
  if (!keys[e.key]) keysPressed[e.key] = true;
  keys[e.key] = true;
  if (e.key === 'r' || e.key === 'R') reset();
  // 첫 키 입력에서 오디오 시작 (브라우저 정책)
  initAudio();
});
window.addEventListener('keyup', (e) => { keys[e.key] = false; });
canvas.addEventListener('click', () => initAudio());

// 이미지 로드
const eyeWallImg = new Image();
eyeWallImg.src = 'assets/eyewall.png';

const gravity = 0.7;

// 24x24 human silhouette - player (cyan)
const playerSprite = [
  "........4444444.........",
  ".......44444444.........",
  ".......44444444.........",
  ".......44444444.........",
  ".......44444444.........",
  "........4444444.........",
  "........4444444.........",
  "....444444444444444.....",
  "....444444444444444.....",
  "....444444444444444.....",
  "....444444444444444.....",
  "....444444444444444.....",
  "........4444444.........",
  "........4444444.........",
  "........4444444.........",
  "........4444444.........",
  ".......444...444........",
  ".......444...444........",
  ".......444...444........",
  ".......444...444........",
  ".......444...444........",
  ".......444...444........",
  ".......444...444........",
  ".......444...444........"
];

// 24x24 chaser silhouette - dark with glowing red eyes
const chaserSprite = [
  "........1111111.........",
  ".......111111111........",
  ".......111111111........",
  ".......111111111........",
  ".......113...311........",
  ".......113...311........",
  ".......111111111........",
  "....111111111111111.....",
  "....111111111111111.....",
  "....111111111111111.....",
  "....111111111111111.....",
  "....111111111111111.....",
  "........1111111.........",
  "........1111111.........",
  "........1111111.........",
  "........1111111.........",
  ".......111...111........",
  ".......111...111........",
  ".......111...111........",
  ".......111...111........",
  ".......111...111........",
  ".......111...111........",
  ".......111...111........",
  ".......111...111........"
];

const palette = {
  '0': '#7ef9ff',
  '2': '#53d7d9',
  '3': '#ff3b3b',
  '4': '#b6f8ff',
  '5': '#d8feff',
  '1': '#1b1d27'
};

function drawSprite(sprite, x, y, scale = 2) {
  for (let r = 0; r < sprite.length; r++) {
    for (let c = 0; c < sprite[r].length; c++) {
      const ch = sprite[r][c];
      if (ch === '.') continue;
      ctx.fillStyle = palette[ch] || '#fff';
      ctx.fillRect(Math.floor(x + c * scale), Math.floor(y + r * scale), scale, scale);
    }
  }
}

// ========== 스토리 이벤트 시스템 ==========
// 각 이벤트: x 트리거 위치, 한 번만 발동, 팝업 타입
const storyEvents = [
  {
    id: 'intro', x: 300, triggered: false,
    dialog: [
      { speaker: '???', text: '…깨어났군. 오래 기다렸다.' },
      { speaker: '너', text: '여기가 어디야. 목이 묶여있었어.' },
      { speaker: '조각가', text: '걱정 마라. 곧 완성될 테니까.' }
    ]
  },
  {
    id: 'diary1', x: 1200, triggered: false, item: '낡은 일기 1페이지',
    dialog: [
      { speaker: '일기 (핏자국)', text: '"그는 나를 보고 웃었다. 작품이 될 자격이 있다고."' },
      { speaker: '일기', text: '"나는 도망쳤다. 하지만 문은 없었다."' }
    ],
    choice: {
      prompt: '일기를 더 읽겠는가?',
      options: [
        { label: '계속 읽는다', effect: 'read_more', text: '"이 성채에서 나간 자는 없다. 작품들이 말해줬다."' },
        { label: '버리고 뛴다', effect: 'skip' }
      ]
    }
  },
  {
    id: 'cp1_arrive', x: 1580, triggered: false,
    dialog: [
      { speaker: '조각가', text: '서두를 필요 없어. 이 복도는 내가 만든 거니까.' },
      { speaker: '너', text: '저 불빛… 출구인가?' },
      { speaker: '조각가', text: '그래. 하지만 먼저 내 작품실을 지나야 한다.' }
    ]
  },
  {
    id: 'door_choice', x: 2200, triggered: false,
    dialog: [
      { speaker: '너', text: '갈림길이다. 왼쪽엔 좁은 통로, 오른쪽엔 불 켜진 방.' }
    ],
    choice: {
      prompt: '어느 쪽으로 가겠는가?',
      options: [
        { label: '좁은 통로 (빠르지만 어둡다)', effect: 'path_dark', text: '어둠 속에서 손이 벽을 스쳐지나간다. 차갑다. 인간의 손이다.' },
        { label: '불 켜진 방 (느리지만 보인다)', effect: 'path_light', text: '방 안엔 조각상들이 빼곡하다. 모두 공포에 질린 표정이다.' }
      ]
    }
  },
  {
    id: 'cp2_chase', x: 3580, triggered: false,
    dialog: [
      { speaker: '조각가', text: '…이제 장난은 끝났다.' },
      { speaker: '너', text: '발소리다. 빠르다!' },
      { speaker: '조각가', text: '도망쳐도 좋아. 그게 더 아름다우니까.' }
    ]
  },
  {
    id: 'tool_found', x: 4800, triggered: false, item: '조각가의 끌',
    dialog: [
      { speaker: '너', text: '바닥에 뭔가 떨어져 있다. 조각도? 그의 도구다.' }
    ],
    choice: {
      prompt: '도구를 집겠는가?',
      options: [
        { label: '집는다', effect: 'pick_tool', text: '손에 쥐는 순간 차갑고 무겁다. 이걸로 그를 끝낼 수 있을까.' },
        { label: '두고 간다', effect: 'skip', text: '더러워서 건드리기 싫다. 그냥 뛴다.' }
      ]
    }
  },
  {
    id: 'library', x: 6000, triggered: false,
    dialog: [
      { speaker: '기록 (도서관 벽)', text: '"작품이 완성되면 창조자는 소멸한다."' },
      { speaker: '기록', text: '"그는 스스로도 알고 있다. 그래서 마지막 작품을 찾는다."' },
      { speaker: '너', text: '…마지막 작품이 나인가.' }
    ]
  },
  {
    id: 'final_trap', x: 7800, triggered: false,
    dialog: [
      { speaker: '조각가', text: '여기까지 왔군. 기대 이상이야.' },
      { speaker: '너', text: '더 가야 한다. 저 탑만 넘으면—' },
      { speaker: '조각가', text: '탑은 내가 설계했다. 모든 함정도.' }
    ],
    choice: {
      prompt: '어떻게 할 것인가?',
      options: [
        { label: '끌을 꺼낸다 (끌 보유 시)', effect: 'use_tool', text: '끌을 들어올리자 그가 잠깐 멈춘다. "…그걸 어디서?"' },
        { label: '무조건 뛴다', effect: 'run', text: '심장이 터질 것 같다. 뛰어. 그냥 뛰어.' }
      ]
    }
  },
  {
    id: 'ending_gate', x: 9400, triggered: false,
    dialog: [
      { speaker: '조각가', text: '이제 끝이야. 내 마지막 작품.' },
      { speaker: '너', text: '아니… 끝낼 건 내가야.' }
    ],
    choice: {
      prompt: '최후의 선택',
      options: [
        { label: '끌로 장치를 부순다', effect: 'ending_true', text: '쾅! 장치가 부서지며 조각가가 굳어간다. 성채가 무너진다.' },
        { label: '그냥 문으로 뛰어든다', effect: 'ending_escape', text: '문을 통과하는 순간 등 뒤에서 쇠사슬 소리가 멈춘다.' }
      ]
    }
  }
];

const inventory = new Set(); // 참고용 (UI 미표시)

// ========== 팝업 시스템 ==========
let popup = null; // { lines, lineIdx, choice, chosenEffect, phase }

function triggerEvent(ev) {
  ev.triggered = true;
  const lines = ev.dialog.map(d => d);
  popup = {
    lines,
    lineIdx: 0,
    choice: ev.choice || null,
    item: ev.item || null,
    phase: 'dialog' // dialog | choice | result
  };
  if (ev.item) inventory.add(ev.item);
}

function advancePopup() {
  if (!popup) return;
  if (popup.phase === 'dialog') {
    popup.lineIdx++;
    if (popup.lineIdx >= popup.lines.length) {
      if (popup.choice) {
        popup.phase = 'choice';
        popup.selectedOption = 0;
      } else {
        popup = null;
      }
    }
  } else if (popup.phase === 'result') {
    popup = null;
  }
}

function handleChoiceSelect(idx) {
  if (!popup || popup.phase !== 'choice') return;
  const opt = popup.choice.options[idx];
  if (!opt) return;
  // apply effect
  if (opt.effect === 'pick_tool') inventory.add('조각가의 끌');
  if (opt.effect === 'ending_true' || opt.effect === 'ending_escape') {
    const endText = opt.effect === 'ending_true'
      ? '【 진엔딩 】 너는 조각가의 장치로 그를 석화시키고 성채를 탈출했다. 하지만 손에 남은 끌 자국이… 그와 닮아 있었다.'
      : '【 탈출 엔딩 】 문을 통과했다. 조각가의 소리는 사라졌다. 하지만 등 뒤엔 아무것도 없었다. 처음부터.';
    popup = { phase: 'result', resultText: endText, lines: [], lineIdx: 0 };
    return;
  }
  popup.phase = 'result';
  popup.resultText = opt.text;
}

// 키보드로 팝업 조작
function handlePopupInput() {
  if (!popup) return false;
  if (popup.phase === 'dialog') {
    if (keysPressed['Enter'] || keysPressed[' '] || keysPressed['z'] || keysPressed['Z']) {
      advancePopup();
    }
    return true;
  }
  if (popup.phase === 'choice') {
    if (keysPressed['ArrowUp']) popup.selectedOption = Math.max(0, (popup.selectedOption || 0) - 1);
    if (keysPressed['ArrowDown']) popup.selectedOption = Math.min(popup.choice.options.length - 1, (popup.selectedOption || 0) + 1);
    if (keysPressed['Enter'] || keysPressed['z'] || keysPressed['Z']) {
      handleChoiceSelect(popup.selectedOption || 0);
    }
    return true;
  }
  if (popup.phase === 'result') {
    if (keysPressed['Enter'] || keysPressed[' '] || keysPressed['z'] || keysPressed['Z']) {
      popup = null;
    }
    return true;
  }
  return false;
}

// ========== 레벨 ==========
const story = [
  '너는 폐허 성채의 지하에서 깨어난다. 벽에는 말없이 웃는 "작품"들이 걸려 있다.',
  '"조각가"라 불리는 사이코가 사람을 석화해 작품으로 만든다는 소문이 떠돈다.',
  '쇠사슬 소리. 그는 여기 있다. 살아서 나가려면 함정과 추격을 견뎌야 한다.',
  '도서관의 기록: "작품이 완성되면 창조자는 소멸한다."',
  '성채가 붕괴하기 시작한다. 너는 조각가의 도구로 그를 완성해야 한다.'
];

const level = { platforms: [], spikes: [], checkpoints: [], texts: [], hideSpots: [], levers: [], keys: [], doors: [], darkZones: [] };

function buildLevel() {
  level.platforms = [];
  level.spikes = [];
  level.checkpoints = [];
  level.texts = [];
  level.hideSpots = [];
  level.levers = [];
  level.keys = [];
  level.doors = [];
  level.darkZones = [];

  for (let i = 0; i < 120; i++) level.platforms.push({ x: i * 80, y: 500, w: 80, h: 40 });

  const adds = [
    [400, 420, 120, 20], [560, 360, 120, 20], [760, 300, 120, 20],
    [1100, 430, 160, 20], [1400, 380, 120, 20], [1650, 320, 120, 20],
    [2100, 440, 160, 20], [2350, 380, 120, 20], [2600, 320, 120, 20],
    [3000, 420, 180, 20], [3350, 360, 140, 20], [3650, 300, 140, 20],
    [4100, 420, 180, 20], [4450, 360, 140, 20], [4750, 300, 140, 20],
    [5200, 440, 200, 20], [5600, 380, 160, 20], [5900, 320, 160, 20],
    [6350, 420, 200, 20], [6750, 360, 160, 20], [7050, 300, 160, 20],
    [7500, 440, 220, 20], [7900, 380, 180, 20], [8200, 320, 180, 20],
    [8650, 420, 220, 20], [9050, 360, 180, 20], [9350, 300, 180, 20]
  ];
  adds.forEach(p => level.platforms.push({ x: p[0], y: p[1], w: p[2], h: p[3] }));

  [900, 1000, 1280, 1900, 2050, 2480, 3120, 3800, 4200, 5100, 5480, 6200, 6880, 7600, 8350, 8800].forEach(x => {
    level.spikes.push({ x, y: 480, w: 40, h: 20, active: true, linkedLever: null });
  });

  level.checkpoints = [
    { x: 1600, y: 460, id: 1 },
    { x: 3600, y: 460, id: 2 },
    { x: 5900, y: 460, id: 3 },
    { x: 8200, y: 460, id: 4 }
  ];

  level.texts = [
    { x: 200, text: story[0] },
    { x: 1500, text: story[1] },
    { x: 3300, text: story[2] },
    { x: 5200, text: story[3] },
    { x: 8600, text: story[4] }
  ];

  // 🫥 숨기 포인트 (관/벽 틈) — Down키로 숨으면 추격자 시야 차단
  level.hideSpots = [
    { x: 700,  y: 462, w: 36, h: 38 },
    { x: 1850, y: 462, w: 36, h: 38 },
    { x: 2900, y: 462, w: 36, h: 38 },
    { x: 4300, y: 462, w: 36, h: 38 },
    { x: 5700, y: 462, w: 36, h: 38 },
    { x: 7200, y: 462, w: 36, h: 38 },
    { x: 8700, y: 462, w: 36, h: 38 },
  ];

  // 🔧 레버 — 상호작용(Up키)하면 연결된 가시 비활성화
  level.levers = [
    { x: 1150, y: 462, w: 20, h: 38, activated: false, targetSpikeX: 1280 },
    { x: 2400, y: 362, w: 20, h: 38, activated: false, targetSpikeX: 2480 },
    { x: 4500, y: 362, w: 20, h: 38, activated: false, targetSpikeX: 4200 },
    { x: 6750, y: 362, w: 20, h: 38, activated: false, targetSpikeX: 6880 },
    { x: 8000, y: 362, w: 20, h: 38, activated: false, targetSpikeX: 7600 },
  ];

  // 🔑 열쇠 — 먹으면 인벤에 추가
  level.keys = [
    { x: 850,  y: 460, collected: false, id: 'key1' },
    { x: 3200, y: 460, collected: false, id: 'key2' },
    { x: 5500, y: 440, collected: false, id: 'key3' },
    { x: 7800, y: 360, collected: false, id: 'key4' },
  ];

  // 🚪 잠긴 문 — 해당 열쇠 있어야 통과
  level.doors = [
    { x: 1050, y: 460, w: 30, h: 80, locked: true, keyId: 'key1' },
    { x: 3500, y: 460, w: 30, h: 80, locked: true, keyId: 'key2' },
    { x: 6000, y: 460, w: 30, h: 80, locked: true, keyId: 'key3' },
    { x: 8100, y: 460, w: 30, h: 80, locked: true, keyId: 'key4' },
  ];

  // 🌑 어둠 구간 — 이 구간에선 캔버스 전체 어둡고 플레이어 주변만 보임
  level.darkZones = [
    { x: 2200, w: 600 },
    { x: 4800, w: 700 },
    { x: 7300, w: 800 },
  ];
}
buildLevel();

const player = { x: 120, y: 420, w: 26, h: 40, vx: 0, vy: 0, onGround: false, hp: 3, checkpoint: 0, hiding: false, collectedKeys: new Set() };
const chaser = { x: -200, y: 420, w: 26, h: 44, speed: 2.2, active: false, alert: true, searchTimer: 0 };
let cameraX = 0;
let currentText = '';
let chaseMode = false;

function reset() {
  player.x = 120; player.y = 420; player.vx = 0; player.vy = 0; player.hp = 3; player.checkpoint = 0;
  player.hiding = false; player.collectedKeys = new Set();
  chaser.x = -200; chaser.y = 420; chaser.active = false; chaser.alert = true; chaser.searchTimer = 0;
  currentText = story[0];
  popup = null;
  storyEvents.forEach(e => e.triggered = false);
}

function respawn() {
  const cp = level.checkpoints.find(c => c.id === player.checkpoint);
  if (cp) { player.x = cp.x; player.y = cp.y - 40; }
  else { player.x = 120; player.y = 420; }
  player.vx = 0; player.vy = 0;
  chaser.x = player.x - 260; chaser.y = player.y; chaser.active = player.checkpoint >= 1;
}

function update(dt) {
  // 팝업 중이면 키 처리 후 물리 멈춤
  const blocked = handlePopupInput();
  // keysPressed 클리어
  Object.keys(keysPressed).forEach(k => delete keysPressed[k]);

  if (blocked) return;

  const left = keys['ArrowLeft'] || keys['a'] || keys['A'];
  const right = keys['ArrowRight'] || keys['d'] || keys['D'];
  const jump = keys['ArrowUp'] || keys['w'] || keys['W'];
  const hide = keys['ArrowDown'] || keys['s'] || keys['S'];
  const dash = keys['Shift'];

  const speed = dash ? 4.2 : 2.6;
  player.vx = (left ? -speed : 0) + (right ? speed : 0);
  if (jump && player.onGround) { player.vy = -12.5; player.onGround = false; }
  player.vy += gravity;
  player.x += player.vx;
  player.y += player.vy;

  player.onGround = false;
  for (const p of level.platforms) {
    if (player.x < p.x + p.w && player.x + player.w > p.x &&
        player.y + player.h > p.y && player.y + player.h < p.y + p.h + 20 && player.vy >= 0) {
      player.y = p.y - player.h;
      player.vy = 0;
      player.onGround = true;
    }
  }

  // 가시 (active 상태인 것만)
  for (const s of level.spikes) {
    if (!s.active) continue;
    if (player.x < s.x + s.w && player.x + player.w > s.x &&
        player.y + player.h > s.y && player.y < s.y + s.h) {
      player.hp -= 1;
      if (player.hp <= 0) { player.hp = 3; respawn(); }
      else { player.y -= 40; }
      break;
    }
  }

  // 🔧 레버 상호작용 (Up키 + 근접)
  if (jump && player.onGround) {
    for (const lv of level.levers) {
      if (!lv.activated && Math.abs(player.x - lv.x) < 40 && Math.abs(player.y - lv.y) < 60) {
        lv.activated = true;
        const spike = level.spikes.find(s => s.x === lv.targetSpikeX);
        if (spike) spike.active = false;
        currentText = '레버를 당겼다. 앞의 가시가 사라진다.';
        break;
      }
    }
  }

  // 🔑 열쇠 수집
  for (const k of level.keys) {
    if (!k.collected && Math.abs(player.x - k.x) < 28 && Math.abs(player.y + player.h - k.y) < 30) {
      k.collected = true;
      player.collectedKeys.add(k.id);
      currentText = '열쇠를 주웠다.';
    }
  }

  // 🚪 잠긴 문 충돌 (열쇠 없으면 통과 불가)
  for (const d of level.doors) {
    if (!d.locked) continue;
    if (player.x + player.w > d.x && player.x < d.x + d.w &&
        player.y + player.h > d.y && player.y < d.y + d.h) {
      if (player.collectedKeys.has(d.keyId)) {
        d.locked = false;
        currentText = '문이 열렸다.';
      } else {
        // 막힘
        player.x = d.x - player.w - 1;
        player.vx = 0;
        currentText = '잠겨있다. 열쇠가 필요하다.';
      }
    }
  }

  for (const c of level.checkpoints) {
    if (player.x < c.x + 20 && player.x + player.w > c.x && player.y + player.h > c.y - 20) {
      if (player.checkpoint < c.id) sfxCheckpoint();
      player.checkpoint = Math.max(player.checkpoint, c.id);
      chaser.active = player.checkpoint >= 1;
    }
  }

  // 🫥 숨기 판정
  player.hiding = false;
  if (hide && player.onGround) {
    for (const hs of level.hideSpots) {
      if (player.x + player.w > hs.x && player.x < hs.x + hs.w &&
          player.y + player.h > hs.y && player.y < hs.y + hs.h) {
        player.hiding = true;
        break;
      }
    }
  }

  // 스토리 이벤트 트리거
  for (const ev of storyEvents) {
    if (!ev.triggered && player.x >= ev.x) {
      triggerEvent(ev);
      break;
    }
  }

  // 텍스트 트리거
  for (const t of level.texts) {
    if (player.x > t.x) currentText = t.text;
  }

  const prevChase = chaseMode;
  chaseMode = player.checkpoint >= 1;
  if (chaseMode !== prevChase) setChaserIntensity(chaseMode);

  if (chaseMode) {
    chaser.active = true;

    // 👁 시야 기반 추격자 AI
    const dist = player.x - chaser.x;
    const sightRange = 400;

    if (player.hiding) {
      // 숨으면 추격자가 탐색 모드로
      chaser.alert = false;
      chaser.searchTimer = Math.max(0, chaser.searchTimer - dt);
      if (chaser.searchTimer <= 0) {
        // 탐색: 천천히 앞으로
        chaser.x += 0.5;
      }
    } else if (Math.abs(dist) < sightRange) {
      // 시야 내 발견
      chaser.alert = true;
      chaser.searchTimer = 120;
      const gap = dist;
      chaser.x += gap > 300 ? chaser.speed * 2.0 : chaser.speed;
    } else {
      // 시야 밖 — 마지막 위치 기억하고 천천히 이동
      chaser.searchTimer = Math.max(0, chaser.searchTimer - dt);
      if (chaser.searchTimer > 0) {
        chaser.x += chaser.speed * 0.7;
      }
      chaser.alert = false;
    }
  }

  if (chaser.active && !player.hiding && Math.abs(player.x - chaser.x) < 40 && Math.abs(player.y - chaser.y) < 50) {
    player.hp -= 1;
    sfxHit();
    if (player.hp <= 0) { player.hp = 3; respawn(); }
    else { player.x += 80; chaser.x = player.x - 260; }
  }

  cameraX = Math.max(0, player.x - 260);

  if (player.x > 9500) {
    currentText = '엔딩 게이트에 도달했다.';
    stateEl.textContent = '완주';
  } else {
    stateEl.textContent = player.hiding ? '🫥 은신' : (chaseMode ? (chaser.alert ? '🔴 추격' : '🟡 탐색') : '탐색');
  }

  hpEl.textContent = '❤️'.repeat(player.hp);
  cpEl.textContent = player.checkpoint;
  storyEl.textContent = currentText;
}

// ========== 팝업 렌더링 ==========
function drawPopup() {
  if (!popup) return;

  const pw = 700, ph = popup.phase === 'choice' ? 220 : 160;
  const px = (W - pw) / 2, py = H - ph - 20;

  // 반투명 배경
  ctx.save();
  ctx.fillStyle = 'rgba(6,8,16,0.93)';
  ctx.strokeStyle = '#3a4a6a';
  ctx.lineWidth = 2;
  roundRect(ctx, px, py, pw, ph, 12);
  ctx.fill();
  ctx.stroke();

  if (popup.phase === 'dialog') {
    const line = popup.lines[popup.lineIdx];
    ctx.fillStyle = '#7ef9ff';
    ctx.font = 'bold 14px system-ui';
    ctx.fillText(line.speaker, px + 20, py + 28);
    ctx.fillStyle = '#dde4f0';
    ctx.font = '14px system-ui';
    wrapText(ctx, line.text, px + 20, py + 52, pw - 40, 22);
    ctx.fillStyle = '#5a6880';
    ctx.font = '12px system-ui';
    ctx.fillText('[ Z / Enter 계속 ]', px + pw - 130, py + ph - 14);
  }

  if (popup.phase === 'choice') {
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 14px system-ui';
    ctx.fillText(popup.choice.prompt, px + 20, py + 28);
    popup.choice.options.forEach((opt, i) => {
      const selected = (popup.selectedOption || 0) === i;
      ctx.fillStyle = selected ? '#7ef9ff' : '#8a9ab8';
      ctx.font = selected ? 'bold 14px system-ui' : '14px system-ui';
      ctx.fillText((selected ? '▶ ' : '  ') + opt.label, px + 30, py + 62 + i * 32);
    });
    ctx.fillStyle = '#5a6880';
    ctx.font = '12px system-ui';
    ctx.fillText('[ ↑↓ 선택  Z / Enter 확인 ]', px + pw - 180, py + ph - 14);
  }

  if (popup.phase === 'result') {
    ctx.fillStyle = '#ff9f43';
    ctx.font = 'bold 14px system-ui';
    ctx.fillText('—', px + 20, py + 28);
    ctx.fillStyle = '#dde4f0';
    ctx.font = '14px system-ui';
    wrapText(ctx, popup.resultText, px + 20, py + 52, pw - 40, 22);
    ctx.fillStyle = '#5a6880';
    ctx.font = '12px system-ui';
    ctx.fillText('[ Z / Enter 닫기 ]', px + pw - 130, py + ph - 14);
  }

  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  let cy = y;
  for (const w of words) {
    const test = line + w + ' ';
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, cy);
      line = w + ' ';
      cy += lineH;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, cy);
}

// ========== 그리기 ==========
function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0b0f1a';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#12182a';
  for (let i = 0; i < 12; i++) {
    ctx.fillRect((i * 180 - cameraX * 0.4) % 1400 - 200, 180, 140, 200);
  }

  if (eyeWallImg.complete) {
    ctx.save();
    ctx.globalAlpha = 0.38;
    const imgW = 280, imgH = 160;
    const offset = (cameraX * 0.25) % (imgW + 60);
    for (let i = -1; i < Math.ceil(W / (imgW + 60)) + 1; i++) {
      ctx.drawImage(eyeWallImg, i * (imgW + 60) - offset, 200, imgW, imgH);
    }
    ctx.restore();
  }

  drawProps();

  ctx.fillStyle = '#2a334a';
  for (const p of level.platforms) ctx.fillRect(p.x - cameraX, p.y, p.w, p.h);

  ctx.fillStyle = '#8b1a1a';
  for (const s of level.spikes) {
    const sx = s.x - cameraX;
    const tw = s.w / 3;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(sx + i * tw, s.y + s.h);
      ctx.lineTo(sx + i * tw + tw / 2, s.y);
      ctx.lineTo(sx + i * tw + tw, s.y + s.h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#5c0f0f';
    ctx.fillRect(sx, s.y + s.h - 4, s.w, 4);
    ctx.fillStyle = '#8b1a1a';
  }

  for (const c of level.checkpoints) {
    ctx.fillStyle = player.checkpoint >= c.id ? '#7ef9ff' : '#3b4a6a';
    ctx.fillRect(c.x - cameraX, c.y - 40, 16, 40);
  }

  // 🫥 숨기 포인트 (관 모양)
  for (const hs of level.hideSpots) {
    const sx = hs.x - cameraX;
    if (sx < -60 || sx > W + 60) continue;
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(sx, hs.y, hs.w, hs.h);
    ctx.strokeStyle = '#3a3a5a';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, hs.y, hs.w, hs.h);
    // 십자 문양
    ctx.strokeStyle = '#2a2a4a';
    ctx.beginPath(); ctx.moveTo(sx + hs.w/2, hs.y + 4); ctx.lineTo(sx + hs.w/2, hs.y + hs.h - 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx + 4, hs.y + hs.h/2); ctx.lineTo(sx + hs.w - 4, hs.y + hs.h/2); ctx.stroke();
    // 힌트 텍스트
    ctx.fillStyle = '#4a4a6a';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('↓ 숨기', sx + hs.w/2, hs.y - 4);
    ctx.textAlign = 'left';
  }

  // 🔧 레버
  for (const lv of level.levers) {
    const sx = lv.x - cameraX;
    if (sx < -40 || sx > W + 40) continue;
    ctx.fillStyle = lv.activated ? '#7ef9ff' : '#d4a017';
    ctx.fillRect(sx, lv.y + 10, 8, 28);
    // 레버 손잡이
    ctx.fillStyle = lv.activated ? '#3a8a9a' : '#8a6010';
    ctx.fillRect(sx - 6, lv.activated ? lv.y + 10 : lv.y + 28, 20, 8);
    ctx.fillStyle = '#5a5a7a';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(lv.activated ? '✓' : '↑ 레버', sx + 4, lv.y + 6);
    ctx.textAlign = 'left';
  }

  // 🔑 열쇠
  for (const k of level.keys) {
    if (k.collected) continue;
    const sx = k.x - cameraX;
    if (sx < -20 || sx > W + 20) continue;
    // 열쇠 본체
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(sx + 8, k.y - 8, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a1a2a';
    ctx.beginPath(); ctx.arc(sx + 8, k.y - 8, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(sx + 14, k.y - 10, 12, 4);
    ctx.fillRect(sx + 20, k.y - 6, 4, 4);
    ctx.fillRect(sx + 24, k.y - 6, 4, 4);
    // 반짝임
    if (Math.floor(Date.now() / 600) % 2 === 0) {
      ctx.fillStyle = 'rgba(255,209,102,0.3)';
      ctx.beginPath(); ctx.arc(sx + 8, k.y - 8, 12, 0, Math.PI * 2); ctx.fill();
    }
  }

  // 🚪 잠긴 문
  for (const d of level.doors) {
    const sx = d.x - cameraX;
    if (sx < -50 || sx > W + 50) continue;
    if (!d.locked) continue;
    ctx.fillStyle = '#2a1a0a';
    ctx.fillRect(sx, d.y, d.w, d.h);
    ctx.strokeStyle = '#5a3a1a';
    ctx.lineWidth = 3;
    ctx.strokeRect(sx, d.y, d.w, d.h);
    // 자물쇠
    ctx.fillStyle = '#d4a017';
    ctx.fillRect(sx + 8, d.y + 30, 14, 12);
    ctx.strokeStyle = '#d4a017';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(sx + 15, d.y + 30, 5, Math.PI, 0); ctx.stroke();
  }

  // 플레이어 숨기 시 반투명
  if (player.hiding) {
    ctx.save(); ctx.globalAlpha = 0.35;
    drawSprite(playerSprite, player.x - cameraX - 10, player.y - 8, 2);
    ctx.restore();
  } else {
    drawSprite(playerSprite, player.x - cameraX - 10, player.y - 8, 2);
  }

  if (chaser.active) {
    // 추격자 시야 표시
    if (chaser.alert) {
      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = '#ff3b3b';
      ctx.fillRect(chaser.x - cameraX, chaser.y - 60, 420, 120);
      ctx.restore();
    }
    drawSprite(chaserSprite, chaser.x - cameraX - 10, chaser.y - 8, 2);
  }

  ctx.fillStyle = '#ffd166';
  ctx.fillRect(9550 - cameraX, 420, 24, 80);

  // 🌑 어둠 구간 — 플레이어 주변만 보임
  const inDark = level.darkZones.some(z => player.x >= z.x && player.x <= z.x + z.w);
  if (inDark) {
    ctx.save();
    const px = player.x - cameraX + player.w/2;
    const py = player.y + player.h/2;
    const grad = ctx.createRadialGradient(px, py, 40, px, py, 180);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.94)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  drawPopup();
}

// ========== 배경 소품 ==========
const propList = [];
function buildProps() {
  const types = ['statue','candle','handprint','window','eyewall','chain'];
  [300,600,950,1300,1700,2100,2500,2900,3300,3700,4100,4500,4900,5300,5700,6100,6500,6900,7300,7700,8100,8500,9000,9300]
    .forEach((x,i) => propList.push({ x, type: types[i % types.length] }));
}
buildProps();

function drawProps() {
  for (const p of propList) {
    const sx = p.x - cameraX * 0.6;
    if (sx < -120 || sx > W + 120) continue;
    const y = 440;
    switch (p.type) {
      case 'statue': drawStatue(sx, y); break;
      case 'candle': drawCandle(sx, y); break;
      case 'handprint': drawHandprint(sx, y - 80); break;
      case 'window': drawWindow(sx, y - 120); break;
      case 'eyewall': drawEyeWall(sx, y - 60); break;
      case 'chain': drawChain(sx, y - 140); break;
    }
  }
}

function drawStatue(x, y) {
  ctx.save(); ctx.globalAlpha = 0.45; ctx.fillStyle = '#7d8a9a';
  ctx.fillRect(x - 8, y - 55, 16, 30);
  ctx.save(); ctx.translate(x + 4, y - 65); ctx.rotate(0.4);
  ctx.fillRect(-7, -10, 14, 14); ctx.restore();
  ctx.fillRect(x + 8, y - 70, 5, 30);
  ctx.fillRect(x - 13, y - 45, 5, 18);
  ctx.fillRect(x - 7, y - 25, 7, 25);
  ctx.fillRect(x, y - 25, 7, 25);
  ctx.strokeStyle = '#4a5060'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x - 4, y - 50); ctx.lineTo(x + 2, y - 30); ctx.stroke();
  ctx.restore();
}
function drawCandle(x, y) {
  ctx.save(); ctx.globalAlpha = 0.7;
  ctx.fillStyle = '#555e72'; ctx.fillRect(x - 3, y - 18, 6, 18);
  ctx.fillStyle = '#ccc'; ctx.fillRect(x - 1, y - 22, 2, 5);
  const f = Math.sin(Date.now() * 0.008) * 2;
  ctx.fillStyle = '#ff9f43'; ctx.beginPath(); ctx.ellipse(x, y - 24 + f, 4, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff176'; ctx.beginPath(); ctx.ellipse(x, y - 24 + f, 2, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.12; ctx.fillStyle = '#ff9f43';
  ctx.beginPath(); ctx.ellipse(x, y - 22, 22, 22, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawHandprint(x, y) {
  ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#7b1c1c';
  ctx.beginPath(); ctx.ellipse(x, y + 10, 10, 12, -0.3, 0, Math.PI * 2); ctx.fill();
  [[-8,-2,-1],[-4,-3,-0.2],[0,-4,0],[4,-3,0.2],[8,-2,1]].forEach(([fx,fy,a]) => {
    ctx.save(); ctx.translate(x + fx, y + fy); ctx.rotate(a);
    ctx.fillRect(-2, -14, 4, 14); ctx.restore();
  }); ctx.restore();
}
function drawWindow(x, y) {
  ctx.save(); ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#3d4d6a'; ctx.lineWidth = 3;
  ctx.strokeRect(x - 22, y - 30, 44, 50);
  ctx.fillStyle = '#05060a'; ctx.fillRect(x - 21, y - 29, 43, 49);
  ctx.globalAlpha = 0.9; ctx.fillStyle = '#ff3b3b';
  ctx.beginPath(); ctx.ellipse(x - 7, y + 5, 5, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(x - 7, y + 5, 2, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawEyeWall(x, y) {
  ctx.save(); ctx.globalAlpha = 0.4;
  ctx.strokeStyle = '#4a3a2a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - 18, y); ctx.quadraticCurveTo(x, y - 18, x + 18, y);
  ctx.quadraticCurveTo(x, y + 18, x - 18, y); ctx.stroke();
  ctx.fillStyle = '#2e1a1a'; ctx.beginPath(); ctx.ellipse(x, y, 7, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff3b3b'; ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.ellipse(x, y, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawChain(x, y) {
  ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = '#5a6070'; ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    ctx.save(); ctx.translate(x, y + i * 14); ctx.rotate(i % 2 === 0 ? 0 : Math.PI / 2);
    ctx.strokeRect(-4, -6, 8, 12); ctx.restore();
  }
  ctx.restore();
}

// ========== 오디오 ==========
let _audioCtx = null;
let _musicStarted = false;
let _bgmAudio = null;

function initAudio() {
  if (_musicStarted) return;
  _musicStarted = true;

  // BGM — 유저 제공 mp3
  _bgmAudio = new Audio('assets/bgm.mp3');
  _bgmAudio.loop = true;
  _bgmAudio.volume = 0.45;
  _bgmAudio.play().catch(() => {});

  // Web Audio (SFX용)
  _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
}

function _getMaster() {
  if (!_audioCtx._master) {
    const g = _audioCtx.createGain();
    g.gain.value = 0.5;
    g.connect(_audioCtx.destination);
    _audioCtx._master = g;
  }
  return _audioCtx._master;
}

function sfxHit() {
  if (!_audioCtx) return;
  const osc = _audioCtx.createOscillator();
  const gain = _audioCtx.createGain();
  osc.type = 'square'; osc.frequency.value = 110;
  osc.frequency.linearRampToValueAtTime(35, _audioCtx.currentTime + 0.35);
  gain.gain.setValueAtTime(0.28, _audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, _audioCtx.currentTime + 0.4);
  osc.connect(gain); gain.connect(_getMaster());
  osc.start(); osc.stop(_audioCtx.currentTime + 0.4);
}

function sfxCheckpoint() {
  if (!_audioCtx) return;
  [220, 277, 330].forEach((f, i) => {
    const osc = _audioCtx.createOscillator();
    const gain = _audioCtx.createGain();
    osc.type = 'sine'; osc.frequency.value = f;
    const t = _audioCtx.currentTime + i * 0.13;
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(gain); gain.connect(_getMaster());
    osc.start(t); osc.stop(t + 0.5);
  });
}

function setChaserIntensity(on) {
  if (_bgmAudio) {
    // 추격 시 볼륨 살짝 올림
    _bgmAudio.volume = on ? 0.75 : 0.45;
  }
}
const introLines = [
  '눈이 떠진다.',
  '차갑다. 돌바닥.',
  '여기가 어디지…',
  '벽에 뭔가 걸려 있다.',
  '…웃고 있다. 조각상들이.',
  '발소리가 들린다. 멀리서.',
  '도망쳐야 한다.',
];

let introState = {
  active: true,
  lineIdx: 0,
  charIdx: 0,
  displayText: '',
  timer: 0,
  fadeIn: 0,       // 0→1 배경 페이드
  done: false,
};

function updateIntro(dt) {
  if (!introState.active) return;

  introState.fadeIn = Math.min(1, introState.fadeIn + 0.015 * dt);

  // 아무 키나 누르면 바로 스킵
  if (Object.keys(keysPressed).length > 0) {
    if (!introState.done) {
      // 첫 번째 키: 텍스트 전체 표시
      introState.displayText = introLines.join('\n');
      introState.lineIdx = introLines.length;
      introState.done = true;
      Object.keys(keysPressed).forEach(k => delete keysPressed[k]);
      return;
    } else {
      // 두 번째 키: 게임 시작
      introState.active = false;
      Object.keys(keysPressed).forEach(k => delete keysPressed[k]);
      return;
    }
  }
  introState.timer += dt;
  // 타이핑 속도: 1.5프레임당 한 글자
  if (introState.timer >= 1.5) {
    introState.timer = 0;
    if (introState.lineIdx >= introLines.length) { introState.done = true; return; }
    const line = introLines[introState.lineIdx];
    if (introState.charIdx < line.length) {
      introState.displayText += line[introState.charIdx];
      introState.charIdx++;
    } else {
      // 줄 끝 — 잠시 대기 후 다음 줄
      introState.timer = -30;
      introState.lineIdx++;
      introState.charIdx = 0;
      if (introState.lineIdx >= introLines.length) {
        introState.done = true;
        return;
      }
      introState.displayText += '\n';
    }
  }
  Object.keys(keysPressed).forEach(k => delete keysPressed[k]);
}

function drawIntro() {
  // 배경 — 성채 복도 느낌
  ctx.fillStyle = '#060810';
  ctx.fillRect(0, 0, W, H);

  // 배경 소품 페이드인
  ctx.save();
  ctx.globalAlpha = introState.fadeIn * 0.4;
  if (eyeWallImg.complete) {
    ctx.drawImage(eyeWallImg, 0, 80, W, 300);
  }
  ctx.restore();

  // 어두운 오버레이
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // 독백 텍스트
  ctx.save();
  ctx.globalAlpha = introState.fadeIn;
  ctx.fillStyle = '#b0c0d8';
  ctx.font = '18px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  ctx.textAlign = 'center';

  const lines = introState.displayText.split('\n');
  const startY = H / 2 - (lines.length * 28) / 2;
  lines.forEach((l, i) => {
    const alpha = i === lines.length - 1 ? 1 : 0.55;
    ctx.globalAlpha = introState.fadeIn * alpha;
    ctx.fillText(l, W / 2, startY + i * 32);
  });

  // 커서 깜빡임
  if (!introState.done && Math.floor(Date.now() / 500) % 2 === 0) {
    const lastLine = lines[lines.length - 1];
    const tw = ctx.measureText(lastLine).width;
    ctx.globalAlpha = introState.fadeIn;
    ctx.fillStyle = '#7ef9ff';
    ctx.fillRect(W / 2 + tw / 2 + 4, startY + (lines.length - 1) * 32 - 16, 2, 18);
  }

  // 완료 안내
  if (introState.done) {
    ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.004) * 0.3;
    ctx.fillStyle = '#7ef9ff';
    ctx.font = '13px monospace';
    ctx.fillText('[ Enter / Space 로 시작 ]', W / 2, H - 40);
  }

  ctx.restore();
  ctx.textAlign = 'left';
}

// ========== 루프 ==========
let last = 0;
function loop(ts) {
  const dt = (ts - last) / 16.67; last = ts;

  if (introState.active) {
    updateIntro(dt);
    drawIntro();
  } else {
    update(dt);
    draw();
  }

  requestAnimationFrame(loop);
}

reset();
requestAnimationFrame(loop);

