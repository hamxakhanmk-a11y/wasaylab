// Who we are: one full-screen 3D scene that holds its place while the page scrolls past (progress 0 to 1). A droplet grows under a
// mossy trunk while the camera moves, falls into the bottle, and the four texts rise in one after another, each in its own place on
// the screen. Scrolling up reverses it. The scene itself is in botanical-three.js.
(() => {
  const story = document.querySelector('[data-botanical-story]');
  if (!story) return;
  const stage = story.querySelector('.botanical-story__stage');
  const canvas = story.querySelector('canvas');
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
  // fallen into the bottle. The droplet's own moments (growing to .6, falling .62 to .82, landing after) are in botanical-three.js.
  function step(p) { return ease((p - .15) / .1) + ease((p - .38) / .1) + ease((p - .66) / .12); }

  function paint(p) {
    const s = reduced.matches ? 0 : step(p), current = Math.round(s);
    panels.forEach((el, i) => {
      el.style.setProperty('--o', reduced.matches ? '0' : (i - s).toFixed(3));
      el.classList.toggle('is-current', i === current);
      if (reduced.matches) { el.removeAttribute('aria-hidden'); el.inert = false; }
      else { el.setAttribute('aria-hidden', String(i !== current)); el.inert = i !== current; }
    });
    controls.forEach((el, i) => { el.setAttribute('aria-current', i === current ? 'step' : 'false'); });
    if (three) three.draw(reduced.matches ? .5 : p, reduced.matches ? { x: 0, y: 0 } : pointer);
    dirty = false;
  }

  function tick(time) {
    frame = 0;
    const dt = last ? Math.min(.05, (time - last) / 1000) : 1 / 60; last = time;
    if (document.hidden || !visible) { last = 0; return; }
    target = reduced.matches ? 0 : clamp((scrollY - top) / dwell);
    progress = reduced.matches ? 0 : progress + (target - progress) * (1 - Math.exp(-dt * 12));
    if (Math.abs(target - progress) < .0002) progress = target;
    paint(progress);
    if (progress !== target) frame = requestAnimationFrame(tick); else last = 0;
  }
  function wake() { if (!frame && visible && !document.hidden) frame = requestAnimationFrame(tick); }

  async function load() {
    if (loading || three) return;
    loading = true;
    try {
      const { createStoryScene } = await import('./botanical-three.js');
      three = createStoryScene(canvas, { onChange: () => { dirty = true; wake(); } });
      canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); stage.classList.remove('is-three-ready'); });
      canvas.addEventListener('webglcontextrestored', () => { dirty = true; wake(); });
      paint(progress);
    } catch (error) {
      stage.dataset.renderer = 'fallback';   // the sky gradient stays behind the texts
      console.warn('Story scene unavailable; showing the sky and the texts only.', error);
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
  stage.addEventListener('pointermove', (e) => {
    if (reduced.matches || e.pointerType !== 'mouse') return;
    const r = stage.getBoundingClientRect();
    pointer = { x: ((e.clientX - r.left) / r.width) * 2 - 1 || 1e-4, y: ((e.clientY - r.top) / r.height) * 2 - 1 || 1e-4 };
    dirty = true; wake();
  });
  stage.addEventListener('pointerleave', () => { pointer = { x: 0, y: 0 }; dirty = true; wake(); });

  // 01 to 04 jump to where that text is on show
  controls.forEach((button, i) => button.addEventListener('click', () => {
    measure();
    const stops = [.05, .3, .56, .93];
    scrollTo({ top: top + dwell * stops[i], behavior: reduced.matches ? 'instant' : 'smooth' });
  }));

  measure();
  paint(0);
  window.WasayStory = { measure, get top() { return top; }, get dwell() { return dwell; }, get progress() { return progress; }, get ready() { return !!three; } };
})();
