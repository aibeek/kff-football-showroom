import { artwork } from './art.js?v=fast-2';
import { use3D, enableLite, preference } from './performance.js?v=fast-2';

export async function mountRack(products) {
  if (!use3D()) return;
  const rail = document.querySelector('.rail'), rack = document.getElementById('rack');
  const canvas = document.createElement('canvas');
  canvas.id = 'rackCanvas';
  canvas.setAttribute('aria-hidden', 'true');
  rail.append(canvas);
  let gpu;
  try { gpu = await (await import('./rack-webgl.js?v=fast-2')).gpuRack(canvas); }
  catch { canvas.remove(); enableLite(); return; }
  const visible = [], queued = new Set(), queue = [];
  let frame = 0, last = 0, stopped = false, dialog = false, busy = false, slow = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function stop() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    observer?.disconnect();
    gpu.dispose();
    canvas.remove();
    rail.classList.remove('cloth-ready');
    visible.forEach(entry => entry.button.classList.remove('rendered'));
  }
  addEventListener('showroom-quality', stop, {once:true});
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); enableLite(); });
  function wake() {
    if (!stopped && !dialog && !document.hidden && !frame) {
      last = 0;
      frame = requestAnimationFrame(render);
    }
  }
  async function drain() {
    if (busy || stopped || !queue.length) return;
    busy = true;
    const {product, button, index} = queue.shift();
    try {
      await artwork(product);
      if (stopped) return;
      const visual = await gpu.add(product);
      if (stopped) { gpu.dispose(); return; }
      const entry = {button, image:button.querySelector('.shirt-image'), visual, phase:index*1.8, hover:0, target:0, bend:0, velocity:0};
      for (const [event,target] of [['pointerenter',1],['pointerleave',0],['focus',1],['blur',0]])
        button.addEventListener(event, () => {entry.target=target;wake();});
      visible.push(entry);
      button.classList.add('rendered');
      rail.classList.add('cloth-ready');
      wake();
    } catch (error) { console.warn('3D kit unavailable', product.id, error); }
    finally {busy=false;if(!stopped) setTimeout(drain, 30);}
  }
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const item of entries) if (item.isIntersecting && !queued.has(item.target)) {
      const index = products.findIndex(p=>p.id===item.target.dataset.id);
      queued.add(item.target);
      queue.push({product:products[index],button:item.target,index});
      observer.unobserve(item.target);
    }
    drain();wake();
  },{root:rack,rootMargin:'0px 100px'}) : null;
  products.forEach((product,index) => {
    const button=rack.querySelector('[data-id="'+product.id+'"]');
    if(observer) observer.observe(button); else queue.push({product,button,index});
  });
  if(!observer) drain();
  function render(now) {
    frame = 0;
    if (stopped || dialog || document.hidden) return;
    if (last && now-last < 32) {frame=requestAnimationFrame(render);return;}
    const elapsed = last ? now-last : 33;
    const dt=Math.min(elapsed/1000,0.05);last=now;
    // Sustained low frame rate in automatic mode falls back to posters permanently for this visit.
    if(preference==='auto' && !busy && visible.length) {
      slow = elapsed>90 ? slow+1 : Math.max(0,slow-1);
      if(slow>=35) {enableLite();return;}
    }
    const area=rail.getBoundingClientRect(), scale=Math.min(devicePixelRatio||1,1.15);
    const width=Math.round(area.width*scale),height=Math.round(area.height*scale);
    if(canvas.width!==width||canvas.height!==height) {gpu.resize(width,height);}
    gpu.clear();
    let active=false,settling=false;
    if(!document.getElementById('room').classList.contains('balls-only')) for(const entry of visible) {
      if(entry.button.hidden) continue;
      const rect=entry.image.getBoundingClientRect();
      if(rect.right<area.left||rect.left>area.right) continue;
      active=true;
      entry.hover+=(entry.target-entry.hover)*(1-Math.exp(-dt*8));
      entry.velocity+=((entry.target-entry.hover)*30-entry.bend*35-entry.velocity*7)*dt;
      entry.bend+=entry.velocity*dt;
      settling ||= Math.abs(entry.target-entry.hover)>.001 || Math.abs(entry.velocity)>.001;
      const time=now/1000+entry.phase;
      const yaw=reduced.matches ? -.13 : -.58+entry.hover*.68+Math.sin(time*.8)*.065;
      gpu.draw(entry.visual,{x:(rect.left-area.left)*scale,y:(rect.top-area.top)*scale,width:rect.width*scale,height:rect.height*scale},time,yaw,entry.bend,!reduced.matches);
    }
    gpu.finish();
    if(active && (!reduced.matches||settling)) frame=requestAnimationFrame(render);
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else wake();});
  addEventListener('showroom-dialog',event=>{dialog=event.detail;if(dialog){cancelAnimationFrame(frame);frame=0;}else wake();});
  rack.addEventListener('scroll',wake,{passive:true});
  document.getElementById('filters').addEventListener('click',wake);
  new ResizeObserver(wake).observe(rail);
  reduced.addEventListener('change',wake);
}
