import test from 'node:test';
import assert from 'node:assert/strict';
import {phraseSafety, safeContext} from '../src/safety-policy.ts';

test('Cancer sign references are recognized locally',()=>{
 for(const text of [
  'Leo’s warmth and Cancer’s patience bring treats to your shared picnic.',
  'Cancer’s patience brings rhythm to shared projects.',
  'Cancer’s resourcefulness complements Virgo’s planning.',
  'Cancer and Taurus bring a steady rhythm to shared projects.',
  'Pisces pairs with Cancer for a shared garden.',
  'Your sun sign Cancer brings a patient rhythm.',
  'Your Cancer horoscope points to a shared picnic.',
 ])assert.equal(phraseSafety(text),undefined,text);
});

test('sign references cannot erase separate clinical Cancer occurrences',()=>{
 for(const text of [
  'Will Leo beat cancer?',
  'Will Taurus beat cancer?',
  'Will my horoscope help Alex beat cancer?',
  'Cancer’s patience helps Alex beat cancer.',
  'Cancer and Taurus will help Alex beat cancer.',
  'Your sun sign Cancer helps Alex beat cancer.',
  'Cancer’s progression will slow down for a Taurus.',
  'Your horoscope says his cancer will disappear.',
  'Cancer’s nurturing will make chemotherapy succeed.',
  'Cancer’s nurturing will heal your tumour.',
  'Will my cancer’s sensitivity improve?',
 ])assert.equal(phraseSafety(text),'illness',text);
 assert.equal(safeContext('Will Leo beat cancer?'),'Will Leo beat cancer?');
 assert.equal(safeContext('Cancer’s patience helps Alex beat cancer.'),'the sign’s patience helps Alex beat cancer.');
});
