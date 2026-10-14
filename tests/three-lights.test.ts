import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {lightBall,threeLights} from '../src/three-lights.ts';

test('unlit glass retains its core and each lit ball renders its halo',async()=>{
 const lights=threeLights({sunSign:'cancer',moonSign:'aries',risingSign:'leo'});
 for(const color of [undefined,...lights.map(light=>light.color)]){
  const {data,info}=await sharp(Buffer.from(lightBall(color))).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const alpha=(x:number,y:number)=>data[(y*info.width+x)*info.channels+3];
  assert.ok(alpha(100,100)>200,`core is filled: ${color??'unlit'}`);
  if(color)assert.ok(alpha(100,20)>0,`halo is visible: ${color}`);
  else assert.equal(alpha(100,20),0);
 }
});
