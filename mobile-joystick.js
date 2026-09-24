/* Mobile FPS controls, reload, exit and weapon projectile effects. */
(function () {
  'use strict';
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const isSmallScreen = () => window.matchMedia('(max-width: 900px)').matches;
  if (!isTouch && !isSmallScreen()) return;

  const style = document.createElement('style');
  style.textContent = `
    #mobile-controls { position:fixed; inset:0; z-index:9000; display:none; pointer-events:none; touch-action:none; }
    #mobile-controls.active { display:block; }
    .mobile-stick { position:absolute; bottom:calc(24px + env(safe-area-inset-bottom)); width:150px; height:150px; border:2px solid rgba(255,255,255,.42); border-radius:50%; background:rgba(5,12,24,.58); box-shadow:0 0 28px rgba(0,242,254,.25), inset 0 0 24px rgba(255,255,255,.08); pointer-events:auto; touch-action:none; }
    #mobile-move-stick { left:calc(20px + env(safe-area-inset-left)); }
    #mobile-look-stick { right:calc(20px + env(safe-area-inset-right)); }
    .mobile-stick::before { content:''; position:absolute; inset:17px; border:1px dashed rgba(255,255,255,.22); border-radius:50%; }
    .mobile-stick::after { content:''; position:absolute; left:50%; top:50%; width:62px; height:62px; margin:-31px; border-radius:50%; background:linear-gradient(135deg,rgba(0,242,254,.9),rgba(79,172,254,.55)); box-shadow:0 0 22px rgba(0,242,254,.65); transform:translate(var(--dx,0),var(--dy,0)); }
    .mobile-action { position:absolute; width:72px; height:72px; border-radius:50%; color:#fff; font-weight:900; border:2px solid rgba(255,255,255,.45); box-shadow:0 5px 18px rgba(0,0,0,.45); pointer-events:auto; touch-action:none; }
    #mobile-fire { right:30px; bottom:calc(195px + env(safe-area-inset-bottom)); background:rgba(255,8,68,.55); border-color:#ff0844; }
    #mobile-reload { right:122px; bottom:calc(125px + env(safe-area-inset-bottom)); width:58px; height:58px; background:rgba(246,211,101,.42); color:#fff; font-size:11px; }
    #mobile-exit { top:calc(18px + env(safe-area-inset-top)); right:18px; width:auto; height:auto; padding:10px 16px; border-radius:999px; background:rgba(255,8,68,.7); }
    #game-ammo { position:absolute; right:24px; top:calc(64px + env(safe-area-inset-top)); z-index:20; padding:9px 14px; border-radius:14px; background:rgba(0,0,0,.64); color:#fff; font:bold 15px Outfit,sans-serif; pointer-events:none; }
    #projectile-effects { position:absolute; inset:0; z-index:8; pointer-events:none; }
    @media (min-width:901px) { #mobile-controls { display:none !important; } }
  `;
  document.head.appendChild(style);

  const controls = document.createElement('div');
  controls.id = 'mobile-controls';
  controls.innerHTML = `
    <div id="mobile-move-stick" class="mobile-stick" aria-label="이동 조이스틱"></div>
    <div id="mobile-look-stick" class="mobile-stick" aria-label="시점 조이스틱"></div>
    <button id="mobile-fire" class="mobile-action" type="button">FIRE</button>
    <button id="mobile-reload" class="mobile-action" type="button">RELOAD</button>
    <button id="mobile-exit" class="mobile-action" type="button">EXIT</button>`;
  document.body.appendChild(controls);

  const game = () => window.Engine3D;
  const key = (name, value) => { if (game()?.keys) game().keys[name] = value; };
  const bindStick = (el, fn) => {
    let id = null;
    const reset = () => { id = null; el.style.setProperty('--dx','0px'); el.style.setProperty('--dy','0px'); fn(0,0); };
    const move = e => {
      if (id !== e.pointerId) return;
      const r = el.getBoundingClientRect(), max = r.width * .36;
      let x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
      const len = Math.hypot(x,y); if (len > max) { x *= max / len; y *= max / len; }
      el.style.setProperty('--dx', `${x}px`); el.style.setProperty('--dy', `${y}px`); fn(x/max,y/max);
    };
    el.addEventListener('pointerdown', e => { id=e.pointerId; el.setPointerCapture(id); e.preventDefault(); move(e); });
    el.addEventListener('pointermove', move); ['pointerup','pointercancel','lostpointercapture'].forEach(t => el.addEventListener(t, reset));
  };
  bindStick(document.getElementById('mobile-move-stick'), (x,y) => { key('w',y<-.2); key('s',y>.2); key('a',x<-.2); key('d',x>.2); });
  bindStick(document.getElementById('mobile-look-stick'), (x) => { key('left',x<-.18); key('right',x>.18); });

  const button = (id, fn) => document.getElementById(id).addEventListener('pointerdown', e => { e.preventDefault(); fn(); });
  button('mobile-fire', () => game()?.shoot());
  button('mobile-reload', () => game()?.reload());
  button('mobile-exit', () => game()?.leaveMatch());

  const view = document.getElementById('game-view');
  const update = () => controls.classList.toggle('active', !!view && getComputedStyle(view).display !== 'none');
  new MutationObserver(update).observe(view, { attributes:true, attributeFilter:['style','class'] });
  update();

  // Draw lightweight, weapon-specific projectile trails over the FPS canvas.
  const effects = document.createElement('canvas'); effects.id = 'projectile-effects';
  view.appendChild(effects); const ctx = effects.getContext('2d'); const shots = [];
  const resize = () => { effects.width=innerWidth; effects.height=innerHeight; }; addEventListener('resize',resize); resize();
  window.weaponProjectile = (weapon, color) => { shots.push({ weapon, color, t:0 }); };
  const draw = () => {
    ctx.clearRect(0,0,effects.width,effects.height);
    for (let i=shots.length-1;i>=0;i--) { const s=shots[i]; s.t+=.08; const x=innerWidth/2, y=innerHeight/2; const length=s.weapon==='SHOTGUN'?240:s.weapon==='RIFLE'?360:280; const spread=s.weapon==='SHOTGUN'?18:2; const endX=x+(Math.random()-.5)*spread, endY=y-(length*s.t);
      ctx.save(); ctx.globalAlpha=Math.max(0,1-s.t); ctx.strokeStyle=s.color; ctx.shadowColor=s.color; ctx.shadowBlur=s.weapon==='SHOTGUN'?24:12; ctx.lineWidth=s.weapon==='SHOTGUN'?6:3; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(endX,endY); ctx.stroke();
      if(s.weapon==='SHOTGUN') { for(let n=0;n<5;n++){ctx.beginPath();ctx.arc(endX+(Math.random()-.5)*45,endY+(Math.random()-.5)*45,3,0,Math.PI*2);ctx.fillStyle=s.color;ctx.fill();} } ctx.restore(); if(s.t>=1) shots.splice(i,1); }
    requestAnimationFrame(draw);
  }; draw();
})();
