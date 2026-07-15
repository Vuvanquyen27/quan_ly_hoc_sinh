-- ============================================================
-- 0013 — Views báo cáo (security_invoker; gom tháng theo giờ VN)
-- Khớp docs/DATABASE.md §9 và specs/2026-07-15-7-bao-cao-dashboard-design.md
-- ============================================================

create view public.v_cashflow_monthly with (security_invoker = true) as
select
  user_id,
  date_trunc('month', (occurred_at at time zone 'Asia/Ho_Chi_Minh')) as month,
  coalesce(sum(amount) filter (where type = 'income'), 0)  as total_income,
  coalesce(sum(amount) filter (where type = 'expense'), 0) as total_expense,
  coalesce(sum(amount) filter (where type = 'income'), 0)
    - coalesce(sum(amount) filter (where type = 'expense'), 0) as net_cashflow
from public.transactions
group by user_id, date_trunc('month', (occurred_at at time zone 'Asia/Ho_Chi_Minh'));

create view public.v_receivables_outstanding with (security_invoker = true) as
select i.user_id, i.student_id, s.full_name as student_name,
  sum(i.total_amount - i.amount_paid) as outstanding
from public.invoices i
join public.students s on s.id = i.student_id
where i.status not in ('paid','cancelled')
group by i.user_id, i.student_id, s.full_name;

create view public.v_payables_outstanding with (security_invoker = true) as
select user_id, sum(total_amount - amount_paid) as outstanding
from public.payables
where status not in ('paid','cancelled')
group by user_id;

create view public.v_upcoming_sessions with (security_invoker = true) as
select se.user_id, se.id, se.student_id, st.full_name as student_name,
  se.start_time, se.end_time, se.status
from public.sessions se
join public.students st on st.id = se.student_id
where se.status = 'scheduled'
  and se.start_time >= now()
  and se.start_time < now() + interval '7 days';

grant select on
  public.v_cashflow_monthly,
  public.v_receivables_outstanding,
  public.v_payables_outstanding,
  public.v_upcoming_sessions
to authenticated;
