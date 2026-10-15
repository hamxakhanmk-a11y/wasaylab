/* Pause ambient motion on request, offscreen, in a background tab or under reduced motion. */
(() => {
  const banner = document.querySelector('[data-wellness-banner]');
  if (!banner) return;
  const button = banner.querySelector('[data-banner-motion]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false, visible = true;
  function sync() {
    banner.classList.toggle('is-paused', paused || reduced.matches);
    banner.classList.toggle('is-offscreen', !visible || document.hidden);
    button.hidden = reduced.matches;
    button.textContent = paused ? 'Play motion' : 'Pause motion';
    button.setAttribute('aria-pressed', String(paused));
  }
  button.addEventListener('click', () => { paused = !paused; sync(); });
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(banner);
  sync();
})();
