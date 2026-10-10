const {getDefaultConfig}=require('expo/metro-config');
const previewBridge=require('./server/preview.cjs');
const config=getDefaultConfig(__dirname);
config.resolver.assetExts.push('woff2','bin');
const enhance=config.server.enhanceMiddleware;
config.server.enhanceMiddleware=(middleware,server)=>previewBridge(enhance?enhance(middleware,server):middleware,process.env.EXPO_PUBLIC_PREVIEW_SECRET);
module.exports=config;
