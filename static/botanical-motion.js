// Who we are: one scene that holds its place while the page scrolls past. The droplet forms on the leaf, falls into the bottle and
// lands (progress 0 to 1); the three texts rise in from the bottom one after another as it happens. Scrolling up reverses it.
(() => {
  const story = document.querySelector('[data-botanical-story]');
  if (!story) return;
  const scene = story.querySelector('[data-botanical-scene]');
  const stage = story.querySelector('.botanical-story__stage');
  const panels = [...story.querySelectorAll('[data-story-panel]')];
  const controls = [...story.querySelectorAll('[data-story-target]')];
  const main = story.parentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (n) => Math.max(0, Math.min(1, n));
  const ease = (n) => { n = clamp(n); return n * n * (3 - 2 * n); };
  let top = 0, dwell = 1, progress = 0, target = 0, frame = 0, last = 0, three = null, loading = false, dirty = true, visible = false;
  let pointer = { x: 0, y: 0 };

  // where the story starts in the document if nothing were pinned (sticky sections move on screen but not in layout)
  function measure() {
    let sum = 0;
    for (const el of main.children) {
      if (el === story) break;
      sum += el.getBoundingClientRect().height;
    }
    top = main.getBoundingClientRect().top + scrollY + sum;
    dwell = Math.max(1, story.offsetHeight - stage.offsetHeight);
    dirty = true;
  }

  // the text on show: 0, 1 and 2 are the three Who we are texts while the droplet grows and mixes colour, 3 (It's simple) once it has
  // fallen into the bottle. The droplet's own moments (growing to .62, falling .64 to .86, landing after) are in botanical-three.js.
  function step(p) { return ease((p - .16) / .1) + ease((p - .4) / .1) + ease((p - .8) / .12); }
  const hex = (c) => '#' + [c[0], c[1], c[2]].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const GREEN = [121, 184, 58], GOLD = [232, 182, 40], AMBER = [212, 128, 15];
  const mixRGB = (k) => { k = clamp(k); const a = k < .5 ? GREEN : GOLD, b = k < .5 ? GOLD : AMBER, u = ease(k < .5 ? k / .5 : (k - .5) / .5); return a.map((v, i) => v + (b[i] - v) * u); };

  function paint(p) {
    const s = reduced.matches ? 0 : step(p), current = Math.round(s);
    panels.forEach((el, i) => {
      el.style.setProperty('--o', reduced.matches ? '0' : (i - s).toFixed(3));
      el.classList.toggle('is-current', i === current);
      if (reduced.matches) { el.removeAttribute('aria-hidden'); el.inert = false; }
      else { el.setAttribute('aria-hidden', String(i !== current)); el.inert = i !== current; }
    });
    controls.forEach((el, i) => { el.setAttribute('aria-current', i === current ? 'step' : 'false'); });
    scene.dataset.progress = p.toFixed(3);
    if (three) three.draw(scene, reduced.matches ? .12 : p, reduced.matches ? { x: 0, y: 0 } : pointer);
    // the drawn fallback art, used until (or unless) WebGL is ready
    if (!three || !scene.classList.contains('is-three-ready')) {
      const grow = clamp(p / .62), fall = clamp((p - .64) / .22);
      const drop = scene.querySelector('.botanical-scene__drop'), ripple = scene.querySelector('.botanical-scene__ripple');
      drop.style.transform = `translateY(${fall * fall * 90}px) scale(${.25 + grow * .75},${.25 + grow * .75})`;
      drop.style.opacity = p < .875 ? '1' : '0';
      ripple.style.opacity = p > .86 && p < .98 ? String(1 - (p - .86) / .12) : '0';
      ripple.style.transform = `scale(${clamp((p - .86) / .12)})`;
      const root = document.documentElement.style;
      root.setProperty('--drop-a', hex(mixRGB(grow - .15))); root.setProperty('--drop-b', hex(mixRGB(grow))); root.setProperty('--drop-c', hex(mixRGB(grow + .2)));
    }
    dirty = false;
  }

  function tick(time) {
    frame = 0;
    const dt = last ? Math.min(.05, (time - last) / 1000) : 1 / 60; last = time;
    if (document.hidden || !visible) { last = 0; return; }
    target = reduced.matches ? 0 : clamp((scrollY - top) / dwell);
    progress = reduced.matches ? 0 : progress + (target - progress) * (1 - Math.exp(-dt * 14));
    if (Math.abs(target - progress) < .0002) progress = target;
    paint(progress);
    if (progress !== target) frame = requestAnimationFrame(tick); else last = 0;
  }
  function wake() { if (!frame && visible && !document.hidden) frame = requestAnimationFrame(tick); }

  async function load() {
    if (loading || three) return;
    loading = true;
    try {
      const { createBotanicalScene } = await import('./botanical-three.js');
      three = createBotanicalScene({ onChange: () => { dirty = true; wake(); } });
      three.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); scene.classList.remove('is-three-ready'); });
      three.canvas.addEventListener('webglcontextrestored', () => { dirty = true; wake(); });
      paint(progress);
    } catch (error) {
      scene.dataset.renderer = 'fallback';
      console.warn('Botanical 3D unavailable; using the drawn scene.', error);
    }
  }

  addEventListener('scroll', wake, { passive: true });
  addEventListener('resize', () => { measure(); wake(); });
  addEventListener('load', () => { measure(); wake(); });
  document.addEventListener('visibilitychange', () => { last = 0; wake(); });
  reduced.addEventListener('change', () => { progress = target = 0; measure(); paint(0); wake(); });
  if ('ResizeObserver' in window) new ResizeObserver(() => { measure(); wake(); }).observe(story);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) { load(); last = 0; wake(); }
  }, { rootMargin: '200px' }).observe(story);
  scene.addEventListener('pointermove', (e) => {
    if (reduced.matches || e.pointerType !== 'mouse') return;
    const r = scene.getBoundingClientRect();
    pointer = { x: clamp((e.clientX - r.left) / r.width) * 2 - 1, y: clamp((e.clientY - r.top) / r.height) * 2 - 1 };
    wake();
  });
  scene.addEventListener('pointerleave', () => { pointer = { x: 0, y: 0 }; wake(); });

  // 01 / 02 / 03 jump to where that text is on show
  controls.forEach((button, i) => button.addEventListener('click', () => {
    measure();
    const stops = [.04, .28, .55, .97];
    scrollTo({ top: top + dwell * stops[i], behavior: reduced.matches ? 'instant' : 'smooth' });
  }));

  measure();
  paint(0);
  window.WasayStory = { measure, get top() { return top; }, get dwell() { return dwell; }, get progress() { return progress; } };
})();
