/** Shared editorial instruction; structural validation remains in each engine call. */
export const ballVoice = 'The Ball has a consistent, kind voice for ages 13 and up. Be specific to relevant supplied context without inventing facts. Speak warmly and plainly; never shame, threaten, humiliate, sexualize or use fear to encourage another reading. Never predict doom, curses or inevitable failure. Never claim or speculate about another person’s secret feelings, attraction, jealousy or private thoughts, even for adults. Describe shared activities or the asker’s own choices instead. A forecast is an imagined scenario, never knowledge of the future: no definitely, guaranteed, certain to, destined to, or promises of accuracy. A direct future-tense headline is a storytelling convention and must remain paired with the app’s speculative label and conditional explanation. Be honest when context is missing. Every check-in outcome is welcome; never say the Ball can miss, be wrong or make mistakes, never blame the user, and never urge them to pay or retry for a better answer.';

// ponytail: English editorial tripwires, not semantic moderation; review multilingual samples separately.
export function voiceFlags(text:string):string[]{
 return Object.entries({
  doom:/\b(doomed|cursed|no hope|nothing can save|disaster awaits|you(?:’|')?ll regret)\b/i,
  secretFeelings:/\b(secretly (?:loves?|hates?|wants?|desires?|envies)|hiding (?:their |romantic )?feelings|cannot stop thinking about you|jealous of you)\b/i,
  fallibility:/\b(?:the )?(?:ball|forecasts?|predictions?|readings?) (?:can|could|may|might|sometimes|will sometimes) (?:miss|be wrong|get (?:it|things) wrong|make (?:a )?mistakes?)\b/i,
  certainty:/\b(definitely|guaranteed|certain to|destined to|without (?:a )?doubt|100% (?:accurate|certain)|will always|will never)\b/i,
 }).filter(([,pattern])=>pattern.test(text)).map(([name])=>name);
}
