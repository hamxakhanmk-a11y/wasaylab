(() => {
  const scene = document.querySelector('[data-botanical-scene]');
  if (!scene) return;
  const control = scene.querySelector('[data-botanical-toggle]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches, visible = false;
  function sync() {
    scene.classList.toggle('is-playing', !paused && visible && !document.hidden);
    control.textContent = paused ? 'Play animation' : 'Pause animation';
    control.setAttribute('aria-label', paused ? 'Play botanical animation' : 'Pause botanical animation');
    control.setAttribute('aria-pressed', String(paused));
  }
  control.hidden = false;
  control.addEventListener('click', () => { paused = !paused; sync(); });
  reduced.addEventListener('change', () => { paused = reduced.matches; sync(); });
  document.addEventListener('visibilitychange', sync);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: .1 }).observe(scene);
  sync();
})();
