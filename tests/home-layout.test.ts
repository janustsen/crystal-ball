import test from 'node:test';
import assert from 'node:assert/strict';
import {homeLayout} from '../src/home-layout.ts';
import track from '../src/roomTrack.json' with {type:'json'};

test('Home layout allocates separate space for the ball, viewport, header and notices',()=>{
 for(const [width,height] of [[375,667],[390,844],[440,956],[390,390],[480,390]]){
  for(const [safeTop,safeBottom] of height<500?[[0,0]]:[[0,0],[59,34]])for(const notice of [false,true]){
   const scale=Math.max(width/track.width,height/track.height);
   const frame=track.stills.home;
   const ball={y:(height-track.height*scale)/2+frame[1]*scale,r:frame[2]*scale};
   const available=height-safeBottom-94,header=Math.max(52,safeTop+6)+44;
   const layout=homeLayout(ball,Math.round(ball.y+ball.r+16),available,header,notice);
   const hit=Math.max(22,ball.r),center=ball.y+layout.roomOffset;
   assert.ok(center-hit>=header,'the ball stays below header controls');
   assert.ok(center+hit<=layout.top-24,'no scrolling control can cross the ball target');
   const viewportBottom=available-(notice?layout.noticeHeight+8:0);
   assert.ok(viewportBottom-(layout.top-24)>=68,'the viewport can show a full touch target');
   if(notice)assert.ok(layout.noticeHeight>=44,'a notice remains accessible');
   else assert.equal(layout.noticeHeight,0);
  }
 }
 assert.equal(homeLayout({y:200,r:22},260,800,96,false).roomOffset,0);
});
