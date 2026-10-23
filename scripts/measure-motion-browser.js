() => {
 const result=[],tasks=[],hooks=[],drawFrames=new Set(),glTypes=new Set();let draws=0;
 // Three uses indexed draws and may choose WebGL2; count rendered frames, not calls per pass.
 for(const type of ['WebGLRenderingContext','WebGL2RenderingContext']){
  const p=window[type]?.prototype;if(!p)continue;
  for(const name of ['drawArrays','drawElements']){
   const original=p[name];hooks.push(()=>{p[name]=original});
   p[name]=function(...args){if(this.canvas?.closest?.('.room')){draws++;drawFrames.add(document.timeline.currentTime);glTypes.add(type)}return original.apply(this,args)};
  }
 }
 const observer=new PerformanceObserver(list=>tasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration}))));observer.observe({type:'longtask',buffered:false});
 const click=id=>{const e=document.querySelector(`[data-testid="${id}"]`);if(!e)throw new Error(`Missing ${id}`);e.click()};
 const sample=async(label,id,duration=2200,until=null)=>{
  await new Promise(r=>requestAnimationFrame(r));
  const start=performance.now(),before=draws,beforeFrames=drawFrames.size;let last=start,settled=0,visibleFrames=0;const frames=[];
  const targets=(Array.isArray(until)?until:until?[until]:[]).map(target=>({selector:`[data-testid="${target}"]`,before:document.querySelector(`[data-testid="${target}"]`)}));
  performance.mark(label+'-start');if(id)click(id);
  await new Promise((resolve,reject)=>{function tick(t){frames.push(t-last);last=t;if(document.querySelector('.room canvas')?.style.visibility==='visible')visibleFrames++;
   if(targets.some(target=>{const node=document.querySelector(target.selector);return node&&node!==target.before}))settled||=t;
   if(t-start>65000)return reject(new Error('Timed out '+label));
   if(until?settled&&t-settled>1800:t-start>=duration)resolve();else requestAnimationFrame(tick);
  }requestAnimationFrame(tick)});
  performance.mark(label+'-end');const ms=last-start,sorted=[...frames].sort((a,b)=>a-b);
  result.push({label,ms,frames:frames.length,fps:frames.length*1000/ms,draws:draws-before,drawFps:(drawFrames.size-beforeFrames)*1000/ms,glTypes:[...glTypes],visibleFrames,glassVisibleThroughout:visibleFrames===frames.length,p95:sorted[Math.floor(sorted.length*.95)],max:Math.max(...frames),over25:frames.filter(x=>x>25).length,longTasks:tasks.filter(x=>x.start>=start&&x.start<=last)});
  return result.at(-1);
 };
 window.motionAudit={sample,result,finish:()=>{observer.disconnect();hooks.forEach(restore=>restore());return result}};
 return 'ready';
}
