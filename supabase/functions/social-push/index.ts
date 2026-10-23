import {scheduledHandler} from '../../../server/scheduled.ts';
Deno.serve(scheduledHandler(key=>Deno.env.get(key),'push'));
