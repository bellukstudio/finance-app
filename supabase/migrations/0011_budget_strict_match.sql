-- Perbaikan: pengeluaran HANYA memotong budget bila wallet (bank) DAN kategorinya cocok dengan budget tsb.
-- Sebelumnya pengeluaran dengan budget_id eksplisit melewati pengecekan wallet/kategori.
-- Daftar wallet/kategori KOSONG pada budget = semua wallet/kategori.
create or replace view budget_usage with(security_invoker=true) as
select b.id budget_id, b.family_id, b.scope, b.amount budget, b.start_date, b.end_date,
 coalesce((select sum(t.amount) from transactions t where t.family_id=b.family_id and t.type='expense' and t.deleted_at is null
   and (t.budget_id=b.id or (t.budget_id is null and t.date between b.start_date and b.end_date))
   and (not exists(select 1 from budget_wallets bw where bw.budget_id=b.id) or t.wallet_id in (select bw.wallet_id from budget_wallets bw where bw.budget_id=b.id))
   and (not exists(select 1 from budget_categories bc where bc.budget_id=b.id) or t.category_id in (select bc.category_id from budget_categories bc where bc.budget_id=b.id))),0) used,
 coalesce((select sum(t.amount) from transactions t where t.family_id=b.family_id and t.type='transfer' and t.deleted_at is null and t.budget_id=b.id),0) topup
from budgets b where b.deleted_at is null;
