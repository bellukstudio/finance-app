create or replace view wallet_balances with(security_invoker=true) as
select w.id wallet_id, w.family_id, w.name, w.kind, w.currency, w.initial_balance,
 w.initial_balance + coalesce(sum(case when t.type='income' and t.wallet_id=w.id then t.amount
   when t.type='expense' and t.wallet_id=w.id then -t.amount
   when t.type='transfer' and t.wallet_id=w.id then -t.amount
   when t.type='transfer' and t.to_wallet_id=w.id then t.amount else 0 end),0) as balance
from wallets w left join transactions t on t.deleted_at is null and (t.wallet_id=w.id or t.to_wallet_id=w.id)
where w.deleted_at is null group by w.id;

create or replace view budget_usage with(security_invoker=true) as
select b.id budget_id, b.family_id, b.scope, b.amount budget, b.start_date, b.end_date,
 coalesce((select sum(t.amount) from transactions t where t.family_id=b.family_id and t.type='expense' and t.deleted_at is null
   and t.date between b.start_date and b.end_date
   and ((b.scope='category' and t.category_id=b.category_id) or (b.scope='wallet' and t.wallet_id=b.wallet_id))),0) used
from budgets b where b.deleted_at is null;

create or replace function dashboard_summary(fid uuid, d_from date, d_to date) returns jsonb language sql stable security invoker as $$
 select jsonb_build_object(
  'income',(select coalesce(sum(amount),0) from transactions where family_id=fid and type='income' and deleted_at is null and date between d_from and d_to),
  'expense',(select coalesce(sum(amount),0) from transactions where family_id=fid and type='expense' and deleted_at is null and date between d_from and d_to),
  'total_balance',(select coalesce(sum(balance),0) from wallet_balances where family_id=fid and currency='IDR'),
  'assets',(select coalesce(sum(current_value),0) from assets where family_id=fid and deleted_at is null),
  'debts',(select coalesce(sum(d.principal-coalesce((select sum(p.amount) from debt_payments p where p.debt_id=d.id and p.deleted_at is null),0)),0) from debts d where d.family_id=fid and d.direction='payable' and d.deleted_at is null)) $$;

create or replace function create_family_with_defaults(fname text) returns uuid language plpgsql security definer set search_path=public as $$
declare fid uuid; n text; begin
 if auth.uid() is null then raise exception 'Tidak terautentikasi'; end if;
 insert into families(name,created_by) values(fname,auth.uid()) returning id into fid;
 insert into family_members(family_id,user_id,role,created_by) values(fid,auth.uid(),'owner',auth.uid());
 foreach n in array array['Makanan dan Minuman','Transportasi','Belanja','Tagihan','Internet dan Komunikasi','Kesehatan','Pendidikan','Hiburan','Rumah Tangga','Cicilan','Donasi','Perawatan','Lainnya'] loop
  insert into categories(family_id,name,type,created_by) values(fid,n,'expense',auth.uid()); end loop;
 foreach n in array array['Gaji','Freelance','Bisnis','Investasi','Bonus','Hadiah','Pendapatan Lainnya'] loop
  insert into categories(family_id,name,type,created_by) values(fid,n,'income',auth.uid()); end loop;
 return fid; end $$;

create or replace function create_transfer(fid uuid,src uuid,dst uuid,amt numeric,d date,fee numeric default 0,fee_cat uuid default null,nt text default null,idem text default null) returns uuid
language plpgsql security invoker as $$
declare tid uuid; begin
 if not has_family_role(fid,array['owner','admin','member']) then raise exception 'Akses ditolak' using errcode='42501'; end if;
 insert into transactions(family_id,type,date,amount,wallet_id,to_wallet_id,note,created_by,idempotency_key) values(fid,'transfer',d,amt,src,dst,nt,auth.uid(),idem) returning id into tid;
 if coalesce(fee,0)>0 then
  insert into transactions(family_id,type,date,amount,wallet_id,category_id,description,parent_transaction_id,created_by) values(fid,'expense',d,fee,src,fee_cat,'Biaya transfer',tid,auth.uid()); end if;
 return tid; end $$;

create or replace function pay_debt(did uuid,amt numeric,d date,wid uuid,cid uuid) returns uuid language plpgsql security invoker as $$
declare dd debts; pid uuid; remaining numeric; begin
 select * into dd from debts where id=did for update;
 if not found then raise exception 'Utang tidak ditemukan'; end if;
 if not has_family_role(dd.family_id,array['owner','admin','member']) then raise exception 'Akses ditolak' using errcode='42501'; end if;
 insert into debt_payments(family_id,debt_id,amount,paid_on,created_by) values(dd.family_id,did,amt,d,auth.uid()) returning id into pid;
 insert into transactions(family_id,type,date,amount,wallet_id,category_id,description,debt_payment_id,created_by)
  values(dd.family_id,case when dd.direction='payable' then 'expense' else 'income' end,d,amt,wid,cid,'Pembayaran: '||dd.counterparty,pid,auth.uid());
 select dd.principal-sum(amount) into remaining from debt_payments where debt_id=did and deleted_at is null;
 if remaining<=0 then update debts set status='paid' where id=did; end if;
 return pid; end $$;

-- Idempotent: aman dijalankan berulang
create or replace function run_recurring(upto date default (now() at time zone 'Asia/Jakarta')::date) returns int
language plpgsql security definer set search_path=public as $$
declare r recurring_transactions; occ date; n int:=0; c int; step interval; begin
 for r in select * from recurring_transactions where is_active and deleted_at is null and start_date<=upto loop
  step:=case r.frequency when 'daily' then r.interval_n*interval '1 day' when 'weekly' then r.interval_n*interval '7 days'
        when 'monthly' then r.interval_n*interval '1 month' else r.interval_n*interval '1 year' end;
  for occ in select g::date from generate_series(r.start_date::timestamp,least(upto,coalesce(r.end_date,upto))::timestamp,step) g loop
   insert into transactions(family_id,type,date,amount,wallet_id,category_id,description,recurring_id,occurrence_date,created_by)
   values(r.family_id,r.type,occ,r.amount,r.wallet_id,r.category_id,r.description,r.id,occ,r.created_by) on conflict(recurring_id,occurrence_date) do nothing;
   get diagnostics c=row_count; n:=n+c; end loop; end loop; return n; end $$;
revoke execute on function run_recurring(date) from public, anon, authenticated;

create or replace function accept_invitation(tok text) returns uuid language plpgsql security definer set search_path=public as $$
declare i family_invitations; begin
 select * into i from family_invitations where token_hash=encode(digest(tok,'sha256'),'hex') and status='pending' and expires_at>now() for update;
 if not found then raise exception 'Undangan tidak valid atau kedaluwarsa'; end if;
 insert into family_members(family_id,user_id,role,created_by) values(i.family_id,auth.uid(),i.role,i.created_by) on conflict(family_id,user_id) do update set deleted_at=null,role=excluded.role;
 update family_invitations set status='accepted' where id=i.id; return i.family_id; end $$;
