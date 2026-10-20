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
  // the steady screen height, with the browser's bars hidden (the scenes are sized to it too): on a phone, innerHeight grows and
  // shrinks as the bars slide away and back while scrolling
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100vh;height:100lvh;visibility:hidden;pointer-events:none';
  document.body.append(probe);
  const screenHeight = () => probe.offsetHeight || innerHeight;
  let fitted = '';
  function fit() {
    const vh = screenHeight();
    chapters.forEach((el) => el.style.setProperty('--stack-top', Math.min(0, vh - el.offsetHeight) + 'px'));
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
      if (el.dataset.cover !== text) {
        el.dataset.cover = text; el.style.setProperty('--cover', text);
        // the dimming layer exists only while the section is being covered: at 0 it shows nothing and at 1 nothing shows of the
        // section, and a page-tall layer kept for nothing makes every frame of everything else on the page dearer
        el.classList.toggle('is-covering', value > 0 && value < 1);
      }
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
  // refit only when the width or the steady height changes, not each time a phone's browser bar moves
  addEventListener('resize', () => { const key = innerWidth + 'x' + screenHeight(); if (key !== fitted) { fitted = key; sync(); } else queue(); });
  addEventListener('load', sync);
  reduced.addEventListener('change', sync);
  if ('ResizeObserver' in window) {
    const watch = new ResizeObserver(() => { if (!reduced.matches) fit(); queue(); });
    chapters.forEach((el) => watch.observe(el));
  }
  window.WasayStack = { chapters, refresh: sync };
})();
