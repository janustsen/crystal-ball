import {randomBytes} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,chmodSync} from 'node:fs';
import {spawn} from 'node:child_process';
mkdirSync('.local',{recursive:true});
const file='.local/preview-secret';
let secret;
try{secret=readFileSync(file,'utf8').trim()}catch(error){if(error.code!=='ENOENT')throw error;secret=randomBytes(32).toString('hex');writeFileSync(file,secret+'\n',{mode:0o600,flag:'wx'})}
if(!/^[a-f0-9]{64}$/.test(secret))throw new Error('Invalid .local/preview-secret; expected 32 random bytes encoded as hex.');
chmodSync(file,0o600);
console.log('Private-network preview: no page login; engine request token loaded from .local/preview-secret.');
const child=spawn(process.execPath,['node_modules/expo/bin/cli','start','--web','--port','8087',...process.argv.slice(2)],{stdio:'inherit',env:{...process.env,EXPO_PUBLIC_PREVIEW_SECRET:secret}});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??1));
