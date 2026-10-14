import test from 'node:test';
import assert from 'node:assert/strict';
import {phraseSafety} from '../src/safety-policy.ts';

test('a person named Leo does not exempt clinical cancer wording',()=>{
 assert.equal(phraseSafety('Will Leo beat cancer?'),'illness');
});
