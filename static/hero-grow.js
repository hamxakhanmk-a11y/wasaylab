// The home banner: runs the living hill (hero-grow-three.js) while the banner is on screen. It loops, so a button pauses and resumes
// it; under reduced motion it shows the hill in full bloom, still. Without WebGL a drawn hill shape stands in.
(() => {
  const hero = document.querySelector('[data-grow]');
  if (!hero) return;
  const canvas = hero.querySelector('canvas'), button = hero.querySelector('[data-grow-pause]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let scene = null, frame = 0, visible = true, paused = false, clock = 0, last = 0;

  function tick(now) {
    frame = 0;
    if (!scene || !visible || document.hidden) { last = 0; return; }
    const still = reduced.matches;
    if (!still && !paused) clock += last ? Math.min(.1, (now - last) / 1000) : 0;
    last = now;
    scene.draw(clock, { still });
    if (!still && !paused) frame = requestAnimationFrame(tick);
  }
  const kick = () => { if (!frame) frame = requestAnimationFrame(tick); };

  function label() {
    if (!button) return;
    button.hidden = reduced.matches || !scene;
    button.textContent = paused ? button.dataset.play : button.dataset.pause;
    button.setAttribute('aria-pressed', String(paused));
  }
  // where the heading and the line under it end, so the scene keeps the hill to the right of them
  const words = [...hero.querySelectorAll('h1, .wz-grow__lead')];
  function measure() {
    const box = hero.getBoundingClientRect(), range = document.createRange();
    if (!scene || !box.width) return;
    let right = box.left;
    words.forEach((el) => { range.selectNodeContents(el); right = Math.max(right, range.getBoundingClientRect().right); });
    scene.setClear((right - box.left) / box.width);
  }

  // the site header lies clear over the banner until the next section slides up under it
  const header = document.querySelector('.site-header'), next = hero.nextElementSibling;
  if (header && next) {
    const over = () => header.classList.toggle('is-over-hero', next.getBoundingClientRect().top > header.offsetHeight);
    addEventListener('scroll', over, { passive: true }); addEventListener('resize', over); over();
  }

  if (button) button.addEventListener('click', () => { paused = !paused; last = 0; label(); kick(); });

  import('./hero-grow-three.js').then(({ createGrowScene }) => {
    scene = createGrowScene(canvas, { bg: getComputedStyle(hero).backgroundColor, density: innerWidth < 760 ? .45 : 1 });
    measure(); document.fonts.ready.then(() => { measure(); kick(); });
    hero.classList.add('is-ready');
    label(); kick();
  }).catch((error) => {
    hero.classList.add('is-fallback');
    console.warn('Banner animation unavailable; showing the drawn hill.', error);
  });

  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; last = 0; if (visible) kick(); }).observe(hero);
  document.addEventListener('visibilitychange', () => { last = 0; kick(); });
  addEventListener('resize', () => { measure(); kick(); });
  reduced.addEventListener('change', () => { last = 0; label(); kick(); });
  window.WasayGrow = { drawAt: (seconds) => { if (scene) scene.draw(seconds); }, pause: () => { paused = true; label(); } };
})();
