import {useRef,useState} from 'react';
import {KeyboardAvoidingView,Modal,Platform,Pressable,TextInput,View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Input,Txt,colors,fonts,styles} from './ui';

export function ExpandableInput({editorTitle,...props}:React.ComponentProps<typeof Input>&{editorTitle:string}){
 const insets=useSafeAreaInsets(),field=useRef<TextInput>(null);
 const [draft,setDraft]=useState<string|null>(null);
 function close(save:boolean){if(save&&draft!==null)props.onChangeText?.(draft);setDraft(null);}
 return <>
  <Input {...props}/>
  <Pressable testID={`${props.testID}-expand`} accessibilityRole="button" accessibilityLabel={`Expand ${editorTitle.toLowerCase()}`} onPress={()=>setDraft(props.value||'')} style={{minHeight:44,justifyContent:'center',paddingVertical:8}}><Txt style={[styles.caption,{color:colors.ice}]}>Expand editor ↗</Txt></Pressable>
  <Modal visible={draft!==null} animationType="none" onRequestClose={()=>close(false)} onShow={()=>field.current?.focus()}>
   <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={{flex:1,backgroundColor:colors.ink,paddingTop:Math.max(insets.top,12),paddingBottom:Math.max(insets.bottom,12)}}>
    <View style={{flex:1,width:'100%',maxWidth:430,alignSelf:'center',paddingHorizontal:24}}>
     <View style={{flexDirection:'row',justifyContent:'space-between',gap:16}}>{(['Cancel','Done'] as const).map(label=><Pressable key={label} testID={`editor-${label.toLowerCase()}`} accessibilityRole="button" onPress={()=>close(label==='Done')} style={{minHeight:48,minWidth:44,justifyContent:'center'}}><Txt style={{color:colors.ice}}>{label}</Txt></Pressable>)}</View>
     <Txt accessibilityRole="header" style={[styles.caption,{marginVertical:12}]}>{editorTitle}</Txt>
     <View style={{flex:1,minHeight:80,borderWidth:1,borderColor:'#79634A',borderRadius:12,paddingVertical:12,marginBottom:8}}><Input fill ref={field} testID="expanded-input" accessibilityLabel={props.accessibilityLabel||editorTitle} multiline value={draft||''} onChangeText={setDraft} maxLength={props.maxLength} placeholder={props.placeholder} placeholderTextColor={colors.muted} style={[styles.input,{flex:1,minHeight:80,fontFamily:fonts.body,fontSize:18,lineHeight:26,textAlignVertical:'top',borderWidth:0,marginVertical:0,paddingVertical:4}]}/></View>
     {props.maxLength?<Txt testID="editor-capacity" style={[styles.caption,{marginBottom:8}]}>{draft?.length||0} / {props.maxLength} characters</Txt>:null}
    </View>
   </KeyboardAvoidingView>
  </Modal>
 </>;
}
