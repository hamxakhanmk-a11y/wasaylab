(() => {
  const tabs=[...document.querySelectorAll('[data-product-tab]')];
  const panels=[...document.querySelectorAll('[data-product-panel]')];
  if(!tabs.length)return;
  function select(key,updateUrl=true){
    if(!tabs.some(t=>t.dataset.productTab===key))key='tablets';
    tabs.forEach(t=>{const active=t.dataset.productTab===key;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;});
    panels.forEach(p=>{p.hidden=p.dataset.productPanel!==key;});
    if(updateUrl)history.replaceState(null,'','#'+key);
  }
  tabs.forEach((t,i)=>{
    t.addEventListener('click',()=>select(t.dataset.productTab));
    t.addEventListener('keydown',e=>{
      let next;
      if(e.key==='ArrowRight')next=(i+1)%tabs.length;
      else if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;
      else if(e.key==='Home')next=0;
      else if(e.key==='End')next=tabs.length-1;
      else return;
      e.preventDefault();tabs[next].focus();select(tabs[next].dataset.productTab);
    });
  });
  addEventListener('hashchange',()=>select(location.hash.slice(1),false));
  select(location.hash.slice(1),false);
})();