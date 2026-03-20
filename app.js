const btn = document.getElementById('btn');
const msg = document.getElementById('msg');
btn.addEventListener('click', () => {
  msg.textContent = '버튼 이벤트도 정상 동작함 ✅';
});
