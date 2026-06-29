# Project Plan & Roadmap

> File này chứa plan tổng thể của project. AI PHẢI đọc file này trước khi implement bất kỳ task nào.
> Cập nhật trạng thái task sau mỗi session.

## Overview

- **Project**: ChartLy (tên tạm — chưa chốt)
- **Goal**: Web app SaaS cho người dùng Excel VN muốn xem visual nhanh, không cần biết cách tạo chart
- **Tech Stack**: React + Vite + TailwindCSS / NestJS + Prisma / PostgreSQL + MinIO + Redis / Docker + Traefik
- **Model**: Freemium — Free (3 chart/dashboard) + Pro (unlimited + AI insight tiếng Việt)
- **Timeline**: TBD

---

## Phase 0 — Setup & Foundation

> Mục tiêu: Dựng skeleton project, CI/CD, DB schema, Auth. Chưa có feature nào chạy được end-to-end.

| Task ID | Mô tả | Status | Dependencies | Notes |
|---------|--------|--------|--------------|-------|
| P0-T1 | Khởi tạo monorepo: `frontend/` + `backend/` + `docker-compose.yml` | ✅ Done | — | Dùng pnpm workspaces |
| P0-T2 | Docker Compose: Postgres 16, Redis, MinIO, NestJS, React dev server | ✅ Done | P0-T1 | PIN version cụ thể, không dùng `latest` |
| P0-T3 | Prisma schema — bổ sung role: users(role: admin\|user), bảng: datasets, dataset_columns, dashboards, charts, subscriptions, audit_logs | ✅ Done | P0-T1 | role lưu enum trong DB |
| P0-T4 | Auth module backend: Google OAuth2 + JWT (access + refresh token) + role guard | ✅ Done | P0-T2, P0-T3 | Refresh token Google PHẢI mã hoá trước khi lưu DB |
| P0-T5 | Auth flow UI: trang Login (Google Sign-In button), callback handler, lưu JWT vào httpOnly cookie | ✅ Done | P0-T4 | Không dùng localStorage cho token |
| P0-T6 | Route guard FE: redirect về /login nếu chưa đăng nhập, redirect về /dashboard nếu đã đăng nhập | ✅ Done | P0-T5 | |
| P0-T7 | GitHub Actions CI: lint + test + build check khi push | ✅ Done | P0-T1 | Không cần deploy thật lúc này |
| P0-T8 | ESLint + Husky pre-commit: enforce max-lines (200 soft / 400 hard), max-lines-per-function (50) | ✅ Done | P0-T1 | Xem quy tắc trong spec |
| P0-T9 | Traefik reverse proxy config (local dev + production skeleton) | ⏭️ Skipped | P0-T2 | Làm trước Phase 6 deploy, không block Phase 1–5 |

---

## Phase 0.5 — Auth & Role System

> Mục tiêu: Phân quyền rõ ràng giữa admin và user thường. Admin có panel quản lý riêng.

### Phân quyền

| Role | Có thể làm gì |
|------|--------------|
| `user` | Quản lý dataset/dashboard/chart của chính mình, nâng cấp subscription |
| `admin` | Xem tất cả users, override subscription, xem audit log, xem stats tổng quan |

> Admin KHÔNG tự đăng ký được — chỉ set thủ công trong DB hoặc qua script seed.

| Task ID | Mô tả | Status | Dependencies | Notes |
|---------|--------|--------|--------------|-------|
| P05-T1 | Role guard NestJS: decorator `@Roles('admin')`, middleware check JWT + role | ⬜ Todo | P0-T4 | Tất cả admin route đều require role=admin |
| P05-T2 | Admin panel layout (FE): sidebar riêng, route `/admin/*`, chỉ render nếu role=admin | ⬜ Todo | P0-T6, P05-T1 | Redirect về /dashboard nếu user thường truy cập /admin |
| P05-T3 | Admin: trang Users — danh sách users, xem plan, có thể override plan thủ công | ⬜ Todo | P05-T2 | |
| P05-T4 | Admin: trang Stats — tổng users, tổng charts tạo, DAU/MAU cơ bản | ⬜ Todo | P05-T2 | Query từ DB, không cần analytics service |
| P05-T5 | Admin: trang Audit Log — xem lịch sử hành động của users | ⬜ Todo | P05-T2 | Đọc từ bảng `audit_logs` |
| P05-T6 | Seed script: tạo admin user đầu tiên | ⬜ Todo | P0-T3 | Chạy 1 lần lúc setup |
| P05-T7 | User: trang Profile — xem thông tin tài khoản, plan hiện tại, nút logout | ⬜ Todo | P0-T5 | |

### Test cases P0.5

- [ ] User thường truy cập `/admin` → redirect về `/dashboard`
- [ ] Admin thấy đủ Users / Stats / Audit Log
- [ ] Override plan user từ free → pro → limits thay đổi ngay
- [ ] Logout → JWT invalidate → truy cập route cần auth → redirect /login

---

## Phase 1 — Core Data Flow (MVP end-to-end)

> Mục tiêu: User upload Excel → thấy chart. Không cần đẹp, không cần đủ tính năng. Chỉ cần chạy được.

| Task ID | Mô tả | Status | Dependencies | Notes |
|---------|--------|--------|--------------|-------|
| P1-T1 | Upload file Excel/CSV lên MinIO (backend: presigned URL, FE: drag-drop UI) | ✅ Done | P0 done | Giới hạn: 10MB free / 50MB pro |
| P1-T2 | Excel/CSV parser service: đọc file từ MinIO, trả về rows + column metadata | ✅ Done | P1-T1 | SheetJS; CSV decode UTF-8, validate magic bytes |
| P1-T3 | Column type detection: phân loại date / number / string / category | ✅ Done | P1-T2 | ColumnTypeService rule-based, ngưỡng khớp 80% |
| P1-T4 | Column overview screen (FE): hiện 3 nhóm cột, preview 3 dòng đầu, auto pre-select | ✅ Done | P1-T3 | 3 nhóm: Thời gian/Số liệu/Phân loại; auto-select date+number đầu |
| P1-T5 | Rule-based chart suggester: nhận cột đã chọn → trả về danh sách chart types hợp lệ | ✅ Done | P1-T3 | POST /datasets/:id/suggest; tối đa 4 gợi ý, mô tả tiếng Việt |
| P1-T6 | Chart suggestion screen (FE): render 4 thumbnail bằng data thật, mô tả tiếng Việt | ✅ Done | P1-T4, P1-T5 | ECharts thumbnail; buildChartOption + ChartView dùng chung |
| P1-T7 | Chart rendering (FE): ECharts render chart từ config + data user đã chọn | ✅ Done | P1-T6 | |
| P1-T8 | Lưu chart vào DB (dashboard + chart record) | ✅ Done | P1-T7, P0-T3 | Chart config lưu JSONB |
| P1-T9 | Load lại dashboard từ DB — user quay lại vẫn thấy chart cũ | ✅ Done | P1-T8 | |

### Test cases P1

- [ ] Upload file 500 dòng, 5 cột → detect đúng kiểu tất cả cột
- [ ] Upload file chỉ có 2 cột (date + number) → suggest đúng 2 chart (bar + line)
- [ ] Upload file 10 cột → auto pre-select đúng cột date đầu + cột number đầu
- [ ] Chart thumbnail render bằng data thật (không phải placeholder)
- [ ] Lưu chart, reload trang → chart vẫn còn

---

## Phase 1.5 — Parsing Robustness, Assisted Correction & Aggregation

> Mục tiêu: App đọc đúng Excel "thực tế" của người Việt (banner gộp ô, cột rỗng, ô merge),
> cho user SỬA phỏng đoán khi auto không chắc, và biến dữ liệu toàn chữ thành chart bằng ĐẾM/NHÓM.
> Bối cảnh + thiết kế: file "Từ vựng HSK" hiển thị rác — xem audit Session 15.
>
> **Triết lý "50/50":** auto chạy 100% như bản nháp; manual là sửa-khi-cần (corrective),
> KHÔNG phải setup bắt buộc. Control chỉ nổi lên khi **confidence thấp** (file sạch im lặng).
> Manual áp vào CẤU TRÚC dữ liệu (user hiểu data của họ), giữ AUTO cho chọn chart (user không rành).

### Nhóm A — Auto parsing robust (backend, trả kèm confidence)

| Task ID | Mô tả | Status | Dependencies | Notes |
|---------|--------|--------|--------------|-------|
| P1.5-T1 | Dò dòng header thật + trả `headerRowIndex` & cờ `headerConfident`; `parse()` nhận optional headerRow để re-parse khi user đổi | ✅ Done | P1-T2 | Bỏ dòng chỉ 1 ô non-empty (banner gộp ô); header = dòng đầu có ≥2 ô non-empty |
| P1.5-T2 | Loại cột rỗng/gần rỗng khỏi overview | ✅ Done | P1-T3 | Cột 0% dữ liệu (vd cột ảnh) → không đưa lên UI. Bonus: tên "Cột N" cho header trống |
| P1.5-T3 | Min fill-ratio guard + trả `confidence` mỗi cột — hết date/number giả | ✅ Done | P1-T3 | Cột quá thưa → string. confidence = ratio khớp, để FE biết khi nào nhắc |
| P1.5-T4 | Forward-fill ô gộp dọc (vertical merge) | ✅ Done | P1.5-T1 | fillVerticalMerges trước sheet_to_json. CHỈ merge dọc (giữ banner ngang cho header detect) |

### Nhóm B — Assisted correction (confidence-gated, FE + API)

| Task ID | Mô tả | Status | Dependencies | Notes |
|---------|--------|--------|--------------|-------|
| P1.5-T5 | ColumnOverviewPage: **thanh đổi tab** (multi-sheet) + **sửa dòng header** (confidence-gated, nudge ▲▼) | ✅ Done | P1.5-T1, P1.5-T10 | Backend /columns nhận ?headerRow=. Tab+header functional e2e. Chip đổi kiểu chuyển sang T6 |
| P1.5-T6 | Panel **xác nhận kiểu cột** (FE, gated) + `/suggest` nhận type override + thread sheet/headerRow vào chart pages | ✅ Done | P1.5-T5, P1-T5 | TypeReview panel (confidence<0.8) thay vì chip inline. ChartSuggestion/Detail dùng sheet+overrides từ router state |

### Nhóm C — Aggregation charts (mở khoá dữ liệu toàn chữ)

| Task ID | Mô tả | Status | Dependencies | Notes |
|---------|--------|--------|--------------|-------|
| P1.5-T7 | Suggester: rule "đếm số dòng theo category" + field `aggregation` trên ChartSuggestion | ✅ Done | P1.5-T6 | numbers=0 + category≥1 → bar/pie đếm. `aggregation:'count'`, y rỗng. Chỉ category |
| P1.5-T8 | buildChartOption (FE): hỗ trợ `aggregation: 'count'` — group-by x + đếm | ✅ Done | P1.5-T7 | Làm gộp với T7 (dính chặt). countBy(); ô trống → "(trống)" |
| P1.5-T9 | Verify end-to-end với file HSK thật (browser) | ⬜ Todo | P1.5-T1..T8 | User test: "Từ loại" → đếm; multi-tab; sửa header/kiểu. Logic đã phủ unit test |

### Nhóm D — Multi-sheet (đọc nhiều tab trong 1 file)

| Task ID | Mô tả | Status | Dependencies | Notes |
|---------|--------|--------|--------------|-------|
| P1.5-T10 | Backend đọc nhiều tab: `parse()` nhận `sheetName`; `/columns` trả `sheets[]`+`activeSheet`; `/columns`,`/rows`,`/suggest` nhận `sheet` | ✅ Done | P1.5-T1 | 1 file = 1 Dataset. KHÔNG làm endpoint /sheets riêng (gộp vào /columns — 1 round-trip). activeSheet persist defer. FE tab switcher = T5 |

### Tính năng tương lai (Pro, không làm v1)

- Thêm/bỏ cột, đổi tên cột hiển thị → gói trả phí (Phase 2+). Persist qua `DatasetColumn`.

### Test cases P1.5

- [ ] File banner gộp ô dòng 1 → header detect đúng từ dòng 2, `headerConfident=false`
- [ ] Cột toàn rỗng (ảnh) → không hiện trong overview
- [ ] Cột 2/500 ô có dữ liệu ngày → KHÔNG bị gán "Thời gian"
- [ ] File sạch (header rõ, type rõ) → KHÔNG hiện control sửa (confidence cao)
- [ ] File HSK → hiện chip đổi kiểu + nút đổi header (confidence thấp)
- [ ] User đổi kiểu 1 cột → /suggest dùng type mới
- [ ] Chọn cột "Từ loại" → suggester trả "Đếm số từ theo Từ loại"; render đúng số lượng mỗi nhóm

### Thứ tự đề xuất

```
A (xong T1,T3,T2)
  → D: T10 (multi-tab backend)
  → B: T5 (UI sửa cột + tab switcher, gated) → T6 (API type override)
  → C: T7 (suggester count) → T8 (buildChartOption count) → T9 (verify e2e file HSK)
  → T4 (merged cells) nếu còn cần
Sau Phase 1.5 → Phase 1.7 (quota + quản lý file)
```

---

## Phase 1.6 — Learning Mode (Flashcard + Quiz + Progress)

> Mục tiêu: Data toàn chữ (từ vựng, kiến thức) KHÔNG vẽ chart được → biến thành công cụ HỌC.
> Triết lý: **output thích nghi theo data** — số/thời gian → chart; chữ/kiến thức → học.
> Đây là tổng quát hoá engine "gợi ý": app suggest cả KIỂU output, không chỉ loại chart.
> Bối cảnh: file HSK 501 dòng toàn chữ — xem brainstorm Session 21. v1 user chốt: cả flashcard + quiz + theo dõi tiến độ.

### Nhóm A — Output routing (tổng quát hoá suggestion)

| Task ID | Mô tả | Status | Dependencies | Notes |
|---------|--------|--------|--------------|-------|
| P1.6-T1 | Bước gợi ý phát hiện "data hợp để học" (≥2 cột text/category) → đề xuất **Học** song song với chart | ✅ Done | P1.5-T7 | BE: overview trả `learnable`. FE: nút "🎴 Học" gated trên ColumnOverviewPage → /learn (placeholder) |

### Nhóm B — Flashcard

| Task ID | Mô tả | Status | Dependencies | Notes |
|---------|--------|--------|--------------|-------|
| P1.6-T2 | Chọn cột **mặt trước / mặt sau** + màn flashcard: lật thẻ, next/prev, shuffle | ✅ Done | P1.6-T1 | LearnPage thuần client; front=select, back=toggle nhiều cột; fallback khi thiếu data |
| P1.6-T3 | Đánh dấu **đã thuộc / chưa thuộc** mỗi thẻ | ✅ Done | P1.6-T2 | Local state. Nút Thuộc/Chưa + tiến độ X/Y + viền xanh. Bonus: lọc thẻ rỗng mặt trước. Persist ở T6 |

### Nhóm C — Quiz

| Task ID | Mô tả | Status | Dependencies | Notes |
|---------|--------|--------|--------------|-------|
| P1.6-T4 | Sinh quiz trắc nghiệm từ data (đáp án đúng + 3 distractor random từ dòng khác) + chấm điểm | ✅ Done | P1.6-T2 | QuizMode + chế độ Thẻ/Quiz trên LearnPage. Chọn cột câu hỏi/đáp án, chấm Đúng X/Y |

### Nhóm D — Progress (DB, cần migration)

| Task ID | Mô tả | Status | Dependencies | Notes |
|---------|--------|--------|--------------|-------|
| P1.6-T5 | Schema `StudyProgress` (per user/dataset/sheet/card: known/seen, lastReviewedAt) + migration | ✅ Done | P0-T3 | enum StudyStatus + model + unique(user,dataset,sheet,cardKey). Migration applied. cardKey=hash dòng (FE tính ở T7) |
| P1.6-T6 | API lưu/đọc tiến độ học | ✅ Done | P1.6-T5 | StudyProgress module: POST upsert + GET theo dataset/sheet. Owner-guard 404 |
| P1.6-T7 | Wire flashcard + quiz vào progress; hiện "đã thuộc X/Y"; verify e2e file HSK | ✅ Done | P1.6-T3, P1.6-T4, P1.6-T6 | cardKey hash giá trị dòng (`lib/cardKey`). Flashcard seed "đã thuộc" từ GET progress; mark→POST upsert (known/learning). Quiz: đúng→known, sai→learning. 22 test FE. **E2e browser pending** (cần login + file HSK). Bonus: fix frontend build đỏ pre-existing (Issue-012) |

### Gating (định hướng)

- Flashcard cơ bản: **Free** (hút người dùng)
- Quiz + theo dõi tiến độ + SRS + AI sinh câu hỏi/mnemonic: **Pro** (Phase 4/5). Cột "Câu chuyện bộ thủ" hợp AI enhance

### Test cases P1.6

- [ ] File HSK (toàn chữ) → app đề xuất "Học", không ép vẽ chart
- [ ] Chọn front=Chữ Hán, back=Nghĩa → flashcard lật đúng nội dung
- [ ] Quiz: 1 đáp án đúng + 3 nhiễu khác nhau, không trùng
- [ ] Đánh dấu thuộc 1 thẻ → reload vẫn nhớ (progress persist trong DB)
- [ ] Học tab "214 bộ thủ" (multi-sheet) → flashcard từ đúng tab

---

## Phase 1.7 — Dataset Management & Quota

> Mục tiêu: User quản lý các file đã upload (xem, mở lại, xoá) + enforce giới hạn số file theo plan.
> Quyết định (Session 19): đầy quota → **CHẶN + user tự chọn xoá** (KHÔNG tự xoá để tránh mất data).
> Lưu ý ràng buộc: `Chart.datasetId` đang `onDelete: Restrict`; MinIO chưa có hàm xoá object.

| Task ID | Mô tả | Status | Dependencies | Notes |
|---------|--------|--------|--------------|-------|
| P1.7-T1 | Trang "File của tôi": list dataset (GET /datasets đã có) + mở lại file | ✅ Done | P1-T1 | Kéo lên làm sớm (Session 29). DashboardPage "Sheet của tôi" + nút "+"; click → /columns |
| P1.7-T2 | Enforce quota upload: Free=2, Pro=5–10 (config) — chặn khi đầy | ✅ Done | P1.7-T1 | presignUpload count dataset; Free=2, Pro=20. Message rõ "xoá bớt" |
| P1.7-T3 | `DELETE /datasets/:id`: thêm `StorageService.removeObject` + xử lý Chart.Restrict | ✅ Done | P1.7-T1 | Kéo lên sớm (Session 33). Xoá kèm charts (transaction); MinIO best-effort. Nút ✕ + xác nhận 2 bước |
| P1.7-T4 | UX đầy quota: "Đã đạt N/N — xoá bớt để thêm" + nút xoá, cảnh báo nếu có chart | ✅ Done | P1.7-T2, P1.7-T3 | Reactive: FileUpload hiện message backend (xoá bớt). Nút xoá đã có (T3) |

### Test cases P1.7

- [ ] Free user có 2 file, upload file 3 → bị chặn, hiện nhắc xoá bớt
- [ ] Xoá file → MinIO object cũng bị xoá (không để rác)
- [ ] Xoá file có chart đã lưu → cảnh báo trước khi xoá
- [ ] Pro user upload tới giới hạn cao hơn (5–10)

---

## Phase 1.8 — Aggregation Suite (phép gộp đầy đủ cho data số)

> Mục tiêu: Đủ phép gộp (Đếm/Tổng/Trung bình/Trung vị/Min/Max) + **switcher để user verify/đổi**
> + toggle % tổng. Đồng thời SỬA lỗi: hiện category+number vẽ raw (mỗi dòng = 1 cột) → nhóm bị
> lặp (vd "Bò Úc" 5 dòng) hiển thị sai nhiều cột trùng tên. Gộp mới đúng.
> Bối cảnh: brainstorm Session 25 (bảng báo giá thịt bò). Thực thi sau Phase 1.6 + 1.7.
>
> **3 trục tách bạch**: GỘP THẾ NÀO (agg) · HIỂN THỊ (bar/pie/% toggle) · GỘP CÁI GÌ (cột số).
> "percent" = cách hiển thị, KHÔNG phải phép gộp (pie vốn đã là %).

| Task ID | Mô tả | Status | Dependencies | Notes |
|---------|--------|--------|--------------|-------|
| P1.8-T1 | Generalize `aggregation` enum (count\|sum\|average\|median\|min\|max) + `groupAggregate(rows,x,yCol,fn)` trong buildChartOption; sửa lỗi nhóm-lặp | ✅ Done | P1.5-T8 | `Aggregation` type (datasets.ts). `groupAggregate` + `reduceAgg`; count gộp chung nhánh. Nhóm theo x distinct → 1 cột (hết lặp). +9 test (sum/avg/median/min/max + báo giá thịt). Switcher đổi agg = T3 |
| P1.8-T2 | Suggester: category+number → default agg thông minh theo tên cột (giá→Trung bình; số lượng/doanh thu/thành tiền→Tổng); encoding mang yCol + aggregation | ⬜ Todo | P1.8-T1 | Heuristic tên cột (rẻ); AI chọn tốt hơn ở Phase 4 |
| P1.8-T3 | Switcher trên ChartDetailPage — user **verify/đổi** phép gộp (Đếm/Tổng/TB/Trung vị/Min/Max) → chart re-render | ⬜ Todo | P1.8-T2 | Đây là "step verify giá trị" user yêu cầu |
| P1.8-T4 | Toggle "% tổng" cho bar (pie đã sẵn %) | ⬜ Todo | P1.8-T3 | Hiển thị, không phải phép gộp |
| P1.8-T5 | Verify e2e + test với bảng báo giá (nhóm lặp + các phép gộp) | ⬜ Todo | P1.8-T1..T4 | |

### Gating (định hướng)

- Đếm / Tổng / Trung bình: **Free** (cơ bản, ai cũng hiểu)
- Trung vị / Min / Max / toggle % tổng: cân nhắc **Pro** (power-user)

---

## Phase 2 — Dashboard Builder

> Mục tiêu: User tạo được dashboard nhiều chart, kéo thả, resize. Enforce free tier gate.

| Task ID | Mô tả | Status | Dependencies | Notes |
|---------|--------|--------|--------------|-------|
| P2-T1 | Tích hợp react-grid-layout: kéo thả và resize chart trên dashboard | ⬜ Todo | P1 done | Lưu position vào `charts.position` JSONB |
| P2-T2 | Thêm chart mới vào dashboard đang mở | ⬜ Todo | P2-T1 | Trigger lại flow từ P1-T4 |
| P2-T3 | Free tier gate: giới hạn 3 chart / dashboard | ⬜ Todo | P2-T2 | Rule: min(3, số chart hợp lý từ data) |
| P2-T4 | UI locked chart slot: blur + 🔒 + nudge nâng cấp | ⬜ Todo | P2-T3 | Không hiện slot trống nếu data không đủ chart |
| P2-T5 | Chart customization panel: đổi màu, tiêu đề, theme | ⬜ Todo | P2-T1 | Simple panel bên phải khi click chart |
| P2-T6 | Xoá chart khỏi dashboard | ⬜ Todo | P2-T1 | |
| P2-T7 | Đổi tên dashboard | ⬜ Todo | P2-T1 | |
| P2-T8 | Export chart thành PNG | ⬜ Todo | P2-T5 | Dùng ECharts built-in export hoặc html2canvas |

### Test cases P2

- [ ] Kéo thả chart → position lưu DB → reload vẫn đúng vị trí
- [ ] Free user thêm chart thứ 4 → bị chặn, hiện nudge upgrade
- [ ] Data chỉ có 2 chart hợp lý → không hiện slot "🔒 bị khóa" trống
- [ ] Export PNG → file download đúng nội dung chart

---

## Phase 3 — Google Sheets Integration

> Mục tiêu: User kết nối Google Sheet thay cho file Excel.

| Task ID | Mô tả | Status | Dependencies | Notes |
|---------|--------|--------|--------------|-------|
| P3-T1 | Kết nối Google Sheet qua link public (không cần đăng nhập) | ⬜ Todo | P1 done | Parse từ Sheets API public endpoint |
| P3-T2 | Kết nối Google Sheet riêng tư qua Google OAuth | ⬜ Todo | P0-T4, P3-T1 | Lưu refresh token đã mã hoá |
| P3-T3 | Nút "Refresh data" — sync lại data từ Sheet | ⬜ Todo | P3-T1 | Cập nhật `last_synced_at` |
| P3-T4 | Auto-sync theo lịch (Pro only) — BullMQ cron job | ⬜ Todo | P3-T3 | Gate: chỉ chạy cho user Pro |

### Test cases P3

- [ ] Paste link Sheet public → app đọc được data
- [ ] Refresh → data cũ trong chart được cập nhật
- [ ] Free user không thể bật auto-sync

---

## Phase 4 — AI Features (Pro)

> Mục tiêu: Tích hợp Claude API để suggest chart thông minh hơn và viết insight tiếng Việt.

| Task ID | Mô tả | Status | Dependencies | Notes |
|---------|--------|--------|--------------|-------|
| P4-T1 | LLM chart suggester service: gọi Claude API với sample data + column metadata | ⬜ Todo | P1-T5 | Prompt tiếng Việt, trả về chart types + lý do |
| P4-T2 | AI insight: Claude viết 2-3 câu nhận xét về data (tiếng Việt) | ⬜ Todo | P4-T1 | Hiện dưới chart suggestion cards |
| P4-T3 | Gate AI features sau subscription check | ⬜ Todo | P5 done | Free → rule-based only; Pro → cả hai |
| P4-T4 | Rate limiting cho AI calls (tránh abuse) | ⬜ Todo | P4-T1 | NestJS Throttler + check subscription plan |

### Test cases P4

- [ ] Pro user upload file → nhận 4 gợi ý AI + insight tiếng Việt
- [ ] Free user không thấy AI insight, thấy nudge upgrade
- [ ] Gọi Claude API với data 500 rows → response < 5s

---

## Phase 5 — Billing & Subscription

> Mục tiêu: Thu phí, enforce limits, upgrade/downgrade flow.

| Task ID | Mô tả | Status | Dependencies | Notes |
|---------|--------|--------|--------------|-------|
| P5-T1 | Stripe integration: tạo subscription, webhook handler | ⬜ Todo | P0-T3 | Schema `subscriptions` đã có sẵn |
| P5-T2 | Upgrade flow UI: màn chọn plan, redirect Stripe Checkout | ⬜ Todo | P5-T1 | |
| P5-T3 | Enforce limits theo plan (chart count, dashboard count, AI access) | ⬜ Todo | P5-T1 | Middleware check subscription status |
| P5-T4 | Webhook: tự động cập nhật plan khi Stripe xác nhận payment | ⬜ Todo | P5-T1 | |
| P5-T5 | Trang quản lý subscription (xem plan, cancel, billing history) | ⬜ Todo | P5-T2 | |

---

## Phase 6 — Landing Page & Launch

> Mục tiêu: Landing page, polish, security hardening, deploy production.

| Task ID | Mô tả | Status | Dependencies | Notes |
|---------|--------|--------|--------------|-------|
| P6-T1 | Landing page: hero, features, pricing, CTA | ⬜ Todo | P5 done | Target VN market |
| P6-T2 | Onboarding flow: hướng dẫn 3 bước cho user mới | ⬜ Todo | P1 done | |
| P6-T3 | Security hardening: UFW, fail2ban, đổi SSH port, Cloudflare | ⬜ Todo | — | Xem checklist trong spec |
| P6-T4 | Backup Postgres (pg_dump cron) + MinIO mirror ra nơi khác | ⬜ Todo | — | Test thử restore trước launch |
| P6-T5 | Performance: lazy load chart, phân trang dataset lớn | ⬜ Todo | P1 done | |
| P6-T6 | Deploy production lên VPS | ⬜ Todo | P6-T3, P6-T4 | |

---

## Critical Path

```
P0 (Setup) → P1 (Core flow) → P2 (Dashboard) → P3 (Google Sheet) → P4 (AI) → P5 (Billing) → P6 (Launch)
```

P3 và P4 có thể chạy song song sau khi P2 xong.
P5 có thể bắt đầu song song với P4.

---

## Câu hỏi còn mở (cần chốt trước khi implement phase liên quan)

- Tên sản phẩm & domain (cần trước P6)
- Giá subscription cụ thể (cần trước P5)
- VPS provider (cần trước P6)
- Số tier: Free + Pro, hay thêm Business tier? (cần trước P5)

---

## Status Legend

- ⬜ Todo
- 🔄 In Progress
- ✅ Done
- ❌ Blocked
- ⏭️ Skipped
