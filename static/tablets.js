(() => {
  const views=[...document.querySelectorAll('[data-tablet]')];if(!views.length)return;document.documentElement.classList.add('tablet-js');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  // Perspective correction uses measured quadrilaterals, never generated packaging artwork.
  function homography(q){const a=[];for(let i=0;i<4;i++){const [u,v]=[[0,0],[1,0],[1,1],[0,1]][i],x=q[i*2],y=q[i*2+1];a.push([u,v,1,0,0,0,-u*x,-v*x,x],[0,0,0,u,v,1,-u*y,-v*y,y]);}for(let c=0;c<8;c++){let p=c;for(let r=c+1;r<8;r++)if(Math.abs(a[r][c])>Math.abs(a[p][c]))p=r;[a[p],a[c]]=[a[c],a[p]];const d=a[c][c];for(let k=c;k<9;k++)a[c][k]/=d;for(let r=0;r<8;r++)if(r!==c){const f=a[r][c];for(let k=c;k<9;k++)a[r][k]-=f*a[c][k];}}return a.map(r=>r[8]);}
  const images=new Map();function load(src){if(!images.has(src))images.set(src,new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src;}));return images.get(src);}
  async function face(src,q,side){const im=await load(src),input=document.createElement('canvas');input.width=im.naturalWidth;input.height=im.naturalHeight;const ctx=input.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0);const data=ctx.getImageData(0,0,input.width,input.height).data;const out=document.createElement('canvas');out.className=side;const distance=(a,b)=>Math.hypot(q[a*2]-q[b*2],q[a*2+1]-q[b*2+1]);out.width=Math.ceil(Math.max(distance(0,1),distance(3,2)));out.height=Math.ceil(Math.max(distance(0,3),distance(1,2)));{const k=Math.min(1,560/Math.max(out.width,out.height));out.width=Math.ceil(out.width*k);out.height=Math.ceil(out.height*k);}const target=out.getContext('2d'),pixels=target.createImageData(out.width,out.height),h=homography(q);for(let y=0;y<out.height;y++){for(let x=0;x<out.width;x++){const u=(x+.5)/out.width,v=(y+.5)/out.height,den=h[6]*u+h[7]*v+1;const sx=Math.max(0,Math.min(input.width-2,(h[0]*u+h[1]*v+h[2])/den)),sy=Math.max(0,Math.min(input.height-2,(h[3]*u+h[4]*v+h[5])/den));const ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy,si=(iy*input.width+ix)*4,di=(y*out.width+x)*4;for(let c=0;c<4;c++)pixels.data[di+c]=(data[si+c]*(1-fx)+data[si+4+c]*fx)*(1-fy)+(data[si+input.width*4+c]*(1-fx)+data[si+input.width*4+4+c]*fx)*fy;}if(y%32===0)await new Promise(r=>setTimeout(r,0));}target.putImageData(pixels,0,0);return out;}
  const jobs=[];let building=false;const state=new Map();
  function pump(){if(building||!jobs.length)return;const mid=innerHeight/2,dist=j=>{const r=j.el.getBoundingClientRect();return Math.abs(r.top+r.height/2-mid)+(r.right>0&&r.left<innerWidth?0:4000)};jobs.sort((a,b)=>dist(a)-dist(b));const j=jobs.shift();building=true;Promise.resolve(j.run()).finally(()=>{building=false;setTimeout(pump,30)})}
  fetch('/tablets-data.json').then(r=>{if(!r.ok)throw Error('Carton data unavailable');return r.json();}).then(products=>{
    const observer=new IntersectionObserver(entries=>{for(const e of entries){const s=state.get(e.target);if(e.isIntersecting&&!s.started){s.started=true;jobs.push({el:e.target,run:async()=>{try{const p=s.product,canvas=document.createElement('canvas');canvas.width=640;canvas.height=800;canvas.className='carton-canvas';const renderer=Wasay3D(canvas);const w=(p.width||260)/100,h=p.height/100,d=(p.depth||46)/100;
const quads=[
[[[-w/2,h/2,d/2],[w/2,h/2,d/2],[w/2,-h/2,d/2],[-w/2,-h/2,d/2]],[0,0,1]],
[[[-w/2,h/2,-d/2],[-w/2,h/2,d/2],[-w/2,-h/2,d/2],[-w/2,-h/2,-d/2]],[-1,0,0]],
[[[w/2,h/2,d/2],[w/2,h/2,-d/2],[w/2,-h/2,-d/2],[w/2,-h/2,d/2]],[1,0,0]],
[[[-w/2,h/2,-d/2],[w/2,h/2,-d/2],[w/2,h/2,d/2],[-w/2,h/2,d/2]],[0,1,0]]];
for(let i=0;i<4;i++){const photo=p.photos[i===3?1:i],texture=await face(photo,p.faces[i],['front','left','right','top'][i]);renderer.add(Wasay3DQuad(...quads[i]),texture,undefined,.16);}
renderer.add(Wasay3DQuad([[-w/2,-h/2,d/2],[w/2,-h/2,d/2],[w/2,-h/2,-d/2],[-w/2,-h/2,-d/2]],[0,-1,0]),null,[.94,.91,.86]);
s.renderer=renderer;s.scale=Math.min(.54,1.65/(h+d),1.3/(w+d));s.model.replaceChildren(canvas);renderer.draw(0,.14,s.scale);e.target.classList.add('ready');s.ready=true;if(window.WasayFit&&!p.fit)WasayFit(e.target,canvas,8);}catch(error){console.error('Unable to build carton',s.product.name,error);e.target.classList.add('failed');}}});pump();}}},{rootMargin:'700px'});
    const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));let frame=0,last=0;
    const visibleObserver=new IntersectionObserver(entries=>{for(const e of entries){e.target.classList.toggle('visible',e.isIntersecting);state.get(e.target).visible=e.isIntersecting}wake();},{threshold:.1});
    views.forEach((view,i)=>{const product=products.find(p=>p.slug===view.dataset.tablet);if(!product)return;if(product.fit){view.style.setProperty('--trim',product.fit[0]+'px');view.style.setProperty('--drop',product.fit[1]+'px');}view.style.setProperty('--h',product.height+'px');view.style.setProperty('--w',(product.width||260)+'px');view.style.setProperty('--d',(product.depth||46)+'px');view.style.setProperty('--delay',(-i*3)+'s');const s={product,model:view.querySelector('.tablet-model'),angle:0,tilt:-8,currentAngle:0,currentTilt:-8,manual:false,visible:false,ready:false,phase:i*1.7,drag:null,vel:0,rest:0,hover:false};state.set(view,s);const turn=delta=>{s.angle=clamp((s.manual?s.angle:s.currentAngle)+delta,-75,75);s.manual=true;s.rest=performance.now()+2500;wake();};view.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();turn(e.key==='ArrowLeft'?-15:15);}if(e.key==='Home'){s.manual=false;s.angle=0;wake();}});
// a press turns into a drag only once it moves (so a click still opens the product); the pointer is captured from then on
view.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;s.drag={id:e.pointerId,x:e.clientX,a:s.currentAngle,lx:e.clientX,lt:e.timeStamp,v:0,on:false};s.vel=0;});
view.addEventListener('pointermove',e=>{if(s.drag&&e.pointerId===s.drag.id){if(!s.drag.on){if(Math.abs(e.clientX-s.drag.x)<6)return;s.drag.on=true;s.drag.x=e.clientX;s.drag.a=s.currentAngle;s.drag.lx=e.clientX;s.drag.lt=e.timeStamp;try{view.setPointerCapture(e.pointerId)}catch{}view.classList.add('is-dragging');}const step=Math.max(1,e.timeStamp-s.drag.lt);s.drag.v=s.drag.v*.5+((e.clientX-s.drag.lx)*.4/step*1000)*.5;s.drag.lx=e.clientX;s.drag.lt=e.timeStamp;s.manual=true;s.angle=clamp(s.drag.a+(e.clientX-s.drag.x)*.4,-75,75);wake();return;}
if(e.pointerType!=='mouse'||performance.now()<s.rest)return;const r=view.getBoundingClientRect();s.manual=true;s.vel=0;s.angle=clamp((e.clientX-r.left-r.width/2)/r.width*80,-40,40);s.tilt=clamp((e.clientY-r.top-r.height/2)/r.height*12-8,-15,-2);wake();});
const end=e=>{if(!s.drag||(e&&e.pointerId!==s.drag.id))return;if(s.drag.on){s.vel=e.type==='pointercancel'||e.timeStamp-s.drag.lt>90?0:clamp(s.drag.v,-500,500);s.rest=performance.now()+1500;view.classList.remove('is-dragging');}s.drag=null;wake();};
view.addEventListener('pointerup',end);view.addEventListener('pointercancel',end);view.addEventListener('lostpointercapture',end);
view.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')s.hover=true;});view.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'){s.hover=false;s.tilt=-8;s.rest=Math.max(s.rest,performance.now()+400);}wake();});
observer.observe(view);visibleObserver.observe(view);});
    function render(t){frame=0;const dt=last?Math.min(.05,(t-last)/1000):.016;last=t;
      // while a product view is open the cartons rest; look again next frame
      if(document.documentElement.classList.contains('has-detail')){last=0;frame=requestAnimationFrame(render);return;}
      let shown=0,moving=false;const now=performance.now();
      for(const s of state.values()){if(!s.visible||!s.ready)continue;shown++;
        if(!s.drag&&s.vel){s.angle=clamp(s.angle+s.vel*dt,-75,75);s.vel*=Math.exp(-dt*3);if(Math.abs(s.vel)<3)s.vel=0;}
        // once a turn is left alone (no drag, no glide, no hover) the carton goes back to its own slow sway
        if(s.manual&&!s.drag&&!s.vel&&!s.hover&&now>s.rest)s.manual=false;
        const a=s.manual?s.angle:reduced.matches?0:Math.sin(t/2900+s.phase)*28,k=reduced.matches?1:1-Math.exp(-dt*(s.drag?20:7));
        const da=a-s.currentAngle,dl=s.tilt-s.currentTilt;
        if(Math.abs(da)<.01&&Math.abs(dl)<.01&&(reduced.matches||s.manual))continue;
        s.currentAngle+=da*k;s.currentTilt+=dl*k;moving=true;
        s.renderer.draw(s.currentAngle*Math.PI/180,-s.currentTilt*Math.PI/180,s.scale);}
      if(shown&&!document.hidden&&(moving||!reduced.matches))frame=requestAnimationFrame(render);else last=0;}
    function wake(){if(!frame&&!document.hidden)frame=requestAnimationFrame(render);}
    wake();document.addEventListener('visibilitychange',()=>{last=0;wake();});
  }).catch(console.error);

})();
