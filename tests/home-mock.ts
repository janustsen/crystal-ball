// Shallow-render stand-in for src/Home: exposes Home's controls under the testIDs the real components use.
// The harness's createElement expands function components, so these render inline in app/index.tsx's tree.
export function homeMock(react:{createElement:(type:any,props:any,...children:any[])=>any}){
 const h=react.createElement;
 return {
  Home:({ready,libraryLocked,onLibrary,checkIns,omen,today}:any)=>h('Home',{},checkIns,omen,today,h('Pressable',{testID:'room-inner-library',locked:libraryLocked,disabled:!ready,onPress:onLibrary})),
  RoomHeader:({title,count,ready,onPlans}:any)=>h('RoomHeader',{},h('Txt',{},title),h('Pressable',{testID:'view-plans',disabled:!ready,onPress:onPlans},h('Txt',{},count))),
  PlansPill:({count,ready,onPress}:any)=>h('Pressable',{testID:'view-plans',disabled:!ready,onPress},h('Txt',{},count)),
  tabBarSpace:(bottom:number)=>bottom+94,
  headerBottom:(top:number)=>Math.max(52,top+6)+44,
  BallButton:({home,onPress}:any)=>h('Pressable',{testID:home?'hero-orb':'ask-ball',onPress}),
  HomeTabBar:({current,disabled,onTab}:any)=>h('HomeTabBar',{},...['Home','Sky','Ask','History','You'].map(t=>h('Pressable',{testID:`tab-${t.toLowerCase()}`,disabled,accessibilityState:{selected:t===current},onPress:()=>onTab(t)}))),
 };
}
