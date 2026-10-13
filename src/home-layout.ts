export function homeLayout(ball:{y:number;r:number},dockTop:number,availableHeight:number,header:number,notice:boolean){
 const hit=Math.max(22,ball.r);
 const body=Math.min(160,Math.max(44,availableHeight-header-2*hit-40-(notice?96:0)));
 const noticeHeight=notice?Math.min(260,Math.max(0,availableHeight-header-2*hit-40-body)):0;
 const top=Math.min(dockTop,Math.max(0,availableHeight-(notice?noticeHeight+8:0)-body));
 return {top,noticeHeight,roomOffset:Math.min(0,top-32-ball.y-hit)};
}
