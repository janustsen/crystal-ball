import React,{useEffect,useRef} from 'react';
import {View} from 'react-native';
import {anchorOnScreen,anchorSpot,quadBox,quadMatrix,type Anchor,type Spot} from './room';
import {idleFrame,roomLive} from './RoomScene.web';
import {useStagePieces,type Stage} from './roomPieces';

// Room surfaces with UI on them. Each piece lays out at its anchor's size on the still, then rides the presented idle
// frame's quad (a perspective matrix3d), so it sways with the camera like the ball; it hides during a flight.
export function RoomStage({width,height,stage}:{spot:Spot;width:number;height:number;stage:Stage}){
 const pieces=useStagePieces(stage);
 const layers=useRef(new Map<Anchor,HTMLElement>());
 const anchors=[...new Set(Object.values(pieces).map(p=>p.anchor))];
 useEffect(()=>{
  if(!anchors.length)return;
  let raf=0;
  const tick=()=>{
   for(const [anchor,el] of layers.current){
    const on=!roomLive.flight&&roomLive.at.toLowerCase()===anchorSpot(anchor);
    el.style.visibility=on?'':'hidden';
    if(on){const box=quadBox(anchorOnScreen(anchor,null,width,height));el.style.transform=`matrix3d(${quadMatrix(box.width,box.height,anchorOnScreen(anchor,idleFrame(),width,height)).map(n=>n.toFixed(6)).join(',')})`}
   }
   raf=requestAnimationFrame(tick);
  };
  tick();
  return()=>cancelAnimationFrame(raf);
 },[width,height,anchors.join()]);
 return <>{anchors.map(anchor=>{
  const box=quadBox(anchorOnScreen(anchor,null,width,height));
  return <View key={anchor} testID={`room-${anchor}`} pointerEvents="box-none" ref={(el:unknown)=>{if(el)layers.current.set(anchor,el as HTMLElement);else layers.current.delete(anchor)}}
   style={{position:'absolute',left:0,top:0,width:box.width,height:box.height,transformOrigin:'0 0',visibility:'hidden'} as object}>
   {Object.entries(pieces).filter(([,p])=>p.anchor===anchor).map(([id,p])=><React.Fragment key={id}>{p.node}</React.Fragment>)}
  </View>;
 })}</>;
}
