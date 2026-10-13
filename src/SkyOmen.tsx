import React from 'react';
import {View} from 'react-native';
import {styles,Txt} from './ui';
import type {SkyOmen as Omen} from './social';
import {Surface} from './Surface';

// The Friday Sky card on its wax-card material.
export function SkyOmen({omen,unavailable,testID}:{omen:Omen|undefined;unavailable:boolean;testID:string}){
 if(unavailable)return <View testID={testID} style={styles.panel}><Surface kind="card"><Txt style={styles.caption}>Friday Sky · unavailable</Txt><Txt style={styles.caption}>This week’s insight could not be loaded. Try again shortly.</Txt></Surface></View>;
 return <View testID={testID} style={styles.panel}><Surface kind="card"><Txt style={styles.caption}>{omen?'Friday Sky · this week’s shared insight':'Friday Sky · opens Fridays at 8pm'}</Txt>{omen?<Txt display>{omen.omen}</Txt>:<Txt style={styles.caption}>One shared insight arrives at 8pm your time.</Txt>}</Surface></View>;
}
