import {openSky} from '../server/sky.ts';
import {provider} from '../server/provider.ts';
const env=(key:string)=>process.env[key];
// An optional ISO time replays a missed run for that moment's week.
console.log(JSON.stringify(await openSky(env,provider(env,160),process.argv[2]?new Date(process.argv[2]):new Date())));
