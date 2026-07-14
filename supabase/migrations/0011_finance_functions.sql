-- ============================================================
-- 0011 — Trigger recalc invoices.amount_paid + RPC tổng hợp hóa đơn từ buổi
-- ============================================================

-- Trigger: cập nhật amount_paid + status của invoice khi transactions đổi
create or replace function public.recalc_invoice_paid()
returns trigger
language plpgsql
as $$
declare
  inv_id uuid;
  paid bigint;
  tot bigint;
  cur_status public.invoice_status;
begin
  inv_id := coalesce(new.invoice_id, old.invoice_id);
  if inv_id is null then
    return coalesce(new, old);
  end if;

  select coalesce(sum(amount), 0) into paid
    from public.transactions
    where invoice_id = inv_id and type = 'income';

  select total_amount, status into tot, cur_status
    from public.invoices where id = inv_id;

  if cur_status = 'cancelled' then
    update public.invoices set amount_paid = paid where id = inv_id;
    return coalesce(new, old);
  end if;

  update public.invoices
    set amount_paid = paid,
        status = case
          when tot > 0 and paid >= tot then 'paid'::public.invoice_status
          when paid > 0 then 'partial'::public.invoice_status
          else 'unpaid'::public.invoice_status
        end
    where id = inv_id;

  return coalesce(new, old);
end;
$$;

create trigger trg_transactions_recalc_invoice
  after insert or update or delete on public.transactions
  for each row execute function public.recalc_invoice_paid();

-- RPC: tổng hợp hóa đơn từ buổi completed chưa billed trong kỳ
-- (atomic, SECURITY INVOKER mặc định → RLS áp theo USER gọi)
create or replace function public.create_invoice_from_sessions(
  p_student_id uuid,
  p_period_month date,
  p_discount bigint default 0,
  p_due_date date default null,
  p_title text default null
)
returns uuid
language plpgsql
as $$
declare
  v_invoice_id uuid;
  v_subtotal bigint;
begin
  select coalesce(sum(fee_amount), 0) into v_subtotal
    from public.sessions
    where student_id = p_student_id
      and status = 'completed'
      and is_billed = false
      and date_trunc('month', (start_time at time zone 'Asia/Ho_Chi_Minh'))
          = date_trunc('month', p_period_month::timestamp);

  if v_subtotal = 0 then
    raise exception 'Khong co buoi hoc hoan thanh chua lap hoa don trong ky';
  end if;

  insert into public.invoices
    (student_id, title, period_month, subtotal, discount, total_amount, status, issue_date, due_date)
  values
    (p_student_id, coalesce(p_title, 'Hoc phi ' || to_char(p_period_month, 'MM/YYYY')),
     p_period_month, v_subtotal, coalesce(p_discount, 0),
     greatest(v_subtotal - coalesce(p_discount, 0), 0), 'unpaid', current_date, p_due_date)
  returning id into v_invoice_id;

  insert into public.invoice_items (invoice_id, session_id, description, quantity, unit_price, amount)
    select v_invoice_id, s.id,
           'Buoi ' || to_char((s.start_time at time zone 'Asia/Ho_Chi_Minh'), 'DD/MM/YYYY HH24:MI'),
           1, s.fee_amount, s.fee_amount
      from public.sessions s
      where s.student_id = p_student_id
        and s.status = 'completed'
        and s.is_billed = false
        and date_trunc('month', (s.start_time at time zone 'Asia/Ho_Chi_Minh'))
            = date_trunc('month', p_period_month::timestamp);

  update public.sessions
    set is_billed = true
    where student_id = p_student_id
      and status = 'completed'
      and is_billed = false
      and date_trunc('month', (start_time at time zone 'Asia/Ho_Chi_Minh'))
          = date_trunc('month', p_period_month::timestamp);

  return v_invoice_id;
end;
$$;
