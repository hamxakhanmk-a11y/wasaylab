// Home products: a page of its own after Wasay at a glance. As the page arrives the products sweep in from the right, the far-left
// one first; then they drift past slowly on their own: the one in the middle is large and the ones to the sides smaller and higher,
// so they read as a ring seen from the front. They follow a drag or swipe (with a glide after a flick), a sideways wheel, the page
// scroll and the arrow keys; hovering, touching or using the keys stops the drift for a while. Everything moves on a spring, the
// products lean the way they travel, bob gently, and whenever they come to rest one settles in the middle. Moving the mouse over a product turns it,
// as on the product tabs, by playing a strip of pre-rendered turn frames that loads the first time it is touched.
(() => {
  const stage = document.querySelector('[data-ring]');
  if (!stage) return;
  const items = [...stage.querySelectorAll('[data-ring-item]')];
  const N = items.length;
  if (N < 3) return;
  const section = stage.closest('.wz-ring') || stage;
  const caption = document.querySelector('[data-ring-caption]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const LEAN = 5;                  // degrees of tilt per product-per-second of travel
  const DRIFT = .18;               // products per second when left alone
  const SCROLL = 700;              // page pixels that carry them by one product

  // pos: the product in the middle (fractions between) as shown; offset: where drift, drag, wheel, scroll and keys have taken it
  let pos = 0, vel = 0, offset = 0, glide = 0, magnet = 0, quiet = 0, last = 0, frame = 0, visible = false, current = -1, drag = null, moved = 0;
  let appear = 0, entered = false, drift = 0, rest = 0, hovered = false, focused = false, lastScroll = scrollY;
  let w = 0, h = 0, perJar = 1, lastGoal = 0;
  const looks = items.map(() => ({ z: '', vis: '' }));
  const FRAMES = 21, SWING = 1;   // frames in a turn strip; the pointer's position across a product runs from -SWING to +SWING
  const turns = items.map((el) => ({ el, url: el.dataset.turn, state: 'idle', span: null, cur: 0, goal: 0, pointer: 0 }));

  const mod = (n) => ((n % N) + N) % N;
  const wrapDiff = (a, b) => { let d = mod(a - b); if (d > N / 2) d -= N; return d; };
  const easeOut = (n) => 1 - Math.pow(1 - clamp(n, 0, 1), 3);

  function measure() {
    w = stage.clientWidth; h = stage.clientHeight;
    perJar = Math.max(96, w * (w < 700 ? 0.46 : 0.25));
  }

  function place(appear, t) {
    const lean = reduced.matches ? 0 : clamp(vel * LEAN, -14, 14);
    for (let i = 0; i < N; i++) {
      const off = wrapDiff(i, pos), ao = Math.abs(off);
      // arriving: each product slides in from beyond the right edge, the leftmost first
      const come = reduced.matches ? (appear > 0 ? 1 : 0) : easeOut(appear * 1.8 - (clamp(off, -3, 3) + 3) / 6 * .8);
      const scale = (0.56 + 0.44 * Math.exp(-off * off / 3)) * (.86 + .14 * come);
      const bob = reduced.matches ? 0 : Math.sin(t / 900 + i * 1.7) * 5 * Math.exp(-ao * .6);
      const x = off * perJar + (1 - come) * (w * .62 + perJar * 1.2), y = -Math.min(ao * ao, 5) * h * 0.04 + bob;
      const roll = lean - clamp(off, -2.5, 2.5) * 6 + (1 - come) * 14;
      const el = items[i];
      el.style.transform = `translate3d(-50%,-50%,0) translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${roll.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      el.style.opacity = come < 1 ? come.toFixed(3) : '';
      // only touch stacking and visibility when they change, so the browser is not asked to re-sort the layers every frame
      const z = String(200 - Math.round(ao * 20)), vis = ao > 3.2 || come <= 0 ? 'hidden' : 'visible';
      if (looks[i].z !== z) { looks[i].z = z; el.style.zIndex = z; }
      if (looks[i].vis !== vis) { looks[i].vis = vis; el.style.visibility = vis; }
      el.firstElementChild.tabIndex = ao < 0.5 ? 0 : -1;
    }
    const front = mod(Math.round(pos));
    if (front !== current) {
      current = front;
      if (caption) caption.innerHTML = `<b>${items[front].dataset.name}</b>${items[front].dataset.detail}`;
    }
  }

  // ---- turning a product with the mouse (and a gentle sway of the middle one once its frames are here)
  let hot = null;
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
      const sway = !reduced.matches && !mouse && i === front && Math.abs(wrapDiff(i, pos)) < 0.35 ? Math.sin(t / 2600) * 0.38 : 0;
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
    if (document.documentElement.classList.contains('has-detail')) { last = 0; if (visible && !document.hidden) frame = requestAnimationFrame(tick); return; }
    // the page has arrived once half of it is on screen: the products sweep in, once
    if (!entered && section.getBoundingClientRect().top < innerHeight * .5) entered = true;
    appear = reduced.matches ? (entered ? 1 : 0) : Math.min(1, appear + (entered ? dt / 1.4 : 0));
    section.style.setProperty('--appear', appear.toFixed(3));
    // left alone they drift past slowly; a hover, touch, key, wheel or scroll stops the drift for a while
    rest = Math.max(0, rest - dt);
    const drifting = reduced.matches || hovered || focused || drag || glide || rest > 0 || appear < 1 ? 0 : DRIFT;
    drift += (drifting - drift) * (1 - Math.exp(-dt * 1.4));
    if (drift < .002 && drifting === 0) drift = 0;
    offset += drift * dt;
    // a flick keeps gliding and slows down
    if (!drag && glide) { offset += glide * dt; glide *= Math.exp(-dt * 3.2); if (Math.abs(glide) < .02) glide = 0; }
    // once nothing moves them for a moment, the nearest one is drawn into the middle (and kept there)
    let goal = offset;
    quiet = goal !== lastGoal || drag || glide ? 0 : quiet + dt;
    lastGoal = goal;
    magnet += ((quiet > .18 ? 1 : 0) - magnet) * (1 - Math.exp(-dt * 6));
    if (magnet > .995) { offset = Math.round(offset); lastGoal = goal = offset; magnet = 0; quiet = .18; }
    goal += (Math.round(goal) - goal) * magnet;
    if (reduced.matches || drag) { vel = drag ? (goal - pos) / Math.max(dt, .001) * .2 + vel * .8 : 0; pos = goal; }
    else {
      // a critically damped spring: quick to follow, no overshoot, no jitter at low frame rates
      const k = 90, c = 2 * Math.sqrt(k);
      vel += ((goal - pos) * k - vel * c) * dt;
      pos += vel * dt;
    }
    place(appear, t);
    spin(t, dt);
    const busy = Math.abs(goal - pos) > .0005 || Math.abs(vel) > .002 || drag || glide || appear < 1 || turns.some((tn) => tn.state === 'ready');
    if (visible && !document.hidden && (busy || !reduced.matches)) frame = requestAnimationFrame(tick);
    else last = 0;
  }
  function wake() { if (!frame && visible && !document.hidden) frame = requestAnimationFrame(tick); }
  function goTo(index) { offset = Math.round(offset) + index - Math.round(pos); glide = 0; rest = 4; wake(); }

  // ---- pointer: drag the products (the pointer is captured only once a press turns into a drag, so a click still reaches its link)
  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag = { id: e.pointerId, x: e.clientX, off0: offset, lx: e.clientX, lt: e.timeStamp, v: 0, started: false };
    moved = 0; rest = 4; wake();
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    moved = Math.max(moved, Math.abs(dx));
    if (!drag.started) {
      if (Math.abs(dx) < 6) return;
      drag.started = true; drag.x = e.clientX; drag.lx = e.clientX; drag.lt = e.timeStamp; glide = 0;
      try { stage.setPointerCapture(e.pointerId); } catch {}
      stage.classList.add('is-dragging');
      return;
    }
    offset = drag.off0 - dx / perJar;
    const step = Math.max(1, e.timeStamp - drag.lt);
    drag.v = drag.v * 0.55 + (-(e.clientX - drag.lx) / perJar / (step / 1000)) * 0.45;
    drag.lx = e.clientX; drag.lt = e.timeStamp;
    wake();
  });
  const release = (e) => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    if (drag.started) glide = reduced.matches || !e || e.type === 'pointercancel' || e.timeStamp - drag.lt > 90 ? 0 : clamp(drag.v, -4, 4);
    drag = null; rest = 4; stage.classList.remove('is-dragging'); wake();
  };
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);
  stage.addEventListener('lostpointercapture', release);

  // ---- a click opens the product view (a drag never does); without the product view the link goes to the product's tab
  stage.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    if (e.detail !== 0 && moved >= 6) { e.preventDefault(); return; }
    if (window.WasayDetail) {
      e.preventDefault();
      const li = a.closest('[data-ring-item]');
      window.WasayDetail.open(li, li.querySelector('img'));
    }
  });

  // ---- a sideways wheel or trackpad swipe
  stage.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    glide = 0; rest = 4; offset += e.deltaX / perJar; wake();
  }, { passive: false });

  // ---- keyboard
  stage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(Math.round(pos) + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(Math.round(pos) - 1); }
    else if (e.key === 'Enter' && e.target === stage && window.WasayDetail) {
      e.preventDefault();
      const item = items[mod(Math.round(pos))];
      window.WasayDetail.open(item, item.querySelector('img'));
    }
  });

  // ---- the page scroll carries them a little while they are on screen
  addEventListener('scroll', () => {
    const dy = scrollY - lastScroll; lastScroll = scrollY;
    if (!visible || reduced.matches || drag || appear < 1) { wake(); return; }
    offset += dy / SCROLL; rest = 2; wake();
  }, { passive: true });
  stage.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hovered = true; });
  stage.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { hovered = false; rest = 1; } });
  stage.addEventListener('focusin', () => { focused = true; });
  stage.addEventListener('focusout', (e) => { focused = stage.contains(e.relatedTarget); rest = 1; wake(); });
  new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; lastScroll = scrollY; if (visible) { last = 0; wake(); } }, { rootMargin: '80px' }).observe(stage);
  new ResizeObserver(() => { measure(); place(appear, performance.now()); }).observe(stage);
  document.addEventListener('visibilitychange', () => { last = 0; wake(); });
  reduced.addEventListener('change', wake);

  measure();
  place(appear, 0);
  stage.classList.add('is-ready');
})();
