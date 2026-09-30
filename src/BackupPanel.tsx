import React,{useEffect,useState} from 'react';
import {Platform,View} from 'react-native';
import * as Apple from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import {anonymousOwner,supabase} from './cloud';
import {useStore} from './store';
import {Action,styles,Txt} from './ui';

export function BackupPanel(){
 const {backup,backupBusy}=useStore();
 const [available,setAvailable]=useState(false),[mode,setMode]=useState<'save'|'restore'>('save'),[notice,setNotice]=useState('');
 useEffect(()=>{if(Platform.OS==='ios')void Apple.isAvailableAsync().then(setAvailable).catch(()=>{})},[]);
 const configured=!!supabase&&process.env.EXPO_PUBLIC_APPLE_LINK_ENABLED==='true';
 async function connect(){
  try{
   await backup(async()=>{
    if(!supabase)throw new Error('Backup is not configured.');
    const owner=await anonymousOwner();
    const nonce=Crypto.randomUUID();
    const credential=await Apple.signInAsync({requestedScopes:[],nonce:await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,nonce)});
    if(!credential.identityToken)throw new Error('Apple returned no identity token.');
    const credentials={provider:'apple' as const,token:credential.identityToken,nonce};
    const result=mode==='save'?await supabase.auth.linkIdentity(credentials):await supabase.auth.signInWithIdToken(credentials);
    if(result.error)throw result.error;
    if(!('user' in result.data)||!result.data.user||(mode==='save'&&result.data.user.id!==owner))throw new Error('Backup identity changed.');
   });
   setNotice('History backed up. Your readings are here.');
  }catch{setNotice(mode==='save'?'Backup could not finish. Already saved with Apple? Choose Restore. Your local readings are safe.':'Restore could not finish. Your local readings are safe. Try again when connected.')}
 }
 return <View style={styles.panel}>
  <Txt>Keep your glimpses</Txt>
  <Txt style={styles.caption}>Optional Apple backup saves your readings and remembered answers to Supabase. Restore combines them with this device. Test credits stay here.</Txt>
  {!available||!configured?<Txt style={[styles.caption,{marginTop:12}]}>Apple backup needs the configured iOS app. Readings stay on this device.</Txt>:<>
   <Action label={mode==='save'?'Restore an Apple backup':'Save this device with Apple'} quiet disabled={backupBusy} onPress={()=>{setMode(mode==='save'?'restore':'save');setNotice('')}}/>
   <Txt style={styles.caption}>{mode==='save'?'Save this device’s history':'Restore your saved history'}</Txt>
   {backupBusy?<Txt accessibilityLiveRegion="polite">Saving your glimpses…</Txt>:<Apple.AppleAuthenticationButton buttonType={Apple.AppleAuthenticationButtonType.CONTINUE} buttonStyle={Apple.AppleAuthenticationButtonStyle.WHITE} cornerRadius={12} style={{height:52,marginTop:12}} onPress={connect}/>}
  </>}
  {notice?<Txt accessibilityLiveRegion="polite" style={styles.caption}>{notice}</Txt>:null}
 </View>;
}
