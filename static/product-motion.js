/* Real, background-isolated video frames. No synthetic label or unseen angles. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const cache = new Map();
  const load = index => {
    if (!cache.has(index)) cache.set(index, new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => { cache.delete(index); reject(new Error(`Product frame ${index} unavailable`)); };
      image.src = `/images/wasay/mother-tonic-motion/${String(index).padStart(3, '0')}.webp`;
    }));
    return cache.get(index);
  };
  document.querySelectorAll('[data-product-motion]').forEach(view => {
    const image = view.querySelector('img');
    const stage = view.querySelector('.product-motion__stage');
    const controls = view.querySelector('.product-motion__controls');
    const hint = view.querySelector('.product-motion__hint');
    const slider = view.querySelector('input');
    const play = view.querySelector('.product-motion__play');
    let ready = false, visible = false, playing = !reduced.matches;
    let frame = 36, phase = 0, previous = 0, raf = 0, dragging = false, hovering = false;
    let loading = false;
    const updateButton = () => {
      play.textContent = playing ? 'Pause' : 'Play';
      play.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} product animation`);
    };
    const show = value => {
      frame = Math.max(0, Math.min(72, Math.round(value)));
      // Controls become available only after every frame has loaded.
      const source = `/images/wasay/mother-tonic-motion/${String(frame).padStart(3, '0')}.webp`;
      if (ready && image.getAttribute('src') !== source) image.src = source;
      slider.value = frame;
      slider.setAttribute('aria-valuetext', frame < 30 ? 'Left side view' : frame > 42 ? 'Right side view' : 'Front view');
    };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; previous = 0; };
    const tick = time => {
      raf = 0;
      if (!ready || !visible || document.hidden || !playing || hovering || dragging) { previous = 0; return; }
      phase += previous ? Math.min(time - previous, 50) / 2800 : 0;
      previous = time;
      show(36 + Math.sin(phase) * 36);
      if (!reduced.matches) {
        image.style.setProperty('--float', `${Math.sin(phase * 1.3) * 7}px`);
        image.style.setProperty('--lean', `${Math.sin(phase) * 3}deg`);
      }
      raf = requestAnimationFrame(tick);
    };
    const start = () => { if (!raf && ready && visible && playing && !document.hidden && !hovering && !dragging) raf = requestAnimationFrame(tick); };
    const manual = value => {
      playing = false; stop(); show(value); updateButton();
      image.style.setProperty('--float', '0px'); image.style.setProperty('--lean', '0deg');
    };
    const atPointer = event => {
      const rect = stage.getBoundingClientRect();
      return (event.clientX - rect.left) / rect.width * 72;
    };
    play.addEventListener('click', () => {
      playing = !playing; phase = Math.asin((frame - 36) / 36); updateButton();
      if (playing) start(); else stop();
    });
    view.querySelector('.product-motion__reset').addEventListener('click', () => manual(36));
    slider.addEventListener('input', () => manual(Number(slider.value)));
    stage.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse') { hovering = true; stop(); }
    });
    stage.addEventListener('pointermove', event => {
      if (!ready) return;
      if (dragging) manual(atPointer(event));
      else if (event.pointerType === 'mouse') show(atPointer(event));
    });
    stage.addEventListener('pointerleave', () => { hovering = false; phase = Math.asin((frame - 36) / 36); start(); });
    stage.addEventListener('pointerdown', event => {
      if (!ready || event.button !== 0) return;
      dragging = true; stage.setPointerCapture(event.pointerId); manual(atPointer(event));
    });
    const release = () => { dragging = false; };
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', release);
    stage.addEventListener('lostpointercapture', release);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
    reduced.addEventListener('change', () => { if (reduced.matches) manual(36); });
    const observer = new IntersectionObserver(async entries => {
      visible = entries[0].isIntersecting;
      if (!visible) { stop(); return; }
      if (!ready && !loading) {
        loading = true;
        try {
          // Six concurrent requests, only when this product approaches the viewport.
          let next = 0;
          await Promise.all(Array.from({length: 6}, async () => { while (next <= 72) await load(next++); }));
          ready = true; controls.hidden = false; hint.textContent = 'Move across or drag to turn'; hint.hidden = false; updateButton(); show(frame);
        } catch (error) {
          console.warn(error);
          // Keep the real front-view poster usable when a connection fails.
          hint.textContent = 'Product preview unavailable. Scroll back to retry.'; hint.hidden = false;
        } finally { loading = false; }
      }
      start();
    }, {threshold: 0.05});
    observer.observe(view);
  });
})();
