import {Platform} from 'react-native';
import {Stack} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {useFonts} from 'expo-font';
import {Store} from '../src/store';
// Jost ships as static TTFs on every platform (Google Fonts' woff2 is one variable file that cannot split 400 and 500).
const ui={Jost:require('../assets/fonts/Jost.ttf'),JostMedium:require('../assets/fonts/JostMedium.ttf')};
export default function Layout(){
 const [loaded,error]=useFonts(Platform.OS==='web'?{
  ...ui,CormorantGaramond:require('../assets/fonts/CormorantGaramond.woff2'),IMFellEnglish:require('../assets/fonts/IMFellEnglish.woff2'),IMFellEnglishItalic:require('../assets/fonts/IMFellEnglishItalic.woff2'),CormorantGaramondSemiBold:require('../assets/fonts/CormorantGaramondSemiBold.woff2')
 }:{
  ...ui,CormorantGaramond:require('../assets/fonts/CormorantGaramond.ttf'),IMFellEnglish:require('../assets/fonts/IMFellEnglish.ttf'),IMFellEnglishItalic:require('../assets/fonts/IMFellEnglishItalic.ttf'),CormorantGaramondSemiBold:require('../assets/fonts/CormorantGaramondSemiBold.ttf')
 });
 if(!loaded&&!error)return null;
 return <Store><StatusBar style="light"/><Stack screenOptions={{headerShown:false,contentStyle:{backgroundColor:'#140E0A'}}}/></Store>;
}
