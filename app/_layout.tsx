import {Platform} from 'react-native';
import {Stack} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {useFonts} from 'expo-font';
import {Store} from '../src/store';
export default function Layout(){
 const [loaded,error]=useFonts(Platform.OS==='web'?{
  CormorantGaramond:require('../assets/fonts/CormorantGaramond.woff2'),CormorantGaramondItalic:require('../assets/fonts/CormorantGaramondItalic.woff2')
 }:{
  CormorantGaramond:require('../assets/fonts/CormorantGaramond.ttf'),CormorantGaramondItalic:require('../assets/fonts/CormorantGaramondItalic.ttf')
 });
 if(!loaded&&!error)return null;
 return <Store><StatusBar style="light"/><Stack screenOptions={{headerShown:false,contentStyle:{backgroundColor:'#120E0B'}}}/></Store>;
}
