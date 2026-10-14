import {useEffect,useRef,useState} from 'react';
import {Animated,Easing,Keyboard,Platform,Pressable,TextInput,View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {SvgXml} from 'react-native-svg';
import {Action,Txt,styles,colors,fonts,Field} from './ui';
import {ageGroup,joinBirthday,typeBirthday,type BirthdayParts} from './profile';
import {motion} from './motion';
import type {Facts} from './types';
import {aboutYou} from './ball-asks';
import {Surface} from './Surface';
import {heardFromSources,type HeardFrom} from './heard-from';

const native=Platform.OS!=='web';
const sparkle='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#E3C78F" d="M12 0c.9 6.6 4.4 10.4 12 12-7.6 1.6-11.1 5.4-12 12-.9-6.6-4.4-10.4-12-12 7.6-1.6 11.1-5.4 12-12z"/></svg>';
// Sparkles around the intro line: position (percent of the line's box), size and when each first glints.
const sparkles=[{x:-4,y:-30,size:18,delay:500},{x:88,y:-46,size:12,delay:850},{x:102,y:28,size:20,delay:1150},{x:8,y:96,size:11,delay:1400},{x:62,y:118,size:15,delay:700},{x:40,y:-62,size:9,delay:1650}];
const introHold=2600;
const fields=[{label:'Month',placeholder:'MM',autoComplete:'birthdate-month',width:72},{label:'Day',placeholder:'DD',autoComplete:'birthdate-day',width:72},{label:'Year',placeholder:'YYYY',autoComplete:'birthdate-year',width:104}] as const;

function Sparkle({x,y,size,delay,reduce}:{x:number;y:number;size:number;delay:number;reduce:boolean}){
 const glint=useRef(new Animated.Value(reduce?.6:0)).current;
 useEffect(()=>{
  if(reduce){glint.setValue(.6);return}
  const loop=Animated.loop(Animated.sequence([Animated.timing(glint,{toValue:1,duration:520,easing:Easing.bezier(...motion.ease),useNativeDriver:native}),Animated.timing(glint,{toValue:.15,duration:900,easing:Easing.inOut(Easing.quad),useNativeDriver:native}),Animated.delay(1100)]));
  const start=setTimeout(()=>loop.start(),delay);
  return()=>{clearTimeout(start);loop.stop()};
 },[reduce,delay,glint]);
 return <Animated.View pointerEvents="none" style={{position:'absolute',left:`${x}%`,top:`${y}%`,opacity:glint,transform:[{scale:glint.interpolate({inputRange:[0,1],outputRange:[.3,1]})},{rotate:glint.interpolate({inputRange:[0,1],outputRange:['-30deg','0deg']})}]}}><SvgXml aria-hidden xml={sparkle} width={size} height={size}/></Animated.View>;
}

// First launch: "I know your future." glints in, then a sheet rises asking for a birthday, then three optional one-tap questions.
export function Onboarding({onFinish,onBlock,onHeard,blocked=false,reduce=false}:{onFinish:(facts:Facts,ageConfirmed:boolean|undefined,answers:Record<string,string>)=>void;onBlock:()=>void;onHeard?:(source:HeardFrom)=>void;blocked?:boolean;reduce?:boolean}){
 const [heard,setHeard]=useState<HeardFrom|null>(null);
 const [sheet,setSheet]=useState(reduce||blocked),[parts,setParts]=useState<BirthdayParts>(['','','']),[error,setError]=useState(''),[confirming,setConfirming]=useState(false),[sheetHeight,setSheetHeight]=useState(0);
 const [about,setAbout]=useState<{facts:Facts;ageConfirmed?:boolean}|null>(null),[answers,setAnswers]=useState<Record<string,string>>({});
 const line=useRef(new Animated.Value(reduce?1:0)).current,rise=useRef(new Animated.Value(sheet?1:0)).current;
 const sheetRef=useRef<View>(null);
 // Until it rises, the sheet stays out of web keyboard navigation too (aria-hidden and pointerEvents leave it tabbable).
 useEffect(()=>{const node=sheetRef.current as unknown as {inert?:boolean}|null;if(Platform.OS==='web'&&node)node.inert=!sheet},[sheet]);
 const inputs=useRef<(TextInput|null)[]>([]),insets=useSafeAreaInsets(),[keyboard,setKeyboard]=useState(0);
 // The sheet rides just above the keyboard so the intro line stays in view instead of scrolling away.
 useEffect(()=>{const show=Keyboard.addListener('keyboardWillShow',e=>setKeyboard(e.endCoordinates.height)),hide=Keyboard.addListener('keyboardWillHide',()=>setKeyboard(0));return()=>{show.remove();hide.remove()}},[]);
 useEffect(()=>{
  if(reduce){line.setValue(1);setSheet(true);return}
  const animation=Animated.timing(line,{toValue:1,duration:1200,delay:300,easing:Easing.bezier(...motion.ease),useNativeDriver:native});animation.start();
  const timer=setTimeout(()=>setSheet(true),introHold);
  return()=>{animation.stop();clearTimeout(timer)};
 },[reduce,line]);
 // Focus follows the sheet only, so turning Reduce Motion on mid-typing does not pull the cursor back to Month.
 useEffect(()=>{if(sheet&&native)inputs.current[0]?.focus()},[sheet]);
 useEffect(()=>{
  if(!sheet)return;
  if(reduce){rise.setValue(1);return}
  const animation=Animated.timing(rise,{toValue:1,duration:620,easing:Easing.bezier(...motion.ease),useNativeDriver:native});animation.start();
  return()=>animation.stop();
 },[sheet,reduce,rise]);
 function type(index:number,text:string){
  const next=typeBirthday(parts,index,text);setParts(next.parts);setError('');
  if(next.focus!==index)inputs.current[next.focus]?.focus();
 }
 function finish(facts:Facts,ageConfirmed?:boolean){Keyboard.dismiss();setConfirming(false);setAbout({facts,ageConfirmed})}
 function pick(id:string,option:string){setAnswers(({[id]:current,...rest})=>current===option?rest:{...rest,[id]:option})}
 function next(){
  const birthday=joinBirthday(parts);
  if(birthday===''){if(blocked){setError('Enter a birthday to correct your age.');return}setConfirming(true);return}
  if(!birthday||ageGroup(birthday)==='unknown'){setError('Check the month, day and year.');return}
  if(ageGroup(birthday)==='under13'){onBlock();return}
  finish({birthday});
 }
 function skip(){
  if(blocked)return;
  if(joinBirthday(parts)){next();return}
  setConfirming(true);
 }
 if(confirming&&!blocked)return <><Txt display>Are you 13 or older?</Txt><Txt style={styles.caption}>No birthday needed. Teen-safe defaults apply.</Txt><Action testID="confirm-age" label="I’m 13 or older" onPress={()=>finish({},true)}/><Action testID="decline-age" label="I’m under 13" quiet onPress={()=>{setConfirming(false);onBlock()}}/></>;
 return <View style={{flex:1,paddingBottom:Math.max(0,keyboard-insets.bottom-40)}}>
  <View testID="onboarding-intro" accessible={false} style={{flex:1,minHeight:140,justifyContent:'center',alignItems:'center'}}>
   {/* Centered on the whole screen until the sheet rises beneath it. */}
   <Animated.View style={{opacity:line,transform:[{translateY:rise.interpolate({inputRange:[0,1],outputRange:[sheetHeight/2,0]})},{translateY:line.interpolate({inputRange:[0,1],outputRange:[14,0]})},{scale:line.interpolate({inputRange:[0,1],outputRange:[.96,1]})}]}}>
    <View>
     {sparkles.map(s=><Sparkle key={s.delay} {...s} reduce={reduce}/>)}
     <Txt display accessibilityRole="header" style={[styles.overRoom,{fontFamily:fonts.italic,fontSize:46,lineHeight:50,textAlign:'center'}]}>I know your{'\n'}future.</Txt>
    </View>
   </Animated.View>
  </View>
  <Animated.View ref={sheetRef} pointerEvents={sheet?'auto':'none'} aria-hidden={!sheet} importantForAccessibility={sheet?'auto':'no-hide-descendants'} onLayout={e=>setSheetHeight(e.nativeEvent.layout.height)} style={{opacity:rise.interpolate({inputRange:[0,.3,1],outputRange:[0,1,1]}),transform:[{translateY:rise.interpolate({inputRange:[0,1],outputRange:[360,0]})}]}}>
   <View style={{padding:22,paddingBottom:12}}><Surface kind="card">
    {about?<>
     <Txt style={[styles.label,{color:colors.gold,textAlign:'center'}]}>The Ball asks · optional</Txt>
     <Txt display accessibilityRole="header" style={[styles.hero,{textAlign:'center',marginTop:8}]}>A little about you</Txt>
     <Txt style={[styles.caption,{textAlign:'center',marginTop:6}]}>One tap each, skip any. A few answers make forecasts more personal.</Txt>
     {aboutYou.map(ask=><View key={ask.id} accessibilityRole="radiogroup" accessibilityLabel={ask.question} style={{marginTop:16}}>
      <Txt style={{textAlign:'center'}}>{ask.question}</Txt>
      <View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:6,marginTop:6}}>{ask.options.map((option,i)=>{const on=answers[ask.id]===option;return <Pressable key={option} testID={`about-${ask.id}-${i}`} accessibilityRole="radio" aria-checked={on} accessibilityState={{checked:on}} onPress={()=>pick(ask.id,option)} style={{minHeight:44,paddingHorizontal:14,paddingVertical:10}}><Surface kind="chip" state={on?'selected':undefined}><Txt style={styles.chip}>{option}</Txt></Surface></Pressable>})}</View>
     </View>)}
     <Action testID="about-done" label={Object.keys(answers).length?'Continue':'Skip for now'} quiet={!Object.keys(answers).length} onPress={()=>{if(heard)onHeard?.(heard);onFinish(about.facts,about.ageConfirmed,answers)}}/>
    </>:<>
     {blocked?<Txt accessibilityRole="alert" style={{marginBottom:8}}>Crystal Ball is for ages 13 and up.</Txt>:null}
     <Txt display style={[styles.hero,{textAlign:'center'}]}>What’s your birthday?</Txt>
     <View accessibilityRole="none" style={{flexDirection:'row',justifyContent:'center',gap:10,marginTop:20}}>
      {fields.map((f,i)=><View key={f.label} style={{width:f.width}}>
       <Txt style={[styles.label,{textAlign:'center',marginBottom:6}]}>{f.label}</Txt>
       <Field ref={el=>{inputs.current[i]=el}} testID={`birthday-${f.label.toLowerCase()}`} accessibilityLabel={`Birthday ${f.label.toLowerCase()}`} autoComplete={f.autoComplete} keyboardType="number-pad" returnKeyType={i===2?'done':'next'} placeholder={f.placeholder} value={parts[i]} onChangeText={text=>type(i,text)} onKeyPress={e=>{if(e.nativeEvent.key==='Backspace'&&!parts[i]&&i>0)inputs.current[i-1]?.focus()}} onSubmitEditing={i===2?next:()=>inputs.current[i+1]?.focus()} style={[styles.input,{textAlign:'center',paddingHorizontal:8}]}/>
      </View>)}
     </View>
     <Txt style={[styles.caption,{textAlign:'center',marginTop:12}]}>Sets your Sun sign. 13 and up.</Txt>
    {blocked?null:<View accessibilityRole="radiogroup" accessibilityLabel="Where did you hear about us? Optional" style={{marginTop:14}}>
     <Txt style={[styles.caption,{textAlign:'center'}]}>Where did you hear about us? Optional.</Txt>
     <View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:6,marginTop:6}}>{heardFromSources.map(source=><Pressable key={source} testID={`heard-${source.toLowerCase().replace(/\W+/g,'-')}`} accessibilityRole="radio" aria-checked={heard===source} accessibilityState={{checked:heard===source}} onPress={()=>setHeard(heard===source?null:source)} style={{minHeight:44,paddingVertical:10,paddingHorizontal:12,justifyContent:'center'}}><Surface kind="chip" state={heard===source?'selected':undefined}><Txt style={styles.chip}>{source}</Txt></Surface></Pressable>)}</View>
    </View>}
     {error?<Txt accessibilityRole="alert" style={[styles.caption,{color:colors.gold,textAlign:'center',marginTop:8}]}>{error}</Txt>:null}
     <Action label="Continue" onPress={next}/>
     <Pressable testID="skip-for-now" accessibilityRole="button" aria-disabled={blocked} disabled={blocked} onPress={skip} style={{minHeight:44,justifyContent:'center',opacity:blocked?.5:1}}><Txt style={[styles.caption,{textAlign:'center'}]}>Skip for now</Txt></Pressable>
    </>}
   </Surface></View>
  </Animated.View>
 </View>;
}
