// A pace for the page scroll, so a hurried scroll cannot rush past the pages and the scenes on them, while an ordinary one feels
// the same. A wheel or touchpad moves the page by a glide that eases towards where it was scrolled to, with a top speed (a couple
// of screens a second) and only a short way it may run ahead, so spinning the wheel hard plays the scenes through instead of
// jumping over them, and the page stops soon after the wheel does. A finger is never held back while it is on the glass, but the
// glide it throws when it lets go (the browser's own momentum) is stopped at the next checkpoint: the start and end of each page,
// and each screen of the long scenes (the banner and Wasay at a glance). The browser's momentum cannot be slowed, only stopped, so
// a flick lands on the next checkpoint, and if a browser carries on anyway it is left alone rather than fought. Under reduced
// motion the scroll is left entirely to the browser.
(() => {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const MAX = 2.4, LEAD = .9, EASE = .09;   // wheel: top speed (screens a second), how far it may run ahead (screens), easing (s)
  const SCENES = '[data-grow], [data-glance]';

  // ---- wheel and touchpad ----
  let pos = 0, target = 0, wrote = 0, frame = 0, last = 0;
  const end = () => Math.max(0, root.scrollHeight - innerHeight);
  // a box of its own that scrolls (the menu on a phone, a product's page) keeps the wheel
  function ownScroll(el) {
    for (; el && el !== document.body && el !== root; el = el.parentElement) {
      if (el.nodeType !== 1) continue;
      const style = getComputedStyle(el).overflowY;
      if ((style === 'auto' || style === 'scroll') && el.scrollHeight > el.clientHeight + 1) return true;
    }
    return false;
  }
  function glide(now) {
    const dt = Math.min(.05, Math.max(.001, (now - last) / 1000)); last = now;
    // something else moved the page (the scroll bar, the keys, a link): let it, and stop gliding
    if (Math.abs(scrollY - wrote) > 2) { frame = 0; return; }
    const cap = MAX * innerHeight * dt;
    pos += Math.max(-cap, Math.min(cap, (target - pos) * (1 - Math.exp(-dt / EASE))));
    if (Math.abs(target - pos) < .5) pos = target;
    scrollTo({ top: pos, behavior: 'instant' });
    wrote = scrollY;
    frame = pos === target ? 0 : requestAnimationFrame(glide);
  }
  addEventListener('wheel', (e) => {
    if (e.defaultPrevented || e.ctrlKey || reduced.matches) return;
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
    if (!dy || Math.abs(e.deltaX) > Math.abs(dy)) return;
    if (document.querySelector('dialog[open]') || getComputedStyle(root).overflowY === 'hidden'
      || getComputedStyle(document.body).overflowY === 'hidden' || ownScroll(e.target)) return;
    e.preventDefault();
    if (!frame) { pos = target = wrote = scrollY; last = performance.now(); frame = requestAnimationFrame(glide); }
    // turning the other way turns at once, without first using up what was still to come
    if (Math.sign(target - pos) === -Math.sign(dy)) target = pos;
    const lead = LEAD * innerHeight;
    target = Math.max(pos - lead, Math.min(pos + lead, Math.max(0, Math.min(end(), target + dy))));
  }, { passive: false });

  // ---- a finger's flick ----
  // where each page starts and ends in the scroll (the pages pin, so they are added up in order rather than measured on screen),
  // and each screen in between on the long scenes
  function checkpoints() {
    const chapters = (window.WasayStack && window.WasayStack.chapters) || [];
    const vh = innerHeight, marks = [0, end()];
    let top = 0, below = 0;
    chapters.forEach((el, i) => {
      const style = getComputedStyle(el), above = parseFloat(style.marginTop) || 0;
      top = i ? top + Math.max(below, above) : el.parentElement.getBoundingClientRect().top + scrollY + above;
      const height = el.offsetHeight, last = top + Math.max(0, height - vh);
      marks.push(top, last);
      if (el.matches(SCENES)) for (let y = top + vh; y < last - vh * .25; y += vh) marks.push(y);
      top += height; below = parseFloat(style.marginBottom) || 0;
    });
    return marks.map(Math.round).sort((a, b) => a - b);
  }
  let finger = false, flick = null;
  const lift = (e) => {
    if (e.touches.length) return;
    finger = false;
    flick = { from: scrollY, at: performance.now(), way: 0, stop: null, stopped: false };
  };
  addEventListener('touchstart', () => { finger = true; flick = null; }, { passive: true });
  addEventListener('touchend', lift, { passive: true });
  addEventListener('touchcancel', lift, { passive: true });
  addEventListener('scroll', () => {
    if (finger || !flick || reduced.matches) return;
    const y = scrollY;
    if (performance.now() - flick.at > 4000) { flick = null; return; }
    if (!flick.way) {
      if (Math.abs(y - flick.from) < 2) return;
      flick.way = Math.sign(y - flick.from);
      const marks = checkpoints(), from = flick.from;
      flick.stop = flick.way > 0 ? marks.find((m) => m > from + 8) : marks.reverse().find((m) => m < from - 8);
      if (flick.stop === undefined) { flick = null; return; }
    }
    if (flick.way * (y - flick.stop) <= 0) return;
    if (flick.stopped) { flick = null; return; }
    flick.stopped = true;
    scrollTo({ top: flick.stop, behavior: 'instant' });
  }, { passive: true });

  window.WasayPace = { checkpoints };
})();
