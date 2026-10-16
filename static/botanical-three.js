import * as T from './vendor/three/three.module.min.js';

// One local, demand-rendered scene. Nothing advances unless the story progress or pointer changes. It is drawn on an off-screen
// canvas and copied into the 2D canvas of whichever story page asks, so every page can show the scene at its own moment.
export function createBotanicalScene({ onChange = () => {} } = {}) {
  const canvas = document.createElement('canvas');
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const scene = new T.Scene();
  scene.background = new T.Color('#f0f0e6');
  const camera = new T.PerspectiveCamera(42, 1, .1, 40);
  let seed = 71;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  function texture(width, height, paint) {
    const c = document.createElement('canvas'); c.width = width; c.height = height;
    paint(c.getContext('2d'), c);
    return new T.CanvasTexture(c);
  }
  // A softly lit studio environment provides real reflections and refraction in the glass.
  const environment = texture(1024, 512, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#d9dfc8'); g.addColorStop(.45, '#f5f3df'); g.addColorStop(1, '#beb39d');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 512);
    ctx.fillStyle = '#fffdf5'; ctx.fillRect(100, 105, 150, 270); ctx.fillRect(675, 165, 45, 230);
    ctx.fillStyle = '#717967'; ctx.fillRect(370, 160, 75, 270);
    ctx.fillStyle = '#eee4bc'; ctx.fillRect(870, 85, 95, 210);
  });
  environment.colorSpace = T.SRGBColorSpace; environment.mapping = T.EquirectangularReflectionMapping;
  const pmrem = new T.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(environment);
  scene.environment = env.texture;
  environment.dispose(); pmrem.dispose();
  scene.add(new T.HemisphereLight('#fffce7', '#747458', 2));
  const key = new T.DirectionalLight('#fff8df', 3.6); key.position.set(-3, 5, 4); scene.add(key);
  const edge = new T.DirectionalLight('#eef5dc', 2.4); edge.position.set(3, 2, -2); scene.add(edge);

  const bottle = new T.Group(); scene.add(bottle);
  const glass = new T.MeshPhysicalMaterial({ color: '#bb793b', metalness: 0, roughness: .1,
    transmission: .97, thickness: .4, ior: 1.5, attenuationColor: new T.Color('#975017'),
    attenuationDistance: .45, envMapIntensity: 1.4, clearcoat: 1, clearcoatRoughness: .05 });
  const profile = [[0,-2],[.67,-2],[.78,-1.98],[.84,-1.89],[.85,-1.74],[.85,-.56],
    [.83,-.41],[.76,-.28],[.59,-.15],[.45,-.04],[.40,.07],[.40,.31],[.43,.35],
    [.43,.4],[.40,.43],[.33,.43],[.32,.38],[.32,.1],[.37,-.08],[.54,-.23],
    [.70,-.38],[.76,-.55],[.76,-1.75],[.69,-1.87],[0,-1.87]];
  const body = new T.Mesh(new T.LatheGeometry(profile.map(([x,y]) => new T.Vector2(x,y)), 96), glass);
  bottle.add(body);
  // Paper label with the real logo (the logo already carries the name Wasay Laboratories), wrapped round the front of the body.
  const labelMap = texture(1536, 512, (ctx, c) => {
    ctx.fillStyle = '#f6f1e3'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = '#0b5c33'; ctx.lineWidth = 5; ctx.strokeRect(764 - 330, 26, 660, 460);
    ctx.fillStyle = '#a3cf3c'; ctx.fillRect(764 - 330, 26, 660, 7);
  });
  labelMap.colorSpace = T.SRGBColorSpace; labelMap.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const logo = new Image();
  logo.onload = () => {
    const ctx = labelMap.image.getContext('2d'), height = 400, width = height * logo.naturalWidth / logo.naturalHeight;
    ctx.drawImage(logo, 768 - width / 2, 56, width, height);
    labelMap.needsUpdate = true; onChange();
  };
  logo.src = '/logo.png';
  const arc = Math.PI * 1.1;
  const label = new T.Mesh(new T.CylinderGeometry(.858, .858, .95, 72, 1, true, -arc / 2, arc),
    new T.MeshStandardMaterial({ map: labelMap, roughness: .62, metalness: 0, envMapIntensity: .55 }));
  label.position.y = -1.16; bottle.add(label);
  for (const y of [.12,.23,.34]) {
    const thread = new T.Mesh(new T.TorusGeometry(.405,.018,10,80), glass);
    thread.rotation.x = Math.PI / 2; thread.position.y = y; bottle.add(thread);
  }
  const liquid = new T.MeshPhysicalMaterial({ color: '#b98930', roughness: .08, transmission: .85,
    thickness: .7, ior: 1.46, attenuationColor: new T.Color('#bd8c35'), attenuationDistance: 1.5 });
  const fill = [[0,-1.85],[.66,-1.85],[.74,-1.72],[.74,-.67],[0,-.67]];
  bottle.add(new T.Mesh(new T.LatheGeometry(fill.map(([x,y]) => new T.Vector2(x,y)), 64), liquid));
  const water = new T.MeshPhysicalMaterial({ color: '#f5ffed', roughness: .015, transmission: 1,
    thickness: .24, ior: 1.333, envMapIntensity: 2.1, clearcoat: 1 });
  const dropPoints = [[0,.22],[.025,.14],[.08,.065],[.125,-.015],[.12,-.085],[.075,-.14],[0,-.16]];
  // The droplet is the medicine, not clear water. While it grows on the leaf it takes on a mixture of colours, green to gold to amber (the
  // amber of the liquid in the bottle it will fall into): the base colour moves along that range and a marbled texture of the three
  // colours slides through the drop, so two neighbouring colours always swirl together.
  const GREEN = new T.Color('#79b83a'), GOLD = new T.Color('#e8b628'), AMBER = new T.Color('#d4800f');
  const mix = (c, out) => { const k = clamp(c); return k < .5 ? out.copy(GREEN).lerp(GOLD, smooth01(k / .5)) : out.copy(GOLD).lerp(AMBER, smooth01((k - .5) / .5)); };
  const smooth01 = (n) => { n = clamp(n); return n * n * (3 - 2 * n); };
  const swirl = texture(128, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 256, 0, 0);
    g.addColorStop(0, '#79b83a'); g.addColorStop(.5, '#e8b628'); g.addColorStop(1, '#d4800f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 46; i++) {
      const y = random() * 256, cs = ['#79b83a', '#e8b628', '#d4800f', '#f6d86a'][Math.floor(random() * 4)];
      const r = ctx.createRadialGradient(random() * 128, y, 2, random() * 128, y, 26 + random() * 40);
      r.addColorStop(0, cs + 'cc'); r.addColorStop(1, cs + '00'); ctx.fillStyle = r; ctx.fillRect(0, 0, 128, 256);
    }
  });
  swirl.colorSpace = T.SRGBColorSpace; swirl.repeat.set(1, .5);
  const medicine = new T.MeshPhysicalMaterial({ color: '#e9a41f', roughness: .04, transmission: .35, thickness: .5, ior: 1.45,
    attenuationColor: new T.Color('#c4720a'), attenuationDistance: .22, clearcoat: 1, clearcoatRoughness: .03,
    emissive: new T.Color('#ffffff'), emissiveMap: swirl, emissiveIntensity: .7, envMapIntensity: 1.8 });
  const tmpColor = new T.Color();
  const drop = new T.Mesh(new T.LatheGeometry(dropPoints.map(([x,y]) => new T.Vector2(x,y)),48), medicine);
  scene.add(drop);
  const rippleMaterial = new T.MeshBasicMaterial({ color: '#f4c04e', transparent: true, opacity: 0, depthWrite: false });
  const ripple = new T.Mesh(new T.TorusGeometry(.27,.008,8,64), rippleMaterial);
  ripple.rotation.x = Math.PI / 2; ripple.position.y = .29; scene.add(ripple);

  // Veins, pores and asymmetric serrations belong to an actual curved mesh, not a flat leaf icon.
  const leafMap = texture(1024, 512, (ctx,c) => {
    const pixels = ctx.createImageData(c.width,c.height);
    for (let y=0;y<c.height;y++) for(let x=0;x<c.width;x++) {
      const i=(y*c.width+x)*4, edge=Math.abs(y/c.height-.5)*2;
      const light=12*Math.sin(x/c.width*3)+8*(1-edge), grain=(random()-.5)*18;
      pixels.data[i]=40+light+grain; pixels.data[i+1]=91+light+grain; pixels.data[i+2]=27+light*.6+grain*.4; pixels.data[i+3]=255;
    }
    ctx.putImageData(pixels,0,0); ctx.lineCap='round';
    ctx.strokeStyle='rgba(173,191,98,.72)'; ctx.lineWidth=4;
    ctx.beginPath();ctx.moveTo(0,256);ctx.bezierCurveTo(300,250,700,261,1024,256);ctx.stroke();
    for(let x=100;x<1000;x+=82) for(const sign of [-1,1]) {
      ctx.lineWidth=2; ctx.strokeStyle='rgba(159,181,86,.56)';
      ctx.beginPath();ctx.moveTo(x,256);ctx.bezierCurveTo(x-10,256+sign*80,x-85,256+sign*170,x-120,256+sign*255);ctx.stroke();
      for(let j=1;j<5;j++) {
        const a=x-j*19,b=256+sign*j*46;
        ctx.lineWidth=.7;ctx.strokeStyle='rgba(135,161,72,.35)';
        ctx.beginPath();ctx.moveTo(a,b);ctx.quadraticCurveTo(a+30,b+sign*15,a+48,b+sign*38);ctx.stroke();
      }
    }
  });
  leafMap.colorSpace=T.SRGBColorSpace; leafMap.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  const leaf = new T.Group(); leaf.position.set(0,1.45,.04); scene.add(leaf);
  const vertices=[],uvs=[],indices=[],U=80,V=30;
  function point(u,v) {
    const width=.68*Math.pow(Math.sin(Math.PI*u),.8)*(1+.025*Math.sin(u*135));
    return new T.Vector3(-1.8*(1-u)+v*width*.67,1.65*(1-u)+v*width*.74,
      .2*Math.sin(u*Math.PI)+.14*v*v*Math.sin(Math.PI*u)+.06*Math.sin(u*7)*(1-u));
  }
  for(let u=0;u<=U;u++)for(let v=0;v<=V;v++) {
    const p=point(u/U,v/V*2-1); vertices.push(p.x,p.y,p.z);uvs.push(u/U,v/V);
  }
  for(let u=0;u<U;u++)for(let v=0;v<V;v++) {
    const a=u*(V+1)+v,b=a+V+1;indices.push(a,b,a+1,b,b+1,a+1);
  }
  const leafGeometry=new T.BufferGeometry();
  leafGeometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  leafGeometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));leafGeometry.setIndex(indices);leafGeometry.computeVertexNormals();
  const leafMaterial=new T.MeshPhysicalMaterial({ map:leafMap,bumpMap:leafMap,bumpScale:.025,
    roughness:.46,clearcoat:.35,clearcoatRoughness:.3,side:T.DoubleSide });
  leaf.add(new T.Mesh(leafGeometry,leafMaterial));
  for(const [u,v,r] of [[.3,.22,.055],[.51,-.25,.038],[.73,.16,.027]]) {
    const bead=new T.Mesh(new T.SphereGeometry(r,20,16),water);bead.position.copy(point(u,v));bead.position.z+=r*.8;bead.scale.z=.65;leaf.add(bead);
  }
  const stemCurve=new T.CatmullRomCurve3([new T.Vector3(-2.05,1.92,.03),new T.Vector3(-1.8,1.65,0),new T.Vector3(-1.6,1.45,.04)]);
  leaf.add(new T.Mesh(new T.TubeGeometry(stemCurve,16,.025,8,false),new T.MeshStandardMaterial({color:'#6d823a',roughness:.7})));
  const shadowMap=texture(128,128,(ctx)=>{
    const g=ctx.createRadialGradient(64,64,5,64,64,63);g.addColorStop(0,'rgba(74,56,25,.3)');g.addColorStop(.4,'rgba(74,56,25,.15)');g.addColorStop(1,'rgba(74,56,25,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
  });
  const shadow=new T.Mesh(new T.PlaneGeometry(3.1,2.2),new T.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;shadow.position.y=-2.015;scene.add(shadow);
  const floor=new T.Mesh(new T.PlaneGeometry(50,50),new T.MeshStandardMaterial({color:'#f0efe4',roughness:.9}));
  floor.rotation.x=-Math.PI/2;floor.position.y=-2.025;scene.add(floor);
  let width=0,height=0;
  const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
  function draw(host, progress, pointer={x:0,y:0}) {
    const w=host.clientWidth,h=host.clientHeight;
    if(!w||!h)return;
    if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
    // the story: the drop grows and mixes colour through the three Who we are texts (0 to .62), falls into the bottle (.64 to .86), lands
    const p=clamp(progress),grow=clamp(p/.62),fall=clamp((p-.64)/.22),impact=clamp((p-.86)/.12);
    const size=.55+grow*1.55;
    drop.visible=p<.875;drop.scale.set(size*(1-.18*Math.sin(fall*Math.PI)),size*(1+.35*Math.sin(fall*Math.PI)),size);
    drop.position.set(0,1.45-.22*size-fall*fall*.99,.04);
    mix(grow,tmpColor);medicine.color.copy(tmpColor);medicine.attenuationColor.copy(tmpColor).multiplyScalar(.7);swirl.offset.y=grow*.5;
    leaf.rotation.z=Math.sin(p*Math.PI)*.018;leaf.rotation.y=-.08+p*.12;
    ripple.visible=p>=.86&&p<.995;ripple.scale.setScalar(.1+impact*.9);rippleMaterial.opacity=(1-impact)*.65;
    mix(1,rippleMaterial.color);
    const orbit=p*.13;
    camera.position.set(.65+orbit+pointer.x*.16,.9+pointer.y*.08,8.1-(Math.sin(p*Math.PI)*.2));
    camera.lookAt(-.45,.57,0);
    renderer.render(scene,camera);
    const out=host.querySelector('canvas');
    if(out.width!==canvas.width||out.height!==canvas.height){out.width=canvas.width;out.height=canvas.height;}
    out.getContext('2d').drawImage(canvas,0,0);
    host.dataset.renderProgress=p.toFixed(3);
    host.classList.add('is-three-ready');
  }
  return { draw, canvas };
}
