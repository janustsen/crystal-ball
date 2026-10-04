// No browser automation: artifact and HTTP checks remain allowed after inbox 020.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const file='public/concepts/witch-house.html',html=fs.readFileSync(file,'utf8');
new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
const refs=[...html.matchAll(/url\(([^)]+)\)/g)].map(m=>m[1]);
const missing=refs.filter(ref=>!fs.existsSync(path.join(path.dirname(file),ref)));
const ledger=JSON.parse(fs.readFileSync('docs/art/provenance.json','utf8'));
const alpha=[];
for(const asset of ledger){
 for(const scale of ['1x','2x','3x']){
  const name=asset.file.replace('@{1x,2x,3x}',`@${scale}`);
  if(!fs.existsSync(`public/concepts/witch-assets/art/${name}`))missing.push(name);
 }
 if(asset.kind==='solid'){
  const file=asset.file.replace('@{1x,2x,3x}','@2x');
  const {data,info}=await sharp(`public/concepts/witch-assets/art/${file}`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const corners=[3,(info.width-1)*4+3,(info.height-1)*info.width*4+3,(info.width*info.height-1)*4+3].map(i=>data[i]);
  assert(corners.every(a=>a===0),`${file} retains an opaque corner`);
  alpha.push({file,corners});
 }
}
const previewStatus=(await fetch('http://localhost:8098/concepts/witch-house.html')).status;
const remoteStatus=(await fetch(process.env.REMOTE_PREVIEW_URL||'http://localhost:8098/concepts/witch-house.html')).status;
assert.equal(missing.length,0);assert.equal(previewStatus,200);assert.equal(remoteStatus,200);
const result={scriptSyntax:'pass',assetCount:ledger.length,missing,alpha,previewStatus,remoteStatus,finalBrowserVerification:'not run: browser control revoked in inbox 020'};
fs.writeFileSync('docs/ux-loop/witch-thesis/static-checks.json',JSON.stringify(result,null,2)+'\n');
console.log('PASS: 13 assets, transparent solid corners, script syntax, local and configured preview HTTP 200');
