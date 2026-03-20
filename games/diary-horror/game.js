// ============================================================
//  낡은 일기장 — 누군가 남기고 간 것
//  일기를 읽을수록 필체가 바뀌고, 이야기가 당신의 것이 된다
// ============================================================

// ===== BGM =====
let bgm = null;
function startBGM() {
  if (bgm) return;
  bgm = new Audio('../psycho-prince/assets/bgm.mp3');
  bgm.loop = true; bgm.volume = 0.3;
  bgm.play().catch(() => {});
}

// ===== 상태 =====
let G = {};
function initG() {
  G = {
    page: 0,
    mood: 0,          // 0~100 불안감
    clues: [],        // 수집한 단서
    choices: {},      // 선택 기록
    name: '',         // 플레이어가 입력하거나 추정되는 이름
    scared: 0,        // 점프스케어 횟수
    ending: null,
  };
}

// ===== DOM =====
const introScreen  = document.getElementById('intro-screen');
const gameScreen   = document.getElementById('game-screen');
const bgImg        = document.getElementById('bg-img');
const bgOverlay    = document.getElementById('bg-overlay');
const pageDate     = document.getElementById('page-date');
const pageNum      = document.getElementById('page-num');
const pageText     = document.getElementById('page-text');
const pageChoices  = document.getElementById('page-choices');
const moodFill     = document.getElementById('mood-fill');
const cluesEl      = document.getElementById('clues');
const scareLayer   = document.getElementById('scare-layer');
const scareImg     = document.getElementById('scare-img');
const scareText    = document.getElementById('scare-text');
const endingScreen = document.getElementById('ending-screen');
const endingTag    = document.getElementById('ending-tag');
const endingTitle  = document.getElementById('ending-title');
const endingBody   = document.getElementById('ending-body');
const endingBtn    = document.getElementById('ending-btn');
const pageContainer= document.getElementById('page-container');

document.getElementById('intro-btn').addEventListener('click', () => {
  startBGM();
  introScreen.style.display = 'none';
  gameScreen.style.display = 'block';
  initG();
  gotoPage(0);
});

endingBtn.addEventListener('click', () => {
  endingScreen.style.display = 'none';
  introScreen.style.display = 'flex';
  gameScreen.style.display = 'none';
});

// ===== 유틸 =====
function setMood(val) {
  G.mood = Math.min(100, Math.max(0, G.mood + val));
  moodFill.style.width = G.mood + '%';
}

function addClue(clue) {
  if (!G.clues.includes(clue)) {
    G.clues.push(clue);
    cluesEl.textContent = G.clues.join(' · ');
  }
}

function setBg(src, extraFilter) {
  bgImg.style.transition = 'all 1.5s ease';
  bgImg.src = src;
  if (extraFilter) bgImg.style.filter = extraFilter;
  else bgImg.style.filter = 'sepia(0.6) brightness(0.3) contrast(1.2)';
}

let typingTimer = null;
function typeText(html, cb) {
  if (typingTimer) clearInterval(typingTimer);
  pageText.innerHTML = '';
  // HTML 태그 포함 타이핑
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const fullText = temp.innerHTML;
  let i = 0; let output = '';
  typingTimer = setInterval(() => {
    if (i >= fullText.length) {
      clearInterval(typingTimer);
      pageText.innerHTML = fullText;
      if (cb) cb();
      return;
    }
    // 태그 한 번에 처리
    if (fullText[i] === '<') {
      const end = fullText.indexOf('>', i);
      output += fullText.slice(i, end + 1);
      i = end + 1;
    } else {
      output += fullText[i++];
    }
    pageText.innerHTML = output;
    pageContainer.scrollTop = pageContainer.scrollHeight;
  }, 28);
}

function showChoices(choices) {
  pageChoices.innerHTML = '';
  choices.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = c.label;
    btn.addEventListener('click', () => {
      startBGM();
      if (c.clue) addClue(c.clue);
      if (c.mood) setMood(c.mood);
      if (c.choice) G.choices[c.choice] = true;
      if (c.scare) triggerScare(c.scare.img, c.scare.text, c.scare.dur, () => gotoPage(c.next));
      else gotoPage(c.next);
    });
    pageChoices.appendChild(btn);
  });
}

// ===== 점프스케어 =====
function triggerScare(imgSrc, text, dur = 800, cb) {
  G.scared++;
  scareImg.src = imgSrc;
  scareText.textContent = text || '';
  scareLayer.style.display = 'flex';

  // 쉐이크
  pageContainer.classList.add('shaking');
  setTimeout(() => pageContainer.classList.remove('shaking'), 400);

  setTimeout(() => {
    scareLayer.style.display = 'none';
    if (cb) cb();
  }, dur);
}

// ===== 페이지 렌더 =====
function gotoPage(id) {
  G.page = id;
  pageContainer.classList.add('page-flip');
  setTimeout(() => pageContainer.classList.remove('page-flip'), 400);
  pageChoices.innerHTML = '';
  const pg = PAGES[id];
  if (!pg) return;
  pageDate.textContent = pg.date || '';
  pageNum.textContent = pg.pageNum || '';
  if (pg.bg) setBg(pg.bg, pg.bgFilter);
  if (pg.mood) setMood(pg.mood);
  if (pg.clue) addClue(pg.clue);
  if (pg.overlay) bgOverlay.style.background = pg.overlay;

  typeText(pg.text, () => {
    if (pg.ending) { triggerEnding(pg.ending); return; }
    if (pg.choices) showChoices(pg.choices);
  });
}

// ===== 엔딩 =====
const ENDINGS = {
  survive: {
    tag: '엔딩 A',
    title: '그것은 여전히 쓰고 있다',
    body: `일기장을 덮었다.\n\n마지막 페이지는 비어있었다.\n아니, 비어있는 것처럼 보였다.\n\n빛을 비추자 희미한 글자가 보였다.\n\n오늘 날짜.\n그리고 네 이름.\n\n일기장은 아직 완성되지 않았다.`,
  },
  possession: {
    tag: '엔딩 B',
    title: '너는 이미 그 안에 있었다',
    body: `마지막 페이지를 넘기는 순간\n손이 멈추지 않았다.\n\n펜을 잡지 않았는데\n손가락이 움직였다.\n\n"이제 나야."\n\n일기장은 다음 장을 기다리고 있다.`,
  },
  burn: {
    tag: '엔딩 C',
    title: '재가 된 기억',
    body: `일기장을 불태웠다.\n\n타는 냄새와 함께\n모든 것이 사라지는 것 같았다.\n\n그런데 다음날 아침,\n책상 위에 일기장이 있었다.\n\n첫 페이지부터.\n마치 아무 일도 없었던 것처럼.`,
  },
  truth: {
    tag: '엔딩 D — 진실 엔딩',
    title: '일기장의 주인',
    body: `모든 단서가 맞아 떨어지는 순간\n손이 떨렸다.\n\n일기장의 주인은\n30년 전 이 집에 살았던 아이였다.\n\n그 아이의 이름은 —\n\n거울을 봤다.\n\n거울 속 얼굴이\n일기장 속 사진과 같았다.`,
  },
};

function triggerEnding(id) {
  const e = ENDINGS[id];
  endingTag.textContent = e.tag;
  endingTitle.textContent = e.title;
  endingBody.textContent = e.body;
  setTimeout(() => { endingScreen.style.display = 'flex'; }, 1200);
}

// ===== 페이지 데이터 =====
const PAGES = {
  // ── 0. 표지 ──
  0: {
    date: '', pageNum: '표지',
    bg: 'assets/cover.jpg',
    text: `낡은 일기장이다.\n\n표지에 검은 얼룩이 있다. 오래된 것 같기도 하고, 최근 것 같기도 하다.\n\n이름이 적혀있어야 할 자리는 — 긁혀있다. 누군가 지웠다.\n\n<span class="whisper">...열지 않는 게 나을 수도 있다.</span>`,
    choices: [
      { label: '첫 페이지를 펼친다', next: 1 },
      { label: '표지를 자세히 살펴본다', next: 10, clue: '긁힌 이름' },
    ],
  },

  // ── 10. 표지 상세 ──
  10: {
    date: '', pageNum: '표지 — 상세',
    bg: 'assets/paper.jpg',
    text: `손가락으로 긁힌 자국을 따라가니 — 글자 형태가 보인다.\n\n누군가 지우려 했지만 완전히 지워지지 않았다.\n\n'이 일기장을 읽는 자에게\n당신도 곧 이것을 쓰게 될 것이다'\n\n<span class="danger">뒤에 핏자국처럼 보이는 것이 번져있다.</span>`,
    clue: '저주의 문구',
    mood: 15,
    choices: [
      { label: '첫 페이지를 펼친다', next: 1 },
    ],
  },

  // ── 1. 첫 번째 일기 ──
  1: {
    date: '19XX년 3월 12일', pageNum: '1페이지',
    bg: 'assets/paper.jpg',
    mood: 10,
    text: `<span class="handwrite">오늘 이 집으로 이사했다.\n\n마당에 나무가 있다. 오래된 나무다. 아버지가 그 나무를 이상하게 쳐다봤다.\n\n방 구석에 누군가 살았던 흔적이 있다. 낙서 같은 것들. 숫자와 이름.\n\n밤에 소리가 난다. 집이 오래돼서 그런 것이라고 했다.</span>\n\n<span class="whisper">— 필체가 또렷하고 침착하다.</span>`,
    choices: [
      { label: '다음 페이지로 넘긴다', next: 2 },
      { label: '\'낙서\'에 대해 더 생각한다', next: 11, clue: '방 구석 낙서' },
    ],
  },

  // ── 11. 낙서 ──
  11: {
    date: '19XX년 3월 12일', pageNum: '1페이지 — 여백',
    bg: 'assets/paper.jpg',
    text: `페이지 아래 여백에 아주 작은 글씨가 있다.\n\n돋보기라도 있어야 읽을 수 있을 것 같은데 — 이상하게 읽힌다.\n\n<span class="danger">숫자들: 3 7 3 7 3 7 3 7 3 7</span>\n\n그리고 이름 하나:\n\n<span class="danger">당신의 이름이 적혀있다.</span>\n\n손이 차가워진다.`,
    clue: '내 이름',
    mood: 25,
    choices: [
      { label: '그럴 리 없다. 우연이다.', next: 2 },
      { label: '페이지를 더 살펴본다', next: 12 },
    ],
  },

  // ── 12. 페이지 뒷면 ──
  12: {
    date: '', pageNum: '1페이지 — 뒷면',
    bg: 'assets/dark.jpg',
    bgFilter: 'sepia(0.8) brightness(0.2) contrast(1.5)',
    text: `페이지를 뒤집었다.\n\n아무것도 없다.\n\n그런데 빛에 비추자 — 글자가 보인다. 잉크가 아니다.\n\n눌린 자국이다. 눌러 쓴 것이다.\n\n<span class="danger">"너는 왔구나."</span>\n\n등이 서늘해진다.`,
    mood: 20,
    choices: [
      { label: '억지로 진정하고 다음으로 넘긴다', next: 2 },
      {
        label: '책을 덮으려 한다',
        next: 13,
        scare: { img: 'assets/dark.jpg', text: '덮히지 않는다', dur: 900 },
      },
    ],
  },

  // ── 13. 덮히지 않음 ──
  13: {
    date: '', pageNum: '—',
    bg: 'assets/dark.jpg',
    bgFilter: 'sepia(0.9) brightness(0.15) contrast(2)',
    mood: 15,
    text: `일기장이 덮히지 않는다.\n\n손에 힘을 줬다. 꽤 오래.\n\n결국 손이 떨렸다.\n\n<span class="danger">그리고 — 페이지가 저절로 넘어갔다.</span>`,
    choices: [
      { label: '읽는다', next: 2 },
    ],
  },

  // ── 2. 두 번째 일기 ──
  2: {
    date: '19XX년 3월 19일', pageNum: '2페이지',
    bg: 'assets/candle.jpg',
    mood: 8,
    text: `<span class="handwrite">일주일이 지났다.\n\n방 구석의 낙서를 지우려 했는데 — 지워지지 않았다. 페인트 위에 새긴 것처럼 깊다.\n\n아버지가 어제부터 말이 없다. 나무 앞에 서서 무언가를 보는 것 같다.\n\n나는 나무가 싫다.\n나무가 밤에 나를 본다는 느낌이 든다.</span>\n\n<span class="whisper">— 7일 후. 필체가 약간 달라졌다.</span>`,
    choices: [
      { label: '다음 페이지', next: 3 },
      { label: '\'나무\'에 대한 단서를 찾는다', next: 20, clue: '나무' },
    ],
  },

  // ── 20. 나무 단서 ──
  20: {
    date: '', pageNum: '사진 한 장이 끼워져 있다',
    bg: 'assets/dark.jpg',
    mood: 12,
    text: `페이지 사이에 낡은 사진이 끼워져 있다.\n\n오래된 나무 사진.\n\n사진 뒷면에 날짜가 있다 — <span class="highlight">같은 날짜다.</span> 오늘 날짜.\n\n그리고 글씨:\n<span class="danger">"그 나무는 집이 아니다. 문이다."</span>`,
    clue: '나무는 문',
    choices: [
      { label: '계속 읽는다', next: 3 },
    ],
  },

  // ── 3. 세 번째 일기 ──
  3: {
    date: '19XX년 4월 3일', pageNum: '3페이지',
    bg: 'assets/paper.jpg',
    mood: 15,
    text: `<span class="handwrite">아버지가 사라졌다.\n\n경찰이 왔다가 갔다. 아무것도 없다고 했다.\n\n나는 알고 있다. 나무다.\n\n밤에 창문으로 나무를 봤다. 가지가 — 손 모양이었다. 나를 향해.</span>\n\n<span class="whisper">— 글씨가 흔들린다.</span>\n\n<span class="danger">여기서 잉크가 번진 것처럼 보이는 구간이 있다. 아니면 눈물인지도 모른다.</span>`,
    choices: [
      { label: '다음으로 넘긴다', next: 4 },
      { label: '\'아버지\'에 대해 기록한다', next: 30, clue: '아버지 실종' },
      {
        label: '번진 잉크를 손가락으로 닦는다',
        next: 31,
        scare: { img: 'assets/dark.jpg', text: '차갑다', dur: 700 },
      },
    ],
  },

  // ── 30. 아버지 단서 ──
  30: {
    date: '', pageNum: '메모 — 여백',
    bg: 'assets/paper.jpg',
    text: `다시 여백을 살핀다.\n\n3페이지 하단 — 아주 작게:\n\n<span class="handwrite">"아빠는 나무 안에 있다.\n나는 매일 밤 노크하는 소리를 듣는다.\n나무 안에서."</span>\n\n<span class="whisper">아이의 글씨다.</span>`,
    choices: [
      { label: '계속 읽는다', next: 4 },
    ],
  },

  // ── 31. 잉크 닦기 ──
  31: {
    date: '', pageNum: '—',
    bg: 'assets/dark.jpg',
    mood: 20,
    text: `손가락이 빨갛게 물들었다.\n\n잉크가 아니다.\n\n닦아도 안 지워진다.\n\n<span class="danger">그리고 페이지에서 번진 자국이 더 넓어진다.</span>\n\n마치 방금 흘린 것처럼.`,
    choices: [
      { label: '손을 닦고 계속 읽는다', next: 4 },
    ],
  },

  // ── 4. 네 번째 일기 ──
  4: {
    date: '19XX년 4월 17일', pageNum: '4페이지',
    bg: 'assets/mirror.jpg',
    bgFilter: 'sepia(0.5) brightness(0.25) contrast(1.4) hue-rotate(10deg)',
    mood: 20,
    text: `<span class="handwrite">거울을 깼다.\n\n거울 속의 내가 내가 아니었다.\n내가 움직이지 않을 때 움직였다.\n\n유리 조각을 치우다 손을 베였다.\n\n이상한 건 — 피가 나지 않았다.</span>\n\n<span class="danger">여기서 필체가 완전히 바뀐다.\n이전 사람이 쓴 게 아닌 것 같다.</span>`,
    choices: [
      { label: '필체 변화를 기록한다', next: 40, clue: '필체 변화' },
      { label: '다음 페이지로 넘긴다', next: 5 },
    ],
  },

  // ── 40. 필체 분석 ──
  40: {
    date: '', pageNum: '분석',
    bg: 'assets/paper.jpg',
    mood: 10,
    text: `앞 페이지들을 다시 훑는다.\n\n처음엔 침착하고 또렷했다.\n\n두 번째엔 조금 흔들렸다.\n\n세 번째엔 글자 간격이 무너졌다.\n\n그리고 네 번째 —\n\n<span class="danger">이건 다른 사람이 쓴 것이다.\n같은 일기장에.\n같은 펜으로.\n하지만 손이 달라졌다.</span>\n\n<span class="whisper">그렇다면 — 언제 달라진 걸까.</span>`,
    choices: [
      { label: '계속 읽는다', next: 5 },
    ],
  },

  // ── 5. 다섯 번째 일기 ──
  5: {
    date: '19XX년 4월 29일', pageNum: '5페이지',
    bg: 'assets/dark.jpg',
    bgFilter: 'sepia(0.9) brightness(0.18) contrast(1.8)',
    mood: 20,
    overlay: 'rgba(10,5,0,0.7)',
    text: `<span class="danger">이 페이지는 다르다.</span>\n\n글이 아니다. 숫자들.\n\n3 7 3 7 3 7 3 7 3 7\n\n페이지를 꽉 채운 숫자들.\n\n그리고 한 가운데 —\n\n<span class="danger" style="font-size:20px">당신의 이름.</span>\n\n표지에서 본 그 이름. 아까 여백에서 본 그 이름.`,
    mood: 30,
    choices: [
      { label: '이름 옆에 다른 글씨가 있는지 확인한다', next: 50, clue: '반복되는 숫자' },
      {
        label: '페이지를 찢으려 한다',
        next: 51,
        scare: { img: 'assets/dark.jpg', text: '찢기지 않는다\n오히려\n다음 장이 열린다', dur: 1100 },
      },
    ],
  },

  // ── 50. 이름 확인 ──
  50: {
    date: '', pageNum: '5페이지 — 확대',
    bg: 'assets/dark.jpg',
    text: `이름 아래 아주 작게:\n\n<span class="handwrite">"너는 이미 읽었다.\n이미 늦었다.\n다음 장을 펼치면\n이 일기장의 새 주인이 된다."</span>\n\n<span class="whisper">...쓸 수 있는 선택지가 있다.</span>`,
    choices: [
      { label: '다음 장을 펼친다', next: 6, choice: 'opened_final' },
      { label: '일기장을 태운다', next: 60, choice: 'tried_burn' },
      { label: '이 방에서 나간다', next: 61 },
    ],
  },

  // ── 51. 찢기 실패 ──
  51: {
    date: '', pageNum: '—',
    bg: 'assets/dark.jpg',
    mood: 15,
    text: `손가락이 아프다.\n\n종이가 찢기지 않는다.\n마치 금속 같다.\n\n그리고 다음 페이지가 저절로 펼쳐진다.`,
    choices: [
      { label: '읽는다', next: 6, choice: 'opened_final' },
    ],
  },

  // ── 60. 태우기 시도 ──
  60: {
    date: '', pageNum: '—',
    bg: 'assets/candle.jpg',
    bgFilter: 'sepia(0.3) brightness(0.35) contrast(1.3)',
    text: `라이터를 찾았다.\n\n불꽃을 갖다댔다.\n\n종이가 — 타지 않는다.\n\n불꽃만 커진다.\n\n그리고 불꽃 속에서 글씨가 보인다.\n\n<span class="danger">"불은 나한테 안 통해."\n\n"다음 페이지를 읽어."</span>`,
    mood: 20,
    choices: [
      { label: '포기하고 읽는다', next: 6, choice: 'tried_burn' },
    ],
  },

  // ── 61. 나가기 시도 ──
  61: {
    date: '', pageNum: '—',
    bg: 'assets/dark.jpg',
    bgFilter: 'sepia(1) brightness(0.1) contrast(2)',
    mood: 15,
    text: `일어서려 했다.\n\n다리가 움직이지 않는다.\n\n아니, 움직이는데 — 의자로 다시 앉아있다.\n\n내가 앉은 게 아닌데.\n\n<span class="danger">일기장이 바람도 없는데 펼쳐진다.</span>`,
    choices: [
      { label: '읽는다', next: 6, choice: 'opened_final' },
    ],
  },

  // ── 6. 여섯 번째 페이지 (분기점) ──
  6: {
    date: '오늘 날짜', pageNum: '6페이지',
    bg: 'assets/mirror.jpg',
    bgFilter: 'sepia(0.6) brightness(0.2) contrast(1.6) hue-rotate(180deg)',
    mood: 25,
    overlay: 'rgba(5,0,10,0.65)',
    text: `이 페이지는 비어있다.\n\n아니 — 비어있지 않다.\n\n날짜가 오늘이다.\n\n그리고 글씨가 나타나기 시작한다.\n지금 이 순간에.\n눈앞에서.\n\n<span class="danger">내가 쓴 것이 아닌데\n내 글씨다.</span>`,
    choices: [
      { label: '글씨를 읽는다', next: 70 },
      { label: '거울을 본다', next: 71, clue: '거울 속 얼굴' },
      { label: '모든 단서를 다시 생각한다', next: 72 },
    ],
  },

  // ── 70. 글씨 읽기 → 잠식 엔딩 ──
  70: {
    date: '오늘 날짜', pageNum: '마지막',
    bg: 'assets/dark.jpg',
    bgFilter: 'sepia(1) brightness(0.1) contrast(2)',
    mood: 30,
    text: `글씨가 말한다.\n\n<span class="danger">"나는 여기서 30년을 기다렸다.\n\n너를.\n\n이 집에 오는 사람을 기다렸다.\n\n이제 나는 나갈 수 있다.\n\n그리고 너는 —\n\n여기서 다음 사람을 기다리면 된다."</span>\n\n손이 움직인다.\n내 의지가 아니다.\n\n일기장에 오늘 날짜를 쓴다.`,
    ending: 'possession',
  },

  // ── 71. 거울 → 진실 엔딩 ──
  71: {
    date: '오늘 날짜', pageNum: '진실',
    bg: 'assets/mirror.jpg',
    bgFilter: 'sepia(0.3) brightness(0.4) contrast(1.2)',
    mood: 20,
    text: `거울을 봤다.\n\n거울 속에 내가 있다.\n\n그런데 —\n\n뒤에 누군가 서 있다.\n아이다.\n아주 오래전 아이.\n\n아이가 말한다:\n\n<span class="handwrite">"찾아줘서 고마워.\n나 여기 있었어.\n30년 동안."</span>\n\n그리고 아이가 — 웃는다.\n\n<span class="danger">그 얼굴이 낯설지 않다.</span>`,
    ending: 'truth',
  },

  // ── 72. 단서 정리 → 생존 엔딩 ──
  72: {
    date: '', pageNum: '추리',
    bg: 'assets/paper.jpg',
    text: `수집한 단서들을 떠올린다.\n\n긁힌 이름 — 숫자 — 아버지 실종 — 나무는 문 — 필체 변화\n\n패턴이 보인다.\n\n이 일기장은 누군가를 잡는 덫이다.\n읽을수록 현실과 일기 속이 겹쳐진다.\n\n탈출구는 — <span class="highlight">마지막 페이지를 읽지 않는 것</span>이다.\n\n하지만 이미 여기까지 왔다.\n\n<span class="whisper">...아직 늦지 않았을 수도 있다.</span>`,
    choices: [
      { label: '일기장을 덮고 내려놓는다', next: 80 },
      { label: '그래도 끝까지 읽는다', next: 70 },
    ],
  },

  // ── 80. 내려놓기 → 생존 엔딩 ──
  80: {
    date: '', pageNum: '—',
    bg: 'assets/candle.jpg',
    bgFilter: 'sepia(0.4) brightness(0.45) contrast(1.1)',
    mood: -20,
    text: `일기장을 내려놨다.\n\n덮혔다.\n\n이번엔 덮혔다.\n\n방이 조용해졌다.\n\n창문 밖에 나무가 보인다.\n나무가 — 더 이상 나를 보지 않는 것 같다.\n\n일기장을 집어들어 창문 밖으로 던졌다.\n\n잠시 후 아래에서 소리가 났다.\n그리고 조용해졌다.`,
    ending: 'survive',
  },
};

// 시작
initG();
