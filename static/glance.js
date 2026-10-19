// Wasay at a glance: one scene that holds its place while the page scrolls through it. The grassy trunk (glance-three.js) arcs under
// the title and the figures; scrolling on gathers its grass into a mound of moss inside a glass capsule, and the figures step aside
// for it. Then the next page (the products) slides up over it as usual. The pointer parts the grass while it is still a trunk.
// Under reduced motion the grass is still and the change happens in one step.
(() => {
  const section = document.querySelector('[data-glance]');
  if (!section) return;
  const stage = section.querySelector('.wz-glance__stage'), canvas = section.querySelector('canvas'), next = section.nextElementSibling;
  const foot = section.querySelector('.wz-glance__foot');
  const title = section.querySelector('[data-glance-title]'), handsTitle = section.querySelector('[data-glance-hands-title]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (n) => Math.max(0, Math.min(1, n));
  let scene = null, frame = 0, visible = false, clock = 0, last = 0, loading = false, morph = 0, hands = 0, held = null;

  // how far the page is through the hold: the change into the capsule over its first half, then the hands reaching in
  function aim() {
    if (held !== null) return held;
    const run = Math.max(1, section.offsetHeight - stage.offsetHeight);
    const p = clamp(-section.getBoundingClientRect().top / run);
    const at = { morph: clamp((p - .03) / .5), hands: clamp((p - .58) / .34) };
    if (reduced.matches) { at.morph = at.morph < .5 ? 0 : 1; at.hands = at.hands < .5 ? 0 : 1; }
    return at;
  }

  function words(m, h = 0) {
    // the title gives way to the hands' title as they arrive
    const a = clamp(1 - h * 3.5), b = clamp((h - .22) * 3.5);
    if (title) { title.style.opacity = a.toFixed(3); title.style.transform = a < 1 ? `translateY(${(-(1 - a) * 18).toFixed(1)}px)` : ''; }
    if (handsTitle) { handsTitle.style.opacity = b.toFixed(3); handsTitle.style.transform = b < 1 ? `translateY(${((1 - b) * 18).toFixed(1)}px)` : ''; handsTitle.setAttribute('aria-hidden', String(b < .5)); }
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
    // while the next page slides up over the finished scene, it holds its last picture instead of drawing underneath
    if (held === null && nextTop < innerHeight - 2 && morph === goal.morph && hands === goal.hands) { last = 0; return; }
    last = now;
    clock += dt;
    const k = still || held !== null ? 1 : 1 - Math.exp(-dt * 10);
    morph += (goal.morph - morph) * k; hands += (goal.hands - hands) * k;
    if (Math.abs(goal.morph - morph) < .0005) morph = goal.morph;
    if (Math.abs(goal.hands - hands) < .0005) hands = goal.hands;
    words(morph, hands);
    if (scene) scene.draw(clock, { still, morph, hands });
    if (!scene || !still || !scene.settled || morph !== goal.morph || hands !== goal.hands) frame = requestAnimationFrame(tick);
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
    drawAt: (seconds, x, y, m = 0, frames = 2, h = 0) => {
      held = { morph: m, hands: h }; morph = m; hands = h; words(m, h);
      if (!scene) return;
      if (x == null) scene.leave(); else scene.point(x, y);
      for (let i = 0; i < frames; i++) scene.draw(seconds + i / 60, { morph: m, hands: h });
    },
    release: () => { held = null; kick(); },
  };
})();
