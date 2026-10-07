import test from 'node:test';
import assert from 'node:assert/strict';
import {labelContrast} from '../scripts/layout-contrast.mjs';

const luminance=(rgb:number[])=>rgb.reduce((n,c,i)=>{const v=c/255;return n+(v<=.04045?v/12.92:((v+.055)/1.055)**2.4)*[.2126,.7152,.0722][i]},0);
const ratio=(a:number[],b:number[])=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
const blend=(top:number[],bottom:number[],alpha:number)=>top.map((c,i)=>c*alpha+bottom[i]*(1-alpha));
const lens={x:20,y:10,width:390,height:844};

test('foreground and background share the vignette for opaque and translucent labels',()=>{
 for(const opacity of [1,.6])for(const text of [[226,196,138],[42,25,12]])for(const [x,y,fade] of [[21,853,.3],[215,10+844*.38+844*.6*.75,.15]]){
  const background=[90,70,40],postBackground=blend([3,2,1],background,fade);
  const expected=blend([3,2,1],blend(text,background,opacity),fade);
  const result=labelContrast({rgb:text,alpha:opacity},[{rgb:postBackground,x,y}],lens);
  assert.ok(Math.abs(result.ratio-ratio(expected,postBackground))<1e-12);
  assert.ok(Math.abs(result.foreground-luminance(expected))<1e-12);
 }
 const label={rgb:[180,180,180],alpha:1},background=[65,65,65],postBackground=blend([3,2,1],background,.3);
 const result=labelContrast(label,[{rgb:postBackground,x:21,y:853}],lens);
 assert.ok(ratio(label.rgb,postBackground)>4.5);
 assert.ok(result.ratio<4.5);
});

test('samples retain their own alpha blend and position and report a sorted median',()=>{
 const label={rgb:[220,210,200],alpha:.5};
 const samples=[180,20,240,50,100].map((v,i)=>({rgb:[v,v,v],x:21+i*40,y:853}));
 const result=labelContrast(label,samples,lens);
 assert.ok(Math.abs(result.background[1]-luminance([100,100,100]))<1e-12);
 const expected=samples.map(s=>ratio(blend(blend([3,2,1],label.rgb,.3),s.rgb,.5),s.rgb));
 assert.ok(Math.abs(result.ratio-Math.min(...expected))<1e-12);
 assert.deepEqual(labelContrast(label,[...samples].reverse(),lens),result);
});

test('labels at the clear lens centre and outside the lens keep their original compositing',()=>{
 const label={rgb:[220,200,180],alpha:.65},background=[40,30,20];
 for(const [x,y,layer] of [[215,10+844*.38,lens],[0,0,lens],[21,853,null]]){
  const result=labelContrast(label,[{rgb:background,x,y}],layer);
  assert.ok(Math.abs(result.ratio-ratio(blend(label.rgb,background,.65),background))<1e-12);
 }
});
