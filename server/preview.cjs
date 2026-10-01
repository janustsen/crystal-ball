const {request}=require('node:http');
const {timingSafeEqual}=require('node:crypto');
const same=(a,b)=>typeof a==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
// The injected client key is only private if the bundle itself requires authentication.
module.exports=function previewBridge(next,secret){
 const paths={'/engine':'/','/engine/share':'/share','/engine/health':'/health'};
 return (req,res,done)=>{
  const engine=Object.hasOwn(paths,req.url);
  const authorized=secret&&(engine?same(req.headers['x-preview-token'],secret):same(req.headers.authorization,`Basic ${Buffer.from(`preview:${secret}`).toString('base64')}`));
  const origin=`http://${req.headers.host}`,secureOrigin=`https://${req.headers.host}`;
  if(!authorized||(engine&&!req.headers.origin)){
   res.writeHead(401,{'Cache-Control':'no-store',...(engine?{}:{'WWW-Authenticate':'Basic realm="Crystal Ball preview"'}),'Content-Type':'application/json'});res.end(JSON.stringify({kind:'error',message:'Preview authentication required.'}));return;
  }
  if(!engine)return next(req,res,done);
  if(req.headers.origin&&req.headers.origin!==origin&&req.headers.origin!==secureOrigin){res.writeHead(403);res.end();return}
  if(req.method!==(req.url==='/engine/health'?'GET':'POST')){res.writeHead(405);res.end();return}
  const upstream=request({hostname:'127.0.0.1',port:8787,path:paths[req.url],method:req.method,headers:{'content-type':'application/json'}},response=>{res.writeHead(response.statusCode,{'content-type':response.headers['content-type']||'application/json'});response.pipe(res)});
  upstream.on('error',()=>{if(!res.headersSent)res.writeHead(503,{'content-type':'application/json'});res.end(JSON.stringify({kind:'error',message:'The engine is resting. Please try again shortly.'}))});
  req.on('aborted',()=>upstream.destroy());res.on('close',()=>upstream.destroy());req.pipe(upstream);
 };
};
