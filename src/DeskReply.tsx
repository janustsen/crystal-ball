import React from 'react';
import {View} from 'react-native';
import {Txt} from './ui';
import {Material} from './Material';
import {useRoomPiece} from './roomPieces';

// The desk card (about 210 × 107 pt at a 390 pt shell) holds a title line of 18 pt display and lines of 14 pt body inside
// 16 pt margins (the vellum's gilt rule sits inside them). Cormorant runs about 0.38 em per character; 0.4 leaves a margin.
const card={margin:16,title:{size:18,line:22},body:{size:12.5,line:18}};
const lines=(text:string,perLine:number)=>text.split(/\s+/).reduce(([n,used],word)=>used&&used+1+word.length>perLine?[n+1,word.length]:[n,used?used+1+word.length:word.length],[1,0])[0];
// Whether a reply fits the card (its size on screen) at normal text size; otherwise it stays on its lit panel.
export function fitsDesk(title:string,body:string,size:{width:number;height:number}){
 const inner=size.width-2*card.margin,height=lines(title,inner/(card.title.size*.4))*card.title.line+lines(body,inner/(card.body.size*1.12*.4))*card.body.line;
 return height<=size.height-2*card.margin+6;
}

// The Ball's reply on a card standing on the desk in front of it: live title and body in iron-gall ink on vellum,
// lit by the candle, swaying with the room. Renders nothing in place; the room stage shows it.
export function DeskReply({title,body}:{title:string;body:string}){
 useRoomPiece('desk-reply',{anchor:'desk',node:<View testID="desk-reply" style={{flex:1,padding:card.margin,justifyContent:'center'}}>
  <Material name="vellum-card" detail={6}>
   <Txt display accessibilityRole="header" style={{fontSize:card.title.size,lineHeight:card.title.line,textAlign:'center'}}>{title}</Txt>
   <Txt accessibilityLiveRegion="polite" style={{fontSize:card.body.size,lineHeight:card.body.line/1.12,textAlign:'center'}}>{body}</Txt>
  </Material>
 </View>});
 return null;
}
