-- Profil otomatis saat user baru login
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into profiles(id,full_name,avatar_url) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',new.email),new.raw_user_meta_data->>'avatar_url') on conflict do nothing; return new; end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();
insert into profiles(id,full_name) select id,email from auth.users on conflict do nothing;

-- KEAMANAN: cegah Admin menaikkan role sendiri. Perubahan anggota hanya lewat RPC di bawah.
drop policy if exists ins on family_members; drop policy if exists upd on family_members; drop policy if exists del on family_members;

-- created_by tidak boleh dipalsukan oleh klien
create or replace function force_created_by() returns trigger language plpgsql as $$
begin if tg_op='INSERT' then new.created_by:=coalesce(auth.uid(),new.created_by); else new.created_by:=old.created_by; end if; return new; end $$;
create trigger trg_cb before insert or update on transactions for each row execute function force_created_by();

create or replace function accept_invitation(tok text) returns uuid language plpgsql security definer set search_path=public,extensions as $$
declare i family_invitations; begin
 if auth.uid() is null then raise exception 'Tidak terautentikasi' using errcode='42501'; end if;
 select * into i from family_invitations where token_hash=encode(digest(tok,'sha256'),'hex') and status='pending' and expires_at>now() for update;
 if not found then raise exception 'Undangan tidak valid atau kedaluwarsa'; end if;
 insert into family_members(family_id,user_id,role,created_by) values(i.family_id,auth.uid(),i.role,i.created_by) on conflict(family_id,user_id) do update set deleted_at=null,role=excluded.role;
 update family_invitations set status='accepted' where id=i.id; return i.family_id; end $$;

create or replace function create_invitation(fid uuid, r text) returns text language plpgsql security invoker set search_path=public,extensions as $$
declare tok text:=encode(gen_random_bytes(24),'hex'); begin
 if not has_family_role(fid,array['owner','admin']) then raise exception 'Akses ditolak' using errcode='42501'; end if;
 if r not in('admin','member','viewer') then raise exception 'Role tidak valid' using errcode='23514'; end if;
 insert into family_invitations(family_id,role,token_hash,created_by) values(fid,r,encode(digest(tok,'sha256'),'hex'),auth.uid());
 return tok; end $$;

create or replace function remove_member(fid uuid, uid uuid) returns void language plpgsql security definer set search_path=public as $$
declare m family_members; begin
 if not has_family_role(fid,array['owner','admin']) then raise exception 'Akses ditolak' using errcode='42501'; end if;
 select * into m from family_members where family_id=fid and user_id=uid and deleted_at is null for update;
 if not found then raise exception 'Anggota tidak ditemukan'; end if;
 if m.role='owner' then raise exception 'Owner tidak dapat dihapus' using errcode='23514'; end if;
 update family_members set deleted_at=now() where id=m.id; end $$;

create or replace function change_member_role(fid uuid, uid uuid, r text) returns void language plpgsql security definer set search_path=public as $$
begin
 if not has_family_role(fid,array['owner']) then raise exception 'Hanya Owner yang dapat mengubah role' using errcode='42501'; end if;
 if r not in('admin','member','viewer') then raise exception 'Role tidak valid' using errcode='23514'; end if;
 update family_members set role=r where family_id=fid and user_id=uid and role<>'owner' and deleted_at is null;
 if not found then raise exception 'Anggota tidak ditemukan atau Owner'; end if; end $$;

-- Notifikasi
alter table notifications add column if not exists dedupe_key text;
alter table notifications add constraint notif_dedupe unique(user_id,dedupe_key);
create or replace function generate_notifications() returns int language plpgsql security definer set search_path=public as $$
declare r record; n int:=0; c int; begin
 for r in select b.id,b.family_id,coalesce(ca.name,w.name) nm,u.used,b.amount from budgets b join budget_usage u on u.budget_id=b.id
   left join categories ca on ca.id=b.category_id left join wallets w on w.id=b.wallet_id
   where b.deleted_at is null and current_date between b.start_date and b.end_date and u.used>=b.amount*0.7 loop
  insert into notifications(family_id,user_id,kind,title,body,dedupe_key)
  select r.family_id,fm.user_id,'budget',case when r.used>r.amount then 'Budget terlampaui: '||r.nm else 'Budget hampir habis: '||r.nm end,
   'Terpakai '||round(r.used/r.amount*100)||'% dari anggaran.','budget:'||r.id||':'||case when r.used>r.amount then 'over' else 'near' end
  from family_members fm where fm.family_id=r.family_id and fm.role in('owner','admin') and fm.deleted_at is null on conflict do nothing;
  get diagnostics c=row_count; n:=n+c; end loop;
 for r in select d.id,d.family_id,d.counterparty,d.due_date,d.direction from debts d where d.deleted_at is null and d.due_date is not null and d.due_date<=current_date+7
   and d.principal>coalesce((select sum(amount) from debt_payments p where p.debt_id=d.id and p.deleted_at is null),0) loop
  insert into notifications(family_id,user_id,kind,title,body,dedupe_key)
  select r.family_id,fm.user_id,'debt',case when r.due_date<current_date then 'Jatuh tempo terlewat: ' else 'Mendekati jatuh tempo: ' end||r.counterparty,
   (case when r.direction='payable' then 'Utang' else 'Piutang' end)||' jatuh tempo '||to_char(r.due_date,'DD/MM/YYYY'),'debt:'||r.id||':'||case when r.due_date<current_date then 'late' else 'soon' end
  from family_members fm where fm.family_id=r.family_id and fm.role in('owner','admin','member') and fm.deleted_at is null on conflict do nothing;
  get diagnostics c=row_count; n:=n+c; end loop;
 for r in select t.id,t.family_id,t.description,t.amount from transactions t where t.recurring_id is not null and t.created_at>now()-interval '1 day' and t.deleted_at is null loop
  insert into notifications(family_id,user_id,kind,title,body,dedupe_key)
  select r.family_id,fm.user_id,'recurring','Transaksi berulang dibuat: '||coalesce(r.description,'-'),'Nominal '||r.amount,'rec:'||r.id
  from family_members fm where fm.family_id=r.family_id and fm.role in('owner','admin') and fm.deleted_at is null on conflict do nothing;
  get diagnostics c=row_count; n:=n+c; end loop;
 return n; end $$;
revoke execute on function generate_notifications() from public, anon, authenticated;
select cron.schedule('gen-notifs','*/30 * * * *',$$select generate_notifications()$$);
do $$ begin alter publication supabase_realtime add table notifications; exception when others then null; end $$;
