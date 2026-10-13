// A notice panel's 40 pt of padding plus one 44 pt row, so its message scrolls and Dismiss stays reachable.
const noticeMin=84;
export function homeLayout(ball:{y:number;r:number},dockTop:number,availableHeight:number,header:number,notice:boolean){
 const hit=Math.max(22,ball.r),space=availableHeight-header-2*hit-40;
 // A notice keeps a usable panel first; on a very short screen Home's scroll viewport gives way while it shows.
 const body=notice?Math.min(160,Math.max(0,space-noticeMin-8)):Math.min(160,Math.max(44,space));
 const noticeHeight=notice?Math.min(260,Math.max(noticeMin,space-body)):0;
 const top=Math.min(dockTop,Math.max(0,availableHeight-(notice?noticeHeight+8:0)-body));
 return {top,noticeHeight,roomOffset:Math.min(0,top-32-ball.y-hit)};
}
