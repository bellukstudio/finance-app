create or replace function create_asset(fid uuid, nm text, k text, acq numeric, cur numeric, bought date, nt text) returns uuid
language plpgsql security invoker as $$
declare aid uuid; begin
 if not has_family_role(fid,array['owner','admin','member']) then raise exception 'Akses ditolak' using errcode='42501'; end if;
 insert into assets(family_id,name,kind,acquisition_value,current_value,purchased_on,notes,created_by) values(fid,nm,k,acq,cur,bought,nt,auth.uid()) returning id into aid;
 insert into asset_valuations(family_id,asset_id,value,valued_on,created_by) values(fid,aid,cur,coalesce(bought,current_date),auth.uid());
 return aid; end $$;

create or replace function update_asset_value(aid uuid, val numeric, d date) returns void language plpgsql security invoker as $$
declare a assets; begin
 select * into a from assets where id=aid for update;
 if not found or not has_family_role(a.family_id,array['owner','admin','member']) then raise exception 'Akses ditolak' using errcode='42501'; end if;
 insert into asset_valuations(family_id,asset_id,value,valued_on,created_by) values(a.family_id,aid,val,d,auth.uid());
 update assets set current_value=val, updated_by=auth.uid() where id=aid; end $$;

create or replace function pay_debt(did uuid,amt numeric,d date,wid uuid,cid uuid) returns uuid language plpgsql security invoker as $$
declare dd debts; pid uuid; paid numeric; begin
 select * into dd from debts where id=did and deleted_at is null for update;
 if not found then raise exception 'Utang tidak ditemukan'; end if;
 if not has_family_role(dd.family_id,array['owner','admin','member']) then raise exception 'Akses ditolak' using errcode='42501'; end if;
 select coalesce(sum(amount),0) into paid from debt_payments where debt_id=did and deleted_at is null;
 if amt > dd.principal-paid then raise exception 'Pembayaran melebihi sisa kewajiban' using errcode='23514'; end if;
 insert into debt_payments(family_id,debt_id,amount,paid_on,created_by) values(dd.family_id,did,amt,d,auth.uid()) returning id into pid;
 insert into transactions(family_id,type,date,amount,wallet_id,category_id,description,debt_payment_id,created_by)
  values(dd.family_id,case when dd.direction='payable' then 'expense' else 'income' end,d,amt,wid,cid,'Pembayaran: '||dd.counterparty,pid,auth.uid());
 if paid+amt>=dd.principal then update debts set status='paid' where id=did; end if;
 return pid; end $$;
