import test from 'node:test';
import assert from 'node:assert/strict';
import {checkInDueDate,forecastDueDate} from '../src/due-date';

test('check-ins clamp both bounds without shortening the forecast horizon',()=>{
 assert.equal(checkInDueDate('this year','2026-12-31'),'2027-01-01');
 assert.equal(checkInDueDate('this week','2026-10-04'),'2026-10-05');
 assert.equal(checkInDueDate('in 10 years','2026-10-03'),'2027-10-03');
 assert.equal(checkInDueDate('in 1 year','2028-02-29'),'2029-02-28');
 assert.equal(checkInDueDate('tomorrow','2026-10-03'),'2026-10-04');
 assert.equal(checkInDueDate('in 6 months','2026-10-03'),'2027-04-03');
 assert.equal(forecastDueDate('in 10 years','2026-10-03'),'2036-10-03');
});

