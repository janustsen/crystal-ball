import {factLabels} from './questions';
import type {Facts,Plan,Prediction} from './types';

export function withAnswerQuestions(prediction:Prediction,plan:Plan,answers:Facts):Prediction {
 const answerQuestions=Object.fromEntries(plan.cards.filter(card=>answers[card.id]&&Object.hasOwn(prediction.facts,card.id)).map(card=>[card.id,card.question]));
 return {...prediction,answerQuestions};
}

export function readingAnswers(prediction:Prediction){
 return Object.entries(prediction.facts).map(([key,value],index)=>{
  const stored=prediction.answerQuestions?.[key],question=typeof stored==='string'?stored:undefined;
  // General readings include the original card question in their fact value.
  // Remove only that exact, separately displayed prefix, never infer a question.
  return {key,label:question||factLabels[key]||`Answer ${index+1}`,answer:question&&value.startsWith(question+' ')?value.slice(question.length+1):value};
 });
}
