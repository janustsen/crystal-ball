export type JsonSchema = Record<string, unknown>;
export type Validation=boolean|{valid:boolean;feedback:string};
export type Validator=(value:unknown)=>Validation|Promise<Validation>;
export interface ModelProvider { json<T>(system: string, input: unknown, schema: JsonSchema, valid: Validator): Promise<T> }
export function provider(env: (key: string) => string | undefined): ModelProvider {
  const hosted = env('MODEL_PROVIDER') === 'hosted';
  return {
    async json<T>(system: string, input: unknown, schema: JsonSchema, valid: Validator) {
      if (hosted && !env('HOSTED_MODEL_KEY')) throw new Error('Hosted model key is not configured.');
      const messages = [{ role: 'system', content: `${system}\nReturn exactly one JSON object matching this JSON Schema: ${JSON.stringify(schema)}.` }, { role: 'user', content: JSON.stringify(input) }];
      for (let attempt = 0; attempt < 2; attempt++) {
        const body = hosted ? { model: env('HOSTED_MODEL_NAME'), messages, response_format: { type: 'json_schema', json_schema: { name: 'result', strict: true, schema } }, temperature: 0 } : { model: env('OLLAMA_MODEL') || 'qwen3:4b-instruct-2507-q4_K_M', messages, stream: false, think: false, format: schema, options: { temperature: 0, num_predict: 600 } };
        const response = await fetch(hosted ? `${env('HOSTED_MODEL_URL')}/chat/completions` : `${env('OLLAMA_URL') || 'http://127.0.0.1:11435'}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(hosted ? { Authorization: `Bearer ${env('HOSTED_MODEL_KEY')}` } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(45000) });
        if (!response.ok) throw new Error(`Model unavailable (${response.status}).`);
        const raw = await response.json();
        const content = hosted ? raw.choices?.[0]?.message?.content : raw.message?.content;
        let feedback='Check field lengths, word limits, required phrasing, and allowed choices.';
        try { const parsed: unknown = JSON.parse(content); const verdict=await valid(parsed); if(verdict===true||(typeof verdict==='object'&&verdict.valid))return parsed as T; if(typeof verdict==='object')feedback=verdict.feedback; } catch { /* Malformed outputs earn one constrained repair, never a rendered fallback. */ }
        messages.push({ role: 'assistant', content: String(content).slice(0,6000) }, { role: 'user', content: `Repair the previous output. Validation issue: ${feedback}. Return only one complete JSON object satisfying the schema and all system constraints.` });
      }
      throw new Error('The mist is too thick. Please ask again.');
    },
  };
}
