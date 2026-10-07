import React from 'react';
import {View} from 'react-native';
import {styles,Txt} from './ui';
import type {SkyOmen as Omen} from './social';
import {Material} from './Material';

// The Friday Sky card on its wax-card material.
export function SkyOmen({omen,unavailable,testID}:{omen:Omen|undefined;unavailable:boolean;testID:string}){
 if(unavailable)return <View testID={testID} style={styles.panel}><Material name="wax-card"/><Txt style={styles.caption}>Friday Sky · unavailable</Txt><Txt style={styles.caption}>This week’s omen could not be loaded. Try again shortly.</Txt></View>;
 return <View testID={testID} style={styles.panel}><Material name="wax-card"/><Txt style={styles.caption}>{omen?'Friday Sky · this week’s shared omen':'Friday Sky · opens Fridays at 8pm'}</Txt>{omen?<Txt display>{omen.omen}</Txt>:<Txt style={styles.caption}>One shared omen arrives at 8pm your time.</Txt>}</View>;
}
