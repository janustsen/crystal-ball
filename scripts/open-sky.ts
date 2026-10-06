import {openSky} from '../server/sky.ts';
import {provider} from '../server/provider.ts';
const env=(key:string)=>process.env[key];
console.log(await openSky(env,provider(env,160)));
