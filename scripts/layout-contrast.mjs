const luminance=rgb=>rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
// A label's contrast over sampled background pixels: its colour composited at its own alpha over each sample. The tenth
// worst sample sets the ratio, so a stray bright pixel does not fail a label.
export function labelContrast(label,samples){
 const pairs=samples.map(({rgb})=>{
  const foreground=luminance(label.rgb.map((c,i)=>c*label.alpha+rgb[i]*(1-label.alpha)));
  const background=luminance(rgb),ratio=(Math.max(foreground,background)+.05)/(Math.min(foreground,background)+.05);
  return {foreground,background,ratio};
 }).sort((a,b)=>a.background-b.background);
 const background=[pairs[0].background,pairs[Math.floor(pairs.length/2)].background,pairs.at(-1).background];
 const worst=[...pairs].sort((a,b)=>a.ratio-b.ratio)[Math.floor(pairs.length*.1)];
 return {...worst,background};
}
