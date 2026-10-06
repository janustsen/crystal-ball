-- The Plus ball styles are the four local-AI renders: smoke, aurora, obsidian and gold-flecked (id gold, kept so saved
-- choices carry over). Card styles are unchanged.
alter table public.social_profiles
 drop constraint social_profiles_ball_style_check,
 add constraint social_profiles_ball_style_check check(ball_style in ('classic','smoke','aurora','obsidian','gold'));
