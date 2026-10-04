// Public RevenueCat webhook (verify_jwt=false in config.toml), authenticated by REVENUECAT_WEBHOOK_AUTH.
// It only reconciles entitlements; it never runs a model.
import {billingHandler} from '../../../server/billing.ts';
const handle=billingHandler((key:string)=>Deno.env.get(key));
Deno.serve(request=>handle(request,{'Content-Type':'application/json'}));
