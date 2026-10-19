// Keeps a WebGL scene smooth on any machine without flicker: it watches how long frames take and, only when a device clearly cannot
// keep up for a while, lowers the drawing resolution one step. A level that proved too slow is never tried again, so the picture does
// not swap back and forth between sharp and soft (which reads as blinking); it rises again only to a level below that. Call the
// returned function once per drawn frame.
export function autoQuality(renderer, { max = 1.5, min = .8, start = 1.25 } = {}) {
  const cap = Math.min(window.devicePixelRatio || 1, max);
  let ratio = Math.min(cap, start), ceiling = cap, avg = 16.7, last = 0, calm = 0, since = 0;
  renderer.setPixelRatio(ratio);
  const set = (value) => { ratio = value; renderer.setPixelRatio(ratio); since = 0; calm = 0; avg = 16.7; };
  return function frame(now = performance.now()) {
    const dt = last ? now - last : 0;
    last = now;
    if (dt > 0 && dt < 100) avg += (dt - avg) * .04;                      // a long gap is a pause, not a slow frame
    if (++since < 90) return;
    if (avg > 26 && ratio > min) { ceiling = ratio; set(Math.max(min, ratio * .85)); }
    else if (avg < 15 && ratio * 1.15 < ceiling - .001) { if (++calm > 600) set(Math.min(ceiling - .01, ratio * 1.15)); }
    else calm = 0;
  };
}
