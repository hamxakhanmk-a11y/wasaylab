(() => {
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),states=[];
const load=src=>new Promise((ok,no)=>{const im=new Image();im.onload=()=>ok(im);im.onerror=no;im.src=src;});
// Each photo supplies a photographed angular sector of the cylindrical label.
const sideBounds=[[[588,282,873,710,389],[582,242,862,668,338]],[[568,231,852,674,358],[563,211,816,594,315]],[[670,278,890,658,400],[605,253,810,621,373]],[[614,277,819,658,416],[640,288,830,635,407]],[[622,335,858,774,484],[541,317,760,711,438]],[[622,271,864,710,450],[558,279,753,638,403]],[[652,253,895,679,417],[650,270,829,578,378]],[[626,302,866,741,470],[554,185,833,689,352]],[[670,129,943,600,282],[576,284,787,664,415]]];
function draw(s){
const {ctx,canvas,p,images}=s;ctx.clearRect(0,0,420,560);
const w=p.wide?276:210,h=p.wide?390:400,left=(420-w)/2,top=(560-h)/2-12;
// Actual embossed lid, clipped to the photographed circular cap outline.
const b=p.bounds,[x0,y0,x1,y1,body]=b,capFraction=(body-y0)/(y1-y0),capH=h*capFraction;
ctx.save();ctx.beginPath();ctx.ellipse(210,top+capH*.25,w*.46,capH*.25,0,Math.PI,0);ctx.lineTo(left+w*.96,top+capH*.83);ctx.quadraticCurveTo(210,top+capH*1.08,left+w*.04,top+capH*.83);ctx.closePath();ctx.clip();ctx.drawImage(images[0],x0+(x1-x0)*(p.wide?.07:.025),y0,(x1-x0)*(p.wide?.86:.95),body-y0,left+w*.04,top,w*.92,capH);ctx.restore();
const bh=h-capH,r=w/2;
ctx.save();ctx.beginPath();ctx.moveTo(left+w*.06,top+capH-15);ctx.lineTo(left+w*.94,top+capH-15);ctx.quadraticCurveTo(left+w,top+capH+22,left+w,top+capH+40);ctx.lineTo(left+w,top+h-15);ctx.quadraticCurveTo(210,top+h+15,left,top+h-15);ctx.lineTo(left,top+capH+40);ctx.quadraticCurveTo(left,top+capH+22,left+w*.06,top+capH-15);ctx.closePath();ctx.clip();
for(let col=0;col<w;col++){
const nx=(col+.5-r)/r,theta=Math.asin(nx),world=theta+s.angle;
let sector=world<-1.2?1:world>1.2?2:0;
const camera=[0,-.70,.70][sector],q=sector?sideBounds[s.index][sector-1]:b;
const local=Math.max(-1.45,Math.min(1.45,world-camera));
const sx=(q[0]+q[2])/2+Math.sin(local)*(q[2]-q[0])/2;
const curve=Math.sqrt(1-nx*nx),dy=top+capH-18+8*curve,dh=bh+18-8*curve;
ctx.drawImage(images[sector],sx,q[4],1.6,q[3]-q[4]-5,left+col,dy,1.4,dh);
ctx.fillStyle='rgba(60,45,30,'+(.10*(1-curve))+')';ctx.fillRect(left+col,dy,1.4,dh);
}
ctx.restore();ctx.fillStyle='rgba(60,45,30,.09)';ctx.beginPath();ctx.ellipse(210,top+h+16,w*.43,9,0,0,Math.PI*2);ctx.fill();
canvas.style.transform='translateY('+(reduced.matches?0:Math.sin(s.time/1100+s.index)*5)+'px)';s.view.dataset.angle=s.angle.toFixed(3);
}
fetch('/pastes-data.json').then(r=>r.json()).then(data=>{
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{const s=states.find(s=>s.view===e.target);s.visible=e.isIntersecting;if(s.visible&&!s.started){s.started=true;Promise.all(s.p.photos.map(load)).then(images=>{s.images=images;s.ready=true;s.view.classList.add('ready');draw(s)}).catch(console.error)}}),{rootMargin:'150px'});
document.querySelectorAll('[data-paste]').forEach(view=>{
const index=data.findIndex(p=>p.slug===view.dataset.paste);if(index<0)return;const canvas=view.querySelector('canvas'),s={view,canvas,ctx:canvas.getContext('2d'),p:data[index],index,angle:0,target:0,time:0,manual:false};states.push(s);observer.observe(view);
view.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;const r=view.getBoundingClientRect();s.manual=true;s.target=((e.clientX-r.left)/r.width-.5)*1.1});
view.addEventListener('pointerleave',()=>s.manual=false);
view.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home'].includes(e.key))return;e.preventDefault();s.manual=e.key!=='Home';s.target=e.key==='Home'?0:Math.max(-.55,Math.min(.55,s.target+(e.key==='ArrowLeft'?-.15:.15)))});
});
let frame;function render(t){for(const s of states)if(s.visible&&s.ready){s.time=t;const target=s.manual?s.target:reduced.matches?0:Math.sin(t/3400+s.index)*.38;s.angle+=(target-s.angle)*(reduced.matches?1:.1);draw(s)}frame=requestAnimationFrame(render)}frame=requestAnimationFrame(render);
document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(frame);if(!document.hidden)frame=requestAnimationFrame(render)});
}).catch(console.error);
})();