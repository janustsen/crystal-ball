import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';

function load(file:string,imports:Record<string,unknown>={}){
 const module={exports:{} as any};
 const code=ts.transpileModule(readFileSync(new URL(file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 runInNewContext(code,{module,exports:module.exports,process:{env:{}},require:(name:string)=>{if(name in imports)return imports[name];throw new Error(`Unexpected import: ${name}`)}});
 return module.exports;
}
const track=JSON.parse(readFileSync(new URL('../src/roomTrack.json',import.meta.url),'utf8'));
const room=load('../src/room.ts',{'./roomTrack.json':track});

test('a piece laid out in a box lands exactly on the four corners of its quad in perspective',()=>{
 const quad:[number,number][]=[[12,40],[300,52],[290,180],[20,160]],m=room.quadMatrix(200,100,quad);
 const apply=(x:number,y:number)=>{const w=m[3]*x+m[7]*y+m[15];return [(m[0]*x+m[4]*y+m[12])/w,(m[1]*x+m[5]*y+m[13])/w]};
 for(const [[x,y],[qx,qy]] of [[0,0],[200,0],[200,100],[0,100]].map((p,i)=>[p,quad[i]] as const)){
  const [px,py]=apply(x,y);
  assert.ok(Math.abs(px-qx)<1e-6&&Math.abs(py-qy)<1e-6,`${x},${y} → ${px},${py}`);
 }
 // An axis-aligned quad the size of the box is the identity.
 assert.deepEqual([...room.quadMatrix(50,20,[[0,0],[50,0],[50,20],[0,20]])].map((n:number)=>Math.round(n*1e6)/1e6+0),[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
});

test('the skylight and desk anchors ride every idle frame of their spot, close to the still, and fit the shell',()=>{
 for(const [anchor,spot] of [['skylight','sky'],['desk','ask']]){
  assert.equal(room.anchorSpot(anchor),spot);
  assert.equal(track.anchors[anchor].idle.length,track.clips[`idle-${spot}`].length);
  const still=room.anchorOnScreen(anchor,null,390,844);
  let moved=0;
  for(let f=0;f<track.anchors[anchor].idle.length;f++){
   const q=room.anchorOnScreen(anchor,f,390,844);
   q.forEach(([x,y]:number[],i:number)=>{const d=Math.hypot(x-still[i][0],y-still[i][1]);moved=Math.max(moved,d);assert.ok(d<15,`${anchor} frame ${f} drifts ${d.toFixed(1)}pt`)});
  }
  assert.ok(moved>.5,`${anchor} never moves with the camera`);
  // The room's cover crop at the narrowest supported shell keeps the anchor on screen.
  const box=room.quadBox(room.anchorOnScreen(anchor,null,360,800));
  assert.ok(box.left>=0&&box.left+box.width<=360,`${anchor} ${box.left}..${box.left+box.width}`);
 }
});

test('the desk card takes a short reply and leaves long copy or a narrow card to the panel',()=>{
 const {fitsDesk}=load('../src/DeskReply.tsx',{react:{},'react/jsx-runtime':{jsx:()=>null},'react-native':{},'./ui':{},'./Material':{},'./roomPieces':{}});
 const card=room.quadBox(room.anchorOnScreen('desk',null,390,844));
 assert.ok(fitsDesk('The mist is too thick.','Please try again.',card));
 assert.ok(fitsDesk('The mist is too thick.','The engine could not complete this reading. Nothing was charged.',card));
 assert.ok(!fitsDesk('The mist is too thick.','Layout fixture: the engine could not complete this reading. Nothing was charged. Please try again later.',card));
 assert.ok(!fitsDesk('This one isn’t for the Ball.','Please try again.',{width:120,height:60}));
});

test('the stage shows and hides pieces and tells its host each time',()=>{
 const {createStage}=load('../src/roomPieces.ts',{react:{createContext:()=>({})}});
 const stage=createStage();let calls=0;
 const stop=stage.subscribe(()=>calls++);
 stage.show('desk-reply',{anchor:'desk',node:'card'});
 stage.show('sky-map',{anchor:'skylight',node:'map'});
 assert.deepEqual(Object.keys(stage.pieces),['desk-reply','sky-map']);
 stage.show('desk-reply',null);
 assert.deepEqual(Object.keys(stage.pieces),['sky-map']);
 stop();stage.show('sky-map',null);
 assert.equal(calls,3);
});
