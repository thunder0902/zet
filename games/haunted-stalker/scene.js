import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
import { PointerLockControls } from 'https://unpkg.com/three@0.154.0/examples/jsm/controls/PointerLockControls.js';

const startBtn = document.getElementById('startBtn');
let camera, scene, renderer, controls;
let clock = new THREE.Clock();
let world = { obstacles: [] };
let flashlight, stalker;
let battery = 100;
let timeElapsed = 0;
let playing = false;

init();

function init(){
  // renderer
  renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x08060a);
  document.body.appendChild(renderer.domElement);

  // scene
  scene = new THREE.Scene();

  // camera
  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.set(0,1.6,0);

  // controls
  controls = new PointerLockControls(camera, document.body);

  // light ambient
  scene.add(new THREE.AmbientLight(0x222222));

  // moon light
  const moon = new THREE.DirectionalLight(0x9fb7ff, 0.5);
  moon.position.set(5,10,2);
  scene.add(moon);

  // flashlight (player)
  flashlight = new THREE.SpotLight(0xfff1c7, 2, 10, Math.PI/6, 0.3, 1);
  flashlight.position.copy(camera.position);
  flashlight.target.position.set(0,0,-1);
  scene.add(flashlight);
  scene.add(flashlight.target);

  // ground (forest floor)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200,200), new THREE.MeshStandardMaterial({color:0x1b2818}));
  ground.rotation.x = -Math.PI/2; ground.position.y = 0;
  scene.add(ground);

  // ruins: simple boxes and columns
  for(let i=0;i<30;i++){
    const box = new THREE.Mesh(new THREE.BoxGeometry(2+Math.random()*6,1+Math.random()*3,2+Math.random()*6), new THREE.MeshStandardMaterial({color:0x2a2a2a}));
    box.position.set((Math.random()-0.5)*80, 0.5, (Math.random()-0.5)*80);
    box.rotation.y = Math.random()*Math.PI;
    scene.add(box);
    world.obstacles.push(box);
  }

  // trees (simple tall cylinders)
  for(let i=0;i<60;i++){
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.6,6,8), new THREE.MeshStandardMaterial({color:0x27211b}));
    tr.position.set((Math.random()-0.5)*180,3, (Math.random()-0.5)*180);
    scene.add(tr);
  }

  // stalker (invisible at start)
  stalker = new THREE.Mesh(new THREE.SphereGeometry(0.6,8,6), new THREE.MeshStandardMaterial({color:0x111111,transparent:true,opacity:0.0}));
  stalker.position.set(10,0.6,10);
  scene.add(stalker);

  // HUD updates
  window.addEventListener('resize', onWindowResize);
  document.addEventListener('keydown', onKeyDown);

  startBtn.addEventListener('click', ()=>{ startGame(); controls.lock(); });

  animate();
}

function startGame(){ playing = true; timeElapsed = 0; battery = 100; document.getElementById('msg').style.display='none'; }

function onKeyDown(e){ if(e.code==='KeyF'){ flashlight.visible = !flashlight.visible; } if(e.code==='KeyE'){ probe(); } }

function probe(){ // simple interaction: if near an object, show a short message
  const p = controls.getObject().position;
  for(const o of world.obstacles){ if(o.position.distanceTo(p) < 3){ showTemp('무언가 오래된 글자가 보인다...'); break; } }
}

function showTemp(text, time=2500){ const el = document.createElement('div'); el.style.position='fixed'; el.style.left='50%'; el.style.top='20%'; el.style.transform='translateX(-50%)'; el.style.background='rgba(0,0,0,0.6)'; el.style.color='#ffdfe6'; el.style.padding='10px 14px'; el.style.borderRadius='8px'; el.style.zIndex=30; el.textContent=text; document.body.appendChild(el); setTimeout(()=>el.remove(),time); }

function onWindowResize(){ camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); }

function updateStalker(dt){ if(!playing) return; // stalker logic: slowly move towards player with occasional bursts
  const playerPos = controls.getObject().position;
  const dir = new THREE.Vector3().subVectors(playerPos, stalker.position);
  const dist = dir.length();
  dir.normalize();
  // if far, teleport closer occasionally to create dread
  if(Math.random()<0.0005){ stalker.position.set(playerPos.x + (Math.random()-0.5)*10,0.6, playerPos.z + (Math.random()-0.5)*10); }
  // move
  const speed = (dist>10)? 0.01 : 0.04;
  stalker.position.addScaledVector(dir, speed*dt);
  // if very close => heartbeat flash + game over
  if(dist < 1.2){ gameOver(); }
}

function gameOver(){ playing=false; controls.unlock(); showTemp('무언가가 당신을 발견했다... 끝입니다.',4000); setTimeout(()=>{ document.getElementById('msg').style.display='block'; document.getElementById('msg').innerHTML='<strong>Game Over</strong><div>당신은 잡혔다. 상황을 바꾸려면 다시 시도해라.</div><a class="btn" onclick="location.reload()">다시</a>'; },1200); }

// simple movement with pointer lock controls
let move = { forward:false,back:false,left:false,right:false };
const onKey = (e)=>{ if(e.type==='keydown'){ if(e.code==='KeyW') move.forward=true; if(e.code==='KeyS') move.back=true; if(e.code==='KeyA') move.left=true; if(e.code==='KeyD') move.right=true; } else { if(e.code==='KeyW') move.forward=false; if(e.code==='KeyS') move.back=false; if(e.code==='KeyA') move.left=false; if(e.code==='KeyD') move.right=false; } };
document.addEventListener('keydown', onKey); document.addEventListener('keyup', onKey);

function animate(){ requestAnimationFrame(animate); const dt = clock.getDelta()*60; if(controls.isLocked===true){ // move
  const speed = 0.08* (flashlight.visible?0.9:1.2);
  const v = new THREE.Vector3(); if(move.forward) v.z -= speed; if(move.back) v.z += speed; if(move.left) v.x -= speed; if(move.right) v.x += speed;
  controls.moveRight(v.x); controls.moveForward(v.z);
  // update flashlight
  flashlight.position.copy(camera.position);
  const forward = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
  flashlight.target.position.copy(camera.position).add(forward.multiplyScalar(5));
  // battery drain when flashlight on
  if(flashlight.visible){ battery -= 0.01*dt; if(battery<0) { flashlight.visible=false; battery=0; } }
  timeElapsed += dt/60;
 }
 updateStalker(dt);
 renderer.render(scene,camera);
 document.getElementById('time').textContent = formatTime(Math.floor(timeElapsed));
}

function formatTime(s){ const m = Math.floor(s/60); const ss = s%60; return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`; }

// position initial for controls object
controls.getObject().position.set(0,1.6,0);
scene.add(controls.getObject());

// basic ground collision clamp
controls.addEventListener('lock', ()=>{ document.getElementById('tip').style.display='none'; });
controls.addEventListener('unlock', ()=>{ document.getElementById('tip').style.display='block'; });

// small ambient sound (optional - left out for Pages simplicity)

export {};
