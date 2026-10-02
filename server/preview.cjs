const {request}=require('node:http');
const {timingSafeEqual}=require('node:crypto');
const same=(a,b)=>typeof a==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
// Login-free private-network preview; the public client token is not user authentication.
module.exports=function previewBridge(next,secret){
 const paths={'/engine':'/','/engine/share':'/share','/engine/social':'/social','/engine/health':'/health'};
 return (req,res,done)=>{
  const engine=Object.hasOwn(paths,req.url);
  if(!engine)return next(req,res,done);
  const authorized=secret&&same(req.headers['x-preview-token'],secret);
  const origin=`http://${req.headers.host}`,secureOrigin=`https://${req.headers.host}`;
  if(!authorized||!req.headers.origin){
   res.writeHead(401,{'Cache-Control':'no-store','Content-Type':'application/json'});res.end(JSON.stringify({kind:'error',message:'Preview authentication required.'}));return;
  }
  if(req.headers.origin&&req.headers.origin!==origin&&req.headers.origin!==secureOrigin){res.writeHead(403);res.end();return}
  if(req.method!==(req.url==='/engine/health'?'GET':'POST')){res.writeHead(405);res.end();return}
  const upstream=request({hostname:'127.0.0.1',port:Number(process.env.ENGINE_PORT||process.env.CRYSTAL_BALL_ENGINE_PORT||8787),path:paths[req.url],method:req.method,headers:{'content-type':'application/json',...(req.headers.authorization?{authorization:req.headers.authorization}:{})}},response=>{res.writeHead(response.statusCode,{'content-type':response.headers['content-type']||'application/json'});response.pipe(res)});
  upstream.on('error',()=>{if(!res.headersSent)res.writeHead(503,{'content-type':'application/json'});res.end(JSON.stringify({kind:'error',message:'The engine is resting. Please try again shortly.'}))});
  req.on('aborted',()=>upstream.destroy());res.on('close',()=>upstream.destroy());req.pipe(upstream);
 };
};
