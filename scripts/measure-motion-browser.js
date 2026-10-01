() => {
 const result=[],tasks=[];let draws=0;
 const p=WebGLRenderingContext.prototype,original=p.drawArrays;
 p.drawArrays=function(...a){draws++;return original.apply(this,a)};
 const observer=new PerformanceObserver(list=>tasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration}))));observer.observe({type:'longtask',buffered:false});
 const click=id=>{const e=document.querySelector(`[data-testid="${id}"]`);if(!e)throw new Error(`Missing ${id}`);e.click()};
 const sample=async(label,id,duration=2200,until=null)=>{
  await new Promise(r=>requestAnimationFrame(r));
  const start=performance.now(),before=draws;let last=start,settled=0;const frames=[];
  performance.mark(label+'-start');if(id)click(id);
  await new Promise((resolve,reject)=>{function tick(t){frames.push(t-last);last=t;
   if(until&&document.querySelector(`[data-testid="${until}"]`))settled||=t;
   if(t-start>65000)return reject(new Error('Timed out '+label));
   if(until?settled&&t-settled>1800:t-start>=duration)resolve();else requestAnimationFrame(tick);
  }requestAnimationFrame(tick)});
  performance.mark(label+'-end');const ms=last-start,sorted=[...frames].sort((a,b)=>a-b);
  result.push({label,ms,frames:frames.length,fps:frames.length*1000/ms,shaderFps:(draws-before)*1000/ms,p95:sorted[Math.floor(sorted.length*.95)],max:Math.max(...frames),over25:frames.filter(x=>x>25).length,longTasks:tasks.filter(x=>x.start>=start&&x.start<=last)});
  return result.at(-1);
 };
 window.motionAudit={sample,result,finish:()=>{observer.disconnect();p.drawArrays=original;return result}};
 return 'ready';
}
