import {Txt,colors} from './ui';
import {motion} from './motion';
export function FogWhispers({questions,reduce}:{questions:readonly string[];reduce:boolean}){
 return <div aria-hidden="true" style={{pointerEvents:'none',position:'absolute',left:12,right:12,top:'32%',display:'grid',justifyItems:'center'}}><style>{`@keyframes fog-whisper{0%,33%,100%{opacity:0}8%,25%{opacity:.7}}`}</style>{(reduce?questions.slice(0,1):questions).map((question,index)=><div key={question} style={{gridArea:'1 / 1',maxWidth:210,textAlign:'center',opacity:reduce?.65:0,animation:reduce?'none':`fog-whisper ${motion.glow*questions.length}ms ${index*motion.glow}ms ease-in-out infinite`}}><Txt display allowFontScaling={false} style={{fontSize:21,lineHeight:26,textAlign:'center',color:colors.ivory,textShadowColor:colors.ink,textShadowRadius:8}}>{question}</Txt></div>)}</div>;
}
