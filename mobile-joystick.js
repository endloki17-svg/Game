(function () {
  'use strict';

  if (document.getElementById('mobile-controls')) return;

  const touchMode = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || window.matchMedia('(max-width: 900px)').matches;
  if (!touchMode) return;

  const style = document.createElement('style');
  style.textContent = `
    #mobile-controls {
      position: fixed; inset: 0; z-index: 9000; display: none; pointer-events: none; touch-action: none;
    }
    #mobile-controls.active { display: block; }
    .mobile-stick {
      position: absolute; bottom: 18px; width: 148px; height: 148px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.45); background: rgba(10,15,25,0.62);
      box-shadow: 0 0 24px rgba(0,242,254,0.28), inset 0 0 20px rgba(255,255,255,0.1);
      pointer-events: auto; touch-action: none;
    }
    #mobile-move-stick { left: 18px; }
    #mobile-look-stick { right: 18px; }
    .mobile-stick::before {
      content: 'MOVE'; position: absolute; inset: 16px; border-radius: 50%;
      border: 1px dashed rgba(255,255,255,0.25); display: grid; place-items: center;
      color: rgba(255,255,255,0.65); font: 900 11px "Outfit", sans-serif; letter-spacing: 1px;
    }
    #mobile-look-stick::before { content: 'LOOK'; }
    .mobile-stick::after {
      content: ''; position: absolute; left: 50%; top: 50%; width: 62px; height: 62px; margin: -31px;
      border-radius: 50%; background: linear-gradient(135deg, rgba(0,242,254,0.96), rgba(79,172,254,0.56));
      box-shadow: 0 0 20px rgba(0,242,254,0.8); transform: translate(var(--dx, 0), var(--dy, 0));
    }
    .mobile-action {
      position: absolute; border-radius: 50%; border: 2px solid rgba(255,255,255,0.5);
      color: #fff; font-weight: 900; background: rgba(255,255,255,0.08);
      box-shadow: 0 8px 18px rgba(0,0,0,0.4); pointer-events: auto; touch-action: none;
    }
    #mobile-fire {
      right: 28px; bottom: 190px; width: 82px; height: 82px; background: rgba(255,8,68,0.5); border-color: rgba(255,8,68,0.9);
    }
    #mobile-reload {
      right: 120px; bottom: 120px; width: 60px; height: 60px; background: rgba(246,211,101,0.46); border-color: rgba(246,211,101,0.9); font-size: 10px;
    }
    #mobile-exit {
      top: 18px; right: 18px; width: auto; height: auto; padding: 10px 16px; border-radius: 999px; background: rgba(255,8,68,0.7); border-color: rgba(255,8,68,1);
      font-size: 12px;
    }
    @media (max-width: 520px) {
      .mobile-stick { width: 126px; height: 126px; }
      .mobile-stick::after { width: 54px; height: 54px; margin: -27px; }
      #mobile-fire { width: 72px; height: 72px; right: 20px; bottom: 170px; }
      #mobile-reload { right: 104px; bottom: 112px; }
    }
  `;
  document.head.appendChild(style);

  const controls = document.createElement('div');
  controls.id = 'mobile-controls';
  controls.innerHTML = `
    <div id="mobile-move-stick" class="mobile-stick"></div>
    <div id="mobile-look-stick" class="mobile-stick"></div>
    <button id="mobile-fire" class="mobile-action" type="button">FIRE</button>
    <button id="mobile-reload" class="mobile-action" type="button">RLD</button>
    <button id="mobile-exit" class="mobile-action" type="button">EXIT</button>
  `;
  document.body.appendChild(controls);

  const engine = () => window.Engine3D;
  const setKey = (key, value) => {
    const e = engine();
    if (e && e.keys) e.keys[key] = value;
  };

  const bindStick = (element, callback) => {
    let pointerId = null;
    const reset = () => {
      pointerId = null;
      element.style.setProperty('--dx', '0px');
      element.style.setProperty('--dy', '0px');
      callback(0, 0);
    };
    const move = (event) => {
      if (pointerId !== event.pointerId) return;
      const rect = element.getBoundingClientRect();
      const max = rect.width * 0.36;
      let x = event.clientX - rect.left - rect.width / 2;
      let y = event.clientY - rect.top - rect.height / 2;
      const length = Math.hypot(x, y);
      if (length > max) {
        x = (x / length) * max;
        y = (y / length) * max;
      }
      element.style.setProperty('--dx', `${x}px`);
      element.style.setProperty('--dy', `${y}px`);
      callback(x / max, y / max);
    };
    element.addEventListener('pointerdown', (event) => {
      pointerId = event.pointerId;
      element.setPointerCapture(pointerId);
      event.preventDefault();
      move(event);
    });
    element.addEventListener('pointermove', move);
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((type) => {
      element.addEventListener(type, reset);
    });
  };

  bindStick(document.getElementById('mobile-move-stick'), (x, y) => {
    setKey('w', y < -0.2);
    setKey('s', y > 0.2);
    setKey('a', x < -0.2);
    setKey('d', x > 0.2);
  });

  bindStick(document.getElementById('mobile-look-stick'), (x) => {
    setKey('left', x < -0.16);
    setKey('right', x > 0.16);
  });

  const action = (id, method) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      const e = engine();
      if (e && typeof e[method] === 'function') e[method]();
    });
  };

  action('mobile-fire', 'shoot');
  action('mobile-reload', 'reload');
  action('mobile-exit', 'leaveMatch');

  const gameView = document.getElementById('game-view');
  const syncVisibility = () => {
    if (!gameView) return;
    controls.classList.toggle('active', getComputedStyle(gameView).display !== 'none');
  };
  if (gameView) {
    new MutationObserver(syncVisibility).observe(gameView, { attributes: true, attributeFilter: ['style', 'class'] });
    syncVisibility();
  }

  window.weaponProjectile = function (weapon, color) {
    let canvas = document.getElementById('projectile-layer');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'projectile-layer';
      Object.assign(canvas.style, {
        position: 'fixed', inset: '0', width: '100vw', height: '100vh', zIndex: '8999', pointerEvents: 'none'
      });
      document.body.appendChild(canvas);
    }
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const shots = canvas._shots || (canvas._shots = []);
    shots.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 10,
      vy: -18 - Math.random() * 10,
      life: 1,
      color: color || '#ff0844',
      weapon: weapon || 'PISTOL'
    });

    if (canvas._animating) return;
    canvas._animating = true;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life -= 0.06;

        ctx.save();
        ctx.globalAlpha = Math.max(0, s.life);
        ctx.strokeStyle = s.color;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = s.weapon === 'SHOTGUN' ? 24 : 12;
        ctx.lineWidth = s.weapon === 'SHOTGUN' ? 6 : 3;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * 3, s.y - s.vy * 3);
        ctx.stroke();
        if (s.weapon === 'SHOTGUN') {
          for (let n = 0; n < 5; n++) {
            ctx.fillStyle = s.color;
            ctx.fillRect(s.x + (Math.random() - 0.5) * 35, s.y + (Math.random() - 0.5) * 35, 4, 4);
          }
        }
        ctx.restore();

        if (s.life <= 0) shots.splice(i, 1);
      }

      if (shots.length > 0) {
        requestAnimationFrame(draw);
      } else {
        canvas._animating = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    requestAnimationFrame(draw);
  };
})();
