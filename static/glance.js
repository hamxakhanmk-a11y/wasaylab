// Wasay at a glance: runs the grassy trunk (glance-three.js) while the section is on screen, and lets the pointer part the grass.
// Under reduced motion the grass is still (the pointer can still part it). Without WebGL the section shows its words on the page.
(() => {
  const section = document.querySelector('[data-glance]');
  if (!section) return;
  const canvas = section.querySelector('canvas'), next = section.nextElementSibling;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let scene = null, frame = 0, visible = false, clock = 0, last = 0, loading = false;

  function tick(now) {
    frame = 0;
    const box = section.getBoundingClientRect();
    // draw only while the page is really on screen and not yet covered by the next one
    if (!scene || !visible || document.hidden || box.top >= innerHeight || (next && next.getBoundingClientRect().top <= 0)) { last = 0; return; }
    const still = reduced.matches;
    clock += last ? Math.min(.1, (now - last) / 1000) : 0;
    last = now;
    scene.draw(clock, { still });
    if (!still || !scene.settled) frame = requestAnimationFrame(tick);
    else last = 0;
  }
  const kick = () => { if (!frame) frame = requestAnimationFrame(tick); };

  function load() {
    if (loading) return;
    loading = true;
    import('./glance-three.js').then(({ createGlanceScene }) => {
      scene = createGlanceScene(canvas, { density: innerWidth < 760 ? .45 : 1 });
      section.classList.add('is-ready');
      kick();
    }).catch((error) => {
      section.classList.add('is-fallback');
      console.warn('Glance grass unavailable.', error);
    });
  }

  section.addEventListener('pointermove', (e) => {
    if (!scene) return;
    const box = canvas.getBoundingClientRect();
    scene.point((e.clientX - box.left) / box.width, (e.clientY - box.top) / box.height);
    kick();
  });
  section.addEventListener('pointerleave', () => { if (scene) { scene.leave(); kick(); } });

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting; last = 0;
    if (visible) { load(); kick(); }
  }, { rootMargin: '300px 0px' }).observe(section);
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', kick);
  document.addEventListener('visibilitychange', () => { last = 0; kick(); });
  reduced.addEventListener('change', kick);
  // for checking: draw a moment with the pointer at a place on the section (fractions), held there
  window.WasayGlance = { drawAt: (seconds, x, y) => { if (!scene) return; if (x == null) scene.leave(); else scene.point(x, y); for (let i = 0; i < 60; i++) scene.draw(seconds + i / 60); } };
})();
