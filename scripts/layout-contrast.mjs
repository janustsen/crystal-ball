const luminance=rgb=>rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
export function labelContrast(label,samples,lens){
 const pairs=samples.map(({rgb,x,y})=>{
  const r=lens?Math.hypot((x-lens.x-lens.width/2)/(lens.width*.75),(y-lens.y-lens.height*.38)/(lens.height*.6)):0;
  const alpha=lens&&x>=lens.x&&x<=lens.x+lens.width&&y>=lens.y&&y<=lens.y+lens.height ? .3*Math.min(1,Math.max(0,(r-.5)/.5)):0;
  const foreground=luminance(label.rgb.map((c,i)=>(c*(1-alpha)+[3,2,1][i]*alpha)*label.alpha+rgb[i]*(1-label.alpha)));
  const background=luminance(rgb),ratio=(Math.max(foreground,background)+.05)/(Math.min(foreground,background)+.05);
  return {foreground,background,ratio};
 }).sort((a,b)=>a.background-b.background);
 const background=[pairs[0].background,pairs[Math.floor(pairs.length/2)].background,pairs.at(-1).background];
 const worst=[...pairs].sort((a,b)=>a.ratio-b.ratio)[Math.floor(pairs.length*.1)];
 return {...worst,background};
}
