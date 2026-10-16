alter table public.user_profiles
  add column if not exists campus_access text not null default 'all'
    check (campus_access in ('all', 'mount-pleasant', 'alma', 'st-johns'));
