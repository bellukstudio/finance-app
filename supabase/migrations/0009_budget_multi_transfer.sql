-- Budget multi-wallet & multi-kategori, alokasi transaksi ke budget, dan transfer yang menambah total budget.
-- Aturan pencocokan: daftar wallet/kategori KOSONG = semua wallet/kategori.

alter table budgets add column if not exists name text;

-- Longgarkan check lama (scope & wallet/category wajib) agar budget bisa memuat banyak wallet/kategori.
do $$ declare c record; begin
 for c in select conname from pg_constraint where conrelid='budgets'::regclass and contype='c' and pg_get_constraintdef(oid) ilike '%scope%' loop
  execute format('alter table budgets drop constraint %I', c.conname);
 end loop;
end $$;
alter table budgets add constraint budgets_scope_chk check (scope in ('category','wallet','multi'));

create table if not exists budget_wallets(
 budget_id uuid not null references budgets on delete cascade,
 wallet_id uuid not null references wallets on delete cascade,
 family_id uuid not null references families on delete cascade,
 primary key(budget_id, wallet_id));
create table if not exists budget_categories(
 budget_id uuid not null references budgets on delete cascade,
 category_id uuid not null references categories on delete cascade,
 family_id uuid not null references families on delete cascade,
 primary key(budget_id, category_id));

-- Backfill budget lama
insert into budget_categories(budget_id,category_id,family_id) select id,category_id,family_id from budgets where scope='category' and category_id is not null on conflict do nothing;
insert into budget_wallets(budget_id,wallet_id,family_id) select id,wallet_id,family_id from budgets where scope='wallet' and wallet_id is not null on conflict do nothing;

do $$ declare t text; begin
 foreach t in array array['budget_wallets','budget_categories'] loop
  execute format('alter table %I enable row level security',t);
  execute format('create policy sel on %I for select using(is_family_member(family_id))',t);
  execute format('create policy ins on %I for insert with check(has_family_role(family_id,array[''owner'',''admin'']))',t);
  execute format('create policy del on %I for delete using(has_family_role(family_id,array[''owner'',''admin'']))',t);
 end loop; end $$;

-- Transaksi boleh dialokasikan ke satu budget (pengeluaran = memotong, transfer = menambah)
alter table transactions add column if not exists budget_id uuid references budgets on delete set null;
create index if not exists transactions_budget_idx on transactions(budget_id) where budget_id is not null;

-- Pemakaian budget:
--  * pengeluaran dengan budget_id -> hanya budget itu yang terpotong
--  * pengeluaran tanpa budget_id  -> otomatis masuk budget yang wallet & kategorinya cocok pada periodenya
--  * transfer dengan budget_id    -> menambah total budget (topup)
create or replace view budget_usage with(security_invoker=true) as
select b.id budget_id, b.family_id, b.scope, b.amount budget, b.start_date, b.end_date,
 coalesce((select sum(t.amount) from transactions t where t.family_id=b.family_id and t.type='expense' and t.deleted_at is null
   and ((t.budget_id=b.id) or (t.budget_id is null and t.date between b.start_date and b.end_date
     and (not exists(select 1 from budget_wallets bw where bw.budget_id=b.id) or t.wallet_id in (select bw.wallet_id from budget_wallets bw where bw.budget_id=b.id))
     and (not exists(select 1 from budget_categories bc where bc.budget_id=b.id) or t.category_id in (select bc.category_id from budget_categories bc where bc.budget_id=b.id))))),0) used,
 coalesce((select sum(t.amount) from transactions t where t.family_id=b.family_id and t.type='transfer' and t.deleted_at is null and t.budget_id=b.id),0) topup
from budgets b where b.deleted_at is null;

-- Transfer: tambah parameter bid (budget tujuan, opsional)
drop function if exists create_transfer(uuid,uuid,uuid,numeric,date,numeric,uuid,text,text);
create or replace function create_transfer(fid uuid,src uuid,dst uuid,amt numeric,d date,fee numeric default 0,fee_cat uuid default null,nt text default null,idem text default null,bid uuid default null) returns uuid
language plpgsql security invoker as $$
declare tid uuid; begin
 if not has_family_role(fid,array['owner','admin','member']) then raise exception 'Akses ditolak' using errcode='42501'; end if;
 if bid is not null and not exists(select 1 from budgets where id=bid and family_id=fid and deleted_at is null) then raise exception 'Budget tidak ditemukan' using errcode='23514'; end if;
 insert into transactions(family_id,type,date,amount,wallet_id,to_wallet_id,note,created_by,idempotency_key,budget_id) values(fid,'transfer',d,amt,src,dst,nt,auth.uid(),idem,bid) returning id into tid;
 if coalesce(fee,0)>0 then
  insert into transactions(family_id,type,date,amount,wallet_id,category_id,description,parent_transaction_id,created_by) values(fid,'expense',d,fee,src,fee_cat,'Biaya transfer',tid,auth.uid()); end if;
 return tid; end $$;
