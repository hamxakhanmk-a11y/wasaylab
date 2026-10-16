// Scroll film: a person leaps onto a mossy trunk, the trunk gives under the landing and a droplet is squeezed out and falls into the
// Who we are story. The scene is drawn by wasay-tale-three.js; this file turns the page scroll into the film's progress (0 to 1).
(() => {
  const tale = document.querySelector('[data-tale]');
  if (!tale) return;
  const stage = tale.querySelector('.wz-tale__stage'), canvas = tale.querySelector('canvas');
  const main = tale.parentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (n) => Math.max(0, Math.min(1, n));
  let top = 0, dwell = 1, progress = 0, target = 0, frame = 0, last = 0, visible = false, three = null, loading = false, dirty = true;

  // where the film starts in the document if nothing were pinned (sticky sections move on screen but not in layout)
  function measure() {
    let sum = 0;
    for (const el of main.children) { if (el === tale) break; sum += el.getBoundingClientRect().height; }
    top = main.getBoundingClientRect().top + scrollY + sum;
    dwell = Math.max(1, tale.offsetHeight - stage.offsetHeight);
    dirty = true;
  }

  function tick(time) {
    frame = 0;
    const dt = last ? Math.min(.05, (time - last) / 1000) : 1 / 60; last = time;
    if (document.hidden || !visible) { last = 0; return; }
    target = reduced.matches ? .74 : clamp((scrollY - top) / dwell);
    progress = reduced.matches ? target : progress + (target - progress) * (1 - Math.exp(-dt * 10));
    if (Math.abs(target - progress) < .0003) progress = target;
    if (three && (dirty || progress !== tick.drawn)) { three.draw(progress); tick.drawn = progress; dirty = false; }
    if (progress !== target || dirty) frame = requestAnimationFrame(tick); else last = 0;
  }
  function wake() { if (!frame && visible && !document.hidden) frame = requestAnimationFrame(tick); }

  async function load() {
    if (loading || three) return;
    loading = true;
    try {
      const { createTale } = await import('./wasay-tale-three.js');
      three = createTale(canvas);
      tale.classList.add('is-ready');
      dirty = true; wake();
    } catch (error) {
      tale.hidden = true;   // without WebGL the film is skipped and the next section follows the banner
      console.warn('Scroll film unavailable; skipping it.', error);
      if (window.WasayStack) WasayStack.refresh();
    }
  }

  addEventListener('scroll', wake, { passive: true });
  addEventListener('resize', () => { measure(); wake(); });
  addEventListener('load', () => { measure(); wake(); });
  document.addEventListener('visibilitychange', () => { last = 0; wake(); });
  reduced.addEventListener('change', () => { measure(); wake(); });
  if ('ResizeObserver' in window) new ResizeObserver(() => { measure(); wake(); }).observe(tale);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) { load(); last = 0; wake(); } }, { rootMargin: '300px' }).observe(tale);
  measure();
  window.WasayTale = { get top() { return top; }, get dwell() { return dwell; }, get progress() { return progress; }, measure, get ready() { return !!three; } };
})();
