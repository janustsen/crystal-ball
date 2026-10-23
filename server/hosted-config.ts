export const deepinfra={url:'https://api.deepinfra.com/v1/openai',model:'Qwen/Qwen3.5-9B',contextTokens:262144} as const;
export const cloudflare={model:'@cf/meta/llama-3.3-70b-instruct-fp8-fast',contextTokens:24000,inputMicro:26668,outputMicro:204805} as const;
export function cloudflareEndpoint(account:string){
 if(!/^[a-f0-9]{32}$/.test(account))throw new Error('Invalid Cloudflare account configuration.');
 return `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${cloudflare.model}`;
}
