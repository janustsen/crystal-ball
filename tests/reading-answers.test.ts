import test from 'node:test';import assert from 'node:assert/strict';
import {readingAnswers,withAnswerQuestions} from '../src/reading-answers.ts';
import type {Plan,Prediction} from '../src/types.ts';
const plan:Plan={topic:'general',provided:{},cards:[{id:'context_a',question:'What have you tried?',options:['Practice','Other'],remember:false},{id:'unused',question:'Never asked?',options:['Yes'],remember:false}]};
const prediction:Prediction={id:'12345678-1234-1234-1234-123456789abc',question:'Will I learn?',headline:'You will learn.',createdAt:'2026-10-02T12:00:00Z',label:'Speculative',why:'A scenario.',facts:{context_a:'What have you tried? Daily practice',horizon:'six months'},sources:[],assumptions:[],friend:false};
test('saved question metadata preserves original facts and only names answered facts',()=>{
 const reading=withAnswerQuestions(prediction,plan,{context_a:'Daily practice'});
 assert.deepEqual(reading.facts,prediction.facts);assert.deepEqual(reading.answerQuestions,{context_a:'What have you tried?'});
 const restored=JSON.parse(JSON.stringify(reading));assert.deepEqual(readingAnswers(restored)[0],{key:'context_a',label:'What have you tried?',answer:'Daily practice'});
});
test('legacy unknown keys remain readable without inventing original questions',()=>{
 assert.deepEqual(readingAnswers(prediction)[0],{key:'context_a',label:'Answer 1',answer:prediction.facts.context_a});
 assert.equal(readingAnswers({...prediction,facts:{constructor:'A supplied answer'}})[0].label,'Answer 1');
 const different={...prediction,answerQuestions:{context_a:'A different question?'}};
 assert.equal(readingAnswers(different)[0].answer,prediction.facts.context_a);
});

test('inferred horizon has a semantic label without a saved question',()=>{assert.equal(readingAnswers(prediction)[1].label,'Time horizon')});
