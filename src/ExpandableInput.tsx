import {useRef,useState} from 'react';
import {KeyboardAvoidingView,Modal,Platform,Pressable,TextInput,View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Action,Input,Txt,colors,fonts,styles} from './ui';

export function ExpandableInput({editorTitle,...props}:React.ComponentProps<typeof Input>&{editorTitle:string}){
 const insets=useSafeAreaInsets(),field=useRef<TextInput>(null);
 const [draft,setDraft]=useState<string|null>(null),[focused,setFocused]=useState(false);
 function close(save:boolean){if(save&&draft!==null)props.onChangeText?.(draft);setDraft(null);}
 return <>
  <Input {...props}/>
  <Pressable testID={`${props.testID}-expand`} accessibilityRole="button" accessibilityLabel={`Expand ${editorTitle.toLowerCase()}`} onPress={()=>setDraft(props.value||'')} style={{minHeight:44,justifyContent:'center',paddingVertical:8}}><Txt style={[styles.caption,{color:colors.ice}]}>Expand editor ↗</Txt></Pressable>
  <Modal visible={draft!==null} animationType="none" onRequestClose={()=>close(false)} onShow={()=>field.current?.focus()}>
   <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={{flex:1,backgroundColor:colors.ink,paddingTop:Math.max(insets.top,12),paddingBottom:Math.max(insets.bottom,12)}}>
    <View style={{flex:1,width:'100%',maxWidth:430,alignSelf:'center',paddingHorizontal:24}}>
     <Pressable testID="editor-cancel" accessibilityRole="button" accessibilityLabel="Cancel" onPress={()=>close(false)} style={{minHeight:48,alignSelf:'flex-start',justifyContent:'center'}}><Txt style={{color:colors.ice}}>‹ Cancel</Txt></Pressable>
     <Txt accessibilityRole="header" display style={{fontSize:22,lineHeight:28,marginVertical:12}}>{editorTitle}</Txt>
     <View style={{flex:1,minHeight:80,borderWidth:focused?2:1,borderColor:focused?colors.ice:'#79634A',borderRadius:12,paddingVertical:focused?11:12,marginBottom:8}}><Input fill ref={field} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} testID="expanded-input" accessibilityLabel={props.accessibilityLabel||editorTitle} multiline value={draft||''} onChangeText={setDraft} maxLength={props.maxLength} placeholder={props.placeholder} placeholderTextColor={colors.muted} style={[styles.input,{flex:1,minHeight:80,fontFamily:fonts.body,fontSize:18,lineHeight:26,textAlignVertical:'top',borderWidth:0,marginVertical:0,paddingVertical:4,paddingHorizontal:focused?11:12}]}/></View>
     {props.maxLength?<Txt testID="editor-capacity" style={styles.caption}>{draft?.length||0} / {props.maxLength} characters</Txt>:null}
     <Action testID="editor-done" label="Done" onPress={()=>close(true)}/>
    </View>
   </KeyboardAvoidingView>
  </Modal>
 </>;
}
