(() => {
  const story=document.querySelector('[data-botanical-story]');
  if(!story)return;
  const scene=story.querySelector('[data-botanical-scene]');
  const panels=[...story.querySelectorAll('[data-story-panel]')];
  const controls=[...story.querySelectorAll('[data-story-target]')];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const clamp=(n)=>Math.max(0,Math.min(1,n));
  let visible=false, frame=0, progress=0, target=0, last=0, three=null, loading=false;
  let pointer={x:0,y:0};
  const distance=()=>Math.max(1,story.offsetHeight-story.querySelector('.botanical-story__pin').offsetHeight);
  function paint(p){
    const step=p<.32?0:p<.67?1:2;
    scene.dataset.progress=p.toFixed(3);
    story.style.setProperty('--story-progress',p);
    panels.forEach((el,i)=>{
      el.classList.toggle('is-current',i===step);
      if(reduced.matches){el.removeAttribute('aria-hidden');el.inert=false;}
      else {el.setAttribute('aria-hidden',String(i!==step));el.inert=i!==step;}
    });
    controls.forEach((el,i)=>{el.setAttribute('aria-current',i===step?'step':'false');});
    if(three)three.draw(reduced.matches ? .12 : p,reduced.matches?{x:0,y:0}:pointer);
    const drop=scene.querySelector('.botanical-scene__drop');
    const grow=clamp(p/.34),fall=clamp((p-.34)/.44);
    drop.style.transform=`translateY(${fall*fall*90}px) scale(${.25+grow*.75},${.25+grow*.75})`;
    drop.style.opacity=p<.79?'1':'0';
    const ripple=scene.querySelector('.botanical-scene__ripple');
    ripple.style.opacity=p>.78&&p<.98?String(1-(p-.78)/.2):'0';
    ripple.style.transform=`scale(${clamp((p-.78)/.2)})`;
  }
  function tick(time){
    frame=0;
    const dt=last?Math.min(.05,(time-last)/1000):1/60;last=time;
    if(document.hidden||!visible){last=0;return;}
    target=reduced.matches?0:clamp((68-story.getBoundingClientRect().top)/distance());
    progress=reduced.matches?0:progress+(target-progress)*(1-Math.exp(-dt*14));
    if(Math.abs(target-progress)<.0002)progress=target;
    paint(progress);
    if(progress!==target)frame=requestAnimationFrame(tick);else last=0;
  }
  function wake(){if(!frame&&visible&&!document.hidden)frame=requestAnimationFrame(tick);}
  async function load(){
    if(loading||three)return;loading=true;
    try {
      const {createBotanicalScene}=await import('./botanical-three.js');
      three=createBotanicalScene(scene);paint(progress);
    } catch(error){scene.dataset.renderer='fallback';console.warn('Botanical 3D unavailable; using the scroll illustration.',error);}
  }
  story.classList.add('is-scroll-story');
  addEventListener('scroll',wake,{passive:true});
  addEventListener('resize',wake);
  document.addEventListener('visibilitychange',()=>{last=0;wake();});
  reduced.addEventListener('change',()=>{progress=target=0;paint(0);wake();});
  new IntersectionObserver(([entry])=>{
    visible=entry.isIntersecting;
    if(visible){load();last=0;wake();}
  },{rootMargin:'200px'}).observe(story);
  scene.addEventListener('pointermove',(e)=>{
    if(reduced.matches||e.pointerType!=='mouse')return;
    const r=scene.getBoundingClientRect();pointer={x:clamp((e.clientX-r.left)/r.width)*2-1,y:clamp((e.clientY-r.top)/r.height)*2-1};wake();
  });
  scene.addEventListener('pointerleave',()=>{pointer={x:0,y:0};wake();});
  controls.forEach((button,i)=>button.addEventListener('click',()=>{
    const stops=[0,.5,.9];
    scrollTo({top:scrollY+story.getBoundingClientRect().top-68+distance()*stops[i],behavior:reduced.matches?'instant':'smooth'});
  }));
  paint(0);
})();
