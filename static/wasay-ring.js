// Home product ring: jars sit on a circle seen from the front. The ring drifts on its own, follows a drag, a horizontal
// wheel or the page scroll, keeps gliding after a flick, and the jars lean the way they are being carried.
(() => {
  const stage = document.querySelector('[data-ring]');
  if (!stage) return;
  const items = [...stage.querySelectorAll('[data-ring-item]')];
  const N = items.length;
  if (N < 3) return;
  const caption = document.querySelector('[data-ring-caption]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const DRIFT = 0.2;          // jars per second when left alone
  const LEAN = 8;             // degrees of tilt per jar-per-second of travel
  const SCROLL_JARS = 650;    // page pixels that carry the ring by one jar

  let pos = 0, shown = 0, prev = 0, last = 0, frame = 0, visible = false;
  let hover = false, pauseUntil = 0, target = null, drag = null, moved = 0, lastScroll = scrollY, current = -1;
  let w = 0, h = 0, perJar = 1;

  const mod = (n) => ((n % N) + N) % N;
  const wrapDiff = (a, b) => { let d = mod(a - b); if (d > N / 2) d -= N; return d; };

  function measure() {
    w = stage.clientWidth; h = stage.clientHeight;
    perJar = Math.max(96, w * (w < 700 ? 0.37 : 0.27));
  }

  function place() {
    const lean = reduced.matches ? 0 : clamp(shown * LEAN, -26, 26);
    for (let i = 0; i < N; i++) {
      const off = wrapDiff(i, pos), ao = Math.abs(off);
      const d = Math.exp(-(off * off) / 1.3);
      const scale = 0.4 + 0.6 * Math.pow(d, 0.8);
      const x = off * perJar, y = -(1 - d) * h * 0.12;
      const roll = lean - clamp(off, -2.5, 2.5) * 3.2;
      const el = items[i];
      el.style.transform = `translate(-50%,-50%) translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${roll.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      el.style.zIndex = String(Math.round(d * 100) + 100);
      el.style.visibility = ao > 3.3 ? 'hidden' : 'visible';
      el.firstElementChild.tabIndex = ao < 0.5 ? 0 : -1;
    }
    const front = mod(Math.round(pos));
    if (front !== current) {
      current = front;
      if (caption) caption.innerHTML = `<b>${items[front].dataset.name}</b>${items[front].dataset.detail}`;
    }
  }

  function tick(t) {
    frame = 0;
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016;
    last = t;
    const now = performance.now();
    if (document.documentElement.classList.contains('has-detail')) { last = 0; if (visible) frame = requestAnimationFrame(tick); return; }
    if (drag) {
      // position follows the finger or mouse in pointermove
    } else if (target !== null) {
      const diff = target - pos;
      if (reduced.matches || Math.abs(diff) < 0.002) { pos = target; target = null; }
      else pos += diff * (1 - Math.exp(-dt * 7));
    } else {
      const drift = reduced.matches || hover || now < pauseUntil ? 0 : DRIFT;
      glide += (drift - glide) * (1 - Math.exp(-dt * (Math.abs(glide) > Math.abs(drift) ? 1.6 : 3)));
      pos += glide * dt;
    }
    pos = pos % N;
    const raw = wrapDiff(pos, prev) / dt;
    shown += (raw - shown) * (1 - Math.exp(-dt * 9));
    prev = pos;
    place();
    if (visible && !document.hidden) frame = requestAnimationFrame(tick);
    else last = 0;
  }
  let glide = reduced.matches ? 0 : DRIFT;

  function wake() { if (!frame && visible && !document.hidden) frame = requestAnimationFrame(tick); }
  function hold(ms) { pauseUntil = performance.now() + ms; }
  function goTo(index) {
    target = pos + wrapDiff(index, pos);
    glide = 0; hold(4000); wake();
  }

  // ---- pointer: drag the ring
  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag = { id: e.pointerId, x: e.clientX, pos0: pos, lx: e.clientX, lt: e.timeStamp, v: 0, started: false };
    moved = 0; wake();
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    moved = Math.max(moved, Math.abs(dx));
    // the pointer is captured only once the press turns into a drag, so a plain click still reaches the jar it hit
    if (!drag.started) {
      if (Math.abs(dx) < 5) return;
      drag.started = true; drag.x = e.clientX; drag.pos0 = pos; drag.lx = e.clientX; drag.lt = e.timeStamp;
      target = null; glide = 0;
      try { stage.setPointerCapture(e.pointerId); } catch {}
      stage.classList.add('is-dragging');
      return;
    }
    pos = drag.pos0 - dx / perJar;
    const dt = Math.max(1, e.timeStamp - drag.lt);
    drag.v = drag.v * 0.6 + (-(e.clientX - drag.lx) / perJar / (dt / 1000)) * 0.4;
    drag.lx = e.clientX; drag.lt = e.timeStamp;
    hold(4000);
  });
  const release = (e) => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    if (drag.started) { glide = reduced.matches ? 0 : clamp(drag.v, -5, 5); hold(2500); }
    drag = null; stage.classList.remove('is-dragging'); wake();
  };
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);
  stage.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hover = true; });
  stage.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { hover = false; hold(600); } });

  // ---- a click opens the jar's product view (a drag never does); without the product view the link goes to the Pastes tab
  stage.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    if (moved > 6) { e.preventDefault(); return; }
    if (window.WasayDetail) {
      e.preventDefault();
      const li = a.closest('[data-ring-item]');
      window.WasayDetail.open(items.indexOf(li), li.querySelector('img'));
    }
  });

  // ---- horizontal wheel or trackpad
  stage.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    target = null; glide = 0; pos += e.deltaX / perJar; hold(3000); wake();
  }, { passive: false });

  // ---- keyboard
  stage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(Math.round(pos) + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(Math.round(pos) - 1); }
    else if (e.key === 'Home') { e.preventDefault(); goTo(0); }
  });

  // ---- page scroll carries the ring while it is on screen
  addEventListener('scroll', () => {
    const dy = scrollY - lastScroll; lastScroll = scrollY;
    if (!visible || reduced.matches || drag || target !== null) return;
    pos += dy / SCROLL_JARS; wake();
  }, { passive: true });

  new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; lastScroll = scrollY; if (visible) { last = 0; wake(); } }, { rootMargin: '80px' }).observe(stage);
  new ResizeObserver(() => { measure(); place(); }).observe(stage);
  document.addEventListener('visibilitychange', () => { last = 0; wake(); });
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => { glide = reduced.matches ? 0 : DRIFT; wake(); });

  measure();
  place();
  stage.classList.add('is-ready');
})();
