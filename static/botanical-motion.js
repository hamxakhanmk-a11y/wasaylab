// Who we are: three full pages in the page-turn stack. One 3D scene (a droplet forms on a leaf, falls and lands in the bottle)
// carries on from page to page: each page shows it at its own moment, 0 to .34 on the first, .34 to .78 on the second and
// .78 to 1 on the third, driven by how far that page has been scrolled while it holds its place.
(() => {
  const pages = [...document.querySelectorAll('[data-botanical-page]')];
  if (!pages.length) return;
  const main = pages[0].parentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (n) => Math.max(0, Math.min(1, n));
  const RANGE = [[0, .34], [.34, .78], [.78, 1]];
  const REST = [.12, .56, .95];   // reduced motion: one fixed moment per page
  const state = pages.map((el, i) => ({ el, i, scene: el.querySelector('[data-botanical-scene]'), stage: el.querySelector('.botanical-page__stage'),
    top: 0, dwell: 1, cur: 0, target: 0, drawn: -1, dirty: true, active: false, pointer: { x: 0, y: 0 } }));
  let three = null, loading = false, frame = 0, last = 0;

  // where each page starts in the document if nothing were pinned (sticky pages move on screen but not in layout)
  function measure() {
    const base = main.getBoundingClientRect().top + scrollY;
    let sum = 0;
    for (const el of main.children) {
      const s = state.find((x) => x.el === el);
      if (s) { s.top = base + sum; s.dwell = Math.max(1, el.offsetHeight - s.stage.offsetHeight); }
      sum += el.getBoundingClientRect().height;   // not offsetHeight: the shared drawing definitions are an <svg>, and heights can be fractional
    }
    state.forEach((s) => { s.dirty = true; });
  }

  function paint(s, p) {
    // the drawn fallback art, used until (or unless) WebGL is ready
    if (!three || !s.scene.classList.contains('is-three-ready')) {
      const grow = clamp(p / .34), fall = clamp((p - .34) / .44);
      const drop = s.scene.querySelector('.botanical-scene__drop'), ripple = s.scene.querySelector('.botanical-scene__ripple');
      drop.style.transform = `translateY(${fall * fall * 90}px) scale(${.25 + grow * .75},${.25 + grow * .75})`;
      drop.style.opacity = p < .79 ? '1' : '0';
      ripple.style.opacity = p > .78 && p < .98 ? String(1 - (p - .78) / .2) : '0';
      ripple.style.transform = `scale(${clamp((p - .78) / .2)})`;
    }
    if (three) three.draw(s.scene, p, reduced.matches ? { x: 0, y: 0 } : s.pointer);
    s.drawn = p; s.dirty = false;
  }

  function tick(time) {
    frame = 0;
    const dt = last ? Math.min(.05, (time - last) / 1000) : 1 / 60; last = time;
    if (document.hidden) { last = 0; return; }
    const vh = innerHeight;
    let busy = false;
    for (const s of state) {
      const next = state[s.i + 1];
      if (reduced.matches) { s.target = REST[s.i]; s.active = true; }
      else {
        const [lo, hi] = RANGE[s.i];
        s.target = lo + (hi - lo) * clamp((scrollY - s.top) / s.dwell);
        // drawn a little before it slides in, and not at all once the next page has covered it
        s.active = scrollY + vh * 1.3 > s.top && (next ? scrollY < next.top : scrollY < s.top + s.el.offsetHeight + vh);
      }
      if (!s.active) { s.seen = false; continue; }
      if (!s.seen) { s.cur = s.target; s.seen = true; }   // a page that comes into view starts at its own moment, not at the beginning
      s.cur = reduced.matches ? s.target : s.cur + (s.target - s.cur) * (1 - Math.exp(-dt * 14));
      if (Math.abs(s.target - s.cur) < .0002) s.cur = s.target; else busy = true;
      if (s.dirty || Math.abs(s.cur - s.drawn) > .00015) paint(s, s.cur);
    }
    if (busy) frame = requestAnimationFrame(tick); else last = 0;
  }
  function wake() { if (!frame && !document.hidden) frame = requestAnimationFrame(tick); }

  async function load() {
    if (loading || three) return;
    loading = true;
    try {
      const { createBotanicalScene } = await import('./botanical-three.js');
      three = createBotanicalScene({ onChange: () => { state.forEach((s) => { s.dirty = true; }); wake(); } });
      three.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); state.forEach((s) => s.scene.classList.remove('is-three-ready')); });
      three.canvas.addEventListener('webglcontextrestored', () => { state.forEach((s) => { s.dirty = true; }); wake(); });
      state.forEach((s) => { s.dirty = true; });
      wake();
    } catch (error) {
      state.forEach((s) => { s.scene.dataset.renderer = 'fallback'; });
      console.warn('Botanical 3D unavailable; using the drawn scene.', error);
    }
  }

  addEventListener('scroll', wake, { passive: true });
  addEventListener('resize', () => { measure(); wake(); });
  addEventListener('load', () => { measure(); wake(); });
  document.addEventListener('visibilitychange', () => { last = 0; wake(); });
  reduced.addEventListener('change', () => { measure(); wake(); });
  if ('ResizeObserver' in window) { const watch = new ResizeObserver(() => { measure(); wake(); }); pages.forEach((el) => watch.observe(el)); }
  new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) load(); wake(); }, { rootMargin: '300px' }).observe(pages[0]);

  // a little camera parallax from the mouse, on the frame it is over
  state.forEach((s) => {
    s.scene.addEventListener('pointermove', (e) => {
      if (reduced.matches || e.pointerType !== 'mouse') return;
      const r = s.scene.getBoundingClientRect();
      s.pointer = { x: clamp((e.clientX - r.left) / r.width) * 2 - 1, y: clamp((e.clientY - r.top) / r.height) * 2 - 1 };
      s.dirty = true; wake();
    });
    s.scene.addEventListener('pointerleave', () => { s.pointer = { x: 0, y: 0 }; s.dirty = true; wake(); });
  });

  // 01 / 02 / 03 jump to the page, a little way into its stretch
  pages.forEach((el) => el.querySelectorAll('[data-story-target]').forEach((button) => button.addEventListener('click', () => {
    const s = state[Number(button.dataset.storyTarget)];
    measure();
    scrollTo({ top: reduced.matches ? s.top : s.top + s.dwell * .4, behavior: reduced.matches ? 'instant' : 'smooth' });
  })));

  measure();
  wake();
  window.WasayStory = { state, measure };
})();
