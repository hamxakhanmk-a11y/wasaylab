// The home banner and Who we are, as one scene. The living hill (hero-grow-three.js) loops while the banner is on show; scrolling on
// holds the scene in place and comes in close to the seedling, raises a bottle out of the grass under its right leaf, forms a drop on
// that leaf and lets it fall in, while the three Who we are texts rise in from below in turn. Scrolling up reverses it. A button
// pauses the loop. Under reduced motion the hill is still and each part of the scroll shows its moment without the camera move.
// Without WebGL a drawn hill shape stands in and the texts still change.
(() => {
  const hero = document.querySelector('[data-grow]');
  if (!hero) return;
  const stage = hero.querySelector('.wz-grow__stage'), canvas = hero.querySelector('canvas'), button = hero.querySelector('[data-grow-pause]');
  const texts = [...hero.querySelectorAll('[data-grow-text]')];
  const header = document.querySelector('.site-header'), next = hero.nextElementSibling;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (n) => Math.max(0, Math.min(1, n));
  const ease = (n) => { n = clamp(n); return n * n * (3 - 2 * n); };
  let scene = null, frame = 0, visible = true, paused = false, clock = 0, last = 0, story = 0, held = null;

  // how far the page has scrolled through the hold (0 to 1); under reduced motion, snapped to the four moments
  function aim() {
    const run = hero.offsetHeight - stage.offsetHeight;
    const p = run > 0 ? clamp(-hero.getBoundingClientRect().top / run) : 0;
    if (!reduced.matches) return p;
    return p < .12 ? 0 : p < .43 ? .3 : p < .73 ? .62 : 1;
  }
  // the text on show: 0 the banner words, 1 to 3 the Who we are texts (each rises in as the scene reaches its moment)
  const level = (p) => ease((p - .06) / .12) + ease((p - .38) / .1) + ease((p - .68) / .1);
  function words(p) {
    const s = level(p), current = Math.round(s);
    texts.forEach((el, i) => {
      el.style.setProperty('--o', (i - s).toFixed(3));
      el.classList.toggle('is-current', i === current);
      el.setAttribute('aria-hidden', String(i !== current)); el.inert = i !== current;
    });
  }

  function tick(now) {
    frame = 0;
    const nextTop = next ? next.getBoundingClientRect().top : Infinity;
    if (!visible || document.hidden || nextTop <= 0) { last = 0; return; }
    const dt = last ? Math.min(.1, (now - last) / 1000) : 0, still = reduced.matches;
    const target = held ?? aim();
    // while the next page slides up over the finished story, the scene holds its last picture instead of drawing underneath
    if (held === null && nextTop < innerHeight - 2 && story === target) { last = 0; return; }
    last = now;
    if (!still && !paused) clock += dt;
    story = still || held !== null ? target : story + (target - story) * (1 - Math.exp(-dt * 13));
    if (Math.abs(target - story) < .0005) story = target;
    words(story);
    if (scene) scene.draw(clock, { still, story });
    // under the opening, one frame is enough (so the hill is there when it fades); the rest waits until it has gone
    if (scene && opening()) { last = 0; return; }
    if ((!still && !paused) || story !== target) frame = requestAnimationFrame(tick);
    else last = 0;
  }
  const kick = () => { if (!frame) frame = requestAnimationFrame(tick); };

  function label() {
    if (!button) return;
    button.hidden = reduced.matches || !scene;
    button.textContent = paused ? button.dataset.play : button.dataset.pause;
    button.setAttribute('aria-pressed', String(paused));
  }
  if (button) button.addEventListener('click', () => { paused = !paused; last = 0; label(); kick(); });

  // where the words end, so the scene keeps the hill (and later the bottle) to the right of them
  function measure() {
    const box = stage.getBoundingClientRect(), range = document.createRange();
    if (!scene || !box.width) return;
    const edge = (els) => {
      let right = box.left;
      els.forEach((el) => { range.selectNodeContents(el); right = Math.max(right, range.getBoundingClientRect().right); });
      return (right - box.left) / box.width;
    };
    scene.setClear(edge(hero.querySelectorAll('h1, .wz-grow__lead')), edge(hero.querySelectorAll('.wz-grow__story h2, .wz-grow__story > p:not(.eyebrow)')));
  }

  // the site header lies clear over the scene until the next section slides up under it
  if (header && next) {
    const over = () => header.classList.toggle('is-over-hero', next.getBoundingClientRect().top > header.offsetHeight);
    addEventListener('scroll', over, { passive: true }); addEventListener('resize', over); over();
  }

  // the words rise in from below once the hill is showing, or after a moment at the latest (a slow device, no WebGL)
  const opening = () => document.querySelector('.logo-intro:not(.done)');
  const show = () => { if (opening()) addEventListener('wasay:intro-done', () => hero.classList.add('is-shown'), { once: true }); else hero.classList.add('is-shown'); };
  addEventListener('wasay:intro-done', () => { last = 0; kick(); });
  const late = setTimeout(show, 1600);
  import('./hero-grow-three.js').then(({ createGrowScene }) => {
    scene = createGrowScene(canvas, { bg: getComputedStyle(stage).backgroundColor, density: innerWidth < 760 ? .45 : 1 });
    measure(); document.fonts.ready.then(() => { measure(); kick(); });
    hero.classList.add('is-ready');
    label(); kick();
    requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(late); show(); }));
  }).catch((error) => {
    clearTimeout(late); show();
    hero.classList.add('is-fallback');
    console.warn('Banner animation unavailable; showing the drawn hill.', error);
  });

  // the pointer (or a finger dragged over the banner) stirs the flying leaves; the listeners are passive, so scrolling is untouched
  const pointAt = (e) => { if (!scene || !scene.point) return; const r = stage.getBoundingClientRect(); scene.point((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); };
  stage.addEventListener('pointermove', pointAt, { passive: true });
  stage.addEventListener('pointerdown', pointAt, { passive: true });
  for (const type of ['pointerleave', 'pointercancel']) stage.addEventListener(type, () => { if (scene && scene.point) scene.point(null); }, { passive: true });
  // on a phone the browser takes a swipe over for scrolling and stops sending pointer events, but touch events keep coming while the
  // page scrolls, so a finger stirs the leaves the whole way
  const touchAt = (e) => { const t = e.touches[0]; if (t) pointAt(t); };
  stage.addEventListener('touchstart', touchAt, { passive: true });
  stage.addEventListener('touchmove', touchAt, { passive: true });
  stage.addEventListener('touchend', (e) => { if (!e.touches.length && scene && scene.point) scene.point(null); }, { passive: true });
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; last = 0; if (visible) kick(); }).observe(hero);
  addEventListener('scroll', kick, { passive: true });
  document.addEventListener('visibilitychange', () => { last = 0; kick(); });
  addEventListener('resize', () => { measure(); kick(); });
  reduced.addEventListener('change', () => { last = 0; label(); kick(); });
  words(0);
  // for checking: draw a chosen moment of the loop (seconds) and of the story (0 to 1); release() hands it back to the scroll
  window.WasayGrow = {
    drawAt: (seconds, p = 0) => { held = p; clock = seconds; story = p; words(p); if (scene) scene.draw(seconds, { story: p }); },
    pause: () => { paused = true; label(); },
    point: (x, y) => { if (scene && scene.point) scene.point(x, y); },
    release: () => { held = null; kick(); },
  };
})();
