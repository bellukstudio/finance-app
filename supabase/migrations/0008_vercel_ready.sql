-- Rate limit terpusat (serverless: memori proses tidak dibagi antar-instance)
create table if not exists rate_limits(key text not null, window_start timestamptz not null, hits int not null default 0, primary key(key,window_start));
alter table rate_limits enable row level security;  -- tanpa policy: hanya lewat fungsi di bawah
create or replace function rate_limit_hit(k text, lim int, win int) returns boolean language plpgsql security definer set search_path=public as $$
declare ws timestamptz; h int; begin
 if auth.uid() is null then return false; end if;
 ws:=to_timestamp(floor(extract(epoch from now())/win)*win);
 insert into rate_limits(key,window_start,hits) values(auth.uid()||':'||k,ws,1)
  on conflict(key,window_start) do update set hits=rate_limits.hits+1 returning hits into h;
 return h<=lim; end $$;
revoke all on function rate_limit_hit(text,int,int) from public, anon;
grant execute on function rate_limit_hit(text,int,int) to authenticated;
select cron.schedule('rl-cleanup','15 * * * *',$$delete from rate_limits where window_start<now()-interval '2 hours'$$);

-- File yatim di Storage (ada file, tidak ada metadata) untuk job pembersihan
create or replace function orphan_storage_objects() returns table(name text) language sql security definer set search_path=public,storage as $$
 select o.name from storage.objects o where o.bucket_id='receipts' and o.created_at<now()-interval '1 day'
  and not exists(select 1 from public.attachments a where a.storage_path=o.name) $$;
revoke execute on function orphan_storage_objects() from public, anon, authenticated;
