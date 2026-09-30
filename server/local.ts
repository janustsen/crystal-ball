import {createServer} from 'node:http';
import {handler} from './handler.ts';
import {animatedCard} from './share.ts';
const handle=handler(k=>process.env[k]);
const port=Number(process.env.ENGINE_PORT||process.env.CRYSTAL_BALL_ENGINE_PORT||process.env.PORT||8787);
const server=createServer(async(req,res)=>{
 if(req.url==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({app:'crystal-ball',provider:process.env.MODEL_PROVIDER||'ollama'}));return;}
 const chunks:Buffer[]=[];let size=0;
 for await(const chunk of req){size+=chunk.length;if(size>(req.url==='/share'?2_100_000:20000)){res.writeHead(413);res.end();return;}chunks.push(chunk);}
 if(req.url==='/share'&&req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':process.env.APP_ORIGIN||'http://localhost:8087','Access-Control-Allow-Headers':'content-type','Access-Control-Allow-Methods':'POST'});res.end();return;}
 if(req.url==='/share'&&req.method==='POST'){try{const body=JSON.parse(Buffer.concat(chunks).toString());if(typeof body.image!=='string')throw new Error('Missing image');const video=await animatedCard(body.image);res.writeHead(200,{'Content-Type':'video/mp4','Access-Control-Allow-Origin':process.env.APP_ORIGIN||'http://localhost:8087'});res.end(video);}catch{res.writeHead(400,{'Access-Control-Allow-Origin':process.env.APP_ORIGIN||'http://localhost:8087'});res.end('Share export failed.');}return;}
 const response=await handle(new Request(`http://localhost:${port}${req.url}`,{method:req.method,headers:{'Content-Type':'application/json',...(req.headers.authorization?{Authorization:req.headers.authorization}:{})},...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})}));
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());
});
server.listen(port,'127.0.0.1',()=>console.log(`Crystal Ball engine ready http://127.0.0.1:${port}`));
