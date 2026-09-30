import {Circle,Text,VStack,ZStack} from '@expo/ui/swift-ui';
import {containerBackground,font,foregroundStyle,frame,widgetURL} from '@expo/ui/swift-ui/modifiers';
import {createWidget} from 'expo-widgets';

function OmenWidget(props:{text:string}){
 'widget';
 return <VStack spacing={8} modifiers={[containerBackground('#100923','widget'),widgetURL('crystalball:///')]}>
  <ZStack><Circle modifiers={[frame({width:44,height:44}),foregroundStyle({type:'linearGradient',colors:['#C8B8EE','#493275','#201039'],startPoint:{x:0,y:0},endPoint:{x:1,y:1}})]}/><Text modifiers={[font({size:21}),foregroundStyle('#F4DBA0')]}>✦</Text></ZStack>
  <Text modifiers={[font({size:11,weight:'semibold'}),foregroundStyle('#F4DBA0')]}>Today’s omen</Text>
  <Text modifiers={[font({size:14}),foregroundStyle('#F3EBFF')]}>{props.text}</Text>
 </VStack>;
}
export default createWidget('DailyOmen',OmenWidget);
