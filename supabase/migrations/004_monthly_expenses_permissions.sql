alter table public.user_profiles
  add column if not exists can_view_monthly_expenses boolean not null default false,
  add column if not exists monthly_expenses_scope text not null default 'all'
    check (
      monthly_expenses_scope in (
        'all',
        'central',
        'mount-pleasant',
        'alma',
        'st-johns'
      )
    );

update public.user_profiles
set
  can_view_monthly_expenses = true,
  monthly_expenses_scope = 'all'
where role = 'admin'
   or can_view_operations = true;
