// One optional onboarding tap, saved on-device. The engine keeps only a count per day and answer,
// with no account, device or network attached, so it measures campaigns without tracking anyone.
export const heardFromSources=['TikTok','Instagram','A friend','App Store','Somewhere else'] as const;
export type HeardFrom=typeof heardFromSources[number];
export const isHeardFrom=(value:unknown):value is HeardFrom=>heardFromSources.includes(value as HeardFrom);

// Keep legacy values accepted by the tally and old clients; the onboarding choices use the launch wording.
export const heardFromChoices=heardFromSources.filter(source=>source!=='App Store');
export const heardFromLabel=(source:HeardFrom)=>source==='Somewhere else'?'Other':source;
