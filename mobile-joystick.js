(function () {
  'use strict';

  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || ('ontouchstart' in window);
  if (!mobile) return;

  const style = document.createElement('style');
  style.textContent = `
    #mobile-controls {
      position: fixed; inset: 0; z-index: 9000; display: none; pointer-events: none; touch-action: none;
    }
    #mobile-controls.active { display: block; }
    .mobile-stick {
      position: absolute; bottom: calc(26px + env(safe-area-inset-bottom)); width: 150px; height: 150px;
      border-radius: 50%; border: 2px solid rgba(255,255,255,.35); background: rgba(10,15,25,.48);
      box-shadow: 0 0 25px rgba(0,242,254,.18), inset 0 0 20px rgba(255,255,255,.08);
      pointer-events: auto; touch-action: none;
    }
    .mobile-stick::before {
      content: ''; position: absolute; inset: 16px; border: 1px dashed rgba(255,255,255,.18); border-radius: 50%;
    }
    .mobile-stick::after {
      content: ''; position: absolute; left: 50%; top: 50%; width: 62px; height: 62px; margin: -31px;
      border-radius: 50%; background: linear-gradient(135deg, rgba(0,242,254,.9), rgba(79,172,254,.5));
      box-shadow: 0 0 18px rgba(0,242,254,.6); transform: translate(var(--dx, 0), var(--dy, 0));
    }
    #mobile-move-stick { left: calc(18px + env(safe-area-inset-left)); }
    #mobile-look-stick { right: calc(18px + env(safe-area-inset-right)); }

    .mobile-action {
      position: absolute; border: 2px solid rgba(255,255,255,.4); border-radius: 50%;
      background: rgba(255,255,255,.08); color: #fff; font-weight: 900; pointer-events: auto; touch-action: none;
      box-shadow: 0 8px 16px rgba(0,0,0,.28);
    }
    #mobile-fire {
      right: 32px; bottom: calc(175px + env(safe-area-inset-bottom)); width: 78px; height: 78px;
      background: rgba(255,8,68,.5); border-color: rgba(255,8,68,.9);
    }
    #mobile-reload {
      right: 118px; bottom: calc(110px + env(safe-area-inset-bottom)); width: 60px; height: 60px;
      background: rgba(246,211,101,.4); border-color: rgba(246,211,101,.9); font-size: 11px;
    }
    #mobile-exit {
      top: calc(18px + env(safe-area-inset-top)); right: 18px; width: auto; height: auto;
      padding: 10px 16px; border-radius: 999px; background: rgba(255,8,68,.7); border-color: rgba(255,8,68,.9);
    }

    @media (min-width: 901px) { #mobile-controls { display: none !important; } }
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

  const bindStick = (element, callback) => {
    let pointerId = null;
    const reset = () => {
      pointerId = null;
      element.style.setProperty('--dx', '0px');
      element.style.setProperty('--dy', '0px');
      callback(0, 0);
    };
    const move = e => {
      if (pointerId !== e.pointerId) return;
      const rect = element.getBoundingClientRect();
      const max = rect.width * 0.36;
      let x = e.clientX - rect.left - rect.width / 2;
      let y = e.clientY - rect.top - rect.height / 2;
      const len = Math.hypot(x, y);
      if (len > max) {
        x = (x / len) * max;
        y = (y / len) * max;
      }
      element.style.setProperty('--dx', `${x}px`);
      element.style.setProperty('--dy', `${y}px`);
      callback(x / max, y / max);
    };
    element.addEventListener('pointerdown', e => {
      pointerId = e.pointerId;
      element.setPointerCapture(pointerId);
      e.preventDefault();
      move(e);
    });
    element.addEventListener('pointermove', move);
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => {
      element.addEventListener(type, reset);
    });
  };

  const engine = () => window.Engine3D;
  const setKey = (name, value) => {
    if (engine() && engine().keys) engine().keys[name] = value;
  };

  bindStick(document.getElementById('mobile-move-stick'), (x, y) => {
    setKey('w', y < -0.2);
    setKey('s', y > 0.2);
    setKey('a', x < -0.2);
    setKey('d', x > 0.2);
  });

  bindStick(document.getElementById('mobile-look-stick'), (x) => {
    setKey('left', x < -0.18);
    setKey('right', x > 0.18);
  });

  document.getElementById('mobile-fire').addEventListener('pointerdown', e => {
    e.preventDefault(); if (engine()) engine().shoot();
  });
  document.getElementById('mobile-reload').addEventListener('pointerdown', e => {
    e.preventDefault(); if (engine()) engine().reload();
  });
  document.getElementById('mobile-exit').addEventListener('pointerdown', e => {
    e.preventDefault(); if (engine()) engine().leaveMatch();
  });

  const gameView = document.getElementById('game-view');
  const updateVisibility = () => {
    if (gameView) {
      controls.classList.toggle('active', getComputedStyle(gameView).display !== 'none');
    }
  };
  if (gameView) {
    new MutationObserver(updateVisibility).observe(gameView, { attributes: true, attributeFilter: ['style', 'class'] });
    updateVisibility();
  }

  window.weaponProjectile = function (weapon, color) {
    const layer = document.getElementById('projectile-layer') || (() => {
      const n = document.createElement('canvas');
      n.id = 'projectile-layer';
      n.style.position = 'fixed';
      n.style.inset = '0';
      n.style.width = '100vw';
      n.style.height = '100vh';
      n.style.zIndex = '6000';
      n.style.pointerEvents = 'none';
      document.body.appendChild(n);
      return n;
    })();
    const ctx = layer.getContext('2d');
    const w = layer.width = window.innerWidth;
    const h = layer.height = window.innerHeight;
    const startX = w / 2;
    const startY = h / 2;
    const trail = {
      x: startX,
      y: startY,
      vx: (Math.random() - 0.5) * 12,
      vy: -3 - Math.random() * 8,
      life: 1,
      color,
      kind: weapon || 'PISTOL'
    };
    const shots = (layer.__shots || []);
    shots.push(trail);
    layer.__shots = shots;

    const draw = () => {
      const c = layer.getContext('2d');
      c.clearRect(0, 0, layer.width, layer.height);
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life -= 0.04;
        c.beginPath();
        c.strokeStyle = s.color;
        c.lineWidth = s.kind === 'SHOTGUN' ? 5 : 3;
        c.shadowBlur = 12;
        c.shadowColor = s.color;
        c.moveTo(s.x - s.vx * 3, s.y - s.vy * 3);
        c.lineTo(s.x, s.y);
        c.stroke();
        if (s.life <= 0) shots.splice(i, 1);
      }
      if (shots.length) requestAnimationFrame(draw);
      else c.clearRect(0, 0, layer.width, layer.height);
    };
    requestAnimationFrame(draw);
  };
})();
