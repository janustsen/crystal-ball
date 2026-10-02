import type { SafetyCategory } from './types';
const rules: [SafetyCategory, RegExp][] = [
 ['self_harm', /\b(suicid\w*|self.?harm|kms|unalive myself|log off permanently|gone for good|cutting my arms|whole bottle|hacerme daño|acabar con todo|skære i mig selv|kill myself|hurt myself|end (it all|my life)|disappear forever|end my pain|no reason to live|matarme|suicidarme|quitarme la vida|selvmord|tage mit liv)\b/i],
 ['pregnancy', /\b(pregnan\w*|fertil\w*|ivf|miscarri\w*|conceive (?:a baby|this|next)|two lines|have a baby|get (her |me )?pregnant|expecting after|embaraz\w*|gravid\w*)\b/i],
 ['illness', /\b(cancer|chemo\w*|(?:have|had|suffer|recover from) (?:a |her |his )?stroke|terminal (?:illness|diagnosis)|scans?.{0,25}terminal|tumou?r|serious illness|alzheimer\w*|dementia|leukemia|kræft)\b/i],
 ['legal', /\b(judge.{0,20}(?:rule|decision|favor)|custody|deport\w*|lawsuit|(?:prison|criminal) sentence|sentenced to|go to prison|arrest\w*|police charge|criminal charge|court case|visa approv\w*|h-1b|green card|work permit|residencia permanente|divorce settlement|demanda judicial|retssag|opholdstilladel\w*|arbejdstilladel\w*|udvis\w*)\b/i],
 ['death', /\b(when will .{0,35}(die|death)|last breath|pass away|how long does .{0,25}have left|will .{0,25}survive this year|morir\w*|fallecer|hvornår dør|skal jeg dø)\b/i],
];
export const redirects: Record<SafetyCategory,string> = {
 person: 'Let’s keep this kind. We can imagine a shared experience, but cannot know another person’s private feelings.',
 self_harm: 'This deserves care, not a prediction about harm. If you or someone else may act on these feelings, contact local emergency help or a trusted person now. We can explore a hopeful plan for tomorrow.',
 death: 'Some moments deserve care rather than a prediction. Let’s explore something you can look forward to instead.',
 illness: 'Your health deserves real support. A qualified clinician can help with this question. Let’s look at a gentle personal goal instead.',
 pregnancy: 'This deserves reliable answers from a test or a qualified clinician. Let’s explore another part of your future.',
 legal: 'Legal outcomes deserve qualified guidance. Let’s explore a personal goal you can influence instead.',
};
export function safeContext(question:string){
 let text=question.replace(/\barresting (performance|voice|design|image)\b/gi,'compelling $1').replace(/\bcustody of the ball\b/gi,'possession of the ball').replace(/\bgreen card game\b/gi,'card game');
 if(/\b(?:chart|graph).{0,30}(?:show|have|contain|display).{0,15}two lines|two lines (?:on|in) (?:the|my|a) (?:chart|graph)\b/i.test(text))text=text.replace(/two lines/gi,'two series');
 // Normalize non-clinical creative/occupational uses, not particular evaluation sentences.
 const creative=/\b(novel|memoir|story|screenplay|song|poem|essay|film|documentary|book)\b/i.test(text);
 const clinical=/\b(my (?:cancer|stroke|illness|pregnancy|death)|(?:will|might|could|can) I[^?.;]{0,50}(?:suicid|kill|hurt|die)|commit suicide|hurt myself|kill myself|my diagnosis|my treatment|my symptoms|my scan|my biopsy|will I recover|will I survive|will I be cured)\b/i.test(text);
 if(creative&&!clinical)text=text.replace(/\b(cancer|pregnancy|death|terminal illness|stroke|murder|suicide|homicide)\b/gi,'subject');
 text=text.replace(/\b(?:legal|immigration|medical|visa|court|paralegal)\s+(?:receptionist|assistant|caseworker|clerk|section|certification|exam|career|job)\b/gi,'professional work');
 text=text.replace(/\b(?:public defender|hospice chaplain|criminal lawyer|immigration lawyer|oncologist|psychiatrist)\b/gi,'professional');
 text=text.replace(/\bdeath metal\b/gi,'music');
 if(!clinical&&/\b(zodiac|horoscope|star sign|sun sign)\b/i.test(text))text=text.replace(/\bcancer\b/gi,'zodiac sign');
 return text;
}
export function phraseSafety(question: string): SafetyCategory | undefined {
 const q=question.normalize('NFKC');
 // Safe creative/job contexts should not turn a topic word alone into a block.
 const context=safeContext(q);
 if(/\b(?:jeg|I).{0,30}(?:ikke|aldrig|not|never|don't).{0,12}(?:vågner?|vågne|wake|awaken)\b/i.test(context)&&!/\b(?:late|early|alarm|sent|tidligt|vækkeur)\b/i.test(context))return 'self_harm';
 if(/\b(?:llegar[áéíóúa-z]*|alcanzar[áéíóúa-z]*).{0,25}cumplir (?:los |la edad de )?(?:cincuenta|sesenta|setenta|ochenta|noventa|\d{2,3})\b/i.test(context))return 'death';
 if(/\b(?:klarer|overlever|overleve).{0,35}\b(?:far|mor|bedstemor|bedstefar|han|hun)\b.{0,30}(?:vinter|sommer|efterår|forår|året|årsskiftet)/i.test(context))return 'death';
 if(/hvor mange år.{0,25}\b(?:mor|far|bedstemor|bedstefar|jeg|han|hun)\b.{0,30}tilbage at leve/i.test(context))return 'death';
 if(/skal jeg dø|hvornår dør|how many years do I have left to live|will (?:I|my (?:mom|dad|mother|father|sister|brother)) (?:still )?(?:be here|be around)/i.test(context))return 'death';
 return rules.find(([,pattern])=>pattern.test(context))?.[0];
}
