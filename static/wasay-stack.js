// Page turn for every page: each section of <main> pins once it has been read and the next slides up over it.
// CSS (wasay-stack.css) does the pinning; this marks the sections, sizes the pin for tall sections and measures how far each
// section has been covered so it can be dimmed. Under reduced motion nothing pins and sections scroll normally.
(() => {
  const main = document.querySelector('main');
  if (!main) return;
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const KINDS = new Set(['SECTION', 'ARTICLE', 'DIV', 'ASIDE']);
  const chapters = [...main.children].filter((el) => KINDS.has(el.tagName) && !el.hasAttribute('data-stack-skip') && getComputedStyle(el).display !== 'none');
  if (chapters.length < 2) return;
  chapters.forEach((el, i) => { el.classList.add('stack-chapter'); el.style.setProperty('--stack-z', String(i + 1)); });

  let ticking = false;
  function fit() {
    chapters.forEach((el) => el.style.setProperty('--stack-top', Math.min(0, innerHeight - el.offsetHeight) + 'px'));
  }
  // how much of each section the next one has slid over (0 to 1), measured on what is actually on screen
  function cover() {
    ticking = false;
    const vh = innerHeight;
    for (let i = 0; i < chapters.length; i++) {
      const el = chapters[i];
      let value = 0;
      if (!reduced.matches && i < chapters.length - 1) {
        const r = el.getBoundingClientRect();
        if (r.bottom > 0 && r.top < vh) {
          const next = chapters[i + 1].getBoundingClientRect();
          value = Math.max(0, Math.min(1, (r.bottom - next.top) / Math.max(1, Math.min(r.height, vh))));
        }
      }
      const text = value.toFixed(2);
      if (el.dataset.cover !== text) { el.dataset.cover = text; el.style.setProperty('--cover', text); }
    }
  }
  const queue = () => { if (!ticking) { ticking = true; requestAnimationFrame(cover); } };
  function sync() {
    root.classList.toggle('has-stack', !reduced.matches);
    if (!reduced.matches) fit();
    queue();
  }

  sync();
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', sync);
  addEventListener('load', sync);
  reduced.addEventListener('change', sync);
  if ('ResizeObserver' in window) {
    const watch = new ResizeObserver(() => { if (!reduced.matches) fit(); queue(); });
    chapters.forEach((el) => watch.observe(el));
  }
  window.WasayStack = { chapters, refresh: sync };
})();
