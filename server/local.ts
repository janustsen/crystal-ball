import {createServer} from 'node:http';
import {handler} from './handler.ts';
import {codexProvider} from './codex-provider.ts';
const env=(key:string)=>process.env[key];
const handle=handler(env,env('MODEL_PROVIDER')==='codex'?codexProvider(env):undefined);
const port=Number(process.env.ENGINE_PORT||process.env.CRYSTAL_BALL_ENGINE_PORT||process.env.PORT||8787);
const server=createServer(async(req,res)=>{
 if(req.url==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({app:'crystal-ball',provider:process.env.MODEL_PROVIDER||'ollama'}));return;}
 const chunks:Buffer[]=[];let size=0;
 for await(const chunk of req){size+=chunk.length;if(size>20000){res.writeHead(413);res.end();return;}chunks.push(chunk);}
 const response=await handle(new Request(`http://localhost:${port}${req.url}`,{method:req.method,headers:{'Content-Type':'application/json','X-Forwarded-For':req.socket.remoteAddress||'',...(req.headers.authorization?{Authorization:req.headers.authorization}:{})},...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})}));
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());
});
server.listen(port,'127.0.0.1',()=>console.log(`Crystal Ball engine ready http://127.0.0.1:${port}`));
