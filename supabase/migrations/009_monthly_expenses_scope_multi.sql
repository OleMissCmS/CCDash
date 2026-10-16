alter table public.user_profiles
  drop constraint if exists user_profiles_monthly_expenses_scope_check;

alter table public.user_profiles
  alter column monthly_expenses_scope drop default;

alter table public.user_profiles
  alter column monthly_expenses_scope type text[]
  using case
    when monthly_expenses_scope = 'all'
      then array['central', 'mount-pleasant', 'alma', 'st-johns']
    else array[monthly_expenses_scope]
  end;

alter table public.user_profiles
  alter column monthly_expenses_scope
    set default array['central', 'mount-pleasant', 'alma', 'st-johns'];

alter table public.user_profiles
  add constraint user_profiles_monthly_expenses_scope_check
    check (
      monthly_expenses_scope <@ array[
        'central',
        'mount-pleasant',
        'alma',
        'st-johns'
      ]
    );

notify pgrst, 'reload schema';
