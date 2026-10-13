// Shallow-render stand-in for src/Home: exposes Home's controls under the testIDs the real components use.
// The harness's createElement expands function components, so these render inline in app/index.tsx's tree.
export function homeMock(react:{createElement:(type:any,props:any,...children:any[])=>any}){
 const h=react.createElement;
 return {
  Home:({ready,libraryLocked,onLibrary,checkIns,recap,omen,today,omenFocus}:any)=>h('Home',{omenFocus},checkIns,recap,omen(()=>{}),today,h('Pressable',{testID:'room-inner-library',locked:libraryLocked,disabled:!ready,onPress:onLibrary})),
  RoomHeader:({title,count,ready,onPlans}:any)=>h('RoomHeader',{},h('Txt',{},title),h('Pressable',{testID:'view-plans',disabled:!ready,onPress:onPlans},h('Txt',{},count))),
  PlansPill:({count,ready,onPress}:any)=>h('Pressable',{testID:'view-plans',disabled:!ready,onPress},h('Txt',{},count)),
  tabBarSpace:(bottom:number)=>bottom+94,
  headerBottom:(top:number)=>Math.max(52,top+6)+44,
  BallButton:({home,onPress}:any)=>h('Pressable',{testID:home?'hero-orb':'ask-ball',onPress}),
  Shift:({offset,children}:any)=>h('Shift',{offset},children),
  HomeTabBar:({current,disabled,onTab}:any)=>h('HomeTabBar',{},...['Home','Sky','Ask','History','You'].map(t=>h('Pressable',{testID:`tab-${t.toLowerCase()}`,disabled,accessibilityState:{selected:t===current},onPress:()=>onTab(t)}))),
 };
}
// Stand-in for src/AskBall: the ball's question field plus the chip and controls the app passes in, under the same testIDs.
export function askBallMock(react:{createElement:(type:any,props:any,...children:any[])=>any}){
 const h=react.createElement;
 return {
  useKeyboardInset:()=>0,
  AskBall:({testID,value,onChangeText,chip,note,controls}:any)=>h('AskBall',{},h('TextInput',{testID,value,onChangeText}),chip,note,controls),
  RoomCamera:({children}:any)=>h('RoomCamera',{},children),
  AskMoment:()=>null,
 };
}
