/* Mobile/desktop touch controls for the 3D match. */
(function () {
  'use strict';
  if (document.getElementById('mobile-controls')) return;
  const touchMode = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || window.matchMedia('(max-width:900px)').matches;
  if (!touchMode) return;

  const style = document.createElement('style');
  style.textContent = `
    #mobile-controls{position:fixed;inset:0;z-index:9000;display:none;pointer-events:none;touch-action:none}
    #mobile-controls.active{display:block}
    .mobile-stick{position:absolute;bottom:18px;width:148px;height:148px;border-radius:50%;border:2px solid rgba(255,255,255,.45);background:rgba(10,15,25,.62);box-shadow:0 0 24px rgba(0,242,254,.28),inset 0 0 20px rgba(255,255,255,.1);pointer-events:auto;touch-action:none}
    #mobile-move-stick{left:18px}#mobile-look-stick{right:18px}
    .mobile-stick:before{content:'MOVE';position:absolute;inset:16px;border-radius:50%;border:1px dashed rgba(255,255,255,.25);display:grid;place-items:center;color:#fffa;font:900 11px Outfit,sans-serif}
    #mobile-look-stick:before{content:'LOOK'}
    .mobile-stick:after{content:'';position:absolute;left:50%;top:50%;width:62px;height:62px;margin:-31px;border-radius:50%;background:linear-gradient(135deg,#00f2fe,#4facfe);box-shadow:0 0 20px #00f2fecc;transform:translate(var(--dx,0),var(--dy,0))}
    .mobile-action{position:absolute;border-radius:50%;border:2px solid #fff;color:#fff;font-weight:900;background:#ffffff14;box-shadow:0 8px 18px #0006;pointer-events:auto;touch-action:none}
    #mobile-fire{right:28px;bottom:190px;width:82px;height:82px;background:#ff084480;border-color:#ff0844}
    #mobile-reload{right:120px;bottom:120px;width:60px;height:60px;background:#f6d36575;border-color:#f6d365;font-size:10px}
    #mobile-exit{top:18px;right:18px;width:auto;height:auto;padding:10px 16px;border-radius:999px;background:#ff0844b3;border-color:#ff0844;font-size:12px}
    @media(max-width:520px){.mobile-stick{width:126px;height:126px}.mobile-stick:after{width:54px;height:54px;margin:-27px}#mobile-fire{width:72px;height:72px;right:20px;bottom:170px}#mobile-reload{right:104px;bottom:112px}}
  `;
  document.head.appendChild(style);

  const controls = document.createElement('div');
  controls.id = 'mobile-controls';
  controls.innerHTML = '<div id="mobile-move-stick" class="mobile-stick"></div><div id="mobile-look-stick" class="mobile-stick"></div><button id="mobile-fire" class="mobile-action" type="button">FIRE</button><button id="mobile-reload" class="mobile-action" type="button">RLD</button><button id="mobile-exit" class="mobile-action" type="button">EXIT</button>';
  document.body.appendChild(controls);

  const engine = () => window.Engine3D;
  const setKey = (name, value) => { const e = engine(); if (e && e.keys) e.keys[name] = value; };
  const bindStick = (el, callback) => {
    let pointerId = null;
    const reset = () => { pointerId = null; el.style.setProperty('--dx','0px'); el.style.setProperty('--dy','0px'); callback(0,0); };
    const move = event => {
      if (event.pointerId !== pointerId) return;
      const r = el.getBoundingClientRect(), max = r.width * .36;
      let x = event.clientX-r.left-r.width/2, y = event.clientY-r.top-r.height/2, length = Math.hypot(x,y);
      if (length > max) { x=x/length*max; y=y/length*max; }
      el.style.setProperty('--dx',`${x}px`); el.style.setProperty('--dy',`${y}px`); callback(x/max,y/max);
    };
    el.addEventListener('pointerdown', e => { pointerId=e.pointerId; el.setPointerCapture(pointerId); e.preventDefault(); move(e); });
    el.addEventListener('pointermove', move);
    ['pointerup','pointercancel','lostpointercapture'].forEach(type => el.addEventListener(type, reset));
  };

  bindStick(document.getElementById('mobile-move-stick'), (x,y) => {
    setKey('w',y<-.2); setKey('s',y>.2); setKey('a',x<-.2); setKey('d',x>.2);
  });

  // Use an analogue turn value instead of the old fixed ArrowLeft/ArrowRight
  // rotation. The previous fixed 0.04 radians per frame felt far too sensitive.
  bindStick(document.getElementById('mobile-look-stick'), x => {
    const e = engine();
    if (e) e.mobileLook = Math.max(-1, Math.min(1, x));
    setKey('left', false); setKey('right', false);
  });

  // Apply a small, frame-rate-independent analogue turn directly to the camera.
  let previous = performance.now();
  const turnLoop = now => {
    const e = engine();
    const dt = Math.min(40, now-previous); previous=now;
    if (e && e.p && e.mobileLook) {
      const r = e.mobileLook * 0.0035 * dt;
      const p=e.p, cos=Math.cos(r), sin=Math.sin(r), oldDirX=p.dirX, oldPlaneX=p.planeX;
      p.dirX=p.dirX*cos-p.dirY*sin; p.dirY=oldDirX*sin+p.dirY*cos;
      p.planeX=p.planeX*cos-p.planeY*sin; p.planeY=oldPlaneX*sin+p.planeY*cos;
    }
    requestAnimationFrame(turnLoop);
  };
  requestAnimationFrame(turnLoop);

  const action = (id, method) => document.getElementById(id).addEventListener('pointerdown', e => { e.preventDefault(); const x=engine(); if(x && typeof x[method]==='function') x[method](); });
  action('mobile-fire','shoot'); action('mobile-reload','reload'); action('mobile-exit','leaveMatch');

  const gameView=document.getElementById('game-view');
  const sync=()=>{ if(gameView) controls.classList.toggle('active',getComputedStyle(gameView).display!=='none'); };
  if(gameView){ new MutationObserver(sync).observe(gameView,{attributes:true,attributeFilter:['style','class']}); sync(); }

  // Draw the projectile from the weapon muzzle toward the crosshair. It no
  // longer travels upward on the screen as if gravity were reversed.
  window.weaponProjectile = function(weapon,color){
    let canvas=document.getElementById('projectile-layer');
    if(!canvas){ canvas=document.createElement('canvas'); canvas.id='projectile-layer'; Object.assign(canvas.style,{position:'fixed',inset:'0',width:'100%',height:'100%',zIndex:'8999',pointerEvents:'none'}); document.body.appendChild(canvas); }
    canvas.width=innerWidth; canvas.height=innerHeight;
    const ctx=canvas.getContext('2d'), shots=canvas._shots||(canvas._shots=[]);
    const spread=weapon==='SHOTGUN'?28:weapon==='RIFLE'?6:3;
    shots.push({startX:innerWidth*.78,startY:innerHeight*.82,endX:innerWidth/2+(Math.random()-.5)*spread,endY:innerHeight/2+(Math.random()-.5)*spread,t:0,color:color||'#ff0844',weapon:weapon||'PISTOL'});
    if(canvas._animating)return; canvas._animating=true;
    const draw=()=>{
      ctx.clearRect(0,0,canvas.width,canvas.height);
      for(let i=shots.length-1;i>=0;i--){const s=shots[i];s.t+=.14;const x=s.startX+(s.endX-s.startX)*s.t,y=s.startY+(s.endY-s.startY)*s.t;ctx.save();ctx.globalAlpha=1-s.t;ctx.strokeStyle=s.color;ctx.shadowColor=s.color;ctx.shadowBlur=s.weapon==='SHOTGUN'?26:14;ctx.lineWidth=s.weapon==='SHOTGUN'?6:3;ctx.beginPath();ctx.moveTo(s.startX+(x-s.startX)*Math.max(0,s.t-.18),s.startY+(y-s.startY)*Math.max(0,s.t-.18));ctx.lineTo(x,y);ctx.stroke();ctx.restore();if(s.t>=1)shots.splice(i,1);}
      if(shots.length)requestAnimationFrame(draw);else{canvas._animating=false;ctx.clearRect(0,0,canvas.width,canvas.height);}
    }; requestAnimationFrame(draw);
  };
})();
