import {Pressable,View} from 'react-native';
import {Paper} from './Paper';
import {RadioGroup,Txt,styles} from './ui';
const offers=[
 {id:'weekly',name:'Weekly',amount:'$1.99',interval:'each week',terms:'$103.48/yr (52 weeks) · renews weekly until canceled'},
 {id:'monthly',name:'Monthly',amount:'$5.99',interval:'each month',terms:'renews monthly until canceled'},
 {id:'annual',name:'Yearly',amount:'$39.99',interval:'each year',terms:'Save 44% vs monthly · renews yearly until canceled'}
] as const;
type PlanChoice=(typeof offers)[number]['id'];
export function PlanLedger({choice,onChange}:{choice:PlanChoice;onChange:(value:PlanChoice)=>void}){
 return <><Paper style={{marginTop:12}}><RadioGroup testID="plan-options" accessibilityLabel="Choose a plan">{offers.map(offer=><Pressable key={offer.id} accessibilityRole="radio" accessibilityLabel={`${offer.name}, ${offer.amount} ${offer.interval}`} aria-describedby={choice===offer.id?'selected-plan-terms':undefined} tabIndex={choice===offer.id?0:-1} aria-checked={choice===offer.id} accessibilityState={{checked:choice===offer.id}} onPress={()=>onChange(offer.id)} style={({pressed})=>({minHeight:64,paddingVertical:12,paddingHorizontal:4,marginVertical:2,backgroundColor:choice===offer.id?'#b6996040':'transparent',opacity:pressed?.75:1})}><View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'baseline',justifyContent:'center',gap:10}}><Txt>{choice===offer.id?'✓ ':''}{offer.name}</Txt><Txt display style={{fontSize:22,lineHeight:28}}>{offer.amount}</Txt></View><Txt style={styles.caption}>{offer.interval}</Txt></Pressable>)}</RadioGroup></Paper><Txt nativeID="selected-plan-terms" testID="selected-plan-terms" style={[styles.caption,{marginTop:12}]}>{offers.find(offer=>offer.id===choice)!.terms}</Txt></>;
}
