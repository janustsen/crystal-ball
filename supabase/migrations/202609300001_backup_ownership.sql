-- Restoring an anonymous device's readings into an Apple account must not
-- collide with the former anonymous owner's mirror. Existing RLS stays intact.
alter table public.predictions drop constraint predictions_pkey;
alter table public.predictions add primary key (user_id, id);
