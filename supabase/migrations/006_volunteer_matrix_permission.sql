alter table public.user_profiles
  add column if not exists can_view_volunteer_matrix boolean not null default true;
