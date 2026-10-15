// Product view, shared by the home ring and the product tabs. Opening a product flies it to the middle of a clean page, the name
// rises from behind it, and it tilts as the page is scrolled. The back button, Escape and the browser's back button all close it.
// Every product on the page is an element with [data-pv-item] (name, detail, kind, a large cutout and a photo list as data attributes).
(() => {
  const dlg = document.querySelector('[data-product-view]');
  const items = [...document.querySelectorAll('[data-pv-item]')];
  if (!dlg || typeof dlg.showModal !== 'function' || !items.length) return;
  const q = (s) => dlg.querySelector(s);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const N = items.length;
  const jar = q('[data-detail-jar]'), stage = q('.wz-detail__stage'), hero = q('[data-detail-hero]'), nameEl = q('.wz-detail__name');
  const hashOf = (it) => '#product-' + it.dataset.slug;
  const HASH = /^#product-(.+)$/;
  const labels = ['Front', 'Left', 'Right', 'From above'];
  const kinds = {};
  document.querySelectorAll('template[data-pv-kind]').forEach((t) => { kinds[t.dataset.pvKind] = { ...t.dataset }; });
  const kindOf = (it) => kinds[it.dataset.kind] || {};
  const lists = new Map();   // photo list url -> promise of its json
  let current = -1, opener = null, closing = false, opening = false, pushed = false, paintToken = 0, ticking = false;

  const fill = (text, it) => {
    const k = kindOf(it), v = { name: it.dataset.name, detail: it.dataset.detail, range: k.range, pack: k.pack, noun: k.noun };
    return text.replace(/\{(name|detail|range|pack|noun)\}/g, (m, key) => v[key] || '');
  };

  // the large picture is loaded and decoded before the view opens, so the flight starts from the right size and position
  const preload = (it) => new Promise((done) => {
    const img = new Image(), timer = setTimeout(done, 700);
    img.onload = () => { clearTimeout(timer); (img.decode ? img.decode() : Promise.resolve()).then(done, done); };
    img.onerror = () => { clearTimeout(timer); done(); };
    img.src = it.dataset.img;
  });

  async function paintPhotos(it, token) {
    const url = it.dataset.photos;
    if (!lists.has(url)) lists.set(url, fetch(url).then((r) => r.json()).catch(() => []));
    const data = (await lists.get(url)).find((p) => p.slug === it.dataset.slug);
    if (token !== paintToken) return;
    const box = q('[data-detail-photos]');
    box.replaceChildren();
    if (!data) return;
    [...data.photos, data.top && data.top.photo].filter(Boolean).forEach((src, i) => {
      const fig = document.createElement('figure'), img = new Image(), cap = document.createElement('figcaption');
      img.src = src; img.alt = `${it.dataset.name} ${kindOf(it).noun || 'pack'}, ${labels[i].toLowerCase()}`; img.loading = 'lazy'; img.decoding = 'async';
      cap.textContent = labels[i];
      fig.append(img, cap); box.append(fig);
    });
  }

  function render(index) {
    const it = items[index], k = kindOf(it);
    current = index;
    dlg.dataset.slug = it.dataset.slug;
    dlg.dataset.kind = it.dataset.kind || '';
    dlg.querySelectorAll('[data-fill="name"]').forEach((e) => { e.textContent = e.classList.contains('wz-detail__name') ? it.dataset.name.replace(' ', '\n') : it.dataset.name; });
    dlg.querySelectorAll('[data-fill="detail"]').forEach((e) => { e.textContent = it.dataset.detail; });
    dlg.querySelectorAll('[data-fill="range"]').forEach((e) => { e.textContent = k.range || ''; });
    dlg.querySelectorAll('[data-fill="all_label"]').forEach((e) => { e.textContent = k.allLabel || ''; });
    dlg.querySelectorAll('[data-fill="photos_note"]').forEach((e) => { e.textContent = k.photosNote || ''; });
    dlg.querySelectorAll('[data-pv-all]').forEach((e) => { e.href = k.allHref || '#'; });
    dlg.querySelectorAll('[data-tpl]').forEach((e) => { e.textContent = fill(e.dataset.tpl, it); });
    jar.src = it.dataset.img;
    jar.alt = `${it.dataset.name}, ${it.dataset.detail} ${k.noun || ''}`.trim();
    dlg.style.setProperty('--pv-ar', jar.naturalWidth && jar.naturalHeight ? (jar.naturalWidth / jar.naturalHeight).toFixed(3) : '.6');
    dlg.querySelectorAll('[data-detail-neighbour]').forEach((e) => { e.textContent = items[(index + Number(e.dataset.detailNeighbour) + N) % N].dataset.name; });
    const token = ++paintToken;
    q('[data-detail-photos]').replaceChildren();
    paintPhotos(it, token);
    dlg.scrollTop = 0;
    update();
  }
  jar.addEventListener('load', () => { if (jar.naturalHeight) dlg.style.setProperty('--pv-ar', (jar.naturalWidth / jar.naturalHeight).toFixed(3)); });

  // the product tilts and the name drifts while the pinned hero scrolls
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
      const ring = fromEl.closest('[data-ring-item]');
      const roll = ring ? parseFloat((ring.style.transform.split('rotate(')[1] || '0')) || 0 : 0;
      const dx = from.left + from.width / 2 - (to.left + to.width / 2), dy = from.top + from.height / 2 - (to.top + to.height / 2);
      jar.animate([{ transform: `translate(${dx}px, ${dy}px) rotate(${roll}deg) scale(${from.height / to.height})` }, { transform: 'translate(0, 0) rotate(0deg) scale(1)' }], { duration: 850, easing: 'cubic-bezier(.22, 1, .36, 1)' });
    } else {
      jar.animate([{ opacity: 0, transform: 'translateY(8svh)' }, { opacity: 1, transform: 'none' }], { duration: 650, easing: 'cubic-bezier(.22, 1, .36, 1)' });
    }
    // the name comes out from behind the product
    nameEl.animate([{ opacity: 0, transform: 'translateY(26%) scale(.93)', letterSpacing: '.05em' }, { opacity: 1, transform: 'translateY(0) scale(1)', letterSpacing: '-.012em' }], { duration: 950, delay: 340, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'backwards' });
    dlg.querySelectorAll('.wz-detail__cap').forEach((c) => c.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: 820, fill: 'backwards' }));
  }

  async function open(target, fromEl, push = true) {
    const index = typeof target === 'number' ? target : items.indexOf(target);
    if (index < 0 || opening) return;
    opening = true;
    opener = fromEl || null;
    await preload(items[index]);
    opening = false;
    render(index);
    document.documentElement.classList.add('has-detail');
    if (!dlg.open) dlg.showModal();
    dlg.scrollTop = 0; update();
    if (push) { history.pushState({ product: items[index].dataset.slug }, '', hashOf(items[index])); pushed = true; }
    animateIn(fromEl);
    q('[data-detail-close]').focus({ preventScroll: true });
  }

  function finishClose() {
    dlg.getAnimations().forEach((a) => a.cancel());
    dlg.close();
    document.documentElement.classList.remove('has-detail');
    closing = false;
    const back = items[current] && (items[current].querySelector('[data-pv-link]') || items[current].querySelector('a, [tabindex]'));
    if (back) back.focus({ preventScroll: true });
  }
  function fadeOut() {
    if (reduced.matches) finishClose();
    else dlg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' }).finished.then(finishClose, finishClose);
  }
  function close() {
    if (!dlg.open || closing) return;
    closing = true;
    if (pushed) { pushed = false; history.back(); return; }   // popstate finishes the job
    if (HASH.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
    fadeOut();
  }
  addEventListener('popstate', () => {
    const m = location.hash.match(HASH);
    const i = m ? items.findIndex((it) => it.dataset.slug === m[1]) : -1;
    if (dlg.open) {
      if (i < 0) { closing = true; pushed = false; fadeOut(); }
      else if (i !== current) preload(items[i]).then(() => { render(i); animateIn(null); });
    } else if (i >= 0) open(i, null, false);
  });

  function step(delta) {
    const next = (current + delta + N) % N;
    preload(items[next]).then(() => {
      render(next);
      history.replaceState(history.state, '', hashOf(items[next]));
      animateIn(null);
    });
  }

  q('[data-detail-close]').addEventListener('click', close);
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  dlg.querySelectorAll('[data-detail-step]').forEach((b) => b.addEventListener('click', () => step(Number(b.dataset.detailStep))));
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  });

  // a click on a product tile opens it (the ring handles its own clicks, because it must tell a click from a drag)
  let down = null;
  document.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; }, true);
  const pictureOf = (li) => li.querySelector('canvas') || li.querySelector('img');
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button || dlg.contains(e.target)) return;
    const li = e.target.closest('[data-pv-item]');
    if (!li || li.hasAttribute('data-ring-item')) return;
    const link = e.target.closest('a');
    if (link && !link.hasAttribute('data-pv-link')) return;
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;   // a drag that turned a jar
    e.preventDefault();
    open(li, pictureOf(li));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || dlg.open) return;
    const view = e.target.closest && e.target.closest('.tablet-view, .paste-view');
    const li = view && view.closest('[data-pv-item]');
    if (li) { e.preventDefault(); open(li, pictureOf(li)); }
  });

  window.WasayDetail = { open: (target, fromEl) => open(target, fromEl), isOpen: () => dlg.open };

  const m = location.hash.match(HASH);
  if (m) { const i = items.findIndex((it) => it.dataset.slug === m[1]); if (i >= 0) open(i, null, false); }
})();
