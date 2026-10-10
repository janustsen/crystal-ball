// A personal device build that points the engine at the private tailnet preview (plain http on a *.ts.net host)
// gets an ATS exception for exactly that host; every other build keeps app.json's local-networking-only policy.
module.exports=({config})=>{
 let url;try{url=new URL(process.env.EXPO_PUBLIC_ENGINE_URL||'')}catch{return config}
 if(url.protocol!=='http:'||!url.hostname.endsWith('.ts.net'))return config;
 const ats=config.ios.infoPlist.NSAppTransportSecurity;
 return {...config,ios:{...config.ios,infoPlist:{...config.ios.infoPlist,NSAppTransportSecurity:{...ats,NSExceptionDomains:{[url.hostname]:{NSExceptionAllowsInsecureHTTPLoads:true}}}}}};
};
