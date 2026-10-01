const {getDefaultConfig}=require('expo/metro-config');
const {request}=require('node:http');
const config=getDefaultConfig(__dirname);
config.resolver.assetExts.push('woff2');
const enhance=config.server.enhanceMiddleware;
// Development-only same-origin bridge: remote previews must not call their own loopback.
config.server.enhanceMiddleware=(middleware,server)=>{
 const nextMiddleware=enhance?enhance(middleware,server):middleware;
 return (req,res,next)=>{
  const paths={'/engine':'/','/engine/health':'/health'};
  if(!Object.hasOwn(paths,req.url))return nextMiddleware(req,res,next);
  if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`&&req.headers.origin!==`https://${req.headers.host}`){res.writeHead(403);res.end();return}
  if(req.method!==(req.url==='/engine/health'?'GET':'POST')){res.writeHead(405);res.end();return}
  const upstream=request({hostname:'127.0.0.1',port:Number(process.env.ENGINE_PORT||8787),path:paths[req.url],method:req.method,headers:{'content-type':'application/json'}},response=>{res.writeHead(response.statusCode,{'content-type':response.headers['content-type']||'application/json'});response.pipe(res)});
  upstream.on('error',()=>{if(!res.headersSent)res.writeHead(503,{'content-type':'application/json'});res.end(JSON.stringify({kind:'error',message:'The engine is resting. Please try again shortly.'}))});
  req.on('aborted',()=>upstream.destroy());res.on('close',()=>upstream.destroy());req.pipe(upstream);
 };
};
module.exports=config;
