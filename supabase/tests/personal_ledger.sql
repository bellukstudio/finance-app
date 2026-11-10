-- Catatan pribadi Owner: isolasi, kelengkapan fitur, dan guard di level database.
begin; select plan(22);
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-00000000000a','a@t'),   -- Owner
 ('00000000-0000-0000-0000-00000000000b','b@t'),   -- Admin keluarga A
 ('00000000-0000-0000-0000-00000000000c','c@t');   -- Orang luar
set local role authenticated; set local request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table ctx as select create_family_with_defaults('Keluarga A') fid;
reset role;
insert into family_members(family_id,user_id,role) select fid,'00000000-0000-0000-0000-00000000000b','admin' from ctx;
set local role authenticated;
insert into wallets(family_id,name,kind,initial_balance) select fid,'Dompet Keluarga','cash',1000 from ctx;

-- === Owner ===
create temp table pctx as select ensure_personal_ledger() pid;
select ok((select pid from pctx) is not null and (select pid from pctx)<>(select fid from ctx),'Owner mendapat catatan pribadi terpisah dari keluarga');
select is(ensure_personal_ledger(),(select pid from pctx),'ensure_personal_ledger idempoten (id sama)');
select is((select count(*) from families where kind='personal')::int,1,'hanya satu catatan pribadi per Owner');
select is((select count(*) from categories where family_id=(select pid from pctx))::int,20,'catatan pribadi punya kategori bawaan lengkap');
select is((select count(*) from wallets where family_id=(select pid from pctx))::int,0,'catatan pribadi mulai kosong (tidak menyalin data keluarga)');

insert into wallets(family_id,name,kind,initial_balance) select pid,'Dompet Pribadi','bank',5000 from pctx;
select lives_ok($$insert into transactions(family_id,type,date,amount,wallet_id,category_id)
  select p.pid,'expense',current_date,500,(select id from wallets where family_id=p.pid),(select id from categories where family_id=p.pid and type='expense' limit 1) from pctx p$$,'Owner dapat mencatat transaksi pribadi');
select is(((dashboard_summary((select pid from pctx),current_date,current_date))->>'expense')::numeric,500::numeric,'ringkasan pribadi menghitung transaksi pribadi');
select is(((dashboard_summary((select fid from ctx),current_date,current_date))->>'expense')::numeric,0::numeric,'transaksi pribadi TIDAK masuk ringkasan keluarga');
select is((select balance from wallet_balances where family_id=(select pid from pctx))::int,4500,'saldo pribadi = 5000-500');
select is((select balance from wallet_balances where family_id=(select fid from ctx))::int,1000,'saldo keluarga tidak berubah');
select ok((select count(*) from audit_logs where family_id=(select pid from pctx))>0,'Owner dapat melihat audit catatan pribadinya');
select throws_ok($$select create_invitation((select pid from pctx),'member')$$,'42501',null,'undangan ke catatan pribadi ditolak');
select throws_ok($$update families set kind='family',owner_user_id=null where id=(select pid from pctx)$$,'42501',null,'jenis catatan pribadi tidak bisa diubah');

-- === Admin keluarga (bukan Owner) ===
set local request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000b"}';
select throws_ok($$select ensure_personal_ledger()$$,'42501',null,'Admin tidak dapat membuat catatan pribadi');
select is((select count(*) from families where kind='personal')::int,0,'Admin tidak melihat catatan pribadi Owner');
select is((select count(*) from wallets where family_id=(select pid from pctx))::int,0,'Admin tidak melihat dompet pribadi Owner');
select is((select count(*) from transactions where family_id=(select pid from pctx))::int,0,'Admin tidak melihat transaksi pribadi Owner');
select is((select count(*) from audit_logs where family_id=(select pid from pctx))::int,0,'Admin tidak melihat audit pribadi Owner');
select throws_ok($$insert into wallets(family_id,name,kind) select pid,'X','cash' from pctx$$,'42501',null,'Admin tidak dapat menulis ke catatan pribadi Owner');

-- === Orang luar ===
set local request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000c"}';
select throws_ok($$select ensure_personal_ledger()$$,'42501',null,'orang tanpa keluarga tidak dapat membuat catatan pribadi');

-- === Guard keanggotaan (jalur apa pun, termasuk superuser/definer) ===
reset role;
select throws_ok($$insert into family_members(family_id,user_id,role) select pid,'00000000-0000-0000-0000-00000000000b','admin' from pctx$$,'42501',null,'anggota lain tidak dapat ditambahkan ke catatan pribadi');
select throws_ok($$insert into family_invitations(family_id,role,token_hash) select pid,'member','h' from pctx$$,'42501',null,'insert undangan langsung ke catatan pribadi ditolak');
select * from finish(); rollback;
