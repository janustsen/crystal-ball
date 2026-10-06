export type Facts = Record<string, string>;
export type Topic = 'money' | 'learning' | 'relocation' | 'growth' | 'sports' | 'world' | 'general';
export type Card = { id: string; question: string; options: string[]; remember: boolean };
export type Plan = { topic: Topic; cards: Card[]; provided: Facts };
export type Source = { title: string; url: string; date: string; publisher: string };
export type FriendTarget = {circle:string;member:string;firstName:string};
export type BallStyle = 'classic' | 'smoke' | 'aurora' | 'obsidian' | 'gold';
export type CardStyle = 'classic' | 'gold' | 'obsidian';
export type StyleOf = { ball: BallStyle; card: CardStyle };
export type Prediction = { circleId?: string; dueDate?: string; astrology?: string; deeperWhy?: string; personName?: string; id: string; question: string; headline: string; createdAt: string; label: string; why: string; facts: Facts; sources: Source[]; assumptions: string[]; friend: boolean; golden?: boolean; friendTarget?: FriendTarget; outcome?: 'yes' | 'no' | 'pending'; checkedInAt?: string };
export type SafetyCategory = 'death' | 'self_harm' | 'illness' | 'pregnancy' | 'legal' | 'person';
export type Result<T> = { kind: 'ok'; value: T } | { kind: 'blocked'; category: SafetyCategory; message: string } | { kind: 'error'; message: string };
export type Flow = { stage: 'approach' } | { stage: 'listening' } | { stage: 'ask' } | { stage: 'planning'; question: string } | { stage: 'cards'; question: string; plan: Plan; answers: Facts; index: number } | { stage: 'research'; question: string; plan: Plan; answers: Facts } | { stage: 'reveal'; prediction: Prediction } | { stage: 'blocked'; message: string; category: SafetyCategory } | { stage: 'error'; message: string; question: string; retry?: {plan: Plan; answers: Facts} };
// plus only sets golden odds in the unmetered loopback preview; a metered server uses its own plan.
export type ReadingContext = { localDate?: string; viewerBirthday?: string; ageConfirmed?: boolean; personName?: string; plus?: boolean; viewerChart?: {moonSign:string;risingSign:string} };
export type AccountState = { balanceSnapshot?: {owner:string;asOf:string}; backupOwner?: string; birthday?: string; sunSign: string|null; ageBand: 'teen'|'adult'|null; birthTime?: string; birthPlace?: string; moonSign?: string; risingSign?: string; chartWeather?: {month:string;text:string}; narrationMuted?: boolean; ageConfirmed?: boolean; onboardingBlocked?: boolean; onboardingDone?: boolean; facts: Facts; history: Prediction[]; credits: number; plus: boolean; usage: { day: string; count: number }; reduceMotion: boolean; ambientSound?: boolean; ballStyle?: BallStyle; cardStyle?: CardStyle; largeText: boolean };
