/* Real footage: autoplay silently when visible, pause on request and respect reduced motion. */
(() => {
  const banner = document.querySelector('[data-wellness-banner]');
  if (!banner) return;
  const button = banner.querySelector('[data-banner-motion]');
  const video = banner.querySelector('video');
  if (!video) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches, visible = true, failed = false, pending = false;
  video.muted = true;
  function updateControl() {
    button.hidden = false;
    button.disabled = failed;
    button.textContent = failed ? 'Video unavailable' : video.paused ? 'Play video' : 'Pause video';
    button.setAttribute('aria-pressed', String(paused));
  }
  const shouldPlay = () => !paused && visible && !document.hidden && !failed;
  function sync() {
    if (!shouldPlay()) { video.pause(); updateControl(); return; }
    if (!video.getAttribute('src')) video.src = video.dataset.src;
    if (!pending && video.paused) {
      pending = true;
      video.play().catch(() => {
        // Autoplay can be blocked by the browser; expose an honest Play button.
        if (shouldPlay()) paused = true;
      }).finally(() => { pending = false; updateControl(); });
    }
    updateControl();
  }
  button.addEventListener('click', () => { paused = !paused; sync(); });
  video.addEventListener('play', updateControl);
  video.addEventListener('pause', updateControl);
  video.addEventListener('error', () => { failed = true; updateControl(); });
  reduced.addEventListener('change', () => { paused = reduced.matches; sync(); });
  document.addEventListener('visibilitychange', sync);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(banner);
  sync();
})();
