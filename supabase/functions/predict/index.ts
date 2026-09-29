// Bundle server/ into this function for deployment; local Node uses the same handler.
import { handler } from '../../../server/handler.ts';
Deno.serve(handler((key:string)=>Deno.env.get(key)));
