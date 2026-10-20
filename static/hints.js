// Little see-through hints on the home page's living scenes, telling a visitor what they can do there: stir the flying leaves on
// the banner, part the grass on the trunk of Wasay at a glance. A mouse gets its own wording and a finger its own. Each hint shows
// once, a moment after its scene is on screen (on the banner, once the opening has gone), and fades away after a few seconds, or
// sooner once the visitor tries it or scrolls on.
(() => {
  const hints = [...document.querySelectorAll('[data-hint]')];
  if (!hints.length) return;
  const mouse = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const opening = () => document.querySelector('.logo-intro:not(.done)');
  const SHOW_AFTER = 1200, STAY = 5200, READ = 1500;

  for (const el of hints) {
    const scene = el.closest('section');
    el.querySelector('[data-hint-text]').textContent = mouse ? el.dataset.hintMouse : el.dataset.hintTouch;
    el.classList.add(mouse ? 'is-mouse' : 'is-touch');
    let state = 'waiting', shownAt = 0, timer = 0, from = 0;
    const hide = () => { if (state !== 'on') return; state = 'done'; el.classList.remove('is-on'); clearTimeout(timer); };
    const show = () => {
      if (state !== 'waiting' || opening()) return;
      state = 'on'; shownAt = performance.now(); from = scrollY;
      el.classList.add('is-on');
      timer = setTimeout(hide, STAY);
    };
    // once it has been read for a moment, trying it or scrolling on puts it away
    const tried = () => { if (state === 'on' && performance.now() - shownAt > READ) hide(); };
    scene.addEventListener('pointermove', tried, { passive: true });
    scene.addEventListener('touchmove', tried, { passive: true });
    addEventListener('scroll', () => { if (state === 'on' && Math.abs(scrollY - from) > innerHeight * .25) hide(); }, { passive: true });

    let wait = 0;
    new IntersectionObserver(([entry]) => {
      clearTimeout(wait);
      if (entry.isIntersecting) wait = setTimeout(show, SHOW_AFTER);
      else hide();
    }, { threshold: 1 }).observe(el);
    // on the banner the opening plays first; the hint follows once it has gone
    addEventListener('wasay:intro-done', () => {
      const r = el.getBoundingClientRect();
      if (r.top >= 0 && r.bottom <= innerHeight) { clearTimeout(wait); wait = setTimeout(show, SHOW_AFTER + 600); }
    });
  }
})();
