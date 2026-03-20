const logEl = document.getElementById('log');
const choicesEl = document.getElementById('choices');
const alertEl = document.getElementById('alert');
const stamEl = document.getElementById('stam');
const locEl = document.getElementById('loc');
const restartBtn = document.getElementById('restart');
const step = document.getElementById('step');

let state = {
  node: 'start',
  alert: 0,
  stamina: 100,
  noise: 0,
  hidden: false,
  inventory: []
};

const nodes = {
  start: {
    title: '정적의 복도',
    text: '형광등이 지직거리며 깜빡인다. 멀리서 금속이 긁히는 소리… “쿵.” 무언가가 다가온다.',
    choices: [
      { label: '숨을 고르고 천천히 이동', next: 'hall' },
      { label: '뛰어간다', next: 'hall', noise: 25, stamina: -20, danger: true },
      { label: '사물함에 숨는다', next: 'locker', noise: -10 }
    ]
  },
  locker: {
    title: '사물함',
    text: '철문 안에서 숨을 참는다. 밖에서 발소리가 가까워진다… “서걱.”',
    choices: [
      { label: '가만히 숨는다', next: 'hall', noise: -15 },
      { label: '급히 튀어나간다', next: 'hall', noise: 15, danger: true }
    ]
  },
  hall: {
    title: '긴 복도',
    text: '복도 끝에 계단이 보이고, 오른쪽엔 창고가 있다. 천장 스피커에서 “정숙” 방송이 반복된다.',
    choices: [
      { label: '창고로 들어간다', next: 'storage' },
      { label: '계단으로 올라간다', next: 'stairs', noise: 10 },
      { label: '의자 밑에 숨는다', next: 'underSeat', noise: -5 }
    ]
  },
  storage: {
    title: '창고',
    text: '걸레, 페인트, 오래된 마네킹. 마네킹 하나가 너를 보는 듯하다.',
    onEnter: () => addItem('테이프'),
    choices: [
      { label: '마네킹 뒤로 숨는다', next: 'mannequin', noise: -10 },
      { label: '창고 뒷문으로', next: 'backDoor', noise: 5 }
    ]
  },
  mannequin: {
    title: '마네킹의 숨결',
    text: '뒤에 숨었는데… 마네킹이 천천히 고개를 돌린다. “쉿.”',
    choices: [
      { label: '숨소리를 낮춘다', next: 'backDoor', noise: -10 },
      { label: '놀라서 튄다', next: 'hall', noise: 20, danger: true }
    ]
  },
  underSeat: {
    title: '의자 밑',
    text: '금속 의자 밑은 좁고 차갑다. 발소리가 바로 옆을 지나간다.',
    choices: [
      { label: '기다렸다가 이동', next: 'stairs', noise: -10 },
      { label: '지금 뛰어', next: 'stairs', noise: 15, stamina: -15, danger: true }
    ]
  },
  stairs: {
    title: '계단',
    text: '삐걱이는 계단. 위층 문 옆에 전기패널이 있다. 전원을 내리면 어둠이 된다.',
    choices: [
      { label: '전원을 내린다', next: 'dark', noise: 5 },
      { label: '그냥 위로 간다', next: 'floor2', noise: 10 }
    ]
  },
  dark: {
    title: '어둠',
    text: '불이 꺼지며 복도가 어두워진다. 어둠 속에서 네 숨소리만 들린다.',
    choices: [
      { label: '어둠을 이용해 이동', next: 'floor2', noise: -5 },
      { label: '문을 찾아 더듬기', next: 'panic', noise: 10, danger: true }
    ]
  },
  panic: {
    title: '패닉',
    text: '손이 미끄러진다. 금속 소리. 그 순간, 바로 뒤에서 숨결이 느껴진다.',
    choices: [
      { label: '전력 질주', next: 'chase', noise: 30, stamina: -30, danger: true },
      { label: '바닥에 엎드린다', next: 'caught', danger: true }
    ]
  },
  backDoor: {
    title: '뒷문',
    text: '문은 잠겨 있다. 테이프를 쓰면 잠깐 고정할 수 있을 것 같다.',
    choices: [
      { label: '테이프로 문을 고정', next: 'escapeRoute', require: '테이프' },
      { label: '복도로 돌아간다', next: 'hall' }
    ]
  },
  escapeRoute: {
    title: '배기통로',
    text: '문이 삐걱이며 열리고, 좁은 배기통로가 나타난다. 안쪽에서 찬바람이 나온다.',
    choices: [
      { label: '통로로 기어간다', next: 'vent', noise: -5 },
      { label: '무섭다, 되돌아', next: 'hall' }
    ]
  },
  vent: {
    title: '배기통로',
    text: '기어가다 보니 아래에 강당이 보인다. 중앙에 “출구” 표지판이 깜빡인다.',
    choices: [
      { label: '강당으로 내려간다', next: 'auditorium', noise: 10 },
      { label: '계속 기어간다', next: 'crawl', noise: 5 }
    ]
  },
  crawl: {
    title: '끝없는 통로',
    text: '통로가 점점 좁아진다. 뒤에서 금속이 긁히는 소리. 누군가 따라온다.',
    choices: [
      { label: '강당으로 내려간다', next: 'auditorium', noise: 10 },
      { label: '돌아간다', next: 'chase', noise: 20, danger: true }
    ]
  },
  floor2: {
    title: '2층 복도',
    text: '바닥이 젖어 있다. 발자국이 이상하게 네 발자국과 겹친다.',
    choices: [
      { label: '강당 쪽으로', next: 'auditorium', noise: 10 },
      { label: '교실로 숨기', next: 'classroom', noise: -5 }
    ]
  },
  classroom: {
    title: '교실',
    text: '칠판에 “도망가지 마”가 적혀있다. 창문이 열려 있고, 커튼이 흔들린다.',
    choices: [
      { label: '커튼 뒤로 숨는다', next: 'curtain', noise: -10 },
      { label: '창문으로 나간다', next: 'window', noise: 15 }
    ]
  },
  curtain: {
    title: '커튼 뒤',
    text: '발자국이 멈춘다. 누군가 교탁을 천천히 긁는다. “찾았다.”',
    choices: [
      { label: '숨을 죽인다', next: 'auditorium', noise: -10 },
      { label: '갑자기 튀어나간다', next: 'chase', noise: 25, danger: true }
    ]
  },
  window: {
    title: '창문 탈출?',
    text: '밖은 어두운 운동장. 하지만 창 아래에 부서진 자전거가 있다.',
    choices: [
      { label: '뛰어내린다', next: 'yard', noise: 20, stamina: -25, danger: true },
      { label: '다시 안으로', next: 'classroom' }
    ]
  },
  yard: {
    title: '운동장',
    text: '잔디가 젖어 있다. 저 멀리 정문이 보인다. 뒤에서 “쿵, 쿵.”',
    choices: [
      { label: '정문으로 전력 질주', next: 'escape', noise: 30, stamina: -30, danger: true },
      { label: '창문으로 복귀', next: 'classroom' }
    ]
  },
  auditorium: {
    title: '강당',
    text: '무대 위 스포트라이트가 켜진다. 의자 사이로 그림자가 지나간다.',
    choices: [
      { label: '무대 뒤로 숨는다', next: 'stage', noise: -5 },
      { label: '출구 표지판 쪽으로', next: 'exitDoor', noise: 10 }
    ]
  },
  stage: {
    title: '무대 뒤',
    text: '커튼 뒤에 거대한 무언가가 매달려 있다. 냄새가 난다.',
    choices: [
      { label: '움직이지 않는다', next: 'exitDoor', noise: -10 },
      { label: '커튼을 들춘다', next: 'endingB', danger: true }
    ]
  },
  exitDoor: {
    title: '비상구 문',
    text: '문이 잠겨 있다. 패널에 “경보 80% 이상 시 자동개방”이라고 적혀있다.',
    choices: [
      { label: '일부러 소리를 낸다', next: 'alarm', noise: 40, danger: true },
      { label: '문을 두드린다', next: 'alarm', noise: 20 },
      { label: '도망친다', next: 'chase', noise: 25, danger: true }
    ]
  },
  alarm: {
    title: '경보',
    text: '경보가 울리며 빨간 불이 켜진다. 뒤에서 괴상한 웃음소리. 문이 열리기 시작한다.',
    choices: [
      { label: '문을 통과한다', next: 'escape' },
      { label: '뒤를 돌아본다', next: 'endingA', danger: true }
    ]
  },
  chase: {
    title: '추격',
    text: '뒤에서 발소리가 겹친다. “쿵! 쿵!” 심장이 터질 것 같다.',
    choices: [
      { label: '숨는다', next: 'locker', noise: -10 },
      { label: '그냥 달린다', next: 'escape', noise: 25, stamina: -20, danger: true }
    ]
  },
  escape: {
    title: '탈출',
    text: '문이 열리고 차가운 공기가 들어온다. 밖으로 뛰쳐나온 순간, 핸드폰 알람이 울린다.',
    ending: true
  },
  endingA: {
    title: '엔딩 A — 돌아보지 말 걸',
    text: '뒤를 보는 순간, 얼굴 없는 형상이 네 얼굴을 덮는다. 화면이 꺼진다.',
    ending: true
  },
  endingB: {
    title: '병맛 엔딩 — 무대의 주인',
    text: '커튼을 들추자 무대용 인형들이 박수친다. “축하합니다, 당신이 오늘의 괴물!”',
    ending: true
  },
  caught: {
    title: '잡힘',
    text: '차가운 손이 어깨를 잡는다. “조용히 해.” 화면이 암전된다.',
    ending: true
  }
};

function render() {
  const node = nodes[state.node];
  if (!node) return;

  locEl.textContent = node.title;
  alertEl.textContent = Math.min(100, Math.max(0, Math.floor(state.alert)));
  stamEl.textContent = Math.max(0, Math.floor(state.stamina));

  logEl.innerHTML = `
    <h2 class="${node.ending ? 'glitch' : ''}">${node.title}</h2>
    <p>${node.text}</p>
    ${node.ending ? '<p class="subtitle">끝. 다시 하려면 아래 버튼을 눌러줘.</p>' : ''}
  `;

  if (node.ending) {
    choicesEl.innerHTML = '';
    return;
  }

  choicesEl.innerHTML = node.choices.map((c, i) => {
    const locked = c.require && !state.inventory.includes(c.require);
    const cls = `${c.danger ? 'danger' : ''} ${locked ? 'ghost' : ''}`.trim();
    const label = locked ? `${c.label} (필요: ${c.require})` : c.label;
    return `<button data-next="${c.next}" data-noise="${c.noise || 0}" data-stam="${c.stamina || 0}" class="${cls}" ${locked ? 'disabled' : ''}>${i + 1}. ${label}</button>`;
  }).join('');
}

function addItem(item) {
  if (!state.inventory.includes(item)) state.inventory.push(item);
}

function applyNoise(delta) {
  state.noise = Math.max(0, state.noise + delta);
  state.alert = Math.min(100, state.alert + Math.max(0, delta) * 0.9);
  if (state.alert >= 100) state.node = 'caught';
}

function applyStamina(delta) {
  state.stamina = Math.max(0, Math.min(100, state.stamina + delta));
  if (state.stamina <= 0) state.node = 'caught';
}

function go(next, noise = 0, stamina = 0) {
  const node = nodes[next];
  if (!node) return;
  try { step.currentTime = 0; step.play(); } catch (_) {}

  applyNoise(noise);
  applyStamina(stamina);

  state.node = next;
  if (node.onEnter) node.onEnter();
  render();
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-next]');
  if (!btn || btn.disabled) return;
  go(btn.dataset.next, Number(btn.dataset.noise), Number(btn.dataset.stam));
});

restartBtn.addEventListener('click', () => {
  state = { node: 'start', alert: 0, stamina: 100, noise: 0, hidden: false, inventory: [] };
  render();
});

render();
