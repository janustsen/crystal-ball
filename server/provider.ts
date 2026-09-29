export type JsonSchema = Record<string, unknown>;
export interface ModelProvider { json<T>(system: string, input: unknown, schema: JsonSchema, valid: (value: unknown) => value is T): Promise<T> }
export function provider(env: (key: string) => string | undefined): ModelProvider {
  const hosted = env('MODEL_PROVIDER') === 'hosted';
  return {
    async json<T>(system: string, input: unknown, schema: JsonSchema, valid: (value: unknown) => value is T) {
      if (hosted && !env('HOSTED_MODEL_KEY')) throw new Error('Hosted model key is not configured.');
      const messages = [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify(input) }];
      for (let attempt = 0; attempt < 2; attempt++) {
        const body = hosted ? { model: env('HOSTED_MODEL_NAME'), messages, response_format: { type: 'json_schema', json_schema: { name: 'result', strict: true, schema } }, temperature: 0 } : { model: env('OLLAMA_MODEL') || 'qwen3:4b-instruct-2507-q4_K_M', messages, stream: false, think: false, format: schema, options: { temperature: 0, num_predict: 600 } };
        const response = await fetch(hosted ? `${env('HOSTED_MODEL_URL')}/chat/completions` : `${env('OLLAMA_URL') || 'http://127.0.0.1:11435'}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(hosted ? { Authorization: `Bearer ${env('HOSTED_MODEL_KEY')}` } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(45000) });
        if (!response.ok) throw new Error(`Model unavailable (${response.status}).`);
        const raw = await response.json();
        const content = hosted ? raw.choices?.[0]?.message?.content : raw.message?.content;
        try { const parsed: unknown = JSON.parse(content); if (valid(parsed)) return parsed; } catch { /* Malformed outputs earn one constrained repair, never a rendered fallback. */ }
        messages.push({ role: 'user', content: 'Your output did not match the required JSON schema. Return only one complete valid JSON object matching it. Do not include commentary.' });
      }
      throw new Error('The mist is too thick. Please ask again.');
    },
  };
}
