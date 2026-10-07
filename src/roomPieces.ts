import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import type {Anchor} from './room';

// UI that lives on a room surface (the skylight's glass, a card on the desk). A screen hands its piece to the shell's
// RoomStage, which fits it onto the anchor's quad above the room and keeps it there while the screen's content scrolls.
// The piece stays live: real text, real buttons, real accessibility.
export type RoomPiece={anchor:Anchor;node:ReactNode};
// The pieces on show. Only the stage re-renders when they change, never the screens that hand them in.
export function createStage(){
 const pieces:Record<string,RoomPiece>={},listeners=new Set<()=>void>();
 return {
  pieces,
  show(id:string,piece:RoomPiece|null){if(piece)pieces[id]=piece;else delete pieces[id];listeners.forEach(l=>l())},
  subscribe(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener)}},
 };
}
export type Stage=ReturnType<typeof createStage>;
export const RoomStageContext=createContext<Stage|null>(null);
// Shows the piece while the calling component is mounted; false when there is no stage (the caller keeps its panel).
export function useRoomPiece(id:string,piece:RoomPiece){
 const stage=useContext(RoomStageContext);
 useEffect(()=>{stage?.show(id,piece)});
 useEffect(()=>()=>stage?.show(id,null),[stage]);
 return !!stage;
}
// The stage's current pieces, re-rendering on every change.
export function useStagePieces(stage:Stage){
 const [,bump]=useState(0);
 useEffect(()=>stage.subscribe(()=>bump(n=>n+1)),[stage]);
 return stage.pieces;
}
