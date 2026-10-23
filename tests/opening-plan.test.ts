import test from 'node:test';
import assert from 'node:assert/strict';
import {openingPlan,appendTailored} from '../src/opening-plan';

test('the opening card is immediate, relevant, and includes a horizon only when missing',()=>{
 const paint=openingPlan('Will I finish my painting this month?',{});
 assert.equal(paint.cards[0].question,'How far along are you?');assert.equal(paint.cards.length,1);assert.equal(paint.provided.horizon,'this month');
 const practice=openingPlan('Will I make the team?',{});
 assert.equal(practice.cards[0].question,'How often do you practice?');assert.equal(practice.cards[1].id,'horizon');
 const love=openingPlan('When will I meet someone special?',{},{timing:'love'});
 assert.equal(love.cards[0].question,'How often do you meet new people?');assert.equal(love.cards.length,1);assert.equal(love.provided.horizon,undefined);
 const person=openingPlan('Will Maya finish her project?',{},{personName:'Maya'});
 assert.match(person.cards[0].question,/Maya/);assert.ok(person.cards.every(c=>!c.remember));
});

test('tailored cards preserve the opening answer under its own key and keep all required inputs',()=>{
 const quick=openingPlan('Will I finish my painting this month?',{});
 const tailored={topic:'general' as const,provided:{horizon:'this month'},cards:[{id:'context_1',question:'How many days have you painted?',options:['One','Two','Three','Other'],remember:false}]};
 const appended=appendTailored(quick,tailored);
 assert.deepEqual(appended.cards.map(c=>c.id),['session_open','context_1']);assert.equal(appended.cards[0].question,quick.cards[0].question);assert.deepEqual(appended.provided,tailored.provided);assert.equal(quick.cards[0].id,'context_1');
});
