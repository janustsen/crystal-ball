import {Stack} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {useFonts,CormorantGaramond_500Medium} from '@expo-google-fonts/cormorant-garamond';
import {DMSans_400Regular,DMSans_500Medium,DMSans_700Bold} from '@expo-google-fonts/dm-sans';
import {Store} from '../src/store';
export default function Layout(){const [loaded,error]=useFonts({CormorantGaramond_500Medium,DMSans_400Regular,DMSans_500Medium,DMSans_700Bold});if(!loaded&&!error)return null;return <Store><StatusBar style="light"/><Stack screenOptions={{headerShown:false,contentStyle:{backgroundColor:'#0B0620'}}}/></Store>}
