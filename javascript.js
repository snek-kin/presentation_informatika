(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const touch = matchMedia('(hover:none)').matches;
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;

  /* ===== Генераторы SVG: шестерни, трубы, робопауки ===== */
  const gearCache = {};
  function gearPath(t) {
    if (gearCache[t]) return gearCache[t];
    const s = Math.PI * 2 / t;
    let d = '';
    for (let i = 0; i < t; i++) {
      [[.05, 40], [.2, 48], [.45, 48], [.6, 40]].forEach(([k, r], j) => {
        const a = i * s + k * s;
        d += (i + j ? 'L' : 'M') + (Math.cos(a) * r).toFixed(1) + ' ' + (Math.sin(a) * r).toFixed(1);
      });
    }
    return (gearCache[t] = d + 'ZM9 0a9 9 0 1 0-18 0a9 9 0 1 0 18 0Z');
  }
  function buildGears() {
    $$('svg.gear').forEach(g => {
      g.setAttribute('viewBox', '-50 -50 100 100');
      g.innerHTML = `<path d="${gearPath(+g.dataset.t)}" fill="url(#brass)" fill-rule="evenodd" stroke="#11100D" stroke-width="1.5"/>` +
        '<circle r="27" fill="none" stroke="#0007" stroke-width="3"/><circle r="22" fill="none" stroke="#fff3" stroke-width="1"/>';
    });
  }
  function buildPipes() {
    $$('.pipes').forEach(s => {
      let h = '';
      for (let k = 0; k < 5; k++) {
        const y = 50 + 100 * k, d = `M0 ${y}C130 ${y} 150 250 300 250`;
        h += `<g><path class="pb" d="${d}"/><path class="ph" d="${d}"/><path class="pf" d="${d}"/></g>`;
      }
      s.innerHTML = h;
    });
  }
  function buildSpiders() {
    const leg = (i, r) => `<path class="lg" style="--i:${i};--r:${r}deg" d="M0 0L24-18L42 4"/>`;
    const side = o => leg(o, -70) + leg(o + 1, -30) + leg(o + 2, 10) + leg(o + 3, 50);
    const html = `<g>${side(0)}</g><g transform="scale(-1 1)">${side(2)}</g>` +
      '<ellipse class="bd" cx="-14" rx="12" ry="9"/><ellipse class="bd" rx="16" ry="12"/><circle class="bd" cx="15" r="8"/>' +
      '<circle cx="19" cy="-3" r="2.4" style="fill:var(--eye)"/><circle cx="19" cy="3" r="2.4" style="fill:var(--eye)"/>' +
      '<path class="sn" d="M22-5L34-12M22 5L34 12"/><circle cx="-2" r="3" fill="#11100D" opacity=".5"/>';
    $$('.spd').forEach(s => (s.innerHTML = html));
  }

  /* ===== Управление слайдами ===== */
  const slides = $$('.slide'), N = slides.length;
  const cnt = $('#cnt'), bar = $('#bar'), tr = $('#tr');
  const prevBtn = $('[data-nav="-1"]'), nextBtn = $('[data-nav="1"]');
  let cur = 0, lock = false;

  function show(n) {
    slides[cur].classList.remove('active');
    slides[n].classList.add('active');
    cur = n;
    cnt.textContent = String(n + 1).padStart(2, '0') + ' / ' + String(N).padStart(2, '0');
    bar.style.transform = `scaleX(${(n + 1) / N})`;
    prevBtn.disabled = n === 0;
    nextBtn.disabled = n === N - 1;
    $$('.doss.open').forEach(d => { d.classList.remove('open'); d.setAttribute('aria-expanded', 'false'); });
  }
  // Переход: заслонки (разные типы) + сканирующая линия; смена слайда под закрытыми заслонками
  function go(n) {
    if (lock || n < 0 || n >= N || n === cur) return;
    lock = true;
    tr.className = 'tr t' + (n % 3);
    void tr.offsetWidth;
    tr.classList.add('run');
    pulse();
    setTimeout(() => show(n), 340);
    setTimeout(() => { tr.className = 'tr'; lock = false; }, 840);
  }
  // Красный импульс по проводам и ускорение шестерён
  function pulse() {
    document.body.classList.add('hot', 'fast');
    setTimeout(() => document.body.classList.remove('hot', 'fast'), 900);
  }

  function bindNavigation() {
    document.addEventListener('click', e => {
      const nav = e.target.closest('[data-nav]'), jump = e.target.closest('[data-go]'), doss = e.target.closest('.doss');
      if (nav) go(cur + Number(nav.dataset.nav));
      else if (jump) go(Number(jump.dataset.go));
      else if (doss) {
        const open = doss.classList.toggle('open');
        doss.setAttribute('aria-expanded', open);
      }
    });
    addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && !e.target.closest('button'))) { e.preventDefault(); go(cur + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(cur - 1);
      else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(N - 1);
    });
    // Колёсико: новый «щелчок» только после паузы, чтобы инерция трекпада не пролистывала слайды
    let lastWheel = 0;
    addEventListener('wheel', e => {
      const now = performance.now(), fresh = now - lastWheel > 250;
      lastWheel = now;
      if (!fresh || lock || Math.abs(e.deltaY) < 20) return;
      go(cur + (e.deltaY > 0 ? 1 : -1));
    }, { passive: true });
    // Свайпы
    let x0 = 0, y0 = 0;
    addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      const d = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      if (Math.abs(d) > 50) go(cur + (d < 0 ? 1 : -1));
    }, { passive: true });
  }

  /* ===== Курсор: свет, параллакс, робопаук (плавно через rAF) ===== */
  function bindCursor() {
    const lamp = $('#lamp'), spider = $('#spider'), layers = $$('.layer');
    let mx = innerWidth / 2, my = innerHeight / 2, lx = mx, ly = my, sx = mx, dir = 1;
    addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
    function frame(t) {
      lx += (mx - lx) * .1; ly += (my - ly) * .1;
      if (!touch) lamp.style.transform = `translate(${lx - 250}px,${ly - 250}px)`;
      if (!reduce) {
        const px = lx / innerWidth - .5, py = ly / innerHeight - .5;
        layers.forEach(l => { const d = +l.dataset.d; l.style.transform = `translate(${-px * d * 2}px,${-py * d * 2}px)`; });
      }
      // Паук ползёт к курсору по нижнему краю; без курсора — патрулирует
      const tx = touch || reduce ? innerWidth * (.5 + .4 * Math.sin(t / 5000)) : Math.min(Math.max(mx, 60), innerWidth - 60);
      const diff = tx - sx;
      sx += diff * .02;
      if (Math.abs(diff) > 6) dir = diff > 0 ? 1 : -1;
      spider.classList.toggle('walk', Math.abs(diff) > 14);
      spider.style.transform = `translate(${sx - 50}px,0) scaleX(${dir})`;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ===== Наклон 3D-карточек ===== */
  function bindTilt() {
    if (touch) return;
    $$('.tilt').forEach(el => {
      let f = 0;
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        cancelAnimationFrame(f);
        f = requestAnimationFrame(() => { el.style.setProperty('--ry', x * 14 + 'deg'); el.style.setProperty('--rx', -y * 14 + 'deg'); });
      });
      el.addEventListener('pointerleave', () => { cancelAnimationFrame(f); el.style.setProperty('--ry', '0deg'); el.style.setProperty('--rx', '0deg'); });
    });
  }

  /* ===== Слайд 4: подсветка труб ===== */
  function bindPipes() {
    const groups = $$('#s4 .pipes g'), why = $('#why'), base = why.textContent;
    const on = b => { groups.forEach((g, i) => g.classList.toggle('on', i === +b.dataset.p)); why.textContent = b.dataset.t; };
    const off = () => { groups.forEach(g => g.classList.remove('on')); why.textContent = base; };
    $$('.src').forEach(b => {
      b.addEventListener('pointerenter', () => on(b));
      b.addEventListener('focus', () => on(b));
      b.addEventListener('click', () => on(b));
      b.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') off(); });
      b.addEventListener('blur', off);
    });
  }

  /* ===== Пар: ограниченное число клубов ===== */
  function bindSteam() {
    if (reduce) return;
    setInterval(() => {
      if (document.hidden) return;
      $$('.vent').forEach(v => {
        if ($$('.puff').length > 9) return;
        const r = v.getBoundingClientRect(), p = document.createElement('i');
        p.className = 'puff';
        p.style.left = r.left - 6 + 'px';
        p.style.top = r.top - 20 + 'px';
        p.style.setProperty('--x', Math.random() * 60 - 30 + 'px');
        document.body.append(p);
        p.addEventListener('animationend', () => p.remove());
      });
    }, 1800);
  }

  /* ===== Запуск ===== */
  buildGears();
  buildPipes();
  buildSpiders();
  bindNavigation();
  bindCursor();
  bindTilt();
  bindPipes();
  bindSteam();
  requestAnimationFrame(() => show(0));
})();