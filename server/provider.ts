export type JsonSchema = Record<string, unknown>;
export type Validation = boolean | {valid: boolean; feedback: string};
export type Validator = (value: unknown) => Validation | Promise<Validation>;
// `signal` cancels the call, including its repair attempt, once its caller has given up.
export interface ModelProvider { json<T>(system: string, input: unknown, schema: JsonSchema, valid: Validator, signal?: AbortSignal): Promise<T> }

export type ModelMessage = {role: string; content: string};
export function validatedProvider(complete:(messages:ModelMessage[],schema:JsonSchema,signal?:AbortSignal)=>Promise<string>):ModelProvider {
 return {async json<T>(system:string,input:unknown,schema:JsonSchema,valid:Validator,signal?:AbortSignal){
  const messages=[{role:'system',content:`${system}\nReturn exactly one JSON object matching this JSON Schema: ${JSON.stringify(schema)}.`},{role:'user',content:JSON.stringify(input)}];
  for(let attempt=0;attempt<2;attempt++){
   signal?.throwIfAborted();
   const content=await complete(messages,schema,signal);
   let feedback='Check field lengths, word limits, required phrasing, and allowed choices.';
   try{const parsed:unknown=JSON.parse(content);const verdict=await valid(parsed);if(verdict===true||(typeof verdict==='object'&&verdict.valid))return parsed as T;if(typeof verdict==='object')feedback=verdict.feedback}catch{/* One constrained repair, then fail closed. */}
   messages.push({role:'assistant',content:String(content).slice(0,6000)},{role:'user',content:`Repair the previous output. Validation issue: ${feedback}. Return only one complete JSON object satisfying the schema and all system constraints.`});
  }
  throw new Error('The mist is too thick. Please ask again.');
 }};
}

// The shared/deployed factory deliberately cannot launch a local CLI.
export function provider(env:(key:string)=>string|undefined,maxTokens?:number):ModelProvider {
 const mode=env('MODEL_PROVIDER')||'ollama';
 if(!['ollama','hosted'].includes(mode))throw new Error('Unknown model provider.');
 const hosted=mode==='hosted';
 return validatedProvider(async(messages,schema,signal)=>{
    let endpoint = `${env('OLLAMA_URL') || 'http://127.0.0.1:11435'}/api/chat`;
    const key = env('HOSTED_MODEL_KEY'), model = env('HOSTED_MODEL_NAME');
    if (hosted) {
      if (!key || !model || !env('HOSTED_MODEL_URL')) throw new Error('Hosted model is not configured.');
      const url = new URL(env('HOSTED_MODEL_URL')!);
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('Hosted model requires a clean HTTPS base URL.');
      endpoint = `${url.href.replace(/\/$/, '')}/chat/completions`;
    }
    const body = hosted ? {
      model, messages, temperature: 0, max_tokens: maxTokens ?? 1200, stream: false,
      response_format: {type: 'json_schema', json_schema: {name: 'result', strict: true, schema}},
    } : {model: env('OLLAMA_MODEL') || 'qwen3:4b-instruct-2507-q4_K_M', messages, stream: false, think: false, format: schema, options: {temperature: 0, num_predict: maxTokens ?? 600}};
    const response = await fetch(endpoint, {method: 'POST', redirect: 'error', headers: {'Content-Type': 'application/json', ...(hosted ? {Authorization: `Bearer ${key}`} : {})}, body: JSON.stringify(body), signal: signal ? AbortSignal.any([AbortSignal.timeout(45000), signal]) : AbortSignal.timeout(45000)});
    if (!response.ok) throw new Error(`Model unavailable (${response.status}).`);
    const raw = await response.json();
    return hosted ? raw.choices?.[0]?.message?.content : raw.message?.content;

 });
}

export function requireAiConsent(env:(key:string)=>string|undefined,consent:unknown){
 if(env('MODEL_PROVIDER')==='hosted'&&(!env('HOSTED_MODEL_DISCLOSURE')||consent!==env('HOSTED_MODEL_DISCLOSURE')))throw new Error('Please allow sharing with the named AI provider before asking.');
}
