export function redactEvidence(text,secret){
 const withoutCredentials=text.replace(/(https?:\/\/)[^\s/"<>]*@/gi,'$1');
 return secret?withoutCredentials.split(secret).join('[redacted]'):withoutCredentials;
}
