const gameEl = document.getElementById('game');
const statsEl = document.getElementById('stats');
const restartBtn = document.getElementById('restart');
const beep = document.getElementById('beep');

let state = {
  step: 'start',
  courage: 3,
  items: []
};

const scenes = {
  start: {
    title: '막차 플랫폼',
    text: '시계는 00:03. 전광판이 꺼져 있고, 바람만 분다. 너는 승강장에 홀로 있다. 어디로 가볼까?',
    choices: [
      { label: '역무실로 간다', next: 'office' },
      { label: '터널로 내려간다', next: 'tunnel', danger: true },
      { label: '무인 편의점을 확인한다', next: 'store' }
    ]
  },
  office: {
    title: '잠긴 역무실',
    text: '문은 잠겼고, 내부에 형광등이 깜빡인다. 벽에 비상키패드가 있다.',
    choices: [
      { label: '키패드를 눌러본다', next: 'keypad' },
      { label: '복도로 돌아간다', next: 'start' }
    ]
  },
  keypad: {
    title: '삑…삑…',
    text: '키패드에 “막차”를 입력하자 문이 열리며 카드가 나온다. 보안카드다.',
    onEnter: () => addItem('보안카드'),
    choices: [
      { label: '보안실로 들어간다', next: 'security' },
      { label: '찝찝해서 나간다', next: 'start' }
    ]
  },
  security: {
    title: '보안실',
    text: 'CCTV 모니터에 비어 있는 2번 승강장과, 꺼진 발전실이 비친다. 책상 위에 지하도면이 있다.',
    choices: [
      { label: '지하도면을 챙긴다', next: 'map', require: null },
      { label: '보급창고로 간다', next: 'supply' },
      { label: '나간다', next: 'start' }
    ]
  },
  map: {
    title: '지하도면 획득',
    text: '도면에는 “발전실 전원 복구 → 2번 승강장 진입 가능”이라 적혀있다.',
    onEnter: () => addItem('지하도면'),
    choices: [
      { label: '보급창고로', next: 'supply' },
      { label: '편의점으로', next: 'store' },
      { label: '터널로', next: 'tunnel' }
    ]
  },
  store: {
    title: '무인 편의점',
    text: '문이 열려있다. 안에는 컵라면과… 혼자 빛나는 랜턴이 있다.',
    choices: [
      { label: '랜턴을 챙긴다', next: 'lantern' },
      { label: '컵라면을 먹는다', next: 'ramen', danger: true },
      { label: '나간다', next: 'start' }
    ]
  },
  lantern: {
    title: '랜턴 획득',
    text: '랜턴을 켜니 바닥의 발자국이 보인다. 발자국은 터널로 향한다.',
    onEnter: () => addItem('랜턴'),
    choices: [
      { label: '터널로 간다', next: 'tunnel' },
      { label: '역무실로 간다', next: 'office' }
    ]
  },
  ramen: {
    title: '뜨끈한 컵라면',
    text: '정신이 조금 풀린다. 그런데 컵라면 국물 안에서 작은 전철이 떠다닌다.',
    onEnter: () => loseCourage(),
    choices: [
      { label: '이게 뭐지… 보급창고', next: 'supply' },
      { label: '역무실로', next: 'office' }
    ]
  },
  supply: {
    title: '보급창고',
    text: '먼지 낀 상자들이 쌓여있다. 한쪽 상자에 “퓨즈”가 보인다. 동시에 창고 안쪽에서 누군가 기침하는 소리가 난다.',
    onEnter: () => addItem('퓨즈'),
    choices: [
      { label: '급하게 나간다', next: 'start' },
      { label: '터널로 간다', next: 'tunnel' },
      { label: '보안실로 돌아간다', next: 'security' }
    ]
  },
  tunnel: {
    title: '터널 입구',
    text: '깜깜한 터널. 멀리서 금속이 긁히는 소리. 랜턴이 있으면 도움이 될 것 같다.',
    choices: [
      { label: '터널로 진입', next: 'deepTunnel', danger: true },
      { label: '뒤로 물러난다', next: 'start' }
    ]
  },
  deepTunnel: {
    title: '깊은 터널',
    text: '바람이 멈췄다. 네 숨소리만 들린다. 갑자기 “칙…칙…” 전동음이 들린다!',
    onEnter: () => loseCourage(),
    choices: [
      { label: '더 안쪽으로', next: 'maintenanceGate', danger: true },
      { label: '도망간다', next: 'start' }
    ]
  },
  maintenanceGate: {
    title: '정비구역 출입문',
    text: '출입문엔 카드 리더가 있다. 옆엔 “정비구역 전원 복구 필요”라고 적혀있다.',
    choices: [
      { label: '보안카드로 문을 연다', next: 'serviceHall', require: '보안카드' },
      { label: '되돌아간다', next: 'start' }
    ]
  },
  serviceHall: {
    title: '정비구역 복도',
    text: '천장 배관에서 물이 뚝뚝 떨어진다. 복도 끝에 발전실, 옆에 거울로 된 통로가 보인다.',
    choices: [
      { label: '발전실로 간다', next: 'generator' },
      { label: '거울 통로로 간다', next: 'mirrorHall', danger: true },
      { label: '다시 나간다', next: 'start' }
    ]
  },
  generator: {
    title: '발전실',
    text: '패널이 꺼져있다. 퓨즈를 갈아끼우면 전원이 돌아올 것 같다.',
    choices: [
      { label: '퓨즈를 갈아끼운다', next: 'powerOn', require: '퓨즈' },
      { label: '아직 무섭다, 나간다', next: 'serviceHall' }
    ]
  },
  powerOn: {
    title: '전원 복구',
    text: '불이 켜지며 스피커에서 방송이 나온다. “2번 승강장 열차 진입 가능.”',
    onEnter: () => addItem('전원복구'),
    choices: [
      { label: '2번 승강장으로', next: 'platform2' },
      { label: '거울 통로 확인', next: 'mirrorHall' }
    ]
  },
  mirrorHall: {
    title: '거울 통로',
    text: '양옆 거울에 네 모습이 무수히 비친다. 그런데 하나만 움직임이 늦다. 그쪽 거울에서 차가운 바람이 새어 나온다.',
    choices: [
      { label: '거울을 만진다', next: 'mirrorWhisper', danger: true },
      { label: '뒤로 물러난다', next: 'serviceHall' }
    ]
  },
  mirrorWhisper: {
    title: '속삭임',
    text: '거울 너머에서 “막차는 너를 기다리지 않는다”는 속삭임이 들린다. 손안에 낡은 승차권이 쥐어진다.',
    onEnter: () => addItem('승차권'),
    choices: [
      { label: '2번 승강장으로', next: 'platform2' },
      { label: '도망친다', next: 'start' }
    ]
  },
  platform2: {
    title: '2번 승강장',
    text: '전광판이 다시 켜졌다. 하지만 행선지는 비어 있고, 스피커에서는 “막차 탑승 준비”만 반복된다.',
    choices: [
      { label: '선로 끝으로 간다', next: 'train' },
      { label: '플랫폼을 더 수색', next: 'platformSearch' }
    ]
  },
  platformSearch: {
    title: '플랫폼 수색',
    text: '벤치 밑에서 작은 열쇠와 거울 조각이 나온다. 거울 조각에는 네 얼굴이 아니라 전철 모자가 비친다.',
    onEnter: () => addItem('운전키'),
    choices: [
      { label: '선로 끝으로', next: 'train' },
      { label: '다시 돌아가기', next: 'platform2' }
    ]
  },
  train: {
    title: '정체불명 열차',
    text: '어둠 속에서 작은 열차가 다가온다. 문이 열린다. 안엔 거울뿐이다.',
    choices: [
      { label: '열차에 탄다', next: 'insideTrain', danger: true },
      { label: '열차를 피해 숨는다', next: 'hide' }
    ]
  },
  hide: {
    title: '숨었다',
    text: '열차가 지나가고 바닥에 티켓이 떨어져 있다. “승차권: 인간 1명”',
    onEnter: () => addItem('승차권'),
    choices: [
      { label: '열차를 따라간다', next: 'insideTrain' },
      { label: '밖으로 도망', next: 'start' }
    ]
  },
  insideTrain: {
    title: '열차 내부',
    text: '거울에 네 모습이 비친다. 그런데 거울 속 너가 너에게 말을 건다. “너가 막차야.”',
    choices: [
      { label: '거울을 만진다', next: 'mirror' },
      { label: '눈을 감는다', next: 'endingA', danger: true }
    ]
  },
  mirror: {
    title: '거울 너머',
    text: '손을 넣자 차가운 바람과 함께 손안에 “열차 운전키”가 들어온다.',
    onEnter: () => addItem('운전키'),
    choices: [
      { label: '운전석으로 간다', next: 'driver' },
      { label: '열차에서 내린다', next: 'endingB' }
    ]
  },
  driver: {
    title: '운전석',
    text: '운전석에는 “막차 운전자는 지각한 자”라 적혀있다. 키를 꽂아볼까?',
    choices: [
      { label: '키를 꽂는다', next: 'endingC', require: '운전키' },
      { label: '도망친다', next: 'endingB' }
    ]
  },
  endingA: {
    title: '엔딩 A — 꿈인가?',
    text: '눈을 뜨니 집. 알람이 울린다. “지각 30분.” 그런데 책상 위에 승차권이 있다.',
    ending: true
  },
  endingB: {
    title: '엔딩 B — 무한 환승',
    text: '밖으로 나왔는데… 또 같은 플랫폼. 너는 영원히 막차를 놓친다.',
    ending: true
  },
  endingC: {
    title: '병맛 엔딩 — 내가 막차다',
    text: '키를 꽂자 갑자기 너의 머리에 전철 모자가 생긴다. “띵동~ 저는 막차입니다.” 네가 출발한다.',
    ending: true
  }
};

function render() {
  const scene = scenes[state.step];
  if (!scene) return;

  gameEl.innerHTML = `
    <h2 class="${scene.ending ? 'glitch' : ''}">${scene.title}</h2>
    <p>${scene.text}</p>
    ${scene.ending ? '<p class="subtitle">끝. 다시 하려면 아래 버튼을 눌러줘.</p>' : ''}
    ${scene.choices ? renderChoices(scene.choices) : ''}
  `;

  statsEl.textContent = `용기 ${'★'.repeat(state.courage)}${'☆'.repeat(Math.max(0, 3 - state.courage))} · 아이템 ${state.items.join(', ') || '없음'}`;
}

function renderChoices(choices) {
  const buttons = choices.map((c, i) => {
    const cls = c.danger ? 'danger' : '';
    const locked = c.require && !state.items.includes(c.require);
    const label = locked ? `${c.label} (필요: ${c.require})` : c.label;
    return `<button data-next="${c.next}" class="${cls} ${locked ? 'ghost' : ''}" ${locked ? 'disabled' : ''}>${i + 1}. ${label}</button>`;
  }).join('');
  return `<div class="choices">${buttons}</div>`;
}

function addItem(item) {
  if (!state.items.includes(item)) state.items.push(item);
}

function loseCourage() {
  state.courage = Math.max(0, state.courage - 1);
  try { beep.currentTime = 0; beep.play(); } catch (_) {}
}

function go(next) {
  const scene = scenes[next];
  if (!scene) return;
  state.step = next;
  if (scene.onEnter) scene.onEnter();
  render();
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-next]');
  if (!btn || btn.disabled) return;
  go(btn.dataset.next);
});

restartBtn.addEventListener('click', () => {
  state = { step: 'start', courage: 3, items: [] };
  render();
});

render();
