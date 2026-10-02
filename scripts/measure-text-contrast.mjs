// Sample rendered backgrounds underneath visible DOM text. Canvas, gradients and opacity are included.
// A sample is not proof of every animated frame, image-based text, or native rendering.
import sharp from 'sharp';
export async function measureTextContrast(page,backgroundPath,includeFades=false){
 const text=await page.evaluate(includeFades=>{
  const result=[],restore=[];
  for(const el of document.body.querySelectorAll('*')){
   if(el.closest('[aria-hidden="true"],[aria-disabled="true"]')||![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))continue;
   const css=getComputedStyle(el);let opacity=1;
   for(let parent=el;parent;parent=parent.parentElement)opacity*=Number(getComputedStyle(parent).opacity);
   const visible=opacity>0.01&&(includeFades||opacity>=.98);
   if(!visible)continue;
   const rects=[];for(const node of el.childNodes)if(node.nodeType===3&&node.textContent.trim()){const range=document.createRange();range.selectNodeContents(node);for(const r of range.getClientRects())if(r.width&&r.height&&r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&(()=>{for(let parent=el.parentElement;parent;parent=parent.parentElement){const style=getComputedStyle(parent),clip=parent.getBoundingClientRect();if(/hidden|scroll|auto/.test(style.overflowY)&&(r.top<clip.top||r.bottom>clip.bottom))return false}return true})())rects.push({x:r.x,y:r.y,width:r.width,height:r.height})}
   if(rects.length)result.push({text:el.textContent.trim().slice(0,90),color:css.color,opacity,size:parseFloat(css.fontSize),weight:parseInt(css.fontWeight)||400,rects});restore.push([el,el.getAttribute('style')]);
  }
  // Hide even partially clipped text: neighboring glyphs are not background.
  // Collect first so inherited foreground colors are measured before mutation.
  for(const [el] of restore){el.style.setProperty('color','transparent','important');el.style.setProperty('text-shadow','none','important');}
  window.__contrastRestore=restore;return result;
 },includeFades);
 let pixels;
 try{pixels=await sharp(await page.screenshot(backgroundPath?{path:backgroundPath}:{})).ensureAlpha().raw().toBuffer({resolveWithObject:true})}finally{await page.evaluate(()=>{for(const [el,style] of window.__contrastRestore)style===null?el.removeAttribute('style'):el.setAttribute('style',style);delete window.__contrastRestore})}
 const luminance=rgb=>rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
 return text.map(item=>{
  const rgba=item.color.match(/[\d.]+/g).map(Number),alpha=item.opacity*(rgba[3]??1);let contrast=Infinity;
  for(const r of item.rects)for(let y=Math.ceil(r.y);y<Math.floor(r.y+r.height);y+=2)for(let x=Math.ceil(r.x);x<Math.floor(r.x+r.width);x+=2){
   const offset=(y*pixels.info.width+x)*4,rgb=[...pixels.data.subarray(offset,offset+3)],bg=luminance(rgb),foreground=luminance(rgb.map((v,i)=>rgba[i]*alpha+v*(1-alpha)));contrast=Math.min(contrast,(Math.max(foreground,bg)+.05)/(Math.min(foreground,bg)+.05));
  }
  return {text:item.text,rects:item.rects,opacity:item.opacity,size:item.size,contrast:Math.round(contrast*100)/100,required:item.size>=24||item.size>=18.66&&item.weight>=700?3:4.5};
 });
}
