-- Seed dữ liệu mẫu (CHỈ dùng cho môi trường dev — không dùng ở production).
-- MVP: một gói Pro ở 2 chu kỳ tháng/năm. Giá VND là ví dụ, chỉnh theo quyết định kinh doanh.

insert into public.plans (code, name, description, price, billing_cycle, sort_order) values
  ('pro_monthly', 'Gói Pro (tháng)', 'Đầy đủ tính năng, thanh toán theo tháng',                 99000,  'monthly', 1),
  ('pro_yearly',  'Gói Pro (năm)',   'Đầy đủ tính năng, thanh toán theo năm (tiết kiệm hơn)',   990000, 'yearly',  2)
on conflict (code) do nothing;
