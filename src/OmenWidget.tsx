import {Circle,Text,VStack,ZStack} from '@expo/ui/swift-ui';
import {containerBackground,font,foregroundStyle,frame,widgetURL} from '@expo/ui/swift-ui/modifiers';
import {createWidget} from 'expo-widgets';

function OmenWidget(props:{text:string}){
 'widget';
 return <VStack spacing={8} modifiers={[containerBackground('#120E0B','widget'),widgetURL('crystalball:///')]}>
  <ZStack><Circle modifiers={[frame({width:44,height:44}),foregroundStyle({type:'linearGradient',colors:['#D1C3A8','#69513A','#251C14'],startPoint:{x:0,y:0},endPoint:{x:1,y:1}})]}/><Text modifiers={[font({size:21}),foregroundStyle('#E0A458')]}>✦</Text></ZStack>
  <Text modifiers={[font({size:11,weight:'semibold'}),foregroundStyle('#E0A458')]}>Today’s insight</Text>
  <Text modifiers={[font({size:14}),foregroundStyle('#F1E9DC')]}>{props.text}</Text>
 </VStack>;
}
export default createWidget('DailyOmen',OmenWidget);
