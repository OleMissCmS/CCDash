insert into metrics (key, label, unit, category, requires_financial, sort_order)
select
  'giving_previous_month',
  'Last Month Giving',
  'currency',
  'stewardship',
  true,
  41
where not exists (
  select 1 from metrics where key = 'giving_previous_month'
);
