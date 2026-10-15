// "Where did you hear about us?": one optional onboarding tap. The engine keeps only a count per day and answer,
// with no account, device or network attached, so it measures campaigns without tracking anyone.
export const heardFromSources=['TikTok','Instagram','A friend','App Store','Somewhere else'] as const;
export type HeardFrom=typeof heardFromSources[number];
export const isHeardFrom=(value:unknown):value is HeardFrom=>heardFromSources.includes(value as HeardFrom);
