const {withXcodeProject}=require('expo/config-plugins');
// GUI archives and CLI builds use the same flag; Metro workers inherit it during Release bundling.
module.exports=config=>withXcodeProject(config,config=>{
 const phases=config.modResults.hash.project.objects.PBXShellScriptBuildPhase;
 let found=false;
 for(const phase of Object.values(phases)){
  if(typeof phase!=='object'||!String(phase.name).includes('Bundle React Native code and images'))continue;
  found=true;
  const script=JSON.parse(phase.shellScript);
  const flag='if [ "$CONFIGURATION" = "Release" ]; then export CRYSTAL_BALL_RELEASE=true; fi\n';
  if(!script.includes('export CRYSTAL_BALL_RELEASE=true'))phase.shellScript=JSON.stringify(flag+script);
 }
 if(!found)throw new Error('Release bundling phase was not found. Review the Xcode template.');
 return config;
});
