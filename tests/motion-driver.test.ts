import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

test('motion audit counts room draw frames across both GL APIs, ignores other canvases, and restores hooks',async()=>{
 class GL1 {canvas={closest:()=>true};drawArrays(){return 'arrays'}drawElements(){return 'elements'}}
 class GL2 {canvas={closest:()=>true};drawArrays(){return 'arrays'}drawElements(){return 'elements'}}
 const originals=[GL1.prototype.drawArrays,GL1.prototype.drawElements,GL2.prototype.drawArrays,GL2.prototype.drawElements];
 const room=[new GL1(),new GL2()],other=new GL2();other.canvas.closest=()=>false;
 let time=0;
 const document={timeline:{currentTime:0},querySelector:()=>({style:{visibility:'visible'}})};
 const window:any={WebGLRenderingContext:GL1,WebGL2RenderingContext:GL2};
 const context={window,document,performance:{now:()=>time,mark:()=>{}},PerformanceObserver:class {observe(){}disconnect(){}},
  requestAnimationFrame:(callback:(time:number)=>void)=>queueMicrotask(()=>{
   time+=16;document.timeline.currentTime=time;
   for(const gl of room){gl.drawArrays();gl.drawElements();gl.drawArrays();gl.drawElements()}
   other.drawElements();callback(time);
  })};
 runInNewContext(`(${readFileSync(new URL('../scripts/measure-motion-browser.js',import.meta.url),'utf8')})()`,context);
 const sample=await window.motionAudit.sample('room',null,32);
 assert.equal(sample.frames,2);assert.equal(sample.draws,16);assert.equal(sample.drawFps,62.5);
 assert.deepEqual(Array.from(sample.glTypes),['WebGLRenderingContext','WebGL2RenderingContext']);
 assert.equal(sample.glassVisibleThroughout,true);
 window.motionAudit.finish();
 assert.deepEqual([GL1.prototype.drawArrays,GL1.prototype.drawElements,GL2.prototype.drawArrays,GL2.prototype.drawElements],originals);
 assert.equal(room[0].drawElements(),'elements');
});
