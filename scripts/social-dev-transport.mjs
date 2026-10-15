// Local verification adapter only. Real migrations/RLS, simulated Auth/PostgREST.
// Started by SOCIAL_DB_SERVE=1 bash scripts/verify-social-db.sh; never deployed.
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile),sessions=new Map();
const quote=value=>value===null?'null':`'${(typeof value==='object'?JSON.stringify(value):String(value)).replaceAll("'","''")}'`;
const functions={open_sky:['zone'],set_sky_push:['enabled','push_token'],sky_omen_targets:['target_week'],save_sky_omen:['target_week','school','circle','text_value'],reading_balance:['viewer'],charge_reading:['viewer','reading'],set_profile_styles:['viewer','ball','card'],apply_store_entitlements:['viewer','entitled_until','purchases','snapshot_at','year_ahead_source'],grant_ask_bonus:['viewer','bonuses'],set_social_identity:['chosen_handle','chosen_name','chosen_avatar'],search_handles:['prefix'],block_handle:['target_handle'],request_circle_invite:['target','target_handle'],circle_inbox:[],answer_circle_invite:['request_id','accept'],manage_circle:['target','person','operation'],share_circle_moment:['reading','moment'],publish_circle_forecast:['approved_draft'],vote_circle_forecast:['forecast','answer'],circle_vote_tallies:[],set_private_room:['target','enabled'],private_rooms:[],send_sealed_forecast:['approved_draft','target_circle','target_member'],sealed_inbox:[],tonights_sky:['my_school'],set_school:['chosen_school'],school_circle_suggestions:[],publish_star:['approved_draft'],resonate:['star'],create_circle:[],create_school_circle_invite:['previous'],invite_to_circle:['target'],join_circle:['invite'],leave_circle:['target'],circle_checkin:['activity_theme'],react_in_circle:['target_circle','target_member','reaction'],seal_forecast:['approved_draft'],open_forecast:['seal'],circle_people:[],report_star:['star'],block_person:['star','member'],set_friend_consent:['allowed'],authorize_friend_reading:['viewer','target_circle','target_member'],dismiss_friend_notices:[],revoke_forecast:['card'],withdraw_star:['star'],sync_social_profile:['viewer','band','sign','mock_plus'],claim_web_reading:['browser','network','daily_cap'],complete_web_reading:['browser','network','day','expires_at'],release_web_reading:['browser','network','day','expires_at'],claim_chart_weather:['viewer','target_month'],save_chart_weather:['viewer','target_month','weather','weather_chart'],release_chart_weather:['viewer','target_month'],set_social_push:['push_token'],claim_social_pushes:[],claim_sky_pushes:[],finish_social_push:['notification'],finish_sky_push:['notification']};
const columns={golden_forecasts:'user_id,reading_id,created_at',reading_charges:'user_id,reading_id,day,source,uses',circle_moments:'id,circle_id,user_id,kind,day',circle_glows:'circle_id,day',circle_forecasts:'id,circle_id,asker_id,charged_at,question,headline,due_date,created_at',circle_forecast_drafts:'id,user_id,circle_id,question,headline,due_date',circles:'id,owner_id',circle_members:'circle_id,user_id,joined_at,consulted_on,theme',circle_reactions:'circle_id,target_id,user_id,day,emoji',sealed_forecasts:'id,headline,token,opened_at',sky_stars:'id,theme,wording,day',schools:'id,name,city,latitude,longitude',social_profiles:'user_id,age_band,sun_sign,friends_can_ask,plus,school_id,handle,display_name,avatar,sky_push,sky_push_answered',friend_notices:'id,day,seen',social_drafts:'id,user_id,kind,wording,theme'};

function pageSql(url,fields,defaultOrder=''){
 const order=url.searchParams.get('order')||defaultOrder;
 const sorting=order?order.split(',').map(term=>{
  const [column,direction='asc',extra]=term.split('.');
  if(!fields.includes(column)||!['asc','desc'].includes(direction)||extra)throw Error('Unsupported order');
  return `${column} ${direction}`;
 }).join(','):'';
 const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||1000);
 if(!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(limit)||limit<0)throw Error('Unsupported range');
 return `${sorting?`order by ${sorting}`:''} limit ${Math.min(limit,1000)} offset ${offset}`;
}

async function sql(statement,uid){
 const auth=uid==='service'?'set local role service_role;':uid?`set local role authenticated; select set_config('request.jwt.claim.sub',${quote(uid)},true);`:'';
 const {stdout}=await exec(`${process.env.PG_BIN}/psql`,['-X','-At','-v','ON_ERROR_STOP=1','-c',`begin; ${auth} ${statement}; commit;`]);
 const lines=stdout.trim().split('\n').filter(line=>!['BEGIN','SET','COMMIT',uid].includes(line));
 return lines.length?JSON.parse(lines.at(-1)):null;
}
function session(uid){
 const user={id:uid,aud:'authenticated',role:'authenticated',is_anonymous:true,app_metadata:{provider:'anonymous',providers:[]},user_metadata:{},created_at:new Date().toISOString()};
 const header=Buffer.from(JSON.stringify({alg:'none',typ:'JWT'})).toString('base64url');
 const claims=Buffer.from(JSON.stringify({sub:uid,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');
 const access_token=`${header}.${claims}.verification-only`,refresh_token=randomUUID();
 const result={access_token,refresh_token,token_type:'bearer',expires_in:3600,user};
 sessions.set(access_token,result);sessions.set(refresh_token,result);return result;
}
const server=createServer(async(req,res)=>{
 const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':process.env.APP_ORIGIN||'http://localhost:8095','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info,x-supabase-api-version,prefer,accept-profile,content-profile','Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS'};
 if(req.method==='OPTIONS'){res.writeHead(204,headers);res.end();return;}
 try{
  const url=new URL(req.url,'http://127.0.0.1:55329');
  const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>20000)throw new Error('Too large');chunks.push(chunk)}
  const body=chunks.length?JSON.parse(Buffer.concat(chunks).toString()):{};
  let result;
  if(url.pathname==='/auth/v1/signup'&&req.method==='POST'){
   const uid=randomUUID();await sql(`insert into auth.users values(${quote(uid)}); select 'null'::json`);result=session(uid);
  }else if(url.pathname==='/auth/v1/token'&&req.method==='POST'){
   const old=sessions.get(body.refresh_token);if(!old)throw new Error('Unknown fixture session');result=session(old.user.id);
  }else{
   const bearer=req.headers.authorization?.replace(/^Bearer /i,'');
   const service=bearer==='verification-service-only';
   const current=sessions.get(bearer);
   if(!current&&!service)throw new Error('Unknown fixture session');
   const uid=service?'service':current.user.id;
   if(url.pathname==='/auth/v1/user')result=current?.user;
   else if(url.pathname.startsWith('/rest/v1/rpc/')&&req.method==='POST'){
    const name=url.pathname.split('/').at(-1),args=functions[name];if(!args)throw new Error('Unsupported fixture RPC');
    const call=`public.${name}(${args.filter(key=>Object.hasOwn(body,key)).map(key=>`${key} => ${quote(body[key])}`).join(',')})`;
    result=await sql(['open_sky','sky_omen_targets','tonights_sky','circle_people','school_circle_suggestions','search_handles','circle_inbox','circle_vote_tallies','sealed_inbox','private_rooms','claim_social_pushes','claim_sky_pushes'].includes(name)?`select coalesce(jsonb_agg(q),'[]') from (select * from ${call} ${pageSql(url,({circle_inbox:['id'],circle_vote_tallies:['forecast_id'],sealed_inbox:['token'],private_rooms:['circle_id']})[name]||[])}) q`:`select coalesce(to_jsonb(${call}),'null'::jsonb)`,uid);
   }else{
    const table=url.pathname.split('/').at(-1);if(!Object.hasOwn(columns,table))throw new Error('Unsupported fixture table');
    const filters=[];
    for(const [key,value] of url.searchParams){
     if(['id','reading_id','user_id','circle_id','day','expires_at','revoked','withdrawn','seen'].includes(key)){
      const op=value.startsWith('eq.')?'=':value.startsWith('gt.')?'>':null;
      if(!op)throw new Error('Unsupported filter');filters.push(`${key}${op}${quote(value.slice(3))}`);
     }
    }
    const where=filters.length?`where ${filters.join(' and ')}`:'';
    if(req.method==='POST'&&service&&['social_drafts','circle_forecast_drafts','golden_forecasts'].includes(table)){
     const keys=table==='golden_forecasts'?['user_id','reading_id']:table==='social_drafts'?['user_id','kind','wording','theme']:['user_id','circle_id','question','headline','due_date'];
     result=await sql(`with inserted as (insert into public.${table}(${keys.join(',')}) values(${keys.map(key=>quote(body[key])).join(',')}) ${table==='golden_forecasts'&&req.headers.prefer?.split(',').some(value=>value.trim()==='resolution=ignore-duplicates')?'on conflict do nothing':''} returning *) select coalesce(jsonb_agg(inserted),'[]'::jsonb) from inserted`,uid);
    }else if(req.method==='DELETE'&&['sky_stars','sealed_forecasts'].includes(table)&&filters.length){
     result=await sql(`delete from public.${table} ${where}; select 'null'::json`,uid);
    }else if(req.method==='GET'){
     const order=pageSql(url,columns[table].split(','),table==='circle_members'?'joined_at.asc':'');
     result=await sql(`select coalesce(jsonb_agg(q),'[]') from (select ${columns[table]} from public.${table} ${where} ${order}) q`,uid);
    }else throw new Error('Unsupported fixture request');
   }
  }
  res.writeHead(200,headers);res.end(JSON.stringify(result));
 }catch(error){res.writeHead(400,headers);res.end(JSON.stringify({message:String(error.message).split('\n').find(line=>line.includes('ERROR:'))?.replace(/^.*ERROR:\s*/,'')||'Verification transport unavailable',code:'verification'}));}
});
const port=Number(process.env.SOCIAL_DB_PORT||55329);
server.listen(port,'127.0.0.1',()=>console.log(`Verification-only Auth/PostgREST adapter: http://127.0.0.1:${server.address().port} (real PostgreSQL RLS)`));
