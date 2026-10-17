create table public.dashboard_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  kind text not null,
  message text not null,
  page_path text not null,
  created_at timestamptz not null default now(),
  constraint dashboard_feedback_kind_check check (kind in ('issue', 'feedback')),
  constraint dashboard_feedback_message_check check (char_length(message) between 1 and 4000),
  constraint dashboard_feedback_page_path_check check (char_length(page_path) between 1 and 500)
);

create index dashboard_feedback_created_at_idx
  on public.dashboard_feedback (created_at desc);

alter table public.dashboard_feedback enable row level security;

revoke all on public.dashboard_feedback from anon, public;
grant select, insert on public.dashboard_feedback to authenticated;
grant select, insert, update, delete on public.dashboard_feedback to service_role;

create policy dashboard_feedback_insert
  on public.dashboard_feedback
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy dashboard_feedback_select
  on public.dashboard_feedback
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or (select public.is_admin())
  );

create or replace function public.set_dashboard_feedback_sender()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  sender_name text;
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;

  new.user_id := auth.uid();
  new.message := trim(new.message);
  new.page_path := left(trim(new.page_path), 500);

  select coalesce(nullif(trim(display_name), ''), 'Staff')
    into sender_name
  from public.user_profiles
  where id = auth.uid();

  new.display_name := coalesce(sender_name, 'Staff');
  return new;
end;
$$;

revoke all on function public.set_dashboard_feedback_sender() from public, anon;
grant execute on function public.set_dashboard_feedback_sender() to authenticated;

create trigger dashboard_feedback_set_sender
  before insert on public.dashboard_feedback
  for each row
  execute function public.set_dashboard_feedback_sender();

notify pgrst, 'reload schema';
