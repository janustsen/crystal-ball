import {useRef,useState} from 'react';
import {KeyboardAvoidingView,Modal,Platform,Pressable,TextInput,View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Atmosphere} from './Atmosphere';
import {useStore} from './store';
import {PaperButton,Input,Txt,colors,fonts,styles} from './ui';

export function ExpandableInput({editorTitle,...props}:React.ComponentProps<typeof Input>&{editorTitle:string}){
 const {state}=useStore();
 const insets=useSafeAreaInsets(),field=useRef<TextInput>(null);
 const [draft,setDraft]=useState<string|null>(null);
 function close(save:boolean){if(save&&draft!==null)props.onChangeText?.(draft);setDraft(null);}
 return <>
  <Input {...props}/>
  <Pressable testID={`${props.testID}-expand`} accessibilityRole="button" accessibilityLabel={`Expand ${editorTitle.toLowerCase()}`} onPress={()=>setDraft(props.value||'')} style={{minHeight:44,justifyContent:'center',paddingVertical:8}}><Txt style={[styles.caption,{color:colors.ice}]}>Expand editor ↗</Txt></Pressable>
  <Modal visible={draft!==null} animationType="none" onRequestClose={()=>close(false)} onShow={()=>field.current?.focus()}>
   <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={{flex:1,backgroundColor:colors.ink,paddingTop:Math.max(insets.top,12),paddingBottom:Math.max(insets.bottom,12)}}>
    <Atmosphere reduce={state.reduceMotion} mood="utility" focused/>
    <View style={{flex:1,width:'100%',maxWidth:430,alignSelf:'center',paddingHorizontal:24}}>
     <Txt accessibilityRole="header" display style={{fontSize:18,lineHeight:24,marginBottom:8}}>{editorTitle}</Txt>
     <View style={{flex:1,minHeight:80,marginBottom:4}}><Input fill ref={field} testID="expanded-input" accessibilityLabel={props.accessibilityLabel||editorTitle} multiline value={draft||''} onChangeText={setDraft} maxLength={props.maxLength} placeholder={props.placeholder} placeholderTextColor={colors.muted} style={[styles.input,{flex:1,minHeight:80,fontFamily:fonts.body,fontSize:18,lineHeight:26,textAlignVertical:'top',borderWidth:0,marginVertical:0,paddingVertical:12,paddingHorizontal:12}]}/></View>
     {props.maxLength?<Txt testID="editor-capacity" style={{fontSize:12,lineHeight:16}}>{draft?.length||0} / {props.maxLength} characters</Txt>:null}
     <View style={{flexDirection:'row',alignItems:'center',gap:12,marginTop:4}}>
      <Pressable testID="editor-cancel" accessibilityRole="button" accessibilityLabel="Cancel" onPress={()=>close(false)} style={{flex:1,minHeight:56,justifyContent:'center'}}><Txt style={{fontSize:18,lineHeight:24,color:colors.ice}}>Cancel</Txt></Pressable>
      <PaperButton wood testID="editor-done" accessibilityRole="button" accessibilityLabel="Done" onPress={()=>close(true)} style={{flex:1,marginTop:0}}><Txt display style={{fontSize:18,lineHeight:24,color:colors.ice}}>Done</Txt></PaperButton>
     </View>
    </View>
   </KeyboardAvoidingView>
  </Modal>
 </>;
}
