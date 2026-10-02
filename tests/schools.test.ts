import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nearbySchools,searchSchools} from '../src/schools';
const schools=[{id:'near',name:'Lowell High School',city:'San Francisco',latitude:37.73,longitude:-122.48},{id:'far',name:'Far School',city:'Elsewhere',latitude:51.5,longitude:0}];
test('school catalog search and coarse matching return schools, never user coordinates',()=>{
 assert.deepEqual(searchSchools(schools,' LOWELL ').map(s=>s.id),['near']);
 assert.deepEqual(searchSchools(schools,'missing'),[]);
 assert.deepEqual(nearbySchools(schools,37.735192,-122.481237),[schools[0]]);
 assert.deepEqual(nearbySchools(schools,0,0),[]);
 assert.deepEqual(nearbySchools(schools,NaN,NaN),[]);
});
