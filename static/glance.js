// Wasay at a glance: one scene that holds its place while the page scrolls through it. The grassy trunk (glance-three.js) arcs under
// the title and the figures; scrolling on gathers its grass into a mound of moss inside a glass capsule, and the figures step aside
// for it. Then the next page (the products) slides up over it as usual. The pointer parts the grass while it is still a trunk.
// Under reduced motion the grass is still and the change happens in one step.
(() => {
  const section = document.querySelector('[data-glance]');
  if (!section) return;
  const stage = section.querySelector('.wz-glance__stage'), canvas = section.querySelector('canvas'), next = section.nextElementSibling;
  const foot = section.querySelector('.wz-glance__foot');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (n) => Math.max(0, Math.min(1, n));
  let scene = null, frame = 0, visible = false, clock = 0, last = 0, loading = false, morph = 0, held = null;

  // how far the change into the capsule has gone: it runs through most of the hold and is complete for the last part of it
  function aim() {
    if (held !== null) return held;
    const run = Math.max(1, section.offsetHeight - stage.offsetHeight);
    const p = clamp((-section.getBoundingClientRect().top / run - .04) / .74);
    return reduced.matches ? (p < .5 ? 0 : 1) : p;
  }

  function words(m) {
    // the figures step aside as the grass starts to gather; the title stays above the capsule
    if (!foot) return;
    const o = clamp(1 - m * 4);
    foot.style.opacity = o.toFixed(3);
    foot.style.transform = o < 1 ? `translateY(${((1 - o) * 30).toFixed(1)}px)` : '';
    foot.style.visibility = o === 0 ? 'hidden' : '';
  }

  function tick(now) {
    frame = 0;
    const box = section.getBoundingClientRect(), nextTop = next ? next.getBoundingClientRect().top : Infinity;
    // draw only while the scene is really on screen and not yet covered by the next page
    if (!visible || document.hidden || box.top >= innerHeight || nextTop <= 0) { last = 0; return; }
    const still = reduced.matches, dt = last ? Math.min(.1, (now - last) / 1000) : 0;
    const goal = aim();
    // while the next page slides up over the finished capsule, the scene holds its last picture instead of drawing underneath
    if (held === null && nextTop < innerHeight - 2 && morph === goal) { last = 0; return; }
    last = now;
    clock += dt;
    morph = still || held !== null ? goal : morph + (goal - morph) * (1 - Math.exp(-dt * 10));
    if (Math.abs(goal - morph) < .0005) morph = goal;
    words(morph);
    if (scene) scene.draw(clock, { still, morph });
    if (!scene || !still || !scene.settled || morph !== goal) frame = requestAnimationFrame(tick);
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

  stage.addEventListener('pointermove', (e) => {
    if (!scene) return;
    const r = canvas.getBoundingClientRect();
    scene.point((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    kick();
  });
  stage.addEventListener('pointerleave', () => { if (scene) { scene.leave(); kick(); } });

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting; last = 0;
    if (visible) { load(); kick(); }
  }, { rootMargin: '300px 0px' }).observe(section);
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', kick);
  document.addEventListener('visibilitychange', () => { last = 0; kick(); });
  reduced.addEventListener('change', kick);
  words(0);
  // for checking: hold a moment (the loop time, the pointer as fractions or none, the change 0 to 1); release() hands it back
  window.WasayGlance = {
    drawAt: (seconds, x, y, m = 0, frames = 2) => {
      held = m; morph = m; words(m);
      if (!scene) return;
      if (x == null) scene.leave(); else scene.point(x, y);
      for (let i = 0; i < frames; i++) scene.draw(seconds + i / 60, { morph: m });
    },
    release: () => { held = null; kick(); },
  };
})();
