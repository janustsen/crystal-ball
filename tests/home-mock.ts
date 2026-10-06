// Shallow-render stand-in for src/Home: exposes Home's controls under the testIDs the real components use.
// The harness's createElement expands function components, so these render inline in app/index.tsx's tree.
export function homeMock(react:{createElement:(type:any,props:any,...children:any[])=>any}){
 const h=react.createElement;
 return {
  Home:({count,ready,onPlans,onAsk,libraryLocked,onLibrary,checkIns,omen}:any)=>h('Home',{},h('Pressable',{testID:'hero-orb',onPress:onAsk}),h('Pressable',{testID:'view-plans',disabled:!ready,onPress:onPlans},h('Txt',{},count)),checkIns,omen,h('Pressable',{testID:'room-inner-library',locked:libraryLocked,disabled:!ready,onPress:onLibrary})),
  HomeTabBar:({disabled,onTab}:any)=>h('HomeTabBar',{},...['Home','Sky','Ask','History','You'].map(t=>h('Pressable',{testID:`tab-${t.toLowerCase()}`,disabled,accessibilityState:{selected:t==='Home'},onPress:()=>onTab(t)}))),
 };
}
