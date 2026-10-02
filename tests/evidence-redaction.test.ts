import {test} from 'node:test';
import assert from 'node:assert/strict';
import {redactEvidence} from '../scripts/redact-evidence.mjs';

test('published evidence strips URL credentials and the preview token without changing measurements',()=>{
 const secret='synthetic-preview-secret';
 for(const url of [`http://preview:${secret}@localhost:8099/`,'HTTPS://alice:password@example.com/path?q=1']){
  const input={url,message:`token=${secret}`,fps:60.2};
  const output=redactEvidence(JSON.stringify(input),secret);
  assert.ok(!output.includes(secret));
  const parsed=JSON.parse(output),clean=new URL(parsed.url),original=new URL(url);
  assert.equal(clean.username,'');assert.equal(clean.password,'');
  original.username='';original.password='';
  assert.equal(clean.href,original.href);
  assert.equal(parsed.message,'token=[redacted]');assert.equal(parsed.fps,60.2);
 }
 assert.equal(redactEvidence(`URL: http://user:pass@localhost/\nToken: ${secret}\nCLS: 0.02`,secret),'URL: http://localhost/\nToken: [redacted]\nCLS: 0.02');
 assert.equal(redactEvidence('no credentials; 60 fps',''),'no credentials; 60 fps');
});
