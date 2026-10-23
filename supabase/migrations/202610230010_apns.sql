-- Expo relay tokens cannot be sent directly to APNs. Devices register a new native token.
delete from public.social_push_tokens;
alter table public.social_push_tokens drop constraint social_push_tokens_token_check;
alter table public.social_push_tokens add constraint social_push_tokens_token_check check(token ~ '^[a-fA-F0-9]+$' and length(token) between 64 and 512);
