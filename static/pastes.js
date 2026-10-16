(() => {
document.documentElement.classList.add('paste-js');const reduced=matchMedia('(prefers-reduced-motion: reduce)'),states=[],clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),SWING=.82,TILT=.16,PHOTO_TILT=.12,silhouette=(h,t)=>h*Math.cos(t)+2*Math.sin(t);
const load=src=>new Promise((ok,no)=>{const im=new Image();im.onload=()=>ok(im);im.onerror=no;im.src=src;});
function pixels(image){const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);return {data:ctx.getImageData(0,0,c.width,c.height).data,w:c.width,h:c.height};}
function sample(im,x,y,k){x=Math.max(0,Math.min(im.w-2,x));y=Math.max(0,Math.min(im.h-2,y));const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,p=(iy*im.w+ix)*4;return (im.data[p+k]*(1-fx)+im.data[p+4+k]*fx)*(1-fy)+(im.data[p+im.w*4+k]*(1-fx)+im.data[p+im.w*4+4+k]*fx)*fy;}
async function label(s){
const out=document.createElement('canvas');out.width=1024;out.height=640;const ctx=out.getContext('2d'),target=ctx.createImageData(out.width,out.height),photos=s.images.map(pixels),bounds=[s.p.bounds,...s.p.side],cam=s.p.cam,camera=cam?[0,-cam[0],cam[1]]:[0,-.70,.70];
for(let y=0;y<out.height;y++){for(let x=0;x<out.width;x++){
const theta=(x/out.width-.5)*Math.PI*2,side=theta<0?1:2,blend=Math.max(0,Math.min(1,(Math.abs(theta)-(cam?cam[side-1]/2+.1:.95))/.35)),v=y/(out.height-1),offset=(y*out.width+x)*4;
for(let k=0;k<3;k++){
let value=0;for(const sector of [0,side]){const w8=sector===0?1-blend:blend;if(w8===0)continue;const q=bounds[sector],local=Math.max(-1.49,Math.min(1.49,theta-camera[sector])),sx=(q[0]+q[2])/2+Math.sin(local)*(q[2]-q[0])*.485;
// Remove the photographed base from the label: it is a continuous molded mesh below.
const m=s.p.measured.label,front=s.p.bounds,factor=(q[3]-q[1])/(front[3]-front[1]);
const labelStart=sector===0?m[0]:q[1]+(m[0]-front[1])*factor,bottom=sector===0?m[1]:q[1]+(m[1]-front[1])*factor;
// Invert the photographed camera elevation before wrapping onto the 3D cylinder.
const curvature=1-Math.cos(local),topCurve=m[2]*factor,bottomCurve=m[3]*factor;
const sy=(labelStart-topCurve*curvature)*(1-v)+(bottom-bottomCurve*curvature)*v;
value+=sample(photos[sector],sx,sy,k)*w8;
}target.data[offset+k]=value;}target.data[offset+3]=255;
}if(y%64===0)await new Promise(r=>setTimeout(r,0));}
ctx.putImageData(target,0,0);return out;
}
function lathe(profile,H,uvRange=null,ribbed=false){const out=[],N=128;for(let j=0;j<profile.length-1;j++){
const [ra,ya]=profile[j],[rb,yb]=profile[j+1],length=Math.hypot(yb-ya,rb-ra)||1,nr=(yb-ya)/length,ny=(ra-rb)/length;
for(let i=0;i<N;i++){const vertex=(ring,k)=>{const [r,y]=profile[ring],a=k/N*Math.PI*2-Math.PI,rr=r+(ribbed?.007*Math.cos(a*80):0);const uv=uvRange?[(a/Math.PI/2)+.5,1-(y-uvRange[0])/(uvRange[1]-uvRange[0])]:[0,0];return [rr*Math.sin(a),y-H/2,rr*Math.cos(a),nr*Math.sin(a),ny,nr*Math.cos(a),...uv]};for(const [ring,k] of [[j,i],[j+1,i],[j+1,i+1],[j,i],[j+1,i+1],[j,i+1]])out.push(...vertex(ring,k));}}
return out;}
function disc(radius,y,H){const out=[];for(let i=0;i<128;i++){const vertex=a=>[radius*Math.sin(a),y-H/2,radius*Math.cos(a),0,1,0,.5+Math.sin(a)/2,.5-Math.cos(a)/2];out.push(0,y-H/2,0,0,1,0,.5,.5,...vertex(i/128*Math.PI*2),...vertex((i+1)/128*Math.PI*2));}return out;}

// Showcase motion: a wide, eased sweep that hands over to the pointer, a finger or the keyboard, keeps gliding after a
// flick, then picks the sweep up again from wherever the jar was left. A little roll and sideways drift sell the turn.
function showcase(s){const v=s.view;s.vel=0;s.hold=0;s.drag=null;s.hover=false;s.phase=(s.index*1.7)%(Math.PI*2);s.goal=reduced.matches?0:Math.sin(s.phase)*SWING;s.angle=s.goal;s.wasManual=false;v.classList.add('paste-showcase');
v.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')s.hover=true});
v.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'){s.hover=false;s.hold=performance.now()+700}});
v.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;s.drag={x:e.clientX,a:s.goal,lx:e.clientX,lt:e.timeStamp,v:0};s.vel=0;v.setPointerCapture(e.pointerId);v.classList.add('is-dragging')});
v.addEventListener('pointermove',e=>{if(s.drag){const dt=Math.max(1,e.timeStamp-s.drag.lt);s.drag.v=s.drag.v*.6+((e.clientX-s.drag.lx)*.011/dt)*.4;s.drag.lx=e.clientX;s.drag.lt=e.timeStamp;s.goal=clamp(s.drag.a+(e.clientX-s.drag.x)*.011,-SWING*1.08,SWING*1.08);s.hold=performance.now()+2400}else if(e.pointerType==='mouse'){const r=v.getBoundingClientRect();s.goal=clamp(((e.clientX-r.left)/r.width-.5)*2.1,-SWING,SWING);s.hold=performance.now()+700}});
const end=()=>{if(s.drag){s.vel=s.drag.v*140;s.hold=performance.now()+2400}s.drag=null;v.classList.remove('is-dragging')};
v.addEventListener('pointerup',end);v.addEventListener('pointercancel',end);
v.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home'].includes(e.key))return;e.preventDefault();s.goal=e.key==='Home'?0:clamp(s.goal+(e.key==='ArrowLeft'?-.22:.22),-SWING,SWING);s.hold=performance.now()+2600});}
function stepShowcase(s,t){const dt=s.last?Math.min(48,t-s.last):16;s.last=t;const manual=!!s.drag||s.hover||performance.now()<s.hold;
if(manual){s.wasManual=true;if(!s.drag&&Math.abs(s.vel)>.0004){s.goal=clamp(s.goal+s.vel*dt/16,-SWING,SWING);s.vel*=Math.exp(-dt/320)}}
else if(!reduced.matches){if(s.wasManual){const g=clamp(s.goal/SWING,-1,1);s.phase=s.goal>=0?Math.PI-Math.asin(g):Math.asin(g);s.wasManual=false}s.phase+=dt/15000*Math.PI*2;s.goal=Math.sin(s.phase)*SWING}
{const k=reduced.matches?1:1-Math.exp(-dt/(s.drag?55:150)),cap=reduced.matches?1e9:(s.drag?9:3.4)*dt/1000;s.angle+=clamp((s.goal-s.angle)*k,-cap,cap)}
const a=s.angle,calm=reduced.matches?0:1,lift=TILT+calm*.02*Math.sin(t/2300+s.index);
s.renderer.draw(a,lift,s.scale);
s.canvas.style.transform='translate3d('+(Math.sin(a)*7)+'px,'+(calm*Math.sin(t/1300+s.index)*5)+'px,0) rotate('+(Math.sin(a)*1.1)+'deg)';
s.view.style.setProperty('--turn',Math.sin(a).toFixed(3));s.view.style.setProperty('--turn-abs',Math.abs(Math.sin(a)).toFixed(3));s.view.dataset.angle=a.toFixed(3);}
const tick=()=>new Promise(r=>setTimeout(r,0)),queue=[];let building=false;
function pump(){if(building||!queue.length)return;const mid=innerHeight/2,dist=q=>{const r=q.view.getBoundingClientRect();return Math.abs(r.top+r.height/2-mid)};queue.sort((a,b)=>dist(a)-dist(b));const s=queue.shift();building=true;build(s).catch(error=>{console.error('Unable to build jar',s.p.name,error);s.view.classList.add('failed')}).finally(()=>{building=false;setTimeout(pump,30)})}
async function build(s){s.images=await Promise.all(s.p.photos.map(load));s.topImage=s.p.top?await load(s.p.top.photo):null;const gloss=s.p.animation==='showcase';const renderer=Wasay3D(s.canvas),p=s.p,nominal=p.wide?2.95:3.85,bb=p.bounds,H=Math.max(2.3,(2*(bb[3]-bb[1])/(bb[2]-bb[0])-2*Math.sin(PHOTO_TILT))/Math.cos(PHOTO_TILT)),base=(p.wide?.12:.24)*H/nominal,labelTop=H*(1-(bb[4]-bb[1])/(bb[3]-bb[1])),neckTop=H*(1-(p.wide?Math.min(.16,Math.max(.11,(p.measured.cap[5]+6-bb[1])/(bb[3]-bb[1]))):Math.min(.27,Math.max(.15,(p.measured.cap[5]-bb[1])/(bb[3]-bb[1])))));
const photo=pixels(s.images[0]),b=p.bounds;const plastic=[0,1,2].map(k=>sample(photo,(b[0]+b[2])/2,b[3]-12,k)/255);
// Closed bottom, rounded heel, cylindrical label, shoulder and neck all share ring vertices.
renderer.add(lathe(p.wide?[[0,.02],[.88,.02],[.945,.034],[.984,.07],[1,base]]:[[0,.025],[.83,.025],[.92,.04],[.975,.10],[1,base]],H),null,plastic,1,gloss?(p.wide?.08:.2):0);
renderer.add(lathe([[1,base],[1,labelTop]],H,[base,labelTop]),await label(s),[.89,.92,.91],1,gloss?(p.wide?.07:.14):0);
renderer.add(lathe(p.wide?[[1,labelTop],[1,labelTop+.035],[.975,labelTop+.12],[.935,neckTop-.30],[.89,neckTop-.17],[.86,neckTop-.13],[.872,neckTop-.115],[.89,neckTop-.095],[.892,neckTop-.045],[.878,neckTop-.01],[.84,neckTop+.012],[.84,neckTop+.035]]:[[1,labelTop],[1,labelTop+.04],[.96,labelTop+.14],[.88,neckTop-.04],[.88,neckTop+.035]],H),null,[.94,.955,.94],1,gloss?(p.wide?.1:.22):0);
const capMesh=vertices=>{if(p.wide)for(let i=0;i<vertices.length;i+=8){vertices[i]*=.92;vertices[i+2]*=.92;}return vertices;};
const capColor=p.wide?[.98,.78,.025]:[.85,.90,.89],c=s.p.measured.cap;
const capBand=document.createElement('canvas');capBand.width=1024;capBand.height=192;const bc=capBand.getContext('2d'),band=bc.createImageData(1024,192);
for(let y=0;y<192;y++){if(y%24===0)await tick();for(let x=0;x<1024;x++){
const theta=(x/1024-.5)*Math.PI*2,local=Math.max(-1.4,Math.min(1.4,theta)),v=y/191,curve=1-Math.cos(local);
const sx=c[0]+Math.sin(local)*c[2]*.97,sy=(c[4]-c[3]*curve)*(1-v)+(c[5]-c[3]*.6*curve)*v;
for(let k=0;k<3;k++)band.data[(y*1024+x)*4+k]=sample(photo,sx,sy,k);band.data[(y*1024+x)*4+3]=255;
}}
bc.putImageData(band,0,0);
// Yellow lids have smooth walls; the smaller white caps carry vertical grip ribs.
renderer.add(capMesh(lathe([[.88,neckTop-.025],[.92,neckTop-.025],[.945,neckTop+.02],[.945,H-.065],[.925,H-.035]],H,[neckTop-.025,H-.035],!p.wide)),capBand,capColor,.35,gloss?.32:0);
// Rectify the lid ellipse to a circular top. Never copy its embossed top into the side wall.
const cap=document.createElement('canvas');cap.width=512;cap.height=512;const cx=cap.getContext('2d'),topPixels=cx.createImageData(512,512),topSrc=s.topImage?pixels(s.topImage):photo,e=s.topImage?s.p.top.ellipse:[c[0],c[1],c[2],c[3]];
for(let y=0;y<512;y++){if(y%48===0)await tick();for(let x=0;x<512;x++){const u=(x+.5)/256-1,v=(y+.5)/256-1;for(let k=0;k<3;k++)topPixels.data[(y*512+x)*4+k]=sample(topSrc,e[0]+u*e[2]*(s.topImage?.935:.985),e[1]+v*e[3]*(s.topImage?.9:.97),k);topPixels.data[(y*512+x)*4+3]=255;}}
cx.putImageData(topPixels,0,0);
// Rounded outer lip, recessed central plane and concentric molded rings.
renderer.add(capMesh(lathe([[.925,H-.035],[.916,H-.009],[.893,H],[.869,H-.008],[.852,H-.025]],H)),null,capColor,.35,gloss?.3:0);
for(const radius of (p.wide?[.80,.73]:[.84]))renderer.add(capMesh(lathe([[radius+.014,H-.024],[radius,H-.014],[radius-.014,H-.024]],H)),null,capColor,.3,gloss?.28:0);
const relief=[];const vertex=(radius,angle)=>{
const x=radius*Math.sin(angle),z=radius*Math.cos(angle),u=.5+x/(2*.852),v=.5-z/(2*.852),ix=Math.max(0,Math.min(511,Math.floor(u*511))),iy=Math.max(0,Math.min(511,Math.floor(v*511))),offset=(iy*512+ix)*4;
const luminance=(topPixels.data[offset]+topPixels.data[offset+1]+topPixels.data[offset+2])/765;
const height=H-.025+Math.max(0,luminance-.58)*.022;
return [x,height-H/2,z,0,1,0,u,v];};
for(let j=0;j<40;j++)for(let i=0;i<128;i++){const ra=.852*j/40,rb=.852*(j+1)/40,aa=i/128*Math.PI*2,ab=(i+1)/128*Math.PI*2;for(const [rr,angle] of [[ra,aa],[rb,aa],[rb,ab],[ra,aa],[rb,ab],[ra,ab]])relief.push(...vertex(rr,angle));}
renderer.add(capMesh(relief),cap,capColor,.25,gloss?.3:0);
s.renderer=renderer;s.scale=(p.wide?.51:.405)*silhouette(nominal,.22)/silhouette(H,TILT);s.ready=true;renderer.draw(0,TILT,s.scale);s.view.classList.add('ready');if(window.WasayFit&&!s.p.fit)WasayFit(s.view,s.canvas,14);
}
fetch('/pastes-data.json').then(r=>{if(!r.ok)throw Error('Jar data unavailable');return r.json()}).then(data=>{
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{const s=states.find(s=>s.view===e.target);s.visible=e.isIntersecting}),{rootMargin:'150px'});
const loader=new IntersectionObserver(entries=>entries.forEach(e=>{const s=states.find(s=>s.view===e.target);if(e.isIntersecting&&!s.started){s.started=true;queue.push(s);pump()}}),{rootMargin:'700px'});
document.querySelectorAll('[data-paste]').forEach(view=>{const index=data.findIndex(p=>p.slug===view.dataset.paste);if(index<0)return;const canvas=view.querySelector('canvas');canvas.width=640;canvas.height=850;const s={view,canvas,p:data[index],index,angle:0,target:0,manual:false,showcase:data[index].animation==='showcase'};if(s.p.fit){view.style.setProperty('--trim',s.p.fit[0]+'px');view.style.setProperty('--drop',s.p.fit[1]+'px');}states.push(s);observer.observe(view);loader.observe(view);if(s.showcase)showcase(s);
view.addEventListener('pointermove',e=>{if(s.showcase||e.pointerType!=='mouse')return;const r=view.getBoundingClientRect();s.manual=true;s.target=((e.clientX-r.left)/r.width-.5)*1.1});view.addEventListener('pointerleave',()=>{if(!s.showcase)s.manual=false});
view.addEventListener('keydown',e=>{if(s.showcase||!['ArrowLeft','ArrowRight','Home'].includes(e.key))return;e.preventDefault();s.manual=e.key!=='Home';s.target=e.key==='Home'?0:Math.max(-.55,Math.min(.55,s.target+(e.key==='ArrowLeft'?-.15:.15)))});
});
let frame;function render(t){if(!document.documentElement.classList.contains('has-detail'))for(const s of states)if(s.visible&&s.ready){if(s.showcase){stepShowcase(s,t);continue}const target=s.manual?s.target:reduced.matches?0:Math.sin(t/3400+s.index)*.22;s.angle+=(target-s.angle)*(reduced.matches?1:.1);s.renderer.draw(s.angle,TILT,s.scale);s.canvas.style.transform='translateY('+(reduced.matches?0:Math.sin(t/1100+s.index)*5)+'px)';s.view.dataset.angle=s.angle.toFixed(3);}frame=requestAnimationFrame(render)}frame=requestAnimationFrame(render);document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(frame);if(!document.hidden)frame=requestAnimationFrame(render)});
}).catch(console.error);
})();