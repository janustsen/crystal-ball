import test from 'node:test';
import assert from 'node:assert/strict';
import {labelContrast} from '../scripts/layout-contrast.mjs';

const luminance=(rgb:number[])=>rgb.reduce((n,c,i)=>{const v=c/255;return n+(v<=.04045?v/12.92:((v+.055)/1.055)**2.4)*[.2126,.7152,.0722][i]},0);
const ratio=(a:number[],b:number[])=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
const blend=(top:number[],bottom:number[],alpha:number)=>top.map((c,i)=>c*alpha+bottom[i]*(1-alpha));

test('samples retain their own alpha blend and report a sorted median',()=>{
 const label={rgb:[220,210,200],alpha:.5};
 const samples=[180,20,240,50,100].map((v,i)=>({rgb:[v,v,v],x:21+i*40,y:853}));
 const result=labelContrast(label,samples);
 assert.ok(Math.abs(result.background[1]-luminance([100,100,100]))<1e-12);
 const expected=samples.map(s=>ratio(blend(label.rgb,s.rgb,.5),s.rgb));
 assert.ok(Math.abs(result.ratio-Math.min(...expected))<1e-12);
 assert.deepEqual(labelContrast(label,[...samples].reverse()),result);
});

test('opaque and translucent labels composite over the pixels behind them',()=>{
 for(const alpha of [1,.65]){
  const label={rgb:[220,200,180],alpha},background=[40,30,20];
  const result=labelContrast(label,[{rgb:background,x:0,y:0}]);
  assert.ok(Math.abs(result.ratio-ratio(blend(label.rgb,background,alpha),background))<1e-12);
 }
});
