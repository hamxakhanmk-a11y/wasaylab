// Home product ring: jars sit on a circle seen from the front. The ring drifts on its own, follows a drag, a horizontal
// wheel or the page scroll, keeps gliding after a flick, and the jars lean the way they are being carried. Moving the mouse over a
// jar turns it, as on the product tabs, by playing a strip of pre-rendered turn frames that loads the first time a jar is touched.
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

  let pos = 0, scrollGoal = 0, scrollShown = 0, shown = 0, prev = 0, last = 0, frame = 0, visible = false;
  let hover = false, focused = false, pauseUntil = 0, target = null, drag = null, moved = 0, lastScroll = scrollY, current = -1;
  let w = 0, h = 0, perJar = 1;
  const FRAMES = 21, SWING = 1;   // frames in a turn strip; the pointer's position across a jar runs from -SWING to +SWING
  const turns = items.map((el) => ({ el, url: el.dataset.turn, state: 'idle', span: null, cur: 0, goal: 0, pointer: 0 }));

  const mod = (n) => ((n % N) + N) % N;
  const wrapDiff = (a, b) => { let d = mod(a - b); if (d > N / 2) d -= N; return d; };

  function measure() {
    w = stage.clientWidth; h = stage.clientHeight;
    perJar = Math.max(96, w * (w < 700 ? 0.43 : 0.245));
  }

  function place() {
    const lean = reduced.matches ? 0 : clamp(shown * LEAN, -26, 26);
    for (let i = 0; i < N; i++) {
      const off = wrapDiff(i, pos), ao = Math.abs(off);
      const d = Math.exp(-(off * off) / 1.3);
      const scale = 0.58 + 0.42 * Math.exp(-off * off / 3.2);
      const x = off * perJar, y = -Math.min(ao * ao, 5) * h * 0.045;
      const roll = lean - clamp(off, -2.5, 2.5) * 11;
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

  // ---- turning a jar with the mouse (and a gentle sway of the front jar once its frames are here)
  let hot = null;   // the jar under the mouse
  function load(tn) {
    if (tn.state !== 'idle' || !tn.url) return;
    tn.state = 'loading';
    const img = new Image();
    img.onload = () => {
      const span = document.createElement('span');
      span.className = 'wz-ring__turn'; span.setAttribute('aria-hidden', 'true');
      span.style.backgroundImage = `url("${tn.url}")`;
      span.style.backgroundSize = `${FRAMES * 100}% 100%`;
      tn.el.firstElementChild.append(span);
      tn.span = span; tn.state = 'ready'; wake();
    };
    img.onerror = () => { tn.state = 'failed'; };
    img.src = tn.url;
  }
  function spin(t, dt) {
    const front = mod(Math.round(pos));
    for (let i = 0; i < N; i++) {
      const tn = turns[i];
      if (tn.state !== 'ready') continue;
      const mouse = hot === tn && !drag;
      const sway = !reduced.matches && !mouse && !hover && i === front && Math.abs(wrapDiff(i, pos)) < 0.35 ? Math.sin(t / 2600) * 0.38 : 0;
      tn.goal = mouse ? tn.pointer : sway;
      tn.cur += (tn.goal - tn.cur) * (reduced.matches ? 1 : 1 - Math.exp(-dt * 9));
      const idle = !mouse && Math.abs(tn.cur) < 0.012 && sway === 0;
      if (idle) { if (tn.span.style.opacity !== '0') { tn.span.style.opacity = '0'; tn.el.firstElementChild.firstElementChild.style.visibility = ''; } continue; }
      const f = clamp((tn.cur / SWING + 1) / 2, 0, 1) * (FRAMES - 1);
      tn.span.style.backgroundPosition = `${(Math.round(f) / (FRAMES - 1)) * 100}% 0`;
      if (tn.span.style.opacity !== '1') { tn.span.style.opacity = '1'; tn.el.firstElementChild.firstElementChild.style.visibility = 'hidden'; }
    }
  }
  stage.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || (drag && drag.started)) return;
    const el = e.target.closest ? e.target.closest('[data-ring-item]') : null;
    hot = el ? turns[items.indexOf(el)] : null;
    if (!hot) return;
    load(hot);
    const r = el.getBoundingClientRect();
    hot.pointer = clamp(((e.clientX - r.left) / Math.max(1, r.width) - 0.5) * 2 * SWING, -SWING, SWING);
    wake();
  });
  stage.addEventListener('pointerleave', () => { hot = null; });

  function tick(t) {
    frame = 0;
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016;
    last = t;
    const now = performance.now();
    if (document.documentElement.classList.contains('has-detail')) { last = 0; if (visible && !document.hidden) frame = requestAnimationFrame(tick); return; }
    if (drag) {
      // position follows the finger or mouse in pointermove
    } else if (target !== null) {
      const diff = target - pos;
      if (reduced.matches || Math.abs(diff) < 0.002) { pos = target; target = null; }
      else pos += diff * (1 - Math.exp(-dt * 7));
    } else {
      const drift = reduced.matches || hover || focused || now < pauseUntil ? 0 : DRIFT;
      glide += (drift - glide) * (1 - Math.exp(-dt * (Math.abs(glide) > Math.abs(drift) ? 1.6 : 3)));
      pos += glide * dt;
    }
    // Keep the logical position continuous: wrapping it while targeting the last/first jar reverses navigation.
    const scrollStep = (scrollGoal - scrollShown) * (1 - Math.exp(-dt * 10));
    if (!drag && target === null) { pos += scrollStep; scrollShown += scrollStep; }
    const raw = wrapDiff(pos, prev) / dt;
    shown += (raw - shown) * (1 - Math.exp(-dt * 9));
    prev = pos;
    place();
    spin(t, dt);
    if (visible && !document.hidden) frame = requestAnimationFrame(tick);
    else last = 0;
  }
  let glide = reduced.matches ? 0 : DRIFT;

  function wake() { if (!frame && visible && !document.hidden) frame = requestAnimationFrame(tick); }
  function hold(ms) { pauseUntil = performance.now() + ms; }
  function goTo(index) {
    target = pos + wrapDiff(index, pos);
    glide = 0; scrollShown = scrollGoal; hold(4000); wake();
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
      drag.started = true; drag.lx = e.clientX; drag.lt = e.timeStamp;
      target = null; glide = 0; scrollShown = scrollGoal;
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
    if (drag.started) {
      glide = reduced.matches || !e || e.type === 'pointercancel' || e.timeStamp - drag.lt > 100 ? 0 : clamp(drag.v, -3, 3);
      hold(2500);
    }
    drag = null; stage.classList.remove('is-dragging'); wake();
  };
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);
  stage.addEventListener('lostpointercapture', release);
  stage.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hover = true; });
  stage.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { hover = false; hold(600); } });
  stage.addEventListener('focusin', () => { focused = true; glide = 0; });
  stage.addEventListener('focusout', (e) => { focused = stage.contains(e.relatedTarget); hold(600); wake(); });

  // ---- a click opens the jar's product view (a drag never does); without the product view the link goes to the Pastes tab
  stage.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    if (e.detail !== 0 && moved >= 5) { e.preventDefault(); return; }
    if (window.WasayDetail) {
      e.preventDefault();
      const li = a.closest('[data-ring-item]');
      window.WasayDetail.open(li, li.querySelector('img'));
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
    else if (e.key === 'Enter' && e.target === stage && window.WasayDetail) {
      e.preventDefault();
      const item = items[mod(Math.round(pos))];
      window.WasayDetail.open(item, item.querySelector('img'));
    }
  });

  // ---- page scroll carries the ring while it is on screen
  addEventListener('scroll', () => {
    const dy = scrollY - lastScroll; lastScroll = scrollY;
    if (!visible || reduced.matches || drag || target !== null) return;
    scrollGoal += dy / SCROLL_JARS; wake();
  }, { passive: true });

  new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; lastScroll = scrollY; if (visible) { last = 0; wake(); } }, { rootMargin: '80px' }).observe(stage);
  new ResizeObserver(() => { measure(); place(); }).observe(stage);
  document.addEventListener('visibilitychange', () => { last = 0; wake(); });
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => { glide = reduced.matches ? 0 : DRIFT; wake(); });

  measure();
  place();
  stage.classList.add('is-ready');
})();
