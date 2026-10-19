// Home products: a page of its own after Wasay at a glance. As the page arrives the products sweep in from the right, the far-left
// one first; then they drift past slowly on their own: the one in the middle is large and the ones to the sides smaller and higher,
// so they read as a ring seen from the front. They follow a drag or swipe one to one, a sideways wheel, the page scroll and the
// arrow keys; hovering, touching or using the keys stops the drift for a while. Letting go of a drag carries them on by the speed
// of the hand and settles one in the middle in a single spring (no glide and then a separate snap). The products lean the way they
// travel and bob gently. Moving the mouse over a product turns it, as on the product tabs, by playing a strip of pre-rendered turn
// frames that loads the first time it is touched.
// Kept cheap per frame: only transforms change on the products; stacking, visibility, the caption and the arrival value are
// written only when they change, and nothing is measured in the middle of a frame.
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
  const FLICK = .25;               // seconds of travel a flick is carried on for when choosing where to settle
  const SETTLE = 9, FOLLOW = 16, HAND = 34;   // spring rates: settling on a product, following a wheel or the page scroll, following the hand

  // pos: the product in the middle (fractions between) as shown, vel its speed; goal: where it is heading
  let pos = 0, vel = 0, goal = 0, rate = SETTLE, lean = 0, drift = 0, rest = 0, pending = 0;
  let last = 0, frame = 0, visible = false, current = -1, drag = null, moved = 0;
  let appear = 0, appearText = '', entered = false, hovered = false, focused = false, lastScroll = scrollY;
  let w = 0, h = 0, perJar = 1;
  const looks = items.map(() => ({ z: '', vis: '', tab: null, op: '' }));
  const FRAMES = 21, SWING = 1;   // frames in a turn strip; the pointer's position across a product runs from -SWING to +SWING
  const turns = items.map((el) => ({ el, url: el.dataset.turn, state: 'idle', span: null, cur: 0, goal: 0, pointer: 0, frame: -1 }));

  const mod = (n) => ((n % N) + N) % N;
  const wrapDiff = (a, b) => { let d = mod(a - b); if (d > N / 2) d -= N; return d; };
  const easeOut = (n) => 1 - Math.pow(1 - clamp(n, 0, 1), 3);

  function measure() {
    w = stage.clientWidth; h = stage.clientHeight;
    perJar = Math.max(96, w * (w < 700 ? 0.46 : 0.25));
  }

  // a critically damped spring, solved exactly for the step, so it is the same at any frame rate and never overshoots
  function spring(dt) {
    const x = pos - goal, k = rate, e = Math.exp(-k * dt), c = vel + k * x;
    pos = goal + (x + c * dt) * e;
    vel = (vel - k * c * dt) * e;
  }

  function place(t) {
    const tilt = reduced.matches ? 0 : clamp(lean * LEAN, -14, 14);
    for (let i = 0; i < N; i++) {
      const off = wrapDiff(i, pos), ao = Math.abs(off), look = looks[i], el = items[i];
      // arriving: each product slides in from beyond the right edge, the leftmost first
      const come = reduced.matches ? (appear > 0 ? 1 : 0) : easeOut(appear * 1.8 - (clamp(off, -3, 3) + 3) / 6 * .8);
      const scale = (0.56 + 0.44 * Math.exp(-off * off / 3)) * (.86 + .14 * come);
      const bob = reduced.matches ? 0 : Math.sin(t / 900 + i * 1.7) * 5 * Math.exp(-ao * .6);
      const x = off * perJar + (1 - come) * (w * .62 + perJar * 1.2), y = -Math.min(ao * ao, 5) * h * 0.04 + bob;
      const roll = tilt - Math.atan(clamp(off, -2.6, 2.6) * .42) * 26 + (1 - come) * 14;
      el.style.transform = `translate3d(-50%,-50%,0) translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${roll.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      const op = come < 1 ? come.toFixed(2) : '';
      if (look.op !== op) { look.op = op; el.style.opacity = op; }
      // stacking in half-product steps (neighbours always differ), so the layers are re-sorted only now and then
      const z = String(200 - Math.round(ao * 2)), vis = ao > 3.2 || come <= 0 ? 'hidden' : 'visible';
      if (look.z !== z) { look.z = z; el.style.zIndex = z; }
      if (look.vis !== vis) { look.vis = vis; el.style.visibility = vis; }
      const tab = ao < 0.5 ? 0 : -1;
      if (look.tab !== tab) { look.tab = tab; el.firstElementChild.tabIndex = tab; }
    }
    const front = mod(Math.round(pos));
    if (front !== current) {
      current = front;
      if (caption) caption.innerHTML = `<b>${items[front].dataset.name}</b>${items[front].dataset.detail}`;
    }
  }

  // ---- turning a product with the mouse (and a gentle sway of the middle one while they rest)
  let hot = null, hotX = 0;
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
  function spin(t, dt, still) {
    const front = mod(Math.round(pos));
    for (let i = 0; i < N; i++) {
      const tn = turns[i];
      if (tn.state !== 'ready') continue;
      const mouse = hot === tn && !drag;
      const sway = !reduced.matches && still && !mouse && i === front ? Math.sin(t / 2600) * 0.38 : 0;
      tn.goal = mouse ? tn.pointer : sway;
      tn.cur += (tn.goal - tn.cur) * (reduced.matches ? 1 : 1 - Math.exp(-dt * 9));
      const idle = !mouse && Math.abs(tn.cur) < 0.012 && sway === 0;
      if (idle) { if (tn.span.style.opacity !== '0') { tn.span.style.opacity = '0'; tn.el.firstElementChild.firstElementChild.style.visibility = ''; tn.frame = -1; } continue; }
      const f = Math.round(clamp((tn.cur / SWING + 1) / 2, 0, 1) * (FRAMES - 1));
      if (f !== tn.frame) { tn.frame = f; tn.span.style.backgroundPosition = `${(f / (FRAMES - 1)) * 100}% 0`; }
      if (tn.span.style.opacity !== '1') { tn.span.style.opacity = '1'; tn.el.firstElementChild.firstElementChild.style.visibility = 'hidden'; }
    }
  }
  stage.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || (drag && drag.started)) return;
    const el = e.target.closest ? e.target.closest('[data-ring-item]') : null;
    hot = el ? turns[items.indexOf(el)] : null;
    if (!hot) return;
    hotX = e.clientX; load(hot); wake();
  });
  stage.addEventListener('pointerleave', () => { hot = null; });

  // settle on a product: the nearest one along the way it is travelling
  function settle(at = Math.round(pos + vel * FLICK)) { goal = at; rate = SETTLE; pending = 0; }

  function tick(t) {
    frame = 0;
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016;
    last = t;
    if (document.documentElement.classList.contains('has-detail')) { last = 0; if (visible && !document.hidden) frame = requestAnimationFrame(tick); return; }
    // the page has arrived once half of it is on screen: the products sweep in, once
    if (!entered && section.getBoundingClientRect().top < innerHeight * .5) entered = true;
    appear = reduced.matches ? (entered ? 1 : 0) : Math.min(1, appear + (entered ? dt / 1.4 : 0));
    const at = appear.toFixed(3);
    if (at !== appearText) { appearText = at; section.style.setProperty('--appear', at); }

    // left alone they drift past slowly; a hover, touch, key, wheel or scroll stops the drift for a while
    rest = Math.max(0, rest - dt);
    const drifting = !(reduced.matches || hovered || focused || drag || rest > 0 || appear < 1);
    drift += ((drifting ? DRIFT : 0) - drift) * (1 - Math.exp(-dt * 1.4));
    if (!drifting && drift < .002) drift = 0;

    if (drag && drag.started) {
      // with the hand, through a very quick spring, so pointer events that come less often than frames (touchpads, touch screens)
      // still give an even glide instead of steps
      goal = drag.goal; rate = HAND;
      if (reduced.matches) { pos = goal; vel = 0; } else spring(dt);
    } else {
      if (drift > 0) { goal += drift * dt; rate = FOLLOW; pending = 0; }
      // a wheel or the page scroll moves the goal; a moment after the last of it, one product settles in the middle
      else if (pending > 0) { pending -= dt; if (pending <= 0) settle(); }
      else if (rate !== SETTLE) settle();
      if (reduced.matches) { pos = goal; vel = 0; } else spring(dt);
    }
    lean += (vel - lean) * (1 - Math.exp(-dt * 10));
    // where the pointer is across the product under it, read before this frame writes anything (the page is still laid out)
    if (hot && !drag) {
      const r = hot.el.getBoundingClientRect();
      hot.pointer = clamp(((hotX - r.left) / Math.max(1, r.width) - 0.5) * 2 * SWING, -SWING, SWING);
    }
    place(t);
    const still = !drag && Math.abs(vel) < .05 && Math.abs(goal - pos) < .01;
    spin(t, dt, still);
    const busy = !still || drift > 0 || appear < 1 || Math.abs(lean) > .01 || turns.some((tn) => tn.state === 'ready' && (hot === tn || Math.abs(tn.cur - tn.goal) > .002 || tn.goal !== 0));
    if (visible && !document.hidden && (busy || !reduced.matches)) frame = requestAnimationFrame(tick);
    else last = 0;
  }
  function wake() { if (!frame && visible && !document.hidden) frame = requestAnimationFrame(tick); }
  function goTo(step) { rest = 4; drift = 0; settle(Math.round(goal) + step); wake(); }
  // the wheel and the page scroll nudge the goal and follow it closely; they settle once they stop
  function nudge(by, hold) { drift = 0; goal += by; rate = FOLLOW; pending = .14; rest = hold; wake(); }

  // ---- pointer: drag the products (the pointer is captured only once a press turns into a drag, so a click still reaches its link)
  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag = { id: e.pointerId, x: e.clientX, from: pos, goal: pos, v: 0, trail: [], started: false };
    moved = 0; rest = 4; wake();
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    moved = Math.max(moved, Math.abs(dx));
    if (!drag.started) {
      if (Math.abs(dx) < 6) return;
      // take over from wherever they were (even mid-settle), so the grab never jumps
      drag.started = true; drag.x = e.clientX; drag.from = pos; drag.goal = pos; vel = 0; drift = 0;
      try { stage.setPointerCapture(e.pointerId); } catch {}
      stage.classList.add('is-dragging');
      return;
    }
    drag.goal = drag.from - dx / perJar;
    // the hand's speed over the last ~100ms, in products per second
    const now = e.timeStamp;
    drag.trail.push([now, drag.goal]);
    while (drag.trail.length > 2 && now - drag.trail[0][0] > 100) drag.trail.shift();
    const [t0, g0] = drag.trail[0];
    drag.v = now - t0 > 8 ? (drag.goal - g0) / ((now - t0) / 1000) : drag.v;
    wake();
  });
  const release = (e) => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    if (drag.started) {
      // a hand that stopped before letting go does not throw; otherwise carry on by its speed and settle
      const lastAt = drag.trail.length ? drag.trail[drag.trail.length - 1][0] : 0;
      vel = reduced.matches || !e || e.type === 'pointercancel' || e.timeStamp - lastAt > 80 ? 0 : clamp(drag.v, -6, 6);
      settle(Math.round(clamp(pos + vel * FLICK, pos - 4, pos + 4)));
      // a slow drag settles back on the nearest product: drop most of the hand's speed then, so it does not run on and swing back
      if ((goal - pos) * vel < 0) vel *= .25;
    } else if (rate === SETTLE) settle(Math.round(goal));
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
    nudge(e.deltaX / perJar, 4);
  }, { passive: false });

  // ---- keyboard
  stage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(-1); }
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
    nudge(dy / SCROLL, 2);
  }, { passive: true });
  stage.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hovered = true; });
  stage.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { hovered = false; rest = 1; } });
  stage.addEventListener('focusin', () => { focused = true; });
  stage.addEventListener('focusout', (e) => { focused = stage.contains(e.relatedTarget); rest = 1; wake(); });
  new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; lastScroll = scrollY; if (visible) { last = 0; wake(); } }, { rootMargin: '80px' }).observe(stage);
  new ResizeObserver(() => { measure(); place(performance.now()); }).observe(stage);
  document.addEventListener('visibilitychange', () => { last = 0; wake(); });
  reduced.addEventListener('change', wake);

  measure();
  place(0);
  stage.classList.add('is-ready');
})();
