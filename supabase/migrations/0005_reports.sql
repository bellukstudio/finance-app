create or replace function report_series(fid uuid, d_from date, d_to date, grain text default 'day')
returns table(bucket date, income numeric, expense numeric) language sql stable security invoker as $$
 select date_trunc(grain, t.date)::date, coalesce(sum(amount) filter (where type='income'),0), coalesce(sum(amount) filter (where type='expense'),0)
 from transactions t where t.family_id=fid and t.deleted_at is null and t.type<>'transfer' and t.date between d_from and d_to
 group by 1 order by 1 $$;

create or replace function report_by_category(fid uuid, d_from date, d_to date, t text)
returns table(category_id uuid, name text, total numeric) language sql stable security invoker as $$
 select c.id, c.name, sum(x.amount) from transactions x join categories c on c.id=x.category_id
 where x.family_id=fid and x.deleted_at is null and x.type=t and x.debt_payment_id is null and x.date between d_from and d_to
 group by c.id, c.name order by 3 desc $$;
