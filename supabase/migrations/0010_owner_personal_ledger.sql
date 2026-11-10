-- Catatan keuangan PRIBADI untuk Owner.
--
-- Desain: catatan pribadi adalah baris `families` tersendiri (kind='personal') yang anggotanya HANYA
-- pemiliknya. Semua tabel, view, RPC, RLS, storage, cron, dan audit yang sudah ada berbasis family_id,
-- sehingga fiturnya otomatis sama lengkapnya dan data keluarga yang ada tidak tersentuh.
-- Isolasi dijaga di database (bukan hanya di UI):
--   * satu-satunya jalan membuat catatan pribadi adalah ensure_personal_ledger() (hanya Owner keluarga),
--   * anggota catatan pribadi tidak bisa ditambah/diubah selain Owner itu sendiri (trigger),
--   * undangan untuk catatan pribadi ditolak (trigger),
--   * jenis/pemilik catatan tidak bisa diubah setelah dibuat (trigger).

alter table families add column if not exists kind text not null default 'family';
alter table families add column if not exists owner_user_id uuid references auth.users on delete cascade;
alter table families add constraint families_kind_chk check (kind in ('family','personal'));
alter table families add constraint families_personal_owner_chk check ((kind='personal') = (owner_user_id is not null));
create unique index if not exists families_one_personal_per_user on families(owner_user_id) where kind='personal';

create or replace function is_personal_family(fid uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from families where id=fid and kind='personal') $$;

-- Jenis & pemilik tidak boleh diubah (mencegah catatan pribadi "dibuka" jadi keluarga atau sebaliknya).
create or replace function families_lock_kind() returns trigger language plpgsql as $$
begin
 if new.kind is distinct from old.kind or new.owner_user_id is distinct from old.owner_user_id then
  raise exception 'Jenis catatan tidak dapat diubah' using errcode='42501'; end if;
 return new; end $$;
create trigger trg_families_lock_kind before update on families for each row execute function families_lock_kind();

-- Catatan pribadi hanya boleh beranggotakan Owner-nya sendiri, apa pun jalur penambahannya.
create or replace function personal_members_only_owner() returns trigger language plpgsql security definer set search_path=public as $$
declare f families; begin
 select * into f from families where id=new.family_id;
 if f.kind='personal' and (new.user_id is distinct from f.owner_user_id or new.role<>'owner') then
  raise exception 'Catatan pribadi hanya dapat diakses oleh pemiliknya' using errcode='42501'; end if;
 return new; end $$;
create trigger trg_personal_members before insert or update on family_members for each row execute function personal_members_only_owner();

-- Catatan pribadi tidak boleh punya undangan (insert langsung, create_invitation, maupun memindahkan undangan).
create or replace function block_personal_invites() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if is_personal_family(new.family_id) then
  raise exception 'Catatan pribadi tidak dapat dibagikan' using errcode='42501'; end if;
 return new; end $$;
create trigger trg_no_personal_invite before insert or update on family_invitations for each row execute function block_personal_invites();

-- Buat (atau ambil) catatan pribadi milik pemanggil. Idempoten. Hanya Owner sebuah keluarga.
create or replace function ensure_personal_ledger() returns uuid language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); fid uuid; n text; begin
 if uid is null then raise exception 'Tidak terautentikasi' using errcode='42501'; end if;
 if not exists(select 1 from family_members m join families f on f.id=m.family_id
   where m.user_id=uid and m.role='owner' and m.deleted_at is null and f.kind='family' and f.deleted_at is null) then
  raise exception 'Hanya Owner yang dapat memiliki catatan pribadi' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtext('personal_ledger:'||uid::text));
 select id into fid from families where kind='personal' and owner_user_id=uid;
 if fid is not null then
  insert into family_members(family_id,user_id,role,created_by) values(fid,uid,'owner',uid)
   on conflict(family_id,user_id) do update set deleted_at=null, role='owner';
  return fid; end if;
 insert into families(name,created_by,kind,owner_user_id) values('Catatan Pribadi',uid,'personal',uid) returning id into fid;
 insert into family_members(family_id,user_id,role,created_by) values(fid,uid,'owner',uid);
 foreach n in array array['Makanan dan Minuman','Transportasi','Belanja','Tagihan','Internet dan Komunikasi','Kesehatan','Pendidikan','Hiburan','Rumah Tangga','Cicilan','Donasi','Perawatan','Lainnya'] loop
  insert into categories(family_id,name,type,created_by) values(fid,n,'expense',uid); end loop;
 foreach n in array array['Gaji','Freelance','Bisnis','Investasi','Bonus','Hadiah','Pendapatan Lainnya'] loop
  insert into categories(family_id,name,type,created_by) values(fid,n,'income',uid); end loop;
 return fid; end $$;
revoke all on function ensure_personal_ledger() from public, anon;
grant execute on function ensure_personal_ledger() to authenticated;

-- Helper internal untuk trigger; tidak perlu bisa dipanggil klien.
revoke all on function is_personal_family(uuid) from public, anon, authenticated;
