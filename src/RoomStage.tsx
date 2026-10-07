import React from 'react';
import {View} from 'react-native';
import {anchorOnScreen,anchorSpot,quadBox,type Spot} from './room';
import {useStagePieces,type Stage} from './roomPieces';

// Room surfaces with UI on them. Native shows the room's stills, so each piece sits on its anchor's quad on the still.
export function RoomStage({spot,width,height,stage}:{spot:Spot;width:number;height:number;stage:Stage}){
 const pieces=useStagePieces(stage);
 const anchors=[...new Set(Object.values(pieces).map(p=>p.anchor))].filter(anchor=>anchorSpot(anchor)===spot.toLowerCase());
 return <>{anchors.map(anchor=>{
  const box=quadBox(anchorOnScreen(anchor,null,width,height));
  return <View key={anchor} testID={`room-${anchor}`} pointerEvents="box-none" style={{position:'absolute',...box}}>
   {Object.entries(pieces).filter(([,p])=>p.anchor===anchor).map(([id,p])=><React.Fragment key={id}>{p.node}</React.Fragment>)}
  </View>;
 })}</>;
}
