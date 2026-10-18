// Keeps a WebGL scene smooth on any machine: it watches how long frames take and lowers the drawing resolution while the device
// cannot keep up, then raises it again (up to a cap) once there is room. Call the returned function once per drawn frame.
export function autoQuality(renderer, { max = 1.5, min = .6, start = 1.25 } = {}) {
  const cap = Math.min(window.devicePixelRatio || 1, max);
  let ratio = Math.min(cap, start), avg = 16.7, last = 0, calm = 0, since = 0;
  renderer.setPixelRatio(ratio);
  const set = (value) => { ratio = value; renderer.setPixelRatio(ratio); since = 0; calm = 0; avg = 16.7; };
  return function frame(now = performance.now()) {
    const dt = last ? now - last : 0;
    last = now;
    if (dt > 0 && dt < 100) avg += (dt - avg) * .08;                      // a long gap is a pause, not a slow frame
    if (++since < 30) return;
    if (avg > 23 && ratio > min) set(Math.max(min, ratio * .82));
    else if (avg < 17.6 && ratio < cap) { if (++calm > 120) set(Math.min(cap, ratio * 1.1)); }
    else calm = 0;
  };
}
