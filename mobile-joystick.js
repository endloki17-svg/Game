/* Mobile/desktop touch controls for the 3D match. Loaded by index.html. */
(function () {
  'use strict';

  // Do not block the script on user-agent detection. This also makes the controls
  // visible in desktop browser device emulation and on touch-enabled laptops.
  const css = document.createElement('style');
  css.textContent = `
    #mobile-controls { position:fixed; inset:0; z-index:9000; display:none; pointer-events:none; touch-action:none; }
    #mobile-controls.active { display:block !important; }
    .mobile-stick { position:absolute; bottom:28px; width:150px; height:150px; border:2px solid rgba(255,255,255,.55); border-radius:50%; background:rgba(10,15,25,.72); box-shadow:0 0 28px rgba(0,242,254,.35), inset 0 0 20px rgba(255,255,255,.1); pointer-events:auto; touch-action:none; }
    #mobile-move-stick { left:22px; }
    #mobile-look-stick { right:22px; }
    .mobile-stick::before { content:'MOVE'; position:absolute; inset:15px; border:1px dashed rgba(255,255,255,.25); border-radius:50%; display:grid; place-items:center; color:rgba(255,255,255,.55); font:900 11px Outfit,sans-serif; }
    #mobile-look-stick::before { content:'LOOK'; }
    .mobile-stick::after { content:''; position:absolute; left:50%; top:50%; width:62px; height:62px; margin:-31px; border-radius:50%; background:linear-gradient(135deg,#00f2fe,#4facfe); box-shadow:0 0 20px rgba(0,242,254,.7); transform:translate(var(--dx,0),var(--dy,0)); }
    .mobile-action { position:absolute; border:2px solid #fff; border-radius:50%; color:#fff; font-weight:900; pointer-events:auto; touch-action:none; box-shadow:0 6px 18px #0008; }
    #mobile-fire { right:34px; bottom:190px; width:80px; height:80px; background:#ff0844cc; border-color:#ff0844; }
    #mobile-reload { right:130px; bottom:125px; width:62px; height:62px; background:#f6d365cc; font-size:10px; }
    #mobile-exit { top:20px; right:20px; width:auto; height:auto; padding:10px 17px; border-radius:999px; background:#ff0844dd; border-color:#ff0844; }
    @media (max-width:520px) { .mobile-stick { width:125px; height:125px; } .mobile-stick::after { width:52px;height:52px;margin:-26px; } #mobile-fire { right:22px; bottom:172px; } #mobile-reload { right:112px; } }
  `;
  document.head.appendChild(css);

  const controls = document.createElement('div');
  controls.id = 'mobile-controls';
  controls.innerHTML = '<div id="mobile-move-stick" class="mobile-stick"></div><div id="mobile-look-stick" class="mobile-stick"></div><button id="mobile-fire" class="mobile-action" type="button">FIRE</button><button id="mobile-reload" class="mobile-action" type="button">RLD</button><button id="mobile-exit" class="mobile-action" type="button">EXIT</button>';
  document.body.appendChild(controls);

  const getEngine = () => window.Engine3D;
  const setKey = (name, value) => { const e = getEngine(); if (e && e.keys) e.keys[name] = value; };
  const bindStick = (el, callback) => {
    let pointerId = null;
    const reset = () => { pointerId = null; el.style.setProperty('--dx','0px'); el.style.setProperty('--dy','0px'); callback(0,0); };
    const move = event => {
      if (event.pointerId !== pointerId) return;
      const r = el.getBoundingClientRect(), max = r.width * .36;
      let x = event.clientX - r.left - r.width / 2, y = event.clientY - r.top - r.height / 2;
      const length = Math.hypot(x,y);
      if (length > max) { x = x / length * max; y = y / length * max; }
      el.style.setProperty('--dx', `${x}px`); el.style.setProperty('--dy', `${y}px`); callback(x/max,y/max);
    };
    el.addEventListener('pointerdown', event => { pointerId = event.pointerId; el.setPointerCapture(pointerId); event.preventDefault(); move(event); });
    el.addEventListener('pointermove', move);
    ['pointerup','pointercancel','lostpointercapture'].forEach(type => el.addEventListener(type, reset));
  };

  bindStick(document.getElementById('mobile-move-stick'), (x,y) => { setKey('w',y < -.2); setKey('s',y > .2); setKey('a',x < -.2); setKey('d',x > .2); });
  bindStick(document.getElementById('mobile-look-stick'), (x) => { setKey('left',x < -.16); setKey('right',x > .16); });

  const action = (id, method) => document.getElementById(id).addEventListener('pointerdown', event => { event.preventDefault(); const e=getEngine(); if (e && typeof e[method] === 'function') e[method](); });
  action('mobile-fire','shoot'); action('mobile-reload','reload'); action('mobile-exit','leaveMatch');

  const view = document.getElementById('game-view');
  const sync = () => { if (view) controls.classList.toggle('active', getComputedStyle(view).display !== 'none'); };
  if (view) { new MutationObserver(sync).observe(view,{attributes:true,attributeFilter:['style','class']}); sync(); }

  // Weapon-specific projectile muzzle/trail effect.
  window.weaponProjectile = function (weapon, color) {
    let canvas = document.getElementById('projectile-layer');
    if (!canvas) { canvas=document.createElement('canvas'); canvas.id='projectile-layer'; Object.assign(canvas.style,{position:'fixed',inset:'0',width:'100%',height:'100%',zIndex:'8999',pointerEvents:'none'}); document.body.appendChild(canvas); }
    canvas.width=innerWidth; canvas.height=innerHeight;
    const ctx=canvas.getContext('2d'), shots=canvas._shots || (canvas._shots=[]); const shot={x:innerWidth/2,y:innerHeight/2,vx:0,vy:-18,life:1,weapon:weapon||'PISTOL',color:color||'#ff0844'}; shots.push(shot);
    if (canvas._animating) return;
    canvas._animating=true;
    const draw=()=>{ ctx.clearRect(0,0,canvas.width,canvas.height); shots.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.life-=.055;ctx.save();ctx.globalAlpha=Math.max(0,s.life);ctx.strokeStyle=s.color;ctx.shadowColor=s.color;ctx.shadowBlur=s.weapon==='SHOTGUN'?26:14;ctx.lineWidth=s.weapon==='SHOTGUN'?7:3;ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.x-s.vx,s.y-s.vy*3);ctx.stroke();if(s.weapon==='SHOTGUN'){ctx.fillStyle=s.color;for(let i=0;i<4;i++)ctx.fillRect(s.x+(Math.random()-.5)*36,s.y+(Math.random()-.5)*36,4,4);}ctx.restore();}); for(let i=shots.length-1;i>=0;i--)if(shots[i].life<=0)shots.splice(i,1); if(shots.length)requestAnimationFrame(draw);else{canvas._animating=false;ctx.clearRect(0,0,canvas.width,canvas.height);}}; requestAnimationFrame(draw);
  };
})();
