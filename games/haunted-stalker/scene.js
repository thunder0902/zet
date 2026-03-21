// Stalker scene (UMD-friendly) - uses global THREE and PointerLockControls when available
(function(){
  // If module-style THREE is available via import, scene.js was already written for that; here we use globals.
  const THREEglobal = (typeof THREE !== 'undefined') ? THREE : null;
  const PointerLockControlsGlobal = (typeof PointerLockControls !== 'undefined') ? PointerLockControls : null;

  if(!THREEglobal){
    // No three available; show error overlay
    const el = document.createElement('div'); el.style.position='fixed'; el.style.left=0; el.style.top=0; el.style.right=0; el.style.bottom=0; el.style.background='black'; el.style.color='white'; el.style.display='flex'; el.style.alignItems='center'; el.style.justifyContent='center'; el.style.zIndex=9999;
    el.textContent = 'Three.js 로딩 실패 — 지원되지 않는 브라우저입니다.'; document.body.appendChild(el); return; }

  const THREE = THREEglobal;
  const PointerLockControls = PointerLockControlsGlobal || THREE.PointerLockControls || null;

  // Minimal shim to provide PointerLockControls class if loaded under THREE namespace
  // Some CDN builds attach controls under THREE. But unpkg example adds global PointerLockControls

  // DOM refs
  const startBtn = document.getElementById('startBtn');
  const touchControls = document.getElementById('touchControls');
  const stickArea = document.getElementById('stickArea');
  const btnFlash = document.getElementById('btnFlash');
  const btnInteract = document.getElementById('btnInteract');

  let camera, scene, renderer, controls;
  let clock = new THREE.Clock();
  let world = { obstacles: [] };
  let flashlight, stalker;
  let battery = 100;
  let timeElapsed = 0;
  let playing = false;
  let isMobile = /Mobi|Android/i.test(navigator.userAgent);
  let move = { forward:false,back:false,left:false,right:false };

  init();

  function init(){
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    const ratio = Math.max(1, Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setPixelRatio(ratio);
    renderer.setClearColor(0x08060a);
    document.body.appendChild(renderer.domElement);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.set(0,1.6,0);

    if(PointerLockControls){
      controls = new PointerLockControls(camera, document.body);
    } else if(THREE.PointerLockControls){
      controls = new THREE.PointerLockControls(camera, document.body);
    } else {
      // basic fallback controls object
      controls = { getObject: ()=>camera, isLocked:false, moveForward:()=>{}, moveRight:()=>{}, lock:()=>{}, unlock:()=>{} };
    }

    scene.add(new THREE.AmbientLight(0x222222));
    const moon = new THREE.DirectionalLight(0x9fb7ff, 0.5); moon.position.set(5,10,2); scene.add(moon);

    flashlight = new THREE.SpotLight(0xfff1c7, 2, 10, Math.PI/6, 0.3, 1);
    flashlight.position.copy(camera.position);
    flashlight.target.position.set(0,0,-1);
    scene.add(flashlight);
    scene.add(flashlight.target);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200,200), new THREE.MeshStandardMaterial({color:0x1b2818}));
    ground.rotation.x = -Math.PI/2; ground.position.y = 0; scene.add(ground);

    for(let i=0;i<30;i++){
      const box = new THREE.Mesh(new THREE.BoxGeometry(2+Math.random()*6,1+Math.random()*3,2+Math.random()*6), new THREE.MeshStandardMaterial({color:0x2a2a2a}));
      box.position.set((Math.random()-0.5)*80, 0.5, (Math.random()-0.5)*80);
      box.rotation.y = Math.random()*Math.PI; scene.add(box); world.obstacles.push(box);
    }

    for(let i=0;i<60;i++){
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.6,6,8), new THREE.MeshStandardMaterial({color:0x27211b}));
      tr.position.set((Math.random()-0.5)*180,3, (Math.random()-0.5)*180); scene.add(tr);
    }

    stalker = new THREE.Mesh(new THREE.SphereGeometry(0.6,8,6), new THREE.MeshStandardMaterial({color:0x111111,transparent:true,opacity:0.0}));
    stalker.position.set(10,0.6,10); scene.add(stalker);

    window.addEventListener('resize', onWindowResize);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    startBtn.addEventListener('click', ()=>{ startGame(); try{ if(!isMobile) controls.lock(); else showTouchControls(); }catch(e){} });

    if(isMobile){ setupTouchControls(); }

    animate();
  }

  function startGame(){ playing = true; timeElapsed = 0; battery = 100; const msg = document.getElementById('msg'); if(msg) msg.style.display='none'; }
  function showTouchControls(){ if(touchControls) touchControls.style.display='block'; }
  function hideTouchControls(){ if(touchControls) touchControls.style.display='none'; }

  function onKeyDown(e){ if(e.code==='KeyF'){ toggleFlash(); } if(e.code==='KeyE'){ probe(); } if(e.code==='KeyW') move.forward=true; if(e.code==='KeyS') move.back=true; if(e.code==='KeyA') move.left=true; if(e.code==='KeyD') move.right=true; }
  function onKeyUp(e){ if(e.code==='KeyW') move.forward=false; if(e.code==='KeyS') move.back=false; if(e.code==='KeyA') move.left=false; if(e.code==='KeyD') move.right=false; }

  function toggleFlash(){ flashlight.visible = !flashlight.visible; }

  function probe(){ const p = controls.getObject().position; for(const o of world.obstacles){ if(o.position.distanceTo(p) < 3){ showTemp('무언가 오래된 글자가 보인다...'); break; } } }
  function showTemp(text, time=2500){ const el = document.createElement('div'); el.style.position='fixed'; el.style.left='50%'; el.style.top='20%'; el.style.transform='translateX(-50%)'; el.style.background='rgba(0,0,0,0.6)'; el.style.color='#ffdfe6'; el.style.padding='10px 14px'; el.style.borderRadius='8px'; el.style.zIndex=30; el.textContent=text; document.body.appendChild(el); setTimeout(()=>el.remove(),time); }
  function onWindowResize(){ camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); }

  function updateStalker(dt){ if(!playing) return; const playerPos = controls.getObject().position; const dir = new THREE.Vector3().subVectors(playerPos, stalker.position); const dist = dir.length(); dir.normalize(); if(Math.random()<0.0005){ stalker.position.set(playerPos.x + (Math.random()-0.5)*10,0.6, playerPos.z + (Math.random()-0.5)*10); } const speed = (dist>10)? 0.01 : 0.03; stalker.position.addScaledVector(dir, speed*dt); if(dist < 1.2){ gameOver(); } }
  function gameOver(){ playing=false; try{ controls.unlock(); }catch(e){} showTemp('무언가가 당신을 발견했다... 끝입니다.',4000); setTimeout(()=>{ const msg = document.getElementById('msg'); if(msg){ msg.style.display='block'; msg.innerHTML='<strong>Game Over</strong><div>당신은 잡혔다. 상황을 바꾸려면 다시 시도해라.</div><a class="btn" onclick="location.reload()">다시</a>'; } },1200); }

  function setupTouchControls(){ showTouchControls(); let active=false; let touchState={startX:0,startY:0,dx:0,dy:0}; if(stickArea){ stickArea.addEventListener('touchstart',(e)=>{ e.preventDefault(); active=true; const t=e.touches[0]; touchState.startX=t.clientX; touchState.startY=t.clientY; },{passive:false}); stickArea.addEventListener('touchmove',(e)=>{ e.preventDefault(); if(!active) return; const t=e.touches[0]; touchState.dx = t.clientX - touchState.startX; touchState.dy = t.clientY - touchState.startY; move.forward = touchState.dy < -10; move.back = touchState.dy > 10; move.left = touchState.dx < -10; move.right = touchState.dx > 10; },{passive:false}); stickArea.addEventListener('touchend',(e)=>{ active=false; move.forward=move.back=move.left=move.right=false; touchState.dx=touchState.dy=0; },{passive:false}); }
    if(btnFlash) btnFlash.addEventListener('touchstart',(e)=>{ e.preventDefault(); toggleFlash(); },{passive:false});
    if(btnInteract) btnInteract.addEventListener('touchstart',(e)=>{ e.preventDefault(); probe(); },{passive:false});
  }

  function animate(){ requestAnimationFrame(animate); const dt = clock.getDelta()*60; if((controls && controls.isLocked===true) || isMobile){ const speed = 0.08* (flashlight.visible?0.95:1.15); const v = new THREE.Vector3(); if(move.forward) v.z -= speed; if(move.back) v.z += speed; if(move.left) v.x -= speed; if(move.right) v.x += speed; if(controls && controls.isLocked===true){ controls.moveRight(v.x); controls.moveForward(v.z); } else { const dir = new THREE.Vector3(); camera.getWorldDirection(dir); dir.y = 0; dir.normalize(); const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0), dir).normalize(); camera.position.addScaledVector(dir, -v.z); camera.position.addScaledVector(right, v.x); } flashlight.position.copy(camera.position); const forward = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion); flashlight.target.position.copy(camera.position).add(forward.multiplyScalar(5)); if(flashlight.visible && playing){ battery -= 0.006*dt; if(battery<0){ flashlight.visible=false; battery=0; } } timeElapsed += dt/60; } updateStalker(dt); renderer.render(scene,camera); const timeEl = document.getElementById('time'); if(timeEl) timeEl.textContent = formatTime(Math.floor(timeElapsed)); }

  function formatTime(s){ const m = Math.floor(s/60); const ss = s%60; return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`; }

  // init controls position
  try{ if(controls && controls.getObject) controls.getObject().position.set(0,1.6,0); }catch(e){}
  if(controls && controls.getObject) scene.add(controls.getObject?controls.getObject():controls);

})();
