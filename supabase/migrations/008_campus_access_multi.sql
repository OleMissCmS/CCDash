alter table public.user_profiles
  drop constraint if exists user_profiles_campus_access_check;

alter table public.user_profiles
  alter column campus_access drop default;

alter table public.user_profiles
  alter column campus_access type text[]
  using case
    when campus_access = 'all'
      then array['church-wide', 'mount-pleasant', 'alma', 'st-johns']
    else array[campus_access]
  end;

alter table public.user_profiles
  alter column campus_access
    set default array['church-wide', 'mount-pleasant', 'alma', 'st-johns'];

alter table public.user_profiles
  add constraint user_profiles_campus_access_check
    check (
      cardinality(campus_access) > 0
      and campus_access <@ array['church-wide', 'mount-pleasant', 'alma', 'st-johns']
    );
