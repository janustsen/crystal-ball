// Focused real-browser recorder regression. Forecast input is a fixture; no model behavior is tested.
import {chromium} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {assertRevealEnd} from './assert-reveal-end.mjs';
const out=process.env.EVIDENCE_DIR||'.local/reveal-recording';
await mkdir(out,{recursive:true});
const modules={};
for(const name of ['RevealClip','ui','retention'])modules[`./${name}`]=ts.transpileModule(await readFile(`src/${name}.${name==='retention'?'ts':'tsx'}`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}}).outputText;
const server=createServer(async(req,res)=>{
 try{
  if(req.url==='/'){res.end('<html><body>Recorder regression</body></html>');return}
  if(!/^\/assets\/[\w/.-]+$/.test(req.url)||req.url.includes('..')){res.writeHead(404).end();return}
  res.end(await readFile(`.${req.url}`));
 }catch{res.writeHead(404).end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
try{
 const page=await browser.newPage({reducedMotion:'reduce'});
 await page.goto(`http://127.0.0.1:${server.address().port}`);
 await page.evaluate(async modules=>{
  const imports={'react-native':{StyleSheet:{create:x=>x},Platform:{OS:'web'}},'expo-asset':{Asset:{fromModule:uri=>({uri})}}};
  const require=name=>{
   if(name.startsWith('../assets/'))return name.slice(2);
   if(modules[name]&&!imports[name]){const module={exports:{}};new Function('require','module','exports',modules[name])(require,module,module.exports);imports[name]=module.exports}
   return imports[name]||{};
  };
  window.recorder=require('./RevealClip');
  for(const name of ['CormorantGaramond','CormorantGaramondItalic'])document.fonts.add(await new FontFace(name,`url(/assets/fonts/${name}.woff2)`).load());
  // Reproduce a rendering pause across the end-card transition while wall-clock time advances.
  const raf=requestAnimationFrame;let start;
  window.requestAnimationFrame=callback=>raf(time=>{start??=time;if(time-start>4500)setTimeout(()=>callback(performance.now()),4000);else callback(time)});
 },modules);
 const bytes=await page.evaluate(async()=>{
  const file=await window.recorder.recordClip({question:'Will I finish my course?',headline:'You will finish your course.',dueDate:'2026-12-01'},await window.recorder.loadLook('classic','classic'),{category:'Learning'});
  return {data:Array.from(new Uint8Array(await file.arrayBuffer())),name:file.name};
 });
 const file=`${out}/${bytes.name}`;await writeFile(file,Buffer.from(bytes.data));
 const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','stream=codec_type,width,height,duration','-of','json',file],{encoding:'utf8'}));
 const video=probe.streams.find(stream=>stream.codec_type==='video');
 assert.equal(video.width,1080);assert.equal(video.height,1920);
 assert.ok(probe.streams.some(stream=>stream.codec_type==='audio'));
 if(video.duration!==undefined)assert.ok(Number(video.duration)>7,'Video must include the complete reveal');
 console.log(probe);
 console.log(await assertRevealEnd(page,file,`${out}/last-title.png`));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
