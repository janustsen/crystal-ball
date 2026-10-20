// Bundle server/ into this function for deployment; local Node uses the same handler.
import { publicHandler } from '../../../server/hosted-limits.ts';
Deno.serve(publicHandler((key:string)=>Deno.env.get(key)));
