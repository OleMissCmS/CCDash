-- Community Church ChMS — process queues v1

-- Permissions on existing staff profiles
alter table public.user_profiles
  add column if not exists can_access_chms boolean not null default true,
  add column if not exists can_manage_chms_processes boolean not null default false;

update public.user_profiles
set can_manage_chms_processes = true
where role = 'admin';

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

create table if not exists public.chms_families (
  id uuid primary key default gen_random_uuid(),
  name text,
  created_at timestamptz not null default now()
);

create table if not exists public.chms_people (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  campus_id uuid references public.campuses (id) on delete set null,
  family_id uuid references public.chms_families (id) on delete set null,
  is_first_time_guest boolean not null default false,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chms_people_name_idx
  on public.chms_people (lower(last_name), lower(first_name));

create index if not exists chms_people_campus_idx
  on public.chms_people (campus_id);

-- ---------------------------------------------------------------------------
-- Processes & queues
-- ---------------------------------------------------------------------------

create table if not exists public.chms_processes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  is_hidden boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chms_queues (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.chms_processes (id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  instructions text,
  sort_order integer not null default 0,
  default_due_days integer not null default 3,
  unique (process_id, slug)
);

create table if not exists public.chms_queue_managers (
  queue_id uuid not null references public.chms_queues (id) on delete cascade,
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  primary key (queue_id, user_id)
);

create table if not exists public.chms_process_managers (
  process_id uuid not null references public.chms_processes (id) on delete cascade,
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  primary key (process_id, user_id)
);

create table if not exists public.chms_queue_transitions (
  id uuid primary key default gen_random_uuid(),
  from_queue_id uuid not null references public.chms_queues (id) on delete cascade,
  to_queue_id uuid not null references public.chms_queues (id) on delete cascade,
  label text,
  is_default boolean not null default false,
  unique (from_queue_id, to_queue_id)
);

-- ---------------------------------------------------------------------------
-- Assignments & notes
-- ---------------------------------------------------------------------------

create type public.chms_assignment_status as enum ('open', 'in_progress', 'done');

create table if not exists public.chms_assignments (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.chms_people (id) on delete cascade,
  queue_id uuid not null references public.chms_queues (id) on delete restrict,
  status public.chms_assignment_status not null default 'open',
  ministry_area text,
  campus_id uuid references public.campuses (id) on delete set null,
  assigned_to uuid references public.user_profiles (id) on delete set null,
  due_at timestamptz,
  entered_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  completed_by uuid references public.user_profiles (id) on delete set null,
  previous_assignment_id uuid references public.chms_assignments (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists chms_assignments_queue_status_idx
  on public.chms_assignments (queue_id, status);

create index if not exists chms_assignments_assigned_to_idx
  on public.chms_assignments (assigned_to)
  where status <> 'done';

create index if not exists chms_assignments_person_idx
  on public.chms_assignments (person_id);

create table if not exists public.chms_assignment_notes (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.chms_assignments (id) on delete cascade,
  author_id uuid references public.user_profiles (id) on delete set null,
  body text not null,
  contact_type text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Forms & notification log
-- ---------------------------------------------------------------------------

create table if not exists public.chms_form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_type text not null,
  payload jsonb not null default '{}',
  person_id uuid references public.chms_people (id) on delete set null,
  assignment_id uuid references public.chms_assignments (id) on delete set null,
  processed_at timestamptz not null default now()
);

create table if not exists public.chms_notification_log (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid references public.user_profiles (id) on delete set null,
  recipient_email text,
  subject text not null,
  body text not null,
  channel text not null default 'email',
  status text not null default 'pending',
  related_assignment_id uuid references public.chms_assignments (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------

create or replace function public.chms_user_can_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles
    where id = auth.uid()
      and (role = 'admin' or can_access_chms = true)
  );
$$;

create or replace function public.chms_user_can_manage()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles
    where id = auth.uid()
      and (role = 'admin' or can_manage_chms_processes = true)
  );
$$;

create or replace function public.chms_user_manages_queue(p_queue_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.chms_user_can_manage()
    or exists (
      select 1
      from public.chms_queue_managers
      where queue_id = p_queue_id and user_id = auth.uid()
    );
$$;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

alter table public.chms_families enable row level security;
alter table public.chms_people enable row level security;
alter table public.chms_processes enable row level security;
alter table public.chms_queues enable row level security;
alter table public.chms_queue_managers enable row level security;
alter table public.chms_process_managers enable row level security;
alter table public.chms_queue_transitions enable row level security;
alter table public.chms_assignments enable row level security;
alter table public.chms_assignment_notes enable row level security;
alter table public.chms_form_submissions enable row level security;
alter table public.chms_notification_log enable row level security;

create policy chms_families_access on public.chms_families
  for all using (public.chms_user_can_access())
  with check (public.chms_user_can_access());

create policy chms_people_access on public.chms_people
  for all using (public.chms_user_can_access())
  with check (public.chms_user_can_access());

create policy chms_processes_read on public.chms_processes
  for select using (public.chms_user_can_access());

create policy chms_processes_write on public.chms_processes
  for all using (public.chms_user_can_manage())
  with check (public.chms_user_can_manage());

create policy chms_queues_read on public.chms_queues
  for select using (public.chms_user_can_access());

create policy chms_queues_write on public.chms_queues
  for all using (public.chms_user_can_manage())
  with check (public.chms_user_can_manage());

create policy chms_queue_managers_access on public.chms_queue_managers
  for all using (public.chms_user_can_manage())
  with check (public.chms_user_can_manage());

create policy chms_process_managers_access on public.chms_process_managers
  for all using (public.chms_user_can_manage())
  with check (public.chms_user_can_manage());

create policy chms_transitions_read on public.chms_queue_transitions
  for select using (public.chms_user_can_access());

create policy chms_transitions_write on public.chms_queue_transitions
  for all using (public.chms_user_can_manage())
  with check (public.chms_user_can_manage());

create policy chms_assignments_access on public.chms_assignments
  for all using (public.chms_user_can_access())
  with check (public.chms_user_can_access());

create policy chms_notes_access on public.chms_assignment_notes
  for all using (public.chms_user_can_access())
  with check (public.chms_user_can_access());

create policy chms_form_submissions_read on public.chms_form_submissions
  for select using (public.chms_user_can_access());

create policy chms_notifications_read on public.chms_notification_log
  for select using (public.chms_user_can_access());

-- ---------------------------------------------------------------------------
-- Seed: Guest Follow-Up process
-- ---------------------------------------------------------------------------

insert into public.chms_processes (slug, name, description, sort_order)
values (
  'guest-follow-up',
  'Guest Follow-Up',
  'First-time guests from connect cards — 48-hour contact, then group & next steps.',
  1
)
on conflict (slug) do nothing;

insert into public.chms_queues (process_id, slug, name, description, instructions, sort_order, default_due_days)
select
  p.id,
  v.slug,
  v.name,
  v.description,
  v.instructions,
  v.sort_order,
  v.default_due_days
from public.chms_processes p
cross join (
  values
    (
      '48-hour-contact',
      '48-Hour Contact',
      'Initial outreach within 48 hours of first visit.',
      'Contact the guest by phone or email within 48 hours. Log your contact attempt. Use the message template if helpful. Mark done with a required note when complete.',
      1,
      2
    ),
    (
      'group-next-steps',
      'Group & Next Steps Invite',
      'Invite the guest to a small group or appropriate next step.',
      'Based on their requested ministry area, invite them to a group, event, or serving opportunity. Log outreach and mark done with next-step details.',
      2,
      7
    )
) as v(slug, name, description, instructions, sort_order, default_due_days)
where p.slug = 'guest-follow-up'
on conflict (process_id, slug) do nothing;

insert into public.chms_queue_transitions (from_queue_id, to_queue_id, label, is_default)
select fq.id, tq.id, 'Continue to Group & Next Steps', true
from public.chms_queues fq
join public.chms_queues tq on tq.slug = 'group-next-steps'
join public.chms_processes p on p.id = fq.process_id and p.slug = 'guest-follow-up'
where fq.slug = '48-hour-contact'
on conflict (from_queue_id, to_queue_id) do nothing;
