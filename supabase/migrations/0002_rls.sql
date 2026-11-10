create or replace function is_family_member(fid uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from family_members where family_id=fid and user_id=auth.uid() and deleted_at is null) $$;
create or replace function has_family_role(fid uuid, roles text[]) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from family_members where family_id=fid and user_id=auth.uid() and role=any(roles) and deleted_at is null) $$;

alter table profiles enable row level security;
create policy p_sel on profiles for select using(id=auth.uid() or exists(select 1 from family_members a join family_members b on a.family_id=b.family_id where a.user_id=auth.uid() and b.user_id=profiles.id));
create policy p_ins on profiles for insert with check(id=auth.uid());
create policy p_upd on profiles for update using(id=auth.uid()) with check(id=auth.uid());

alter table families enable row level security;
create policy f_sel on families for select using(is_family_member(id));
create policy f_upd on families for update using(has_family_role(id,array['owner'])) with check(has_family_role(id,array['owner']));

alter table audit_logs enable row level security;
create policy a_sel on audit_logs for select using(has_family_role(family_id,array['owner','admin']));

alter table idempotency_keys enable row level security;

alter table notifications enable row level security;
create policy n_sel on notifications for select using(user_id=auth.uid() and is_family_member(family_id));
create policy n_upd on notifications for update using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy n_del on notifications for delete using(user_id=auth.uid());

do $$ declare t text; w text[]; d text[]; begin
 for t,w,d in select * from (values
  ('family_members',array['owner','admin'],array['owner','admin']),
  ('family_invitations',array['owner','admin'],array['owner','admin']),
  ('wallets',array['owner','admin'],array['owner','admin']),
  ('categories',array['owner','admin'],array['owner','admin']),
  ('budgets',array['owner','admin'],array['owner','admin']),
  ('transactions',array['owner','admin','member'],array['owner','admin']),
  ('assets',array['owner','admin','member'],array['owner','admin']),
  ('asset_valuations',array['owner','admin','member'],array['owner','admin']),
  ('debts',array['owner','admin','member'],array['owner','admin']),
  ('debt_payments',array['owner','admin','member'],array['owner','admin']),
  ('recurring_transactions',array['owner','admin','member'],array['owner','admin']),
  ('attachments',array['owner','admin','member'],array['owner','admin']),
  ('settings',array['owner','admin'],array['owner','admin'])) v(t,w,d) loop
  execute format('alter table %I enable row level security',t);
  execute format('create policy sel on %I for select using(is_family_member(family_id))',t);
  execute format('create policy ins on %I for insert with check(has_family_role(family_id,%L))',t,w);
  execute format('create policy upd on %I for update using(has_family_role(family_id,%L)) with check(has_family_role(family_id,%L))',t,w,w);
  execute format('create policy del on %I for delete using(has_family_role(family_id,%L))',t,d);
 end loop; end $$;
-- Member hanya boleh mengubah transaksi miliknya
drop policy upd on transactions;
create policy upd on transactions for update using(has_family_role(family_id,array['owner','admin']) or (created_by=auth.uid() and has_family_role(family_id,array['member'])))
 with check(has_family_role(family_id,array['owner','admin']) or (created_by=auth.uid() and has_family_role(family_id,array['member'])));

-- Storage: bucket private, path {family_id}/...
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('receipts','receipts',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf']) on conflict do nothing;
create policy rc_sel on storage.objects for select using(bucket_id='receipts' and is_family_member(((storage.foldername(name))[1])::uuid));
create policy rc_ins on storage.objects for insert with check(bucket_id='receipts' and has_family_role(((storage.foldername(name))[1])::uuid,array['owner','admin','member']));
create policy rc_del on storage.objects for delete using(bucket_id='receipts' and has_family_role(((storage.foldername(name))[1])::uuid,array['owner','admin']));
