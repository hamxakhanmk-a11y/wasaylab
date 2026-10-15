// Product view for the home ring. Opening a jar flies it to the middle of a clean page, the name rises from behind it, and the
// jar tilts as the page is scrolled. The back button, Escape and the browser's back button all close it.
(() => {
  const dlg = document.querySelector('[data-product-view]');
  const items = [...document.querySelectorAll('[data-ring-item]')];
  if (!dlg || typeof dlg.showModal !== 'function' || !items.length) return;
  const q = (s) => dlg.querySelector(s);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const N = items.length;
  const jar = q('[data-detail-jar]'), stage = q('.wz-detail__stage'), hero = q('[data-detail-hero]'), nameEl = q('.wz-detail__name');
  const hashOf = (slug) => '#jar-' + slug;
  const labels = ['Front', 'Left', 'Right', 'From above'];
  let current = -1, opener = null, closing = false, pushed = false, photos = null, paintToken = 0, ticking = false;

  const fill = (text, it) => text.replace(/\{name\}/g, it.dataset.name).replace(/\{detail\}/g, it.dataset.detail);

  async function paintPhotos(it, token) {
    if (!photos) { try { photos = await (await fetch('/pastes-data.json')).json(); } catch { photos = []; } }
    if (token !== paintToken) return;
    const box = q('[data-detail-photos]');
    box.replaceChildren();
    const data = photos.find((p) => p.slug === it.dataset.slug);
    if (!data) return;
    [...data.photos, data.top && data.top.photo].filter(Boolean).forEach((src, i) => {
      const fig = document.createElement('figure'), img = new Image(), cap = document.createElement('figcaption');
      img.src = src; img.alt = `${it.dataset.name} jar, ${labels[i].toLowerCase()}`; img.loading = 'lazy'; img.decoding = 'async';
      cap.textContent = labels[i];
      fig.append(img, cap); box.append(fig);
    });
  }

  function render(index) {
    const it = items[index];
    current = index;
    dlg.dataset.slug = it.dataset.slug;
    dlg.querySelectorAll('[data-fill="name"]').forEach((e) => { e.textContent = e.classList.contains('wz-detail__name') ? it.dataset.name.replace(' ', '\n') : it.dataset.name; });
    dlg.querySelectorAll('[data-fill="detail"]').forEach((e) => { e.textContent = it.dataset.detail; });
    dlg.querySelectorAll('[data-tpl]').forEach((e) => { e.textContent = fill(e.dataset.tpl, it); });
    jar.src = `/images/wasay/ring/${it.dataset.slug}-large.webp`;
    jar.alt = `${it.dataset.name}, ${it.dataset.detail} jar`;
    dlg.querySelectorAll('[data-detail-neighbour]').forEach((e) => { e.textContent = items[(index + Number(e.dataset.detailNeighbour) + N) % N].dataset.name; });
    const token = ++paintToken;
    q('[data-detail-photos]').replaceChildren();
    paintPhotos(it, token);
    dlg.scrollTop = 0;
    update();
  }

  // the jar tilts and the name drifts while the pinned hero scrolls
  function update() {
    ticking = false;
    const total = Math.max(1, hero.offsetHeight - innerHeight);
    const p = clamp(dlg.scrollTop / total, 0, 1);
    stage.style.transform = reduced.matches ? 'translateX(-50%) translateY(12svh)'
      : `translateX(-50%) translateY(${(34 - p * 44).toFixed(2)}svh) rotate(${(p * 22).toFixed(2)}deg) scale(${(1 + p * 0.07).toFixed(3)})`;
    nameEl.style.transform = reduced.matches ? '' : `translateY(${(-p * 5).toFixed(2)}svh)`;
  }
  dlg.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', () => { if (dlg.open) update(); });

  function animateIn(fromEl) {
    if (reduced.matches) return;
    dlg.getAnimations().forEach((a) => a.cancel());
    dlg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-out' });
    const to = jar.getBoundingClientRect();
    if (fromEl && to.height) {
      const from = fromEl.getBoundingClientRect();
      const roll = parseFloat((fromEl.closest('[data-ring-item]').style.transform.split('rotate(')[1] || '0')) || 0;
      const dx = from.left + from.width / 2 - (to.left + to.width / 2), dy = from.top + from.height / 2 - (to.top + to.height / 2);
      jar.animate([{ transform: `translate(${dx}px, ${dy}px) rotate(${roll}deg) scale(${from.height / to.height})` }, { transform: 'translate(0, 0) rotate(0deg) scale(1)' }], { duration: 850, easing: 'cubic-bezier(.22, 1, .36, 1)' });
    } else {
      jar.animate([{ opacity: 0, transform: 'translateY(8svh)' }, { opacity: 1, transform: 'none' }], { duration: 650, easing: 'cubic-bezier(.22, 1, .36, 1)' });
    }
    // the name comes out from behind the jar
    nameEl.animate([{ opacity: 0, transform: 'translateY(26%) scale(.93)', letterSpacing: '.05em' }, { opacity: 1, transform: 'translateY(0) scale(1)', letterSpacing: '-.012em' }], { duration: 950, delay: 340, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'backwards' });
    dlg.querySelectorAll('.wz-detail__cap').forEach((c) => c.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: 820, fill: 'backwards' }));
  }

  function open(index, fromEl, push = true) {
    opener = fromEl || null;
    render(index);
    document.documentElement.classList.add('has-detail');
    if (!dlg.open) dlg.showModal();
    dlg.scrollTop = 0; update();
    if (push) { history.pushState({ jar: items[index].dataset.slug }, '', hashOf(items[index].dataset.slug)); pushed = true; }
    animateIn(fromEl);
    q('[data-detail-close]').focus({ preventScroll: true });
  }

  function finishClose() {
    dlg.getAnimations().forEach((a) => a.cancel());
    dlg.close();
    document.documentElement.classList.remove('has-detail');
    closing = false;
    if (opener && opener.isConnected) { const link = opener.closest('a'); if (link) link.focus({ preventScroll: true }); }
  }
  function close() {
    if (!dlg.open || closing) return;
    closing = true;
    if (pushed) { pushed = false; history.back(); return; }   // popstate finishes the job
    if (location.hash.startsWith('#jar-')) history.replaceState(null, '', location.pathname + location.search);
    if (reduced.matches) finishClose();
    else dlg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' }).finished.then(finishClose, finishClose);
  }
  addEventListener('popstate', () => {
    const m = location.hash.match(/^#jar-(.+)$/);
    const i = m ? items.findIndex((it) => it.dataset.slug === m[1]) : -1;
    if (dlg.open) {
      if (i < 0) {
        closing = true; pushed = false;
        if (reduced.matches) finishClose();
        else dlg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' }).finished.then(finishClose, finishClose);
      } else if (i !== current) { render(i); animateIn(null); }
    } else if (i >= 0) open(i, null, false);
  });

  function step(delta) {
    const next = (current + delta + N) % N;
    render(next);
    history.replaceState(history.state, '', hashOf(items[next].dataset.slug));
    animateIn(null);
  }

  q('[data-detail-close]').addEventListener('click', close);
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  dlg.querySelectorAll('[data-detail-step]').forEach((b) => b.addEventListener('click', () => step(Number(b.dataset.detailStep))));
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  });

  window.WasayDetail = { open: (index, fromEl) => open(index, fromEl), isOpen: () => dlg.open };

  const m = location.hash.match(/^#jar-(.+)$/);
  if (m) { const i = items.findIndex((it) => it.dataset.slug === m[1]); if (i >= 0) open(i, null, false); }
})();
