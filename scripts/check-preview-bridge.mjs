// Runs the actual Metro middleware through HTTP, including remote-origin boundaries.
import assert from 'node:assert/strict';
const base=process.env.PREVIEW_URL||'http://localhost:8087';
assert.equal((await fetch(`${base}/engine/health`).then(r=>r.json())).app,'crystal-ball');
assert.equal((await fetch(`${base}/engine`,{method:'GET'})).status,405);
assert.equal((await fetch(`${base}/engine`,{method:'POST',headers:{origin:'http://localhost:9999','content-type':'application/json'},body:'{}'})).status,403);
const response=await fetch(`${base}/engine`,{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify({action:'plan',question:'Will my IVF succeed?',facts:{},friend:false})});
assert.equal(response.status,200);assert.equal((await response.json()).kind,'blocked');
assert.equal((await fetch(`${base}/engine`,{method:'POST',headers:{origin:base,'content-type':'application/json'},body:'x'.repeat(20001)})).status,413);
console.log('PASS: real preview bridge preserves engine safety, method/origin checks and request size limit.');
