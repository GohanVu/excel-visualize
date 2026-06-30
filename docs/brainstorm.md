# Brainstorm Notes

> File này lưu lại toàn bộ kết quả brainstorm giữa người dùng và AI.
> Đây là nguồn context quan trọng để hiểu TẠI SAO project được thiết kế như hiện tại.

---

## Session 1 — 2026-06-27 — UI/UX & Product Direction

### Bối cảnh & Vấn đề

Người dùng muốn build web app giúp **người dùng Excel lâu năm, data lớn, muốn xem visual nhưng không biết cách**.

Mục tiêu cốt lõi: **đưa user từ file Excel → chart đẹp nhanh nhất có thể, ít quyết định nhất có thể.**

Không phải tool cho data analyst — là tool cho người không chuyên.

### Yêu cầu đã xác nhận

- **Platform**: Web app SaaS
- **Target**: Người dùng Việt Nam, dùng Excel lâu năm, data lớn, không biết cách tạo chart đẹp
- **Model**: Freemium với subscription trả phí
- **Ngôn ngữ UI**: Tiếng Việt (tên tính năng, AI insight đều bằng tiếng Việt)

### 3 Nguyên tắc UX cốt lõi

1. **Đừng hỏi user chọn chart** — họ không biết Bar vs Line là gì. App suggest trước, user click chọn.
2. **Wow moment < 30 giây** — Upload xong → thấy chart ngay. Smart default, detect tự động.
3. **Ẩn hết jargon** — Không dùng "dataset", "transform", "axis". Dùng "cột", "số liệu", "So sánh theo thời gian".

### User Journey đã chốt

```
Upload file (5s)
  → Tổng quan cột (tự động)
  → Chọn cột muốn dùng (auto pre-select)
  → App suggest chart (không hỏi gì)
  → Xem chart → Tuỳ chỉnh (optional)
  → Export / Lưu dashboard
```

### Màn hình Tổng quan cột

- App tự detect kiểu cột và nhóm thành 3 loại bằng tiếng Việt:
  - 📅 **Thời gian** (date/datetime columns)
  - 🔢 **Số liệu** (numeric columns)
  - 🏷️ **Phân loại** (string/categorical columns)
- Hiện preview 3 dòng đầu để user nhận ra file của mình
- **Auto pre-select**: cột date đầu tiên + cột số liệu đầu tiên
- User có thể thay đổi selection — nhưng không bắt buộc

### Màn hình Gợi ý Chart

- Hiện 4 chart thumbnails render bằng **data thật** của user (không phải data mẫu)
- Mô tả bằng tiếng Việt đơn giản: "So sánh theo từng tháng", "Xu hướng theo thời gian"
- Không dùng tên kỹ thuật (Bar chart, Line chart)
- 1 thumbnail được pre-select sẵn (recommended)
- Có escape hatch nhỏ: "Tôi tự chọn loại chart" cho power user

### Freemium Gate đã chốt

#### Free tier
- Tối đa **3 chart / dashboard** (hoặc ít hơn nếu data không đủ để suggest)
- Tối đa **1 dashboard**
- Tối đa **2 dataset**
- Rule-based suggest: **2 gợi ý** (không tốn API)
- Export PNG cơ bản
- Sync Google Sheet: manual only (nút Refresh)

#### Pro tier
- Không giới hạn chart, dashboard, dataset
- AI suggest: **4 gợi ý + insight tiếng Việt** (Claude API)
- Export PNG + PDF, watermark-free
- Sync Google Sheet tự động (BullMQ cron)

#### Rule gate quan trọng
**Số chart free user thấy = min(3, số chart hợp lý app suggest được từ data)**

- Nếu data chỉ đủ cho 2 chart → free user thấy 2, không hiện slot "🔒 bị khóa" trống
- Gate chỉ kích hoạt khi có thứ gì đó thực sự để khóa
- Hiện locked: blur + 🔒, không ẩn đi — user thấy mình bỏ lỡ gì

#### Chi phí API (ước tính)
- Rule-based suggest: $0 (chạy local)
- Claude API cho 1 dataset ~500 rows: ~$0.01–0.03 / lần
- Paid user dùng 10 lần/tháng: ~$0.1–0.3 / user / tháng
- → Margin tốt nếu plan từ 99k VND/tháng

### Tech Stack đã chốt (từ spec)

| Layer | Công nghệ |
|---|---|
| Frontend | React + Vite + TailwindCSS |
| Chart | ECharts (echarts-for-react) |
| Dashboard layout | react-grid-layout |
| Data fetching | TanStack Query |
| Backend | NestJS + Prisma |
| DB | PostgreSQL 16 |
| File storage | MinIO |
| Cache/Queue | Redis + BullMQ |
| Auth | Google OAuth2 + JWT |
| Infra | Docker + Traefik + GitHub Actions |
| Payment | Stripe |

### Câu hỏi còn mở

- Tên sản phẩm và domain cụ thể (đang để "ChartLy" tạm)
- Giá subscription cụ thể (đề xuất từ 99k VND/tháng)
- VPS provider (ưu tiên VN, hoặc Vultr/Hetzner)
- Plan có bao nhiêu tier? (Free + 1 Pro, hay Free + Pro + Business?)

---
## Session 2 — 2026-06-30 — Notion-like Chart View / Editor

### Bối cảnh & Mục tiêu
Người dùng muốn có cách thiết kế biểu đồ hoạt động tương tự như Notion Chart View: trực quan, linh hoạt, cấu hình trực tiếp từ sidebar bên phải thay vì đi theo luồng tuyến tính từng bước.

### Thiết kế đã thống nhất (Brainstorm)
1. **Luồng UX Lai (Hybrid Flow)**:
   * Giữ luồng Upload $\rightarrow$ Suggest 4 mẫu nhanh cho người dùng phổ thông.
   * Cung cấp nút **"Tự thiết kế / Chỉnh sửa"** mở ra **Studio Chart Editor** cho power-user.
2. **Studio Chart Editor Layout**:
   * **Bên trái (Preview & Table)**: Biểu đồ ECharts kích thước lớn kèm bảng dữ liệu thu nhỏ phía dưới để đối chiếu.
   * **Bên phải (Control Sidebar)**: Panel Glassmorphism cấu hình trực tiếp bao gồm:
     * *Dữ liệu (Data)*: Loại biểu đồ, cột Trục X, cột Trục Y, Phép gộp (Aggregation), Nhóm theo (Series), Sắp xếp (Sort), Giới hạn (Limit).
     * *Giao diện (Style)*: Tiêu đề, Mô tả, Bảng màu gradient, Toggles (Grid lines, Data labels, Legend, Dark mode).
3. **Giải pháp Lưu trữ**:
   * Không thay đổi schema Prisma. Lưu cả `definition` (Notion-like spec) và `option` (đã biên dịch cho ECharts) vào chung cột `config: Json` của bảng `Chart` để dễ phục hồi state của Sidebar Editor.
4. **Trình biên dịch Option**:
   * Nâng cấp `buildChartOption.ts` thành một compiler nhận `definition` + `rows` $\rightarrow$ sinh ra option ECharts tương ứng trực tiếp ở frontend.

## Session 3 — 2026-06-30 — Thay thế Stripe bằng Cổng thanh toán Việt Nam (VietQR / PayOS)

### Bối cảnh & Yêu cầu
Người dùng phát triển dự án tại Việt Nam, không sử dụng Stripe hoặc các hình thức đăng ký tự động gia hạn (Subscription auto-recurring). 
Yêu cầu:
- Tích hợp quét mã QR (VietQR) chuyển khoản ngân hàng.
- Lựa chọn các gói trả trước theo thời hạn cố định: 1 tháng, 3 tháng, 6 tháng, 12 tháng.
- Xử lý tự động: Khách hàng chuyển khoản thành công -> hệ thống nhận webhook -> kích hoạt gói Pro tự động.

### Giải pháp đề xuất
1. **Cổng thanh toán hỗ trợ**: Sử dụng **PayOS** (payos.vn).
   - *Lý do:* Hỗ trợ tài khoản cá nhân, tạo mã QR động chứa chính xác số tiền và mã giao dịch duy nhất, hoàn toàn miễn phí giao dịch (hoặc phí rất thấp tùy ngân hàng), hỗ trợ Webhook tự động bắn tín hiệu thanh toán thành công về Backend cực kỳ ổn định mà không cần cào lịch sử giao dịch thủ công.
2. **Mô hình thanh toán**: Chuyển đổi từ **Subscription (tự động gia hạn)** sang **Prepaid (trả trước theo thời hạn)**.
   - Khi giao dịch thành công, gói Pro sẽ được kích hoạt bằng cách cập nhật ngày hết hạn `expiredAt` trên tài khoản.
   - User có thể nạp thêm để cộng dồn thời hạn (ví dụ: đang còn 15 ngày Pro, nạp gói 1 tháng sẽ thành 45 ngày).
3. **Cấu trúc DB Schema**:
   - Bảng `Subscription` sẽ chuyển đổi ngữ nghĩa từ trạng thái cổng Stripe sang lưu trữ thông tin thời hạn của user: `plan` (free/pro), `status` (active/expired), `startDate`, `endDate` (tương ứng với `expiredAt`), và `paymentProvider` (payos).
   - Thêm bảng `PaymentTransaction` để lưu lịch sử giao dịch (id, userId, orderCode, amount, durationMonths, status, createdAt).
4. **Luồng thanh toán**:
   - **Frontend:** User click chọn gói (1/3/6/12 tháng) $\rightarrow$ FE gọi API `POST /payments/create-link` $\rightarrow$ Nhận link thanh toán PayOS $\rightarrow$ Redirect hoặc hiển thị Modal chứa mã QR động $\rightarrow$ Chờ thông báo thanh toán (qua polling hoặc websocket) $\rightarrow$ Hiển thị popup thành công.
   - **Backend:** Nhận request tạo link thanh toán $\rightarrow$ Generate mã đơn hàng (`orderCode` ngẫu nhiên/tăng dần) $\rightarrow$ Gọi API PayOS tạo link thanh toán $\rightarrow$ Lưu `PaymentTransaction` trạng thái `PENDING`.
   - **Webhook:** Khi khách chuyển khoản thành công $\rightarrow$ PayOS bắn Webhook POST tới `/payments/webhook` $\rightarrow$ Backend verify signature $\rightarrow$ Cập nhật `PaymentTransaction` sang `SUCCESS` $\rightarrow$ Tính toán cộng dồn hạn dùng và cập nhật bảng `Subscription` $\rightarrow$ Trả về 200 OK cho PayOS.

<!-- Thêm session mới ở đây -->
