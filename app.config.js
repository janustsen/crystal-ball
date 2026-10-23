// A personal device build that points the engine at the private tailnet preview (plain http on a *.ts.net host)
// gets an ATS exception for exactly that host; every other build keeps app.json's local-networking-only policy.
module.exports=({config})=>{
 if(process.env.CRYSTAL_BALL_RELEASE==='true'){
  const base=process.env.EXPO_PUBLIC_SUPABASE_URL||'';
  let hosted;try{hosted=new URL(base)}catch{throw new Error('Release requires EXPO_PUBLIC_SUPABASE_URL.');}
  if(hosted.protocol!=='https:'||!hosted.hostname.endsWith('.supabase.co')||hosted.pathname!=='/'||hosted.search||hosted.hash||hosted.username||hosted.password)throw new Error('Release requires a hosted Supabase project.');
  const endpoint=`${hosted.origin}/functions/v1/predict`;
  if(process.env.EXPO_PUBLIC_ENGINE_URL!==endpoint)throw new Error('Release EXPO_PUBLIC_ENGINE_URL must be the Supabase predict function.');
  if(process.env.EXPO_PUBLIC_PREVIEW_SECRET)throw new Error('Remove the preview secret from release builds.');
  if(!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY||!process.env.EXPO_PUBLIC_AI_PROVIDER_NAME)throw new Error('Release requires Supabase public key and AI disclosure.');
  if(process.env.EXPO_PUBLIC_WEB_ORIGIN!=='https://crystalball.janustsen.com')throw new Error('Release requires the Crystal Ball web origin.');
  return config;
 }
 let url;try{url=new URL(process.env.EXPO_PUBLIC_ENGINE_URL||'')}catch{return config}
 if(url.protocol!=='http:'||!url.hostname.endsWith('.ts.net'))return config;
 const ats=config.ios.infoPlist.NSAppTransportSecurity;
 return {...config,ios:{...config.ios,infoPlist:{...config.ios.infoPlist,NSAppTransportSecurity:{...ats,NSExceptionDomains:{[url.hostname]:{NSExceptionAllowsInsecureHTTPLoads:true}}}}}};
};
