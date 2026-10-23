import {openSky} from './sky.ts';
import {deliverSocialPushes} from './social-push.ts';
import {hostedAccounting,requireHostedReady} from './hosted-limits.ts';
import {provider} from './provider.ts';
// Cron has a separate shared secret; an app session or public API key cannot run service jobs.
export function scheduledHandler(env:(key:string)=>string|undefined,job:'sky'|'push'){
 return async(request:Request)=>{
  if(request.method!=='POST')return new Response('Use POST.',{status:405});
  const secret=env('SCHEDULER_SECRET');
  if(!secret||request.headers.get('authorization')!==`Bearer ${secret}`)return new Response('Unauthorized.',{status:401});
  try{
   if(job==='push')return Response.json(await deliverSocialPushes(env));
   requireHostedReady(env);
   return Response.json(await openSky(env,provider(env,160,30000,hostedAccounting(env,null,'sky'))));
  }catch{return Response.json({error:'Scheduled job unavailable. Check server configuration.'},{status:503});}
 };
}
