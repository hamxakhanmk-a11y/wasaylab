import * as T from './vendor/three/three.module.min.js';

// Photographic relief: a generated botanical cutout on a gently curved mesh.
// Camera travel is intentionally shallow: the asset has no photographed reverse face.
// The droplet and its reflections are real-time 3D; the bottle is a photographic cutout.
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = n => { n = clamp(n); return n * n * (3 - 2 * n); };
const lerp = (a, b, t) => a + (b - a) * t;
const CAM = [
  {t:0, x:0, y:2.5, z:27, lx:0, ly:2.5, r:0},
  {t:.14, x:.5, y:2.8, z:26, lx:.5, ly:2.8, r:0},
  {t:.30, x:2.5, y:6.5, z:20, lx:1.8, ly:5.7, r:-3},
  {t:.39, x:3, y:6.2, z:19, lx:2.1, ly:5.5, r:-3},
  {t:.53, x:-1, y:3.2, z:25, lx:-.5, ly:3.2, r:3},
  {t:.62, x:-.5, y:2, z:24, lx:0, ly:2, r:2},
  {t:.78, x:-1.8, y:-1.5, z:23, lx:-1.8, ly:-1.5, r:0},
  {t:.88, x:-2.8, y:-3.1, z:21, lx:-2.8, ly:-3.1, r:0},
  {t:1, x:-2.8, y:-3, z:22, lx:-2.8, ly:-3, r:0}
];
function cameraAt(p) {
  let i=0;
  while(i<CAM.length-2 && p>CAM[i+1].t) i++;
  const a=CAM[i],b=CAM[i+1],u=smooth((p-a.t)/(b.t-a.t)), c={};
  for(const k of ['x','y','z','lx','ly','r']) c[k]=lerp(a[k],b[k],u);
  return c;
}
export async function createStoryScene(canvas, {onChange=()=>{}}={}) {
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1;
  renderer.setClearColor(0xffffff,0);
  const scene=new T.Scene(); scene.background=new T.Color('#faf8f4'); const camera=new T.PerspectiveCamera(36,1,.1,100);
  const texture=(w,h,paint)=>{const c=document.createElement('canvas'); c.width=w;c.height=h;paint(c.getContext('2d'),c);return new T.CanvasTexture(c);};
  const env=texture(1024,512,ctx=>{
    const g=ctx.createLinearGradient(0,0,0,512);
    g.addColorStop(0,'#fbfaf5');g.addColorStop(.48,'#e6e3d9');g.addColorStop(1,'#8f897c');
    ctx.fillStyle=g;ctx.fillRect(0,0,1024,512);
    ctx.fillStyle='#ffffff';ctx.fillRect(130,80,170,270);ctx.fillRect(700,110,70,250);
    ctx.fillStyle='#4d5044';ctx.fillRect(450,170,70,230);
  });
  env.colorSpace=T.SRGBColorSpace;env.mapping=T.EquirectangularReflectionMapping;
  const pmrem=new T.PMREMGenerator(renderer), environment=pmrem.fromEquirectangular(env);
  scene.environment=environment.texture;env.dispose();pmrem.dispose();
  scene.add(new T.HemisphereLight('#fffdf6','#847d6b',2));
  const key=new T.DirectionalLight('#fff9ed',3);key.position.set(-4,8,6);scene.add(key);
  const rim=new T.DirectionalLight('#ffffff',2);rim.position.set(5,3,-4);scene.add(rim);
  const trunkG=new T.Group();scene.add(trunkG);
  let map;
  try { map=await new T.TextureLoader().loadAsync('/images/botanical/trunk.png'); }
  catch(error) { renderer.dispose();environment.dispose();throw error; }
  map.colorSpace=T.SRGBColorSpace;map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const geo=new T.PlaneGeometry(28,28*map.image.height/map.image.width,80,40);
  const vertices=geo.attributes.position;
  for(let i=0;i<vertices.count;i++) { const x=vertices.getX(i),y=vertices.getY(i);vertices.setZ(i,.5*Math.sin(x*.22)+.14*Math.cos(y*.7)); }
  geo.computeVertexNormals();
  const trunk=new T.Mesh(geo,new T.MeshBasicMaterial({map,transparent:true,alphaTest:.035,side:T.DoubleSide,toneMapped:false}));
  trunk.position.y=5.4;trunkG.add(trunk);
  // Attachment is the pointed spur at 54.5% x / 74% y of the source cutout.
  const dripLocal=new T.Vector3(1.26,.92,.19);
  // A photographic bottle keeps the final shot consistent with the bark's material detail.
  // This is a conceptual brand vessel, not a photograph of a marketed Wasay product.
  const BX=2, BS=1.35, BY=-3.7;
  const rig=new T.Group();rig.position.set(BX,BY,0);rig.scale.setScalar(BS);scene.add(rig);
  const bottleMap=await new T.TextureLoader().loadAsync('/images/botanical/bottle.png');
  bottleMap.colorSpace=T.SRGBColorSpace;
  const bottle=new T.Mesh(new T.PlaneGeometry(3.8,3.8),new T.MeshBasicMaterial({map:bottleMap,transparent:true,alphaTest:.02,toneMapped:false}));
  bottle.position.y=-.8;rig.add(bottle);
  const logoMap=await new T.TextureLoader().loadAsync('/logo.png');logoMap.colorSpace=T.SRGBColorSpace;
  const label=new T.Mesh(new T.PlaneGeometry(.86,.86*logoMap.image.height/logoMap.image.width),new T.MeshBasicMaterial({map:logoMap,transparent:true,toneMapped:false}));
  label.position.set(0,-1.22,.035);rig.add(label);
  const baseY=BY-2.58*BS, mouthY=BY+.99*BS;
  const shadowMap=texture(128,64,ctx=>{const g=ctx.createRadialGradient(64,32,1,64,32,60);g.addColorStop(0,'rgba(62,47,25,.22)');g.addColorStop(1,'rgba(62,47,25,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,64);});
  const contact=new T.Mesh(new T.PlaneGeometry(4,.5),new T.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false}));
  contact.position.set(BX,baseY,-.05);scene.add(contact);
  const medicine=new T.MeshPhysicalMaterial({color:'#c89a46',roughness:.06,transmission:.96,thickness:.45,ior:1.34,attenuationColor:new T.Color('#a67930'),attenuationDistance:1.4,envMapIntensity:1.4,clearcoat:1});
  const dropPoints=[[0,.25],[.025,.15],[.08,.065],[.14,-.015],[.145,-.09],[.10,-.17],[0,-.2]];
  const drop=new T.Mesh(new T.LatheGeometry(dropPoints.map(([x,y])=>new T.Vector2(x,y)),64),medicine);scene.add(drop);
  const rippleMat=new T.MeshBasicMaterial({color:'#b58c45',transparent:true,opacity:0,depthWrite:false});
  const ripple=new T.Mesh(new T.TorusGeometry(.28*BS,.008,8,64),rippleMat);ripple.rotation.x=-Math.PI/2;scene.add(ripple);
  const dripWorld=new T.Vector3(), leaf=new T.Color('#8a9a56'), amber=new T.Color('#c79845');
  let width=0,height=0;
  function draw(progress,pointer={x:0,y:0}) {
    const w=canvas.clientWidth,h=canvas.clientHeight;
    if(!w||!h) return;
    if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
    const p=clamp(progress), c=cameraAt(p), portrait=camera.aspect<1;
    trunk.scale.x=Math.max(1,camera.aspect/1.40);
    trunkG.rotation.set(0,.035*Math.sin(p*5),.045*Math.sin(p*5));
    const macro=smooth((p-.14)/.13)*(1-smooth((p-.40)/.12));
    trunkG.position.set(-.35*Math.sin(p*4)+macro*4.5, 3.4*(1-macro)*(1-smooth((p-.64)/.18)), 0);
    if(portrait) trunkG.position.y+=.8*(1-macro)*(1-smooth((p-.64)/.18));
    trunkG.updateMatrixWorld(true);
    const reveal=smooth((p-.61)/.09);
    rig.visible=contact.visible=reveal>0;
    bottle.material.opacity=label.material.opacity=contact.material.opacity=reveal;
    // Phones retain a generous image area above their copy, without sideways overflow.
    if(portrait){c.x=1+macro*3;c.lx=1+macro*3;c.ly+=p>.7?-2:1.5*(1-macro)+macro;c.y=c.ly;c.z*=1.18+macro*.12;}
    camera.position.set(c.x+pointer.x*.10,c.y-pointer.y*.06,c.z);
    camera.up.set(Math.sin(c.r*Math.PI/180),Math.cos(c.r*Math.PI/180),0);camera.lookAt(c.lx,c.ly,0);
    const grow=smooth(p/.6), fall=clamp((p-.63)/.19), distance=fall*fall, size=.65+grow*1.35;
    dripWorld.copy(dripLocal);dripWorld.x*=trunk.scale.x;trunkG.localToWorld(dripWorld);
    drop.visible=p<.825;
    drop.scale.set(size*(1-.12*Math.sin(fall*Math.PI)),size*(1+.5*Math.sin(fall*Math.PI)),size);
    drop.position.set(lerp(dripWorld.x,BX,smooth(fall)),lerp(dripWorld.y-.25*size,mouthY-.12,distance),lerp(dripWorld.z,0,fall)+.02);
    medicine.color.copy(leaf).lerp(amber,grow);
    const impact=clamp((p-.82)/.11);
    ripple.visible=p>=.82&&p<.94;ripple.position.set(BX,mouthY-.08,0);ripple.scale.setScalar(.15+impact*.9);rippleMat.opacity=(1-impact)*.45;
    // Rendering is demand-driven by the scroll controller.
    renderer.render(scene,camera);
    canvas.parentElement.classList.add('is-three-ready');
  }
  return {draw,canvas};
}
