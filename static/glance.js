// Wasay at a glance and Our products, as one scene that holds its place while the page scrolls through it. The grassy trunk
// (glance-three.js) arcs under the title and figures; scrolling on dives into it until its grass fills the screen, then the products
// sweep in from the right and scrolling carries them across (wasay-ring.js reads the same phases). The pointer parts the grass.
// Under reduced motion the grass is still and the dive happens in one step.
(() => {
  const section = document.querySelector('[data-glance]');
  if (!section) return;
  const stage = section.querySelector('.wz-glance__stage'), canvas = section.querySelector('canvas'), next = section.nextElementSibling;
  const intro = section.querySelector('[data-glance-intro]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (n) => Math.max(0, Math.min(1, n));
  let scene = null, frame = 0, visible = false, clock = 0, last = 0, loading = false, zoom = 0, held = null, odd = false;

  // where the page is in the hold: the dive (zoom), the products arriving (appear) and being carried across (travel), each 0 to 1;
  // the section says how many screens the dive and the arrival take (data-zoom, data-appear)
  function phases() {
    const vh = stage.offsetHeight, run = Math.max(0, section.offsetHeight - vh);
    const s = Math.min(run, Math.max(0, -section.getBoundingClientRect().top));
    const zoomLen = vh * (+section.dataset.zoom || 1), appearLen = vh * (+section.dataset.appear || .5);
    const travelLen = Math.max(1, run - zoomLen - appearLen);
    const p = { zoom: clamp(s / zoomLen), appear: clamp((s - zoomLen) / appearLen), travel: clamp((s - zoomLen - appearLen) / travelLen) };
    if (reduced.matches) { p.zoom = p.zoom < .5 ? 0 : 1; p.appear = p.appear > 0 || p.zoom === 1 ? 1 : 0; }
    return held ? { ...p, ...held } : p;
  }

  function words(z) {
    // the title and figures leave upward as the dive begins
    if (!intro) return;
    const o = clamp(1 - z * 3.2);
    intro.style.opacity = o.toFixed(3);
    intro.style.transform = o < 1 ? `translateY(${(-z * 90).toFixed(1)}px)` : '';
    intro.style.visibility = o === 0 ? 'hidden' : '';
  }

  function tick(now) {
    frame = 0;
    const box = section.getBoundingClientRect(), nextTop = next ? next.getBoundingClientRect().top : Infinity;
    // draw only while the scene is really on screen and not yet covered by the next page
    if (!visible || document.hidden || box.top >= innerHeight || nextTop <= 0) { last = 0; return; }
    const still = reduced.matches, dt = last ? Math.min(.1, (now - last) / 1000) : 0;
    last = now;
    clock += dt;
    const at = phases(), goal = at.zoom;
    // while the next page slides up over the finished scene, the grass holds its last picture instead of drawing underneath
    if (!held && nextTop < innerHeight - 2 && zoom === goal) { last = 0; return; }
    zoom = still || held ? goal : zoom + (goal - zoom) * (1 - Math.exp(-dt * 12));
    if (Math.abs(goal - zoom) < .0005) zoom = goal;
    words(zoom);
    // once the products stand on the grass it fills the screen; its sway is drawn every other frame, leaving the products room to glide
    odd = !odd;
    if (scene && (at.appear < 1 || odd || held)) scene.draw(clock, { still, zoom });
    if (!scene || !still || !scene.settled || zoom !== goal) frame = requestAnimationFrame(tick);
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
  // phases() is shared with the product ring; for checking, drawAt holds a moment: the loop time, pointer (fractions or none), phases
  window.WasayGlance = {
    phases,
    drawAt: (seconds, x, y, hold, frames = 60) => {
      held = hold || null; zoom = held && held.zoom != null ? held.zoom : zoom; words(zoom);
      if (!scene) return;
      if (x == null) scene.leave(); else scene.point(x, y);
      for (let i = 0; i < frames; i++) scene.draw(seconds + i / 60, { zoom });
      window.dispatchEvent(new Event('scroll'));
    },
  };
})();
