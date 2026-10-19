import * as T from './vendor/three/three.module.min.js';

// Two children who run up the hill and leap into the sky, part of the home banner's loop (hero-grow-three.js). They are built here
// from simple rounded shapes in an anime manner: flat, banded (toon) shading, a dark outline round every part, big heads and big
// dark eyes with a white catch-light. The motion is a proper run cycle (thighs, knees, arms, a bounce and a forward lean, all in
// step) up the slope from the low meadow, a crouch near the top, a leap with the arms flung up and a knee tucked, then they rise
// away and fade into the sky in a few sparkles. Then the hill's loop starts again and so do they.
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = (n) => { n = clamp(n); return n * n * (3 - 2 * n); };

// a three-band toon ramp: shadow, mid, light
function toonRamp() {
  const t = new T.DataTexture(new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]), 3, 1, T.RGBAFormat);
  t.minFilter = t.magFilter = T.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
}

export function createKids(scene, { land, cycle }) {
  const ramp = toonRamp();
  const star = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 30); g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(.25, 'rgba(255,250,215,.9)'); g.addColorStop(1, 'rgba(255,250,215,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#fffef4'; ctx.beginPath(); ctx.moveTo(32, 2); ctx.lineTo(36, 28); ctx.lineTo(62, 32); ctx.lineTo(36, 36); ctx.lineTo(32, 62); ctx.lineTo(28, 36); ctx.lineTo(2, 32); ctx.lineTo(28, 28); ctx.closePath(); ctx.fill();
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
  })();

  function makeKid({ skin, hair, top, bottom, shoes, girl }) {
    const mats = [];
    const toon = (color) => { const m = new T.MeshToonMaterial({ color, gradientMap: ramp, transparent: true }); mats.push(m); return m; };
    const line = new T.MeshBasicMaterial({ color: '#16220f', side: T.BackSide, transparent: true }); mats.push(line);
    // a part with its outline: the same shape a touch larger, drawn from the inside in dark green-black
    const part = (geometry, material, size, outline = .007) => {
      const g = new T.Group();
      g.add(new T.Mesh(geometry, material));
      const o = new T.Mesh(geometry, line); o.scale.setScalar(1 + outline / size); g.add(o);
      return g;
    };
    const capsule = (r, len) => new T.CapsuleGeometry(r, len, 4, 12);
    const M = { skin: toon(skin), hair: toon(hair), top: toon(top), bottom: toon(bottom), shoes: toon(shoes), eye: toon('#1d1712'), white: new T.MeshBasicMaterial({ color: '#ffffff', transparent: true }) };
    mats.push(M.white);

    const kid = new T.Group();                 // stands at the feet, faces +x
    const body = new T.Group(); kid.add(body); // bounces
    const hips = new T.Group(); hips.position.y = .27; body.add(hips);

    const legs = [-1, 1].map((side) => {
      const hip = new T.Group(); hip.position.z = side * .036; hips.add(hip);
      const thigh = part(capsule(.029, .085), girl ? M.skin : M.bottom, .029); thigh.position.y = -.064; hip.add(thigh);
      const knee = new T.Group(); knee.position.y = -.132; hip.add(knee);
      const shin = part(capsule(.024, .08), M.skin, .024); shin.position.y = -.058; knee.add(shin);
      const shoe = part(new T.SphereGeometry(.031, 14, 10), M.shoes, .031); shoe.scale.set(1.55, .72, 1); shoe.position.set(.02, -.122, 0); knee.add(shoe);
      return { hip, knee };
    });
    if (girl) {
      // a short skirt flaring from the waist
      const cloth = toon(bottom); cloth.side = T.DoubleSide;
      const skirt = new T.Mesh(new T.CylinderGeometry(.05, .088, .085, 18, 1, true), cloth);
      skirt.position.y = -.02; hips.add(skirt);
    } else {
      const shorts = part(capsule(.056, .03), M.bottom, .056); shorts.position.y = .005; hips.add(shorts);
    }

    const torso = new T.Group(); hips.add(torso);
    const chest = part(capsule(.054, .085), M.top, .054); chest.position.y = .085; chest.scale.set(.9, 1, 1.05); torso.add(chest);
    const neck = part(capsule(.018, .02), M.skin, .018); neck.position.y = .17; torso.add(neck);
    const head = new T.Group(); head.position.y = .255; torso.add(head);
    const skull = part(new T.SphereGeometry(.088, 24, 18), M.skin, .088); skull.scale.set(.96, 1.02, .94); head.add(skull);
    // big anime eyes, a dark oval with a white catch-light, and a small open smile
    const blush = toon('#f08f86');
    for (const z of [-.034, .034]) {
      const eye = new T.Mesh(new T.SphereGeometry(.021, 14, 12), M.eye); eye.scale.set(.42, 1.5, .95); eye.position.set(.079, -.002, z); head.add(eye);
      const glint = new T.Mesh(new T.SphereGeometry(.0068, 8, 6), M.white); glint.position.set(.088, .012, z + .005); head.add(glint);
      const cheek = new T.Mesh(new T.SphereGeometry(.013, 10, 8), blush); cheek.scale.set(.3, .55, 1); cheek.position.set(.079, -.03, z * 1.45); head.add(cheek);
    }
    const mouth = new T.Mesh(new T.SphereGeometry(.011, 10, 8), toon('#8a2f25')); mouth.scale.set(.4, .7, 1.3); mouth.position.set(.083, -.038, 0); head.add(mouth);
    // hair: a cap over the top and back of the head, a spiky fringe, and for the girl a ponytail that swings as she runs
    const cap = part(new T.SphereGeometry(.096, 24, 16, 0, Math.PI * 2, 0, Math.PI * .56), M.hair, .096);
    cap.rotation.z = .72; cap.position.set(-.008, .008, 0); head.add(cap);
    for (const [y, z, tilt] of [[.072, -.042, .32], [.08, -.012, .16], [.08, .02, .18], [.07, .048, .34]]) {
      const tuft = part(new T.ConeGeometry(.022, .055, 8), M.hair, .026); tuft.position.set(.052, y, z); tuft.rotation.set(tilt * Math.sign(z || 1), 0, -2.35); head.add(tuft);
    }
    let tail = null;
    if (girl) {
      tail = new T.Group(); tail.position.set(-.08, .05, 0); head.add(tail);
      const tie = part(new T.SphereGeometry(.02, 10, 8), toon('#a3cf3c'), .02); tail.add(tie);
      const lock = part(new T.CapsuleGeometry(.03, .1, 4, 10), M.hair, .03); lock.position.set(-.02, -.07, 0); lock.rotation.z = -.35; tail.add(lock);
    }

    const arms = [-1, 1].map((side) => {
      const shoulder = new T.Group(); shoulder.position.set(0, .14, side * .067); torso.add(shoulder);
      const upper = part(capsule(.02, .065), M.top, .02); upper.position.y = -.045; shoulder.add(upper);
      const elbow = new T.Group(); elbow.position.y = -.095; shoulder.add(elbow);
      const fore = part(capsule(.018, .06), M.skin, .018); fore.position.y = -.042; elbow.add(fore);
      const hand = part(new T.SphereGeometry(.022, 10, 8), M.skin, .022); hand.position.y = -.09; elbow.add(hand);
      return { shoulder, elbow };
    });

    // a few sparkles left behind as they vanish into the sky
    const sparkGeo = new T.BufferGeometry(); sparkGeo.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(14 * 3), 3));
    const sparkMat = new T.PointsMaterial({ map: star, size: .09, transparent: true, depthWrite: false, opacity: 0, color: '#fffbe6' });
    const sparks = new T.Points(sparkGeo, sparkMat); sparks.frustumCulled = false; scene.add(sparks);
    const sparkDirs = Array.from({ length: 14 }, (_, i) => { const a = i / 14 * Math.PI * 2 + Math.random() * .4; return [Math.cos(a), Math.sin(a) * .8 + .3, (Math.random() - .5) * .6]; });

    kid.scale.setScalar(1.15);
    kid.visible = false; scene.add(kid);
    return { kid, body, hips, torso, head, legs, arms, tail, mats, sparks, sparkMat, sparkDirs, launch: new T.Vector3() };
  }

  // the route up the slope, in the hill's own coordinates (x across, z towards the viewer; the land sits 2 forward in the scene)
  const route = new T.CatmullRomCurve3([new T.Vector3(-1.5, 0, 2.5), new T.Vector3(.4, 0, 1.85), new T.Vector3(1.75, 0, 1.15), new T.Vector3(2.5, 0, .7)]);
  const LEN = route.getLength();
  const kids = [
    { ...makeKid({ skin: '#d9a17a', hair: '#1c1410', top: '#f6f1e3', bottom: '#2f6b3a', shoes: '#f2f2ea', girl: false }), start: 1.1, run: 4.3, side: 0 },
    { ...makeKid({ skin: '#e2ae88', hair: '#2a1a12', top: '#b9dc6a', bottom: '#f6f1e3', shoes: '#0b5c33', girl: true }), start: 1.45, run: 4.25, side: .34 },
  ];
  const CROUCH = .16, FLY = 1.55;
  const end = route.getPointAt(1), before = route.getPointAt(.99);
  for (const k of kids) {
    k.launch.set(end.x, land(end.x, end.z + k.side) + .07, end.z + k.side + 2);
    k.facing = Math.atan2(-(end.z - before.z), end.x - before.x) - .95;
  }
  const at = new T.Vector3(), ahead = new T.Vector3();
  const ground = (x, z) => land(x, z) + .07;   // feet just down in the turf

  function pose(k, phase, lean, crouch) {
    // the run cycle: the legs swing opposite, the knee folds as the leg comes through, the arms swing against the legs
    k.legs.forEach(({ hip, knee }, i) => {
      const p = phase + i * Math.PI;
      hip.rotation.z = Math.sin(p) * .82 - crouch * .5;
      knee.rotation.z = -(.25 + 1.15 * Math.max(0, Math.cos(p)) + crouch * 1.1);
    });
    k.arms.forEach(({ shoulder, elbow }, i) => {
      const p = phase + i * Math.PI;
      shoulder.rotation.z = -Math.sin(p) * .85 - crouch * .6;
      elbow.rotation.z = 1.25 + .25 * Math.sin(p);
    });
    k.torso.rotation.z = -lean;
    k.head.rotation.z = lean * .55;
    k.body.position.y = Math.abs(Math.cos(phase)) * .028 - crouch * .07;
    if (k.tail) k.tail.rotation.z = .25 + Math.sin(phase * 2) * .22;
  }
  function leapPose(k, f) {
    // arms flung up, one knee tucked forward, the other leg trailing
    const [front, back] = k.legs;
    front.hip.rotation.z = .95; front.knee.rotation.z = -1.5;
    back.hip.rotation.z = -.55 - .2 * f; back.knee.rotation.z = -.45;
    k.arms.forEach(({ shoulder, elbow }, i) => { shoulder.rotation.z = 2.55 + (i ? .25 : -.1); elbow.rotation.z = .35; });
    k.torso.rotation.z = .1 - .15 * f; k.head.rotation.z = -.2;
    k.body.position.y = 0;
    if (k.tail) k.tail.rotation.z = -.6;
  }
  function fade(k, o) { for (const m of k.mats) m.opacity = o; }

  function update(seconds, { hidden = false } = {}) {
    const t = seconds % cycle;
    for (const k of kids) {
      const local = t - k.start;
      const flyAt = k.run + CROUCH;
      if (hidden || local < 0 || local > flyAt + FLY) { k.kid.visible = false; k.sparks.visible = false; continue; }
      k.kid.visible = true;
      let o = 1;
      if (local <= k.run) {
        // running: a gentle start, then a steady pace up the route
        const s = clamp(local / k.run), u = s * s * (1.6 - .6 * s);
        route.getPointAt(clamp(u), at); route.getPointAt(clamp(u + .01), ahead);
        at.z += k.side; ahead.z += k.side;
        k.kid.position.set(at.x, ground(at.x, at.z), at.z + 2);
        // face along the route, turned a little towards the viewer so their faces show
        k.kid.rotation.set(0, Math.atan2(-(ahead.z - at.z), ahead.x - at.x) - .95, 0);
        const travelled = u * LEN;
        pose(k, travelled / .5 * Math.PI * 2, .26 + .08 * s, 0);
        k.sparks.visible = false;
      } else if (local <= flyAt) {
        // a quick crouch before the leap, at the take-off point
        const c = Math.sin((local - k.run) / CROUCH * Math.PI);
        k.kid.position.copy(k.launch); k.kid.rotation.set(0, k.facing, 0);
        pose(k, 0, .32, c);
      } else {
        // the leap: up and away behind the seedling, rising faster as they go, until they fade into the sky
        const f = (local - flyAt) / FLY;
        k.kid.position.set(k.launch.x - f * .15, k.launch.y + f * 2.1 + f * f * 1.6, k.launch.z - f * 1.2);
        k.kid.rotation.set(0, k.facing, -.15 * f);
        leapPose(k, f);
        o = 1 - smooth((f - .32) / .38);
        // sparkles burst where they vanish
        const sf = clamp((f - .42) / .5);
        k.sparks.visible = sf > 0;
        if (sf > 0) {
          const pos = k.sparks.geometry.attributes.position;
          k.sparkDirs.forEach((d, i) => pos.setXYZ(i, k.kid.position.x + d[0] * sf * .45, k.kid.position.y + .35 + d[1] * sf * .45, k.kid.position.z + d[2] * sf * .3));
          pos.needsUpdate = true;
          k.sparkMat.opacity = Math.sin(sf * Math.PI) * .95;
        }
      }
      fade(k, o);
    }
  }
  return { update };
}
