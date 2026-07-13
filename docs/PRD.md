# PRD — Tài liệu Yêu cầu Sản phẩm

**Sản phẩm:** EduFlow — Không gian làm việc số cho giáo viên cá nhân
_(Tên "EduFlow" là tên tạm, có thể thay đổi trước khi phát hành.)_

**Phiên bản tài liệu:** 1.0
**Ngày:** 2026-07-13
**Trạng thái:** Bản nháp để phê duyệt — chưa lập trình
**Ngôn ngữ giao diện:** Tiếng Việt · **Tiền tệ mặc định:** VND · **Múi giờ:** Asia/Ho_Chi_Minh

---

## 1. Tổng quan sản phẩm

### 1.1. Bối cảnh & vấn đề
Giáo viên dạy cá nhân (gia sư, giáo viên luyện thi, giáo viên tự do) hiện đang quản lý công việc bằng nhiều công cụ rời rạc: sổ tay giấy, Excel, Zalo, Google Calendar, ứng dụng ghi chú. Hệ quả:

- Khó theo dõi lịch dạy, dễ trùng/sót buổi.
- Công nợ học phí (ai nợ, nợ bao nhiêu, quá hạn chưa) không rõ ràng, dễ thất thoát thu nhập.
- Không có bức tranh tài chính tổng thể (thu, chi, dòng tiền).
- Hồ sơ học sinh, tài liệu giảng dạy nằm rải rác, khó tra cứu.

### 1.2. Giải pháp
Một sản phẩm **SaaS đa người thuê (multi-tenant)** cho phép mỗi giáo viên có một không gian làm việc riêng, dữ liệu **cách ly tuyệt đối**, tập trung 4 nhóm nghiệp vụ:

1. **Học sinh & giảng dạy** — hồ sơ học sinh, bài học/nội dung, tài liệu.
2. **Lịch & buổi học** — lịch theo ngày/tuần/tháng, trạng thái buổi, điểm danh, ghi chú.
3. **Tài chính** — công nợ phải thu (học phí), công nợ phải trả, thu nhập, chi phí, hạn & lịch sử thanh toán.
4. **Báo cáo & tổng quan** — bảng điều khiển, báo cáo doanh thu/chi phí/công nợ/dòng tiền.

### 1.3. Tầm nhìn
Trở thành "phần mềm điều hành" (operating system) cho công việc của giáo viên cá nhân tại Việt Nam: thay thế hoàn toàn Excel + sổ tay, giúp giáo viên **không thất thoát học phí** và **nắm rõ tình hình tài chính** chỉ trong vài phút mỗi ngày.

### 1.4. Nguyên tắc sản phẩm
- **Đơn giản trước, mạnh mẽ sau** — MVP tối giản, dễ dùng cho người không rành công nghệ.
- **Cách ly dữ liệu là bất khả xâm phạm** — bảo mật theo `user_id` + Row Level Security ở tầng cơ sở dữ liệu.
- **Tiếng Việt & bối cảnh Việt Nam là mặc định** — VND, định dạng ngày dd/MM/yyyy, múi giờ Asia/Ho_Chi_Minh.
- **Responsive-first** — dùng tốt trên điện thoại vì giáo viên thường thao tác khi di chuyển.

---

## 2. Đối tượng người dùng (Personas)

### 2.1. USER — Giáo viên cá nhân (khách hàng trả tiền)
| Thuộc tính | Mô tả |
|---|---|
| Vai trò | Chủ sở hữu không gian làm việc |
| Mục tiêu | Quản lý học sinh, lịch dạy, thu học phí, nắm tài chính |
| Trình độ công nghệ | Trung bình — quen Zalo, Excel cơ bản |
| Thiết bị | Chủ yếu điện thoại; máy tính khi làm báo cáo cuối tháng |
| Nỗi đau chính | Thất thoát học phí, quên lịch, không rõ dòng tiền |

**Đặc điểm dữ liệu:** Mỗi USER chỉ thấy và thao tác trên dữ liệu **của chính mình**. Không có khái niệm chia sẻ dữ liệu giữa các USER trong MVP.

### 2.2. ADMIN — Chủ hệ thống (đội ngũ vận hành sản phẩm)
| Thuộc tính | Mô tả |
|---|---|
| Vai trò | Quản trị nền tảng |
| Mục tiêu | Quản lý tài khoản khách hàng, trạng thái mua/gói, theo dõi sức khỏe hệ thống |
| Quyền hạn | Quản lý vòng đời tài khoản USER; **không** thao tác nghiệp vụ bên trong không gian của USER trong luồng thông thường |
| Truy cập | Trang quản trị riêng biệt (`/admin`), xác thực & phân quyền phía máy chủ |

### 2.3. Học sinh (không phải người dùng phần mềm ở MVP)
Học sinh là **đối tượng dữ liệu**, không đăng nhập trong phiên bản đầu tiên. Cổng học sinh/phụ huynh để lại cho phiên bản sau.

---

## 3. Mục tiêu & Phi mục tiêu

### 3.1. Mục tiêu (MVP)
- G1. Giáo viên tạo & quản lý hồ sơ học sinh trong < 1 phút/học sinh.
- G2. Xem lịch dạy tuần và biết ngay buổi nào sắp diễn ra / đã xong / đã hủy.
- G3. Ghi nhận điểm danh & ghi chú ngay sau buổi học.
- G4. Theo dõi chính xác học phí còn nợ của từng học sinh và tổng công nợ.
- G5. Ghi nhận thu/chi và xem báo cáo dòng tiền theo tháng.
- G6. Dữ liệu giữa các USER cách ly tuyệt đối, được kiểm chứng bằng RLS.
- G7. ADMIN quản lý được vòng đời tài khoản (khóa/mở/kích hoạt, trạng thái gói).

### 3.2. Phi mục tiêu (không làm ở MVP)
- Không có cổng đăng nhập cho học sinh/phụ huynh.
- Không tích hợp cổng thanh toán tự động (Stripe/VNPay/MoMo) — thanh toán được ghi nhận thủ công.
- Không có lớp học nhóm nhiều học sinh/buổi phức tạp (MVP tối ưu cho dạy 1–1; xem §8.3).
- Không có nhắn tin/chat trong ứng dụng.
- Không có ứng dụng di động native (chỉ web responsive).
- Không có tính năng cộng tác nhiều giáo viên trong một không gian (mỗi USER là một không gian độc lập).

---

## 4. Giả định & Quyết định thiết kế

> Các mục dưới đây là **giả định** được chốt để có thể tiến hành. Nếu khác với mong muốn, cần điều chỉnh ở bước rà soát.

| # | Chủ đề | Quyết định/giả định | Lý do |
|---|---|---|---|
| A1 | Đăng ký & gói | USER **tự đăng ký** (self-serve) bằng email + mật khẩu qua Supabase Auth. Tài khoản mới ở trạng thái **`trialing`** (dùng thử, mặc định 14 ngày). Mô hình **thuê bao trả phí**; MVP chỉ **một gói** với **2 chu kỳ (tháng/năm)**, **không** có gói miễn phí vĩnh viễn. | Giảm ma sát tiếp nhận khách; đơn giản hóa gói ở MVP. |
| A2 | Kích hoạt & gia hạn | MVP: thanh toán **ngoài luồng** (chuyển khoản). **ADMIN xác nhận thanh toán rồi kích hoạt/gia hạn thuê bao thủ công** (đặt gói, ngày bắt đầu/hết hạn, trạng thái thanh toán). Cổng thanh toán tự động → **phiên bản sau**. | Phù hợp thói quen thị trường VN; đơn giản hóa MVP. |
| A3 | Vai trò | Chỉ 2 vai trò: `user` và `admin`. Vai trò lưu trong `app_metadata` của Supabase Auth (JWT claim), **không** để USER tự sửa. | Cho phép RLS & middleware kiểm tra vai trò an toàn, tránh đệ quy truy vấn. |
| A4 | Mô hình dạy | Tối ưu cho **dạy 1 kèm 1**: mỗi buổi học gắn với 1 học sinh. Lớp nhóm nhiều học sinh để phiên bản sau (thiết kế CSDL vẫn để đường mở rộng). | Bám sát nhu cầu "giáo viên cá nhân". |
| A5 | Tài chính | Dùng mô hình lai: **công nợ (accrual)** cho khoản phải thu/phải trả + **dòng tiền thực (cash)** cho thu/chi. Báo cáo dòng tiền tổng hợp từ các lần thanh toán thực tế. | Vừa quản lý được công nợ, vừa phản ánh dòng tiền thật. |
| A6 | Tiền tệ | Mặc định VND, lưu số nguyên (đồng), không có phần thập phân. Cho phép đổi tiền tệ hiển thị ở cài đặt (đa tiền tệ đầy đủ để sau). | VND không dùng số lẻ; tránh lỗi làm tròn. |
| A7 | Múi giờ | Lưu thời gian dạng `timestamptz` (UTC) trong CSDL, hiển thị theo `Asia/Ho_Chi_Minh`. | Chuẩn hóa lưu trữ, tránh lệch giờ. |
| A8 | Tệp/tài liệu | Lưu trên Supabase Storage, đường dẫn có tiền tố `user_id`; chính sách Storage theo `user_id`. | Cách ly tệp giữa các USER. |
| A9 | Thông báo | MVP: thông báo **trong ứng dụng** (in-app) + nhắc hạn ở bảng điều khiển. Email/Zalo/push để sau. | Giảm phụ thuộc dịch vụ ngoài ở giai đoạn đầu. |
| A10 | Hết hạn thuê bao | Khi trial hết hạn hoặc thuê bao `expired`: USER đăng nhập được nhưng vào chế độ **chỉ đọc/hạn chế** (khóa thao tác ghi), kèm lời nhắc gia hạn. | Không mất dữ liệu khách; tạo động lực gia hạn. |
| A11 | Lập hóa đơn học phí | Hóa đơn **tự động tổng hợp** từ các buổi đã hoàn thành chưa lập hóa đơn trong kỳ; giáo viên **chỉnh tay** được rồi chốt. Vẫn cho tạo hóa đơn thủ công. | Giá trị cốt lõi: giảm thất thoát học phí, tiết kiệm công. |

---

## 5. Chức năng của USER (chi tiết)

Ký hiệu độ ưu tiên: **P0** = bắt buộc MVP · **P1** = nên có sớm · **P2** = phiên bản sau.

### 5.1. Bảng điều khiển tổng quan (Dashboard) — P0
- Thẻ chỉ số nhanh: số học sinh đang học, số buổi hôm nay/tuần này, học phí còn phải thu, thu–chi tháng hiện tại.
- Danh sách "Buổi học sắp tới" (hôm nay & 7 ngày tới).
- Cảnh báo: hóa đơn quá hạn, khoản phải trả sắp đến hạn.
- Biểu đồ nhỏ: dòng tiền 6 tháng gần nhất.

**User story:** _Là giáo viên, tôi muốn mở app thấy ngay việc cần làm hôm nay và ai đang nợ học phí, để không bỏ sót._

### 5.2. Quản lý hồ sơ học sinh — P0
- CRUD học sinh: họ tên, ngày sinh, giới tính, lớp/khối, môn học, liên hệ (SĐT, email), phụ huynh (tên, SĐT), địa chỉ, học phí mặc định/buổi hoặc /tháng, trạng thái (đang học/tạm nghỉ/đã nghỉ), ảnh đại diện, ghi chú.
- Tìm kiếm, lọc theo trạng thái/môn/lớp.
- Trang chi tiết học sinh: lịch sử buổi học, công nợ, tài liệu liên quan.

### 5.3. Quản lý bài học & nội dung giảng dạy — P0
- CRUD bài học/chủ đề: tiêu đề, môn, khối lớp, mô tả, nội dung (văn bản định dạng), thẻ (tag), thứ tự.
- Thư viện bài học dùng chung trong không gian của USER (không bắt buộc gắn 1 học sinh).
- Gắn bài học vào buổi học khi lên lịch (tùy chọn).

### 5.4. Quản lý tài liệu, tệp & liên kết — P0
- Tải lên tệp (PDF, ảnh, tài liệu) lên Supabase Storage hoặc lưu **liên kết ngoài** (Google Drive, YouTube…).
- Gắn nhãn, phân loại; liên kết tới bài học và/hoặc học sinh (tùy chọn).
- Xem/tải xuống; giới hạn dung lượng theo gói (thực thi ở phiên bản sau).

### 5.5. Quản lý lịch dạy theo ngày/tuần/tháng — P0
- Chế độ xem: **Ngày**, **Tuần**, **Tháng** (và danh sách).
- Tạo buổi học: chọn học sinh, bài học (tùy chọn), thời gian bắt đầu/kết thúc, hình thức (online/offline), địa điểm/link, học phí buổi.
- Lặp lại lịch (hằng tuần) — **P1** (MVP có thể tạo từng buổi hoặc tạo nhanh theo mẫu).
- Phát hiện trùng giờ — P1.

### 5.6. Theo dõi trạng thái buổi học — P0
- Trạng thái: `Sắp diễn ra (scheduled)`, `Đã hoàn thành (completed)`, `Đã hủy (cancelled)`, (mở rộng: `Vắng/no_show`).
- Chuyển trạng thái nhanh từ lịch; ghi lý do hủy.
- Buổi quá giờ mà chưa cập nhật → gợi ý "đánh dấu hoàn thành".

### 5.7. Điểm danh & ghi chú sau buổi học — P0
- Với mỗi buổi: điểm danh (có mặt/vắng/đi trễ), tình trạng bài tập, nhận xét sau buổi (nội dung đã dạy, đánh giá, việc cần làm).
- Ghi chú hiển thị trong lịch sử của học sinh.

### 5.8. Quản lý khoản phải thu (học phí còn nợ) — P0
- **Tự động tổng hợp hóa đơn** từ các buổi **đã hoàn thành** chưa lập hóa đơn trong kỳ (cộng học phí từng buổi) — giúp không thất thoát học phí; cho phép **chỉnh tay** trước khi chốt.
- Cũng có thể tạo hóa đơn thủ công: kỳ áp dụng (tháng), số tiền, giảm giá, hạn thanh toán, mô tả.
- Trạng thái: chưa thu / thu một phần / đã thu / quá hạn / hủy.
- Xem tổng công nợ theo học sinh và toàn bộ.

### 5.9. Quản lý khoản phải trả (USER nợ người khác) — P0
- Ghi nhận khoản phải trả: chủ nợ, hạng mục (thuê phòng, mua tài liệu, trả cộng tác viên…), số tiền, hạn trả, ghi chú.
- Trạng thái & lịch sử trả dần.

### 5.10. Ghi nhận thu nhập & chi phí — P0
- Sổ thu/chi: loại (thu/chi), danh mục, số tiền, ngày, ghi chú, gắn học sinh (tùy chọn).
- Thu học phí tự động tạo bản ghi "thu"; trả nợ tự động tạo bản ghi "chi" (liên thông với §5.8, §5.9).

### 5.11. Theo dõi hạn thanh toán & lịch sử thanh toán — P0
- Danh sách hạn sắp tới/quá hạn (cả phải thu & phải trả).
- Lịch sử các lần thanh toán: ngày, số tiền, phương thức (tiền mặt/chuyển khoản/ví), tham chiếu.

### 5.12. Báo cáo doanh thu, chi phí, công nợ & dòng tiền — P0/P1
- Báo cáo theo tháng/khoảng thời gian: tổng thu, tổng chi, lợi nhuận, dòng tiền ròng.
- Báo cáo công nợ: tổng phải thu, tổng phải trả, danh sách quá hạn.
- Báo cáo theo học sinh (doanh thu đóng góp) — P1.
- Xuất CSV/Excel — P1.

### 5.13. Cài đặt hồ sơ, tiền tệ & thông báo — P0
- Hồ sơ giáo viên: tên, ảnh, SĐT.
- Cài đặt: tiền tệ hiển thị (mặc định VND), múi giờ (mặc định Asia/Ho_Chi_Minh), định dạng ngày.
- Tùy chọn thông báo (nhắc buổi học, nhắc hạn học phí).
- Thông tin gói & trạng thái sử dụng (chỉ xem).

---

## 6. Chức năng của ADMIN

Truy cập qua khu vực riêng `/admin`, **tách biệt** khỏi ứng dụng của USER. Mọi thao tác được xác minh phía máy chủ và **ghi audit log**.

**Phạm vi ADMIN — chỉ quản lý tài khoản & thuê bao:**

| # | Chức năng | Mô tả | Ưu tiên |
|---|---|---|---|
| AD1 | Đăng nhập quản trị | Đăng nhập trang quản trị; chỉ vai trò `admin` mới vào được. | P0 |
| AD2 | Xem & sửa thông tin tài khoản USER | Danh sách/chi tiết: email, tên, ngày tạo, trạng thái tài khoản & thuê bao; tìm kiếm/lọc; sửa thông tin tài khoản. | P0 |
| AD3 | Trạng thái tài khoản (khóa/mở) | Khóa tài khoản vi phạm, mở khóa lại. | P0 |
| AD4 | Xác nhận thanh toán & kích hoạt/gia hạn | Sau khi nhận chuyển khoản: xác nhận thanh toán, kích hoạt hoặc gia hạn thuê bao (đặt **gói**, **ngày bắt đầu**, **ngày hết hạn**, **trạng thái thanh toán**). | P0 |
| AD5 | Quản lý gói thuê bao của USER | Đổi gói, đổi trạng thái thuê bao (`trialing`/`active`/`past_due`/`expired`/`cancelled`). | P0 |
| AD6 | Lịch sử kích hoạt/gia hạn | Xem lịch sử thanh toán, kích hoạt, gia hạn của từng tài khoản. | P0 |
| AD7 | Quản lý danh mục gói | Tạo/sửa gói sản phẩm (tên, giá, **chu kỳ tháng/năm**, tính năng). | P1 |
| AD8 | Nhật ký kiểm toán (audit log) | Xem nhật ký thao tác quản trị (ai, làm gì, với ai, khi nào). | P1 |
| AD9 | Thống kê hoạt động chung | Số USER theo trạng thái thuê bao, đăng ký mới, tài khoản hoạt động (mức tổng hợp). | P1 |

**ADMIN KHÔNG được đọc hoặc chỉnh sửa dữ liệu nghiệp vụ riêng của USER**, gồm: **học sinh, bài học, lịch dạy, tài liệu, công nợ (phải thu/phải trả), thu nhập và chi phí**. Ràng buộc này được thực thi ở tầng cơ sở dữ liệu bằng **RLS** (policy các bảng nghiệp vụ chỉ dựa trên `auth.uid() = user_id`, không có nhánh cho ADMIN) — không chỉ bằng giao diện.

**Ràng buộc bảo mật (bắt buộc):**
- ADMIN chỉ thao tác ở phạm vi **tài khoản + thuê bao**; **không** có đường truy cập dữ liệu nghiệp vụ của USER trong luồng thường. (Impersonation hỗ trợ kỹ thuật — nếu có — là tính năng riêng, có log, để phiên bản sau.)
- USER **không** thấy hay gọi được bất kỳ chức năng ADMIN nào (kiểm soát ở máy chủ, không phải ẩn nút).
- **Mọi** thao tác kích hoạt, gia hạn, khóa, mở khóa (và đổi/hủy gói) đều được ghi vào `admin_audit_logs`.

---

## 7. Luồng nghiệp vụ chính

### 7.1. Đăng ký & khởi tạo không gian (USER)
```
Truy cập landing → Đăng ký (email/mật khẩu) → Xác minh email
→ Tạo profile (trạng thái trial 14 ngày) → Onboarding (nhập giáo viên, thêm học sinh đầu tiên)
→ Vào Dashboard
```

### 7.2. Kích hoạt & gia hạn thuê bao (USER ↔ ADMIN)
```
USER hết dùng thử / muốn mua hoặc gia hạn → Chuyển khoản (ngoài luồng)
→ ADMIN xác nhận thanh toán (tạo bản ghi subscription_payments)
→ ADMIN kích hoạt/gia hạn: đặt gói, ngày bắt đầu, ngày hết hạn, trạng thái = active
→ Ghi admin_audit_logs → USER mở khóa toàn bộ tính năng
```

### 7.3. Vòng đời buổi học (USER)
```
Lên lịch buổi (chọn học sinh, giờ, học phí) → Trạng thái: Sắp diễn ra
→ Sau buổi: Điểm danh + ghi chú → Trạng thái: Đã hoàn thành
→ (Tùy chọn) Sinh công nợ học phí cho buổi/kỳ
→ Nếu không dạy: Đánh dấu Đã hủy (ghi lý do)
```

### 7.4. Thu học phí (USER)
```
Tạo hóa đơn công nợ cho học sinh (kỳ, số tiền, hạn)
→ Học sinh trả (một phần/toàn bộ) → Ghi nhận thanh toán (ngày, phương thức)
→ Hệ thống cập nhật trạng thái hóa đơn + tạo bản ghi "thu" vào sổ dòng tiền
→ Báo cáo & công nợ cập nhật tức thì
```

### 7.5. Chi & công nợ phải trả (USER)
```
Ghi khoản phải trả (chủ nợ, số tiền, hạn) → Trả dần
→ Ghi nhận lần trả → Tạo bản ghi "chi" → Cập nhật công nợ còn lại
```

### 7.6. Chốt sổ & báo cáo tháng (USER)
```
Cuối tháng: mở Báo cáo → Xem thu/chi/lợi nhuận/dòng tiền
→ Xem công nợ tồn → (P1) Xuất CSV
```

### 7.7. Quản trị tài khoản (ADMIN)
```
Đăng nhập /admin → Xem danh sách USER → Chọn tài khoản
→ Kích hoạt/khóa/đổi gói/đặt hạn → (Ghi audit log) → Trạng thái áp dụng ngay cho USER
```

---

## 8. Phạm vi MVP & Phiên bản sau

### 8.1. Trong phạm vi MVP (Bản 1.0)
- Xác thực USER (đăng ký/đăng nhập/quên mật khẩu) + trạng thái trial.
- Quản lý học sinh, bài học, tài liệu/tệp/liên kết.
- Lịch dạy (ngày/tuần/tháng) + trạng thái buổi + điểm danh + ghi chú.
- Công nợ phải thu (hóa đơn **tự động từ buổi học** + chỉnh tay), phải trả; thu/chi; hạn & lịch sử thanh toán.
- Báo cáo cơ bản (thu/chi/dòng tiền/công nợ) + Dashboard.
- Cài đặt hồ sơ/tiền tệ/thông báo in-app.
- Khu vực ADMIN: danh sách USER, khóa/mở/kích hoạt, đổi trạng thái gói.
- Bảo mật: `user_id` trên mọi bảng dữ liệu khách + RLS bật toàn bộ + phân quyền máy chủ.

### 8.2. Phiên bản sau (Backlog)
- Tích hợp thanh toán tự động (VNPay/MoMo/Stripe) + tự gia hạn.
- Hóa đơn định kỳ tự động hằng tháng (theo lịch); nhắc lập hóa đơn.
- Lịch lặp nâng cao, phát hiện trùng, đồng bộ Google Calendar.
- Nhắc lịch/nhắc học phí qua Email/Zalo ZNS/push.
- Xuất Excel/PDF, báo cáo nâng cao & biểu đồ.
- Thống kê ADMIN nâng cao, quản lý gói, audit log đầy đủ, impersonation có kiểm soát.
- Cổng phụ huynh/học sinh (xem lịch, công nợ, nhận xét).
- Lớp nhóm nhiều học sinh/buổi; điểm danh theo lớp.
- Ứng dụng di động (PWA/native).

### 8.3. Ghi chú về mở rộng "lớp nhóm"
MVP tối ưu dạy 1–1 nhưng thiết kế CSDL sẽ **tách bảng điểm danh** ra khỏi buổi học để sau này một buổi có nhiều học sinh mà không phải đổi cấu trúc lớn (xem `docs/DATABASE.md`).

---

## 9. Yêu cầu phi chức năng

### 9.1. Bảo mật (bắt buộc)
- Mọi bảng chứa dữ liệu khách hàng có cột `user_id` **NOT NULL**.
- Bật **Row Level Security** trên tất cả bảng dữ liệu khách; policy mặc định `auth.uid() = user_id`.
- USER chỉ đọc/ghi dữ liệu của chính mình; không truy cập dữ liệu USER khác.
- Không dựa vào ẩn nút giao diện để phân quyền — mọi kiểm soát ở máy chủ + RLS.
- Thao tác ADMIN xác minh phía máy chủ (kiểm tra vai trò trong JWT/máy chủ, không tin client).
- **Không** đưa khóa bí mật Supabase (`service_role`) vào mã chạy trên trình duyệt; chỉ dùng ở máy chủ.
- Chi tiết: xem `docs/PERMISSIONS.md`.

### 9.2. Hiệu năng
- Trang chính tải nội dung < 2.5s trên 4G (mục tiêu LCP).
- Truy vấn danh sách có phân trang; đánh chỉ mục theo `user_id` và cột lọc phổ biến.

### 9.3. Khả dụng & Responsive
- Giao diện responsive: điện thoại (ưu tiên), máy tính bảng, máy tính.
- Hỗ trợ thao tác nhanh trên di động (thêm buổi, ghi thu học phí trong vài chạm).

### 9.4. Quốc tế hóa & bản địa hóa
- Toàn bộ giao diện tiếng Việt; định dạng số/tiền theo `vi-VN` (dấu chấm phân tách nghìn, "₫").
- Ngày dd/MM/yyyy; giờ 24h; múi giờ Asia/Ho_Chi_Minh.
- Kiến trúc chuỗi văn bản tách rời để dễ đa ngôn ngữ sau.

### 9.5. Độ tin cậy & dữ liệu
- Sao lưu CSDL theo chính sách của Supabase; không xóa cứng dữ liệu tài chính (ưu tiên xóa mềm/`archived`).
- Ràng buộc toàn vẹn bằng khóa ngoại; số tiền lưu số nguyên (đồng).

### 9.6. Khả năng bảo trì
- Next.js App Router + TypeScript, thành phần UI dùng shadcn/ui + Tailwind.
- Migrations CSDL versioned (SQL trong repo).
- Tách rõ tầng: UI · truy cập dữ liệu (server) · chính sách RLS.

---

## 10. Chỉ số thành công (định hướng)
- **Kích hoạt:** % USER thêm ≥ 1 học sinh và ≥ 1 buổi học trong 7 ngày đầu.
- **Giữ chân:** % USER quay lại tuần thứ 4.
- **Giá trị lõi:** % USER ghi nhận ≥ 1 khoản thu học phí/tháng.
- **Chuyển đổi:** % tài khoản `trialing` → `active`.
- **Sức khỏe:** tỉ lệ lỗi máy chủ < 0.1%, không có sự cố rò rỉ dữ liệu chéo USER (bằng 0 — tuyệt đối).

---

## 11. Rủi ro & Giảm thiểu
| Rủi ro | Ảnh hưởng | Giảm thiểu |
|---|---|---|
| Rò rỉ dữ liệu chéo giữa các USER | Nghiêm trọng | RLS bắt buộc + kiểm thử phân quyền tự động (§PERMISSIONS) |
| Lộ `service_role` key | Nghiêm trọng | Chỉ dùng ở máy chủ; kiểm tra biến môi trường; không import ở client |
| Mô hình tài chính sai lệch | Cao | Chuẩn hóa: công nợ tách khỏi dòng tiền; kiểm thử số liệu báo cáo |
| Người dùng ít rành công nghệ bỏ cuộc | Trung bình | Onboarding dẫn dắt, giao diện tối giản tiếng Việt |
| Phình phạm vi (scope creep) | Trung bình | Bám sát §8.1; đẩy phần còn lại về backlog |

---

## 12. Tài liệu liên quan
- Phân quyền chi tiết: [`PERMISSIONS.md`](./PERMISSIONS.md)
- Thiết kế cơ sở dữ liệu: [`DATABASE.md`](./DATABASE.md)
- Lộ trình triển khai: [`ROADMAP.md`](./ROADMAP.md)
- Giới thiệu dự án: [`../README.md`](../README.md)
