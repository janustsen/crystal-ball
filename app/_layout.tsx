import {Platform} from 'react-native';
import {Stack} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {useFonts} from 'expo-font';
import {Store} from '../src/store';
export default function Layout(){
 const [loaded,error]=useFonts({
  Fraunces:require('../assets/fonts/Fraunces.ttf'),Manrope:require('../assets/fonts/Manrope.ttf'),
  IMFellEnglishItalic:Platform.OS==='web'?require('../assets/fonts/IMFellEnglishItalic.woff2'):require('../assets/fonts/IMFellEnglishItalic.ttf')
 });
 if(!loaded&&!error)return null;
 return <Store><StatusBar style="light"/><Stack screenOptions={{headerShown:false,contentStyle:{backgroundColor:'#120E0B'}}}/></Store>;
}
