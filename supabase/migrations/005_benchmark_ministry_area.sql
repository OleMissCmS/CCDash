alter table public.benchmark_targets
  add column if not exists ministry_area text
    check (
      ministry_area is null
      or ministry_area in ('weekend-reach', 'adult-discipleship', 'next-gen')
    );

update public.benchmark_targets b
set ministry_area = case m.key
  when 'total_in_person_avg' then 'weekend-reach'
  when 'adult_worship_avg' then 'weekend-reach'
  when 'total_serving' then 'weekend-reach'
  when 'first_time_guests' then 'adult-discipleship'
  when 'group_participation_rate' then 'adult-discipleship'
  when 'baptisms' then 'adult-discipleship'
  when 'kids_avg' then 'next-gen'
  when 'students_avg' then 'next-gen'
  when 'kids_pct_of_attendance' then 'next-gen'
end
from public.metrics m
where m.id = b.metric_id
  and b.ministry_area is null;
