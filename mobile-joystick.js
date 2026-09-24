/* Mobile FPS joystick controller for APOCALYPSE: ULTIMATE ARENA.
 * Add <script src="mobile-joystick.js"></script> before </body> in index.html.
 */
(function () {
  'use strict';

  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    || ('ontouchstart' in window);
  if (!mobile) return;

  const css = document.createElement('style');
  css.textContent = `
    #mobile-controls { position:fixed; inset:0; z-index:6000; pointer-events:none; display:none; touch-action:none; }
    #mobile-controls.active { display:block; }
    .mobile-stick { position:absolute; bottom:max(28px, env(safe-area-inset-bottom)); width:142px; height:142px; border:2px solid rgba(255,255,255,.3); border-radius:50%; background:rgba(10,15,25,.38); box-shadow:0 0 25px rgba(0,242,254,.18), inset 0 0 20px rgba(255,255,255,.08); pointer-events:auto; touch-action:none; }
    #mobile-move-stick { left:max(22px, env(safe-area-inset-left)); }
    #mobile-look-stick { right:max(22px, env(safe-area-inset-right)); }
    .mobile-stick::after { content:''; position:absolute; left:50%; top:50%; width:58px; height:58px; margin:-29px; border-radius:50%; background:linear-gradient(135deg,rgba(0,242,254,.8),rgba(79,172,254,.48)); box-shadow:0 0 18px rgba(0,242,254,.5); transform:translate(var(--dx,0),var(--dy,0)); transition:transform .04s linear; }
    #mobile-fire { position:absolute; right:24px; bottom:190px; width:72px; height:72px; border:2px solid rgba(255,8,68,.8); border-radius:50%; color:#fff; background:rgba(255,8,68,.35); font-weight:900; pointer-events:auto; touch-action:none; }
    @media (min-width:700px) { #mobile-controls { display:none !important; } }
  `;
  document.head.appendChild(css);

  const controls = document.createElement('div');
  controls.id = 'mobile-controls';
  controls.innerHTML = '<div id="mobile-move-stick" class="mobile-stick" aria-label="이동 조이스틱"></div><div id="mobile-look-stick" class="mobile-stick" aria-label="시점 조이스틱"></div><button id="mobile-fire" type="button">FIRE</button>';
  document.body.appendChild(controls);

  const engine = () => window.Engine3D;
  const setKey = (key, value) => { if (engine() && engine().keys) engine().keys[key] = value; };
  const bindStick = (element, callback) => {
    let pointerId = null;
    const reset = () => { pointerId = null; element.style.setProperty('--dx', '0px'); element.style.setProperty('--dy', '0px'); callback(0, 0); };
    element.addEventListener('pointerdown', e => { pointerId = e.pointerId; element.setPointerCapture(pointerId); e.preventDefault(); move(e); });
    const move = e => {
      if (pointerId !== e.pointerId) return;
      const r = element.getBoundingClientRect();
      const max = r.width * .36;
      let x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
      const length = Math.hypot(x, y);
      if (length > max) { x *= max / length; y *= max / length; }
      element.style.setProperty('--dx', `${x}px`); element.style.setProperty('--dy', `${y}px`);
      callback(x / max, y / max);
    };
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerup', reset); element.addEventListener('pointercancel', reset); element.addEventListener('lostpointercapture', reset);
  };

  bindStick(document.getElementById('mobile-move-stick'), (x, y) => {
    setKey('w', y < -.22); setKey('s', y > .22); setKey('a', x < -.22); setKey('d', x > .22);
  });
  bindStick(document.getElementById('mobile-look-stick'), (x) => {
    setKey('left', x < -.2); setKey('right', x > .2);
  });
  const fire = document.getElementById('mobile-fire');
  fire.addEventListener('pointerdown', e => { e.preventDefault(); if (engine()) engine().shoot(); });

  const gameView = document.getElementById('game-view');
  const updateVisibility = () => controls.classList.toggle('active', !!gameView && getComputedStyle(gameView).display !== 'none');
  new MutationObserver(updateVisibility).observe(gameView, { attributes:true, attributeFilter:['style','class'] });
  updateVisibility();
})();
