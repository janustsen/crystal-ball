import test from 'node:test';
import assert from 'node:assert/strict';
import {drawStoryBody,drawStoryHeadlines} from '../src/story-layout.ts';

function draw(headlines:string[],width=.5){
 const lines:{text:string;y:number;font:number}[]=[];
 const ctx={font:'',measureText(text:string){return {width:text.length*parseFloat(this.font)*width} as TextMetrics},fillText(text:string,x:number,y:number){assert.equal(x,540);lines.push({text,y,font:parseFloat(this.font)})}};
 const bottom=drawStoryHeadlines(ctx,headlines,'Georgia');
 return {lines,bottom};
}

test('three wrapped golden headlines leave room for the count and uncertainty label',()=>{
 const headlines=Array(3).fill('You will finish your first draft within 6 months.');
 const {lines,bottom}=draw(headlines);
 assert.ok(lines.length>=6);
 assert.ok(lines[0].font<82);
 assert.equal(bottom,lines.at(-1)!.y);
 assert.ok(bottom<=1270);
 assert.ok(bottom+lines.at(-1)!.font*.25<1370-42);
 assert.equal(lines.map(line=>line.text).join('').replace(/\s/g,''),headlines.join('').replace(/\s/g,''));
});

test('one to three headlines fit with different measured widths and word lengths',()=>{
 for(const count of [1,2,3])for(const width of [.4,.6,.8])for(const headline of ['A new door opens.','You will finish your first draft within 6 months.','W'.repeat(110)]){
  const headlines=Array(count).fill(headline),{lines,bottom}=draw(headlines,width);
  assert.equal(bottom,lines.at(-1)!.y);
  assert.ok(bottom<=1270);
  assert.ok(lines.every(line=>line.text.length*line.font*width<=820));
  assert.equal(lines.map(line=>line.text).join('').replace(/\s/g,''),headlines.join('').replace(/\s/g,''));
  for(let i=1;i<lines.length;i++)assert.ok(lines[i].y-lines[i-1].y>=lines[i].font*1.25);
 }
});

test('a short forecast retains its original size and position',()=>{
 assert.deepEqual(draw(['A new door opens.']),{lines:[{text:'A new door opens.',y:1080,font:82}],bottom:1080});
});

test('a portrait body keeps every word and ends above the wordmark, even under a long title',()=>{
 for(const title of ['The Group Spark','The Quiet Cartographer Of Every Crowded Room'])for(const width of [.45,.6]){
  const lines:{text:string;y:number}[]=[];
  const ctx={font:'',measureText(text:string){return {width:text.length*parseFloat(this.font)*width} as TextMetrics},fillText(text:string,_x:number,y:number){lines.push({text,y})}};
  const body='You are the vibrant spark who thrives in crowds, energized by shared moments, quick to start, bright in spirit, and always ready to leap into new places with friends and strangers alike.';
  const end=drawStoryBody(ctx,body,drawStoryHeadlines(ctx,[title],'Georgia',80)+90,'Georgia');
  assert.ok(end<=1500,`${title} ${width}: ${end}`);
  assert.ok(lines[0].y>=960,'the title clears the panel edge');
  assert.ok(lines.map(l=>l.text).join(' ').replace(/\s/g,'').includes(body.replace(/\s/g,'')));
 }
});
