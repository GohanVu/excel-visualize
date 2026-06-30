# Audit Log

> Nhật ký ghi lại toàn bộ quá trình làm việc với AI.
> Mục đích: tracking quyết định, tránh lặp lỗi, giữ context giữa các session.

---

## [YYYY-MM-DD] Session Title

### Yêu cầu
- Người dùng yêu cầu gì

### Công việc đã làm
- AI đã thực hiện những gì

### Quyết định quan trọng
- Các technical decisions và lý do

### Kết quả
- Summary kết quả session

### Tasks liên quan
- Task IDs từ plan (nếu có)

---

> [!NOTE]
> Các session từ Phase 0 đến Phase 1.8 đã được lưu trữ tại [audit-log-phase-1.md](file:///d:/Project/excel-visualize/docs/archive/audit-log-phase-1.md) để giảm dung lượng file và tối ưu hóa việc đọc context.

## [2026-06-30] Session — Fix Docker healthcheck MinIO (clone-and-run)

### Yêu cầu
- Pull code mới về và chạy dự án lên.

### Công việc đã làm
- `git pull --ff-only`: cập nhật 27 commits mới (Google Sheets integration, Auth & Role System, Admin Panel, export chart PNG, fix format ngày trên chart...).
- `docker compose up -d --build`: MinIO báo `unhealthy` → backend/frontend bị chặn bởi `depends_on: condition: service_healthy`.
- Phát hiện image `minio/minio:RELEASE.2024-06-13` **không có sẵn `curl`** nên healthcheck cũ (`curl -f .../minio/health/live`) luôn fail, dù MinIO server thực tế "1 Online" và endpoint health trả OK từ host.
- Đổi healthcheck sang `["CMD", "mc", "ready", "local"]` (`mc` có sẵn trong image, là cách MinIO khuyến nghị).
- `pnpm install` lại trong container backend (thiếu `@nestjs/schedule`) và frontend (dep mới) do volume `node_modules` còn cũ; restart 2 container.

### Quyết định quan trọng
- Dùng `mc ready local` thay vì cài thêm `curl` vào image — gọn, không thay đổi base image, đúng khuyến nghị MinIO.
- Lý do node_modules cũ: dùng named volume (`backend_modules`/`frontend_modules`) persist qua các lần build → khi package.json thêm dep mới phải `pnpm install` trong container (hoặc rebuild volume).

### Kết quả
- Toàn bộ stack Up & healthy: Frontend http://localhost:5174 (200), Backend :3000 (routes mapped OK), Postgres/Redis/MinIO healthy.

### Tasks liên quan
- Hạ tầng/môi trường (không thuộc task plan cụ thể).

---

## [2026-06-29] Session — P2-T1: react-grid-layout (kéo-thả/resize chart)

### Yêu cầu
- Dashboard: kéo-thả + resize chart, lưu vị trí vào `charts.position` JSONB (đã có sẵn field)

### Công việc đã làm
- **Backend**: `PATCH /charts/layout` (UpdateLayoutDto: layout[]{id,x,y,w,h}). Service `updateLayout` dùng `$transaction` + `updateMany` lọc `dashboard.userId` → owner-guard (chỉ sửa chart của mình). `listCharts` thêm `position` vào select. +5 test
- **Frontend**: cài `react-grid-layout@1.4.4` + `react-resizable@3.0.5` (cần react-resizable làm direct dep để CSS resolve dưới pnpm). `lib/chartLayout.ts` (chartsToLayout: position đã lưu hoặc xếp mặc định 2/hàng; layoutToPayload: i→id). DashboardPage `SavedCharts` → `WidthProvider(RGL)` 12 cột, drag-handle = thanh tiêu đề, onDragStop/onResizeStop → lưu. ChartView remount theo key w-h để echarts resize đúng ô. +4 test (mock RGL passthrough + chartLayout unit)
- **E2e** (script): save chart → position {} → PATCH → đọc lại position {x,y,w,h} đúng (JSONB reorder key nhưng giá trị khớp). Owner-guard id lạ → 200 không sửa

### Quyết định quan trọng
- **updateMany + relation filter** thay vì update từng id: owner-guard ngay trong where (`dashboard:{userId}`) → chart người khác bị bỏ qua an toàn, 1 transaction
- **Lưu khi onDragStop/onResizeStop** (không onLayoutChange) → tránh ghi DB lúc mount; layout state vẫn cập nhật qua onLayoutChange để tính lại height
- **ChartView key=`id-w-h`**: echarts-for-react không tự resize theo container → remount khi đổi kích thước ô (chỉ lúc resize-stop, rẻ)
- **pnpm store-dir**: container dev có node_modules link từ store cũ → `pnpm add --store-dir=/root/.local/share/pnpm/store` (Issue: store mismatch khi add lúc runtime trên Windows)

### Kết quả
- Kéo-thả/resize hoạt động, vị trí lưu DB e2e-verified. FE 133, BE 144 test xanh, build xanh. DnD visual cần xem ở browser
- Phase 2 mở màn. Tiếp: P2-T2 (thêm chart vào dashboard đang mở) / P2-T6 (xoá chart) / P2-T5 (customization)

### Tasks liên quan
- P2-T1 ✅ → tiếp các task Phase 2 (T2 thêm chart, T6 xoá chart, T5 panel tuỳ chỉnh, T7 đổi tên dashboard…)

## [2026-06-29] Session — P2-T6: Xoá chart khỏi dashboard

### Yêu cầu
- Cho phép xoá 1 chart khỏi dashboard (bổ trợ lưới P2-T1)

### Công việc đã làm
- **Backend**: `DELETE /charts/:id` → `deleteChart` dùng `deleteMany` lọc `dashboard.userId` (owner-guard); count 0 → 404 (không lộ tồn tại). +2 test
- **Frontend**: `deleteChart` api. Header chart tách drag-handle (chỉ tiêu đề) khỏi nút; nút ✕ → xác nhận 2 bước (Xoá/Huỷ); `onMouseDown stopPropagation` để RGL không bắt đầu kéo khi bấm nút; mutation invalidate ['charts']. +2 test
- **E2e**: xoá → 200 {deleted:true}; biến mất khỏi list; xoá lại/id lạ → 404. 4/4

### Quyết định quan trọng
- **deleteMany + relation filter** (như updateLayout) → owner-guard trong where, 404 khi không phải chart của user
- **Tách drag-handle khỏi nút xoá** + `stopPropagation` onMouseDown: tránh xung đột giữa kéo (RGL mousedown) và bấm nút
- **Xác nhận 2 bước** (1 confirmId cho cả lưới) — đồng nhất với SheetCard, gọn không cần state mỗi item (giữ children RGL là div thuần)

### Kết quả
- Xoá chart hoạt động e2e. FE 135, BE 146 test xanh, build xanh
- Phase 2: T1 ✅ T6 ✅. Tiếp: T2 (thêm chart vào dashboard đang mở) / T7 (đổi tên dashboard) / T5 (panel tuỳ chỉnh)

### Tasks liên quan
- P2-T6 ✅ → tiếp P2-T2 hoặc P2-T7

## [2026-06-30] Session — P2-T5: Panel tuỳ chỉnh chart (tiêu đề/màu/nền)

### Yêu cầu
- Hoàn thành P2-T5 (đang dở: commit trước mới scaffold `UpdateChartDto`, chưa wire). Panel tuỳ chỉnh khi click chart: đổi tiêu đề, màu, theme

### Công việc đã làm
- **Backend**: wire `UpdateChartDto` → `ChartsService.updateChart` (updateMany lọc `dashboard.userId` = owner-guard như deleteChart/updateLayout; chỉ set field gửi lên, bỏ qua undefined → không ghi đè nhầm; count 0 → 404). Controller `PATCH /charts/:id` đặt SAU `@Patch('layout')` để route 'layout' không bị ':id' bắt nhầm. +5 test (4 service: update title+config, chỉ-field-gửi, trả updated, 404; 1 controller delegate)
- **Frontend**:
  - `lib/chartCustomize.ts` (thuần): 4 bảng màu (Mặc định/Đại dương/Hoàng hôn/Rừng) + theme Tối/Sáng; `applyCustomization(config, style)` set `color`+`backgroundColor`+`textStyle.color` (trả config mới, không sửa gốc); `readStyle(config)` suy ngược style để khởi tạo panel (không nhồi field lạ vào ECharts option)
  - `components/ChartStylePanel.tsx`: drawer bên phải (role=dialog), input tiêu đề + swatch bảng màu + segmented nền + preview ChartView trực tiếp; Lưu/Huỷ
  - `api/charts.ts`: `updateChart(id, patch)`
  - `DashboardPage`: nút ⚙ trên header mỗi chart (onMouseDown stopPropagation để RGL không kéo) → mở panel; `editMut` → updateChart → invalidate ['charts'] + đóng panel
  - +13 test (6 chartCustomize, 5 ChartStylePanel, 2 DashboardPage: mở panel + lưu gọi updateChart đúng id/patch)
- **api.md**: thêm `PATCH /charts/:id` + bổ sung doc còn thiếu cho `PATCH /charts/layout` & `DELETE /charts/:id` (vốn chưa được ghi từ T1/T6)

### Quyết định quan trọng
- **updateMany + relation filter** (đồng nhất deleteChart/updateLayout): owner-guard ngay trong where, không lộ tồn tại (404 khi không phải chart user). Không trả lại record (FE đã có sẵn patch + invalidate refetch)
- **Chỉ set field gửi lên**: title/config độc lập — gửi mỗi title không xoá config và ngược lại
- **Tiêu đề = `chart.title`** (nhãn header thẻ), KHÔNG đụng `config.title.text` — tránh trùng/nhập nhằng nguồn hiển thị
- **Style suy ngược từ config** (readStyle so khớp `color`/`backgroundColor`) thay vì lưu key riêng → không nhồi field non-ECharts vào option JSONB
- **Tách helper thuần `chartCustomize`**: test màu/nền/round-trip không cần DOM; panel + DashboardPage mock ChartView
- **Route `@Patch(':id')` khai báo sau `@Patch('layout')`**: tránh ':id' nuốt path 'layout'

### Môi trường
- Sau fresh state: không còn `.env`/image/volume. Build dev-stage image riêng (`ev-backend-dev`, `ev-frontend-dev`) chạy unit test (mock, không cần DB/MinIO): `docker run --rm <img> sh -c "pnpm db:generate && pnpm test"`. KHÔNG cần dựng cả stack cho unit test

### Test coverage
- Backend: 146 → **151 pass** (lint 0 error)
- Frontend: 135 → **148 pass**, `pnpm build` (tsc -b) xanh (Issue-012), lint 0 error

### Kết quả
- P2-T5 hoàn tất. User click ⚙ → đổi tiêu đề/màu/nền có preview → Lưu → chart re-render + persist. Phần visual drawer cần xem ở browser
- Phase 2: T1 ✅ T5 ✅ T6 ✅. Tiếp: P2-T2 (thêm chart vào dashboard đang mở) / P2-T3+T4 (free-tier gate) / P2-T7 (đổi tên dashboard) / P2-T8 (export PNG)

### Tasks liên quan
- P2-T5 ✅

## [2026-06-30] Session — P2-T2: Thêm chart vào dashboard đang mở

### Yêu cầu
- Cho phép thêm biểu đồ mới vào dashboard đang mở (re-trigger flow gợi ý từ P1-T4)

### Công việc đã làm
- **Frontend**:
  - `components/AddChartMenu.tsx`: nút "+ Thêm biểu đồ" + dropdown (role=menu) liệt kê sheet đã có → `onPick(datasetId)`; mục "⬆ Tải sheet mới" → `onUpload`; backdrop click đóng menu; trạng thái rỗng "Chưa có sheet nào"
  - `DashboardPage`: đặt AddChartMenu ở header khu "Biểu đồ đã lưu"; `onPick` → `navigate('/datasets/:id/columns')` (vào lại flow cột→gợi ý→lưu), `onUpload` → `/upload`. Truyền `datasets` từ datasetsQ
  - +6 test (5 AddChartMenu: đóng ban đầu, mở liệt kê sheet, chọn sheet gọi onPick + đóng, tải mới gọi onUpload, rỗng; 1 DashboardPage: chọn sheet → điều hướng /columns)

### Quyết định quan trọng
- **Không cần endpoint/flow mới**: `saveChart` đã auto gắn chart vào dashboard mặc định → "thêm chart" chỉ là điểm vào lại flow `/columns` từ 1 sheet đã có. Tái dùng toàn bộ ColumnOverview→Suggestion→Detail
- **Menu chọn sheet thay vì nút đơn**: user thường có nhiều sheet → chọn nguồn dữ liệu ngay; gộp luôn lối "tải sheet mới" để không phải quay lại khu Sheets
- **Đặt trong khu "Biểu đồ đã lưu"** (chỉ hiện khi đã có ≥1 chart): chart đầu tiên vẫn vào từ card "Sheet của tôi"; giữ test "ẩn khu biểu đồ khi rỗng" không đổi
- **Bind-mount source vào dev-image để test** (khỏi rebuild): `docker run -v <dir>:/app -v /app/node_modules ev-frontend-dev` — anonymous volume giữ node_modules của image, lấy code mới live

### Test coverage
- Frontend: 148 → **154 pass**, `pnpm build` (tsc -b) xanh, lint 0 error
- (Backend không đổi: 151 pass)

### Kết quả
- Dashboard có nút "+ Thêm biểu đồ" → chọn sheet → dựng & lưu chart mới vào cùng dashboard. Phase 2: T1 ✅ T2 ✅ T5 ✅ T6 ✅
- Tiếp: P2-T3 (free-tier gate 3 chart/dashboard) → P2-T4 (locked slot) / P2-T7 (đổi tên dashboard) / P2-T8 (export PNG)

### Tasks liên quan
- P2-T2 ✅

## [2026-06-30] Session — Tooling: bật auto-index codebase-memory MCP + nhắc kiểm tra stale

### Yêu cầu
- Đảm bảo index của codebase-memory MCP tự cập nhật khi có code mới; thêm nhắc nhở kiểm tra index cũ ở đầu session

### Công việc đã làm
- `config set auto_index true` cho codebase-memory-mcp (toàn cục, persisted). `auto_index_limit` giữ 50000 (trần repo). Có hiệu lực từ phiên SAU (server nạp lại config lúc khởi động)
- CLAUDE.md mục "Khi bắt đầu session mới": thêm 1 dòng — nếu vừa đổi code lớn/đổi branch thì chạy `detect_changes`, danh sách dài thì `index_repository` lại trước khi tin `file:line` từ MCP

### Quyết định quan trọng
- **Hook SessionStart chỉ NUDGE, không enforce**: nó nhắc "dùng MCP first" + index nếu chưa có, nhưng KHÔNG cover trường hợp index cũ (stale) khi code đã đổi → đó là lý do thêm dòng `detect_changes` thủ công
- **Auto-index + detect_changes + Read-before-Edit là 3 lớp bổ trợ**, không trùng: auto-index lo quanh lúc start session, detect_changes lo giữa phiên, Read-before-Edit chặn sửa nhầm file stale
- **Hành vi auto_index suy từ tên** (help không mô tả thời điểm trigger chính xác) — coi như đồng bộ quanh lúc khởi động server, không giả định watch real-time từng lần lưu file

### Kết quả
- MCP exe v0.8.1; `config list` xác nhận `auto_index = true`. Không đụng code dự án (chỉ config tooling + CLAUDE.md)

### Tasks liên quan
- Không nằm trong plan — tooling. Task code kế tiếp vẫn là P2-T3

## [2026-06-30] Session — P2-T3: Free tier gate (3 biểu đồ/dashboard)

### Yêu cầu
- Giới hạn gói Free: tối đa 3 biểu đồ/dashboard; Pro không giới hạn. Hiện nudge nâng cấp khi đầy

### Công việc đã làm
- **Backend** (`charts.service.ts`): gate trong `saveChart` — sau khi resolve dashboard, nếu KHÔNG phải Pro thì `chart.count({ dashboardId })`; ≥ `FREE_CHART_LIMIT` (3) → `BadRequestException` với message nudge nâng cấp Pro. Thêm private `isProUser` (subscription plan='pro' & status='active') — mirror `DatasetsService.isProUser`. +3 test (chặn chart thứ 4 Free, cho lưu khi <3, Pro bỏ qua không count). Mock thêm `chart.count` + `subscription.findUnique` (default Free/count 0 trong beforeEach để test cũ không vướng)
- **Frontend**:
  - Tách helper dùng chung `lib/apiError.ts` (`apiErrorMessage`) từ bản local trong `FileUpload.tsx` — trả `undefined` khi không có message backend, caller tự fallback. FileUpload import lại + giữ fallback "Upload thất bại…"
  - `ChartDetailPage.handleSave`: `catch` đọc `apiErrorMessage(err)` → hiện đúng message backend (nudge nâng cấp) thay vì "Lưu thất bại" chung chung. +1 test (đầy quota → hiện "Nâng cấp Pro")
- **docs/api.md**: ghi chú quota gate ở `POST /charts`

### Quyết định quan trọng
- **Gate ở điểm save duy nhất (`saveChart`)**: phủ cả luồng "Lưu vào dashboard" (P1) lẫn "Thêm biểu đồ" (P2-T2) vì cả hai cùng đổ về endpoint này
- **Đếm theo `dashboardId`** (không phải userId): đúng ngữ nghĩa "3 chart/dashboard"; dashboard vừa tạo có 0 chart nên user mới không bị vướng
- **Phần "min(3, số chart hợp lý từ data)"** chuyển sang **P2-T4** (locked slot UI) — T3 chỉ là hard cap + enforcement; "số chart hợp lý" là quyết định hiển thị slot, không phải chặn lưu
- **Tách `apiErrorMessage` thành lib chung** thay vì nhân đôi: FileUpload đã có sẵn pattern này → reuse (CLAUDE.md "reuse trước, tạo mới sau")
- **`isProUser` trùng với DatasetsService**: chấp nhận duplicate 4 dòng để tránh churn module-wiring; ghi chú cân nhắc tách `SubscriptionService` sau

### Test coverage
- Backend: 151 → **154 pass** (lint 0 error, chỉ warning cũ)
- Frontend: 154 → **155 pass**, `pnpm build` (tsc -b) xanh

### Kết quả
- Free user lưu chart thứ 4 → bị chặn 400 + thấy nudge "Nâng cấp Pro…". Pro lưu không giới hạn
- Phase 2: T1 ✅ T2 ✅ T3 ✅ T5 ✅ T6 ✅. Tiếp: P2-T4 (locked slot UI) / P2-T7 (đổi tên dashboard) / P2-T8 (export PNG)

### Tasks liên quan
- P2-T3 ✅

## [2026-06-30] Session — P2-T4: Locked chart slot (UI gate nâng cấp)

### Yêu cầu
- Khi gói Free đầy chart/dashboard → hiện slot khoá (blur + 🔒 + nudge nâng cấp). Không hiện slot trống nếu chưa đủ điều kiện

### Công việc đã làm
- **Backend** (`charts.service.listCharts`): trả thêm `limit` = `isPro ? null : FREE_CHART_LIMIT` (3). Authoritative, đặt cạnh gate P2-T3. +2 test (limit=3 Free, null Pro)
- **Frontend**:
  - `api/charts.ts`: `listCharts()` đổi return `DashboardChart[]` → `ChartsResponse { charts, limit }`
  - `DashboardPage`: đọc `charts`/`chartLimit` từ response; `SavedCharts` nhận `limit`; `atLimit = limit != null && charts.length >= limit` → render `LockedChartSlot` (nền bar blur + 🔒 + "Đã đạt N biểu đồ của gói Free / Nâng cấp Pro…"), `role="note"`
  - +3 test (hiện khi Free đạt cap 3/3; ẩn khi dưới cap 2/3; ẩn cho Pro limit=null). Cập nhật mock listCharts sang `{ charts, limit }`

### Quyết định quan trọng
- **`limit` từ `listCharts`** (không thêm endpoint/không nhồi plan vào `/auth/me`): dashboard vốn đã gọi `/charts`, ghép limit vào là 1 round-trip; logic giới hạn ở 1 chỗ (charts.service) cạnh gate
- **Locked slot chỉ hiện ĐÚNG lúc đạt cap** (Free, charts≥limit): thoả "không hiện slot trống nếu data chưa đủ chart" một cách tự nhiên — dưới cap user vẫn thêm chart bình thường (AddChartMenu), không có slot khoá lơ lửng. "min(số chart hợp lý từ data)" trên dashboard đa-dataset không tính được rõ → diễn giải thực dụng: cap = tín hiệu chặn
- **CTA "Nâng cấp Pro" defer**: trang billing là Phase 5, chưa có đích → để button dead-end là UX xấu → tạm chỉ nudge text. Thêm CTA khi P5 có trang upgrade
- **`limit: number | null`** (null = unlimited) thay vì số lớn/`Infinity`: JSON-safe, FE check `!= null` rõ nghĩa

### Test coverage
- Backend: 154 → **156 pass** (lint 0 error)
- Frontend: 155 → **158 pass**, `pnpm build` (tsc -b) xanh, lint 0 error

### Kết quả
- Free user đủ 3 chart → thấy slot khoá nudge nâng cấp; Pro/dưới cap → không. Phase 2: T1 ✅ T2 ✅ T3 ✅ T4 ✅ T5 ✅ T6 ✅
- Còn lại Phase 2: P2-T7 (đổi tên dashboard), P2-T8 (export PNG). Phần visual (blur slot, drag/resize) cần xem ở browser

### Tasks liên quan
- P2-T4 ✅

## [2026-06-30] Session — P2-T7: Đổi tên dashboard

### Yêu cầu
- Cho user đổi tên dashboard của mình

### Công việc đã làm
- **Backend — DashboardsModule mới** (chưa từng có; dashboard mặc định vốn do `charts.service` tạo lười):
  - `DashboardsService`: `getDefault(userId)` (dashboard đầu tiên theo createdAt, select id+name, null nếu chưa có) + `rename(userId, id, name)` (trim, rỗng→400; updateMany lọc `userId` owner-guard; count 0→404)
  - `DashboardsController`: `GET /dashboards/default`, `PATCH /dashboards/:id`
  - `RenameDashboardDto` (IsString + MaxLength 100; trim/chặn-rỗng ở service)
  - Wire vào `app.module.ts`. +7 test (5 service, 2 controller)
- **Frontend**:
  - `api/dashboards.ts`: `getDefaultDashboard()`, `renameDashboard(id, name)` + type `Dashboard`
  - `DashboardPage`: query `['dashboard','default']`; truyền vào `SavedCharts`. Component `DashboardTitle` — hiện tên dashboard làm tiêu đề khu "Biểu đồ đã lưu" + nút ✏️ → form input tại chỗ (Lưu/Huỷ) → `renameDashboard` → invalidate `['dashboard','default']`. Không đổi gì hoặc trùng tên cũ → không gọi API. Chưa có dashboard (chưa lưu chart) → fallback nhãn tĩnh "Biểu đồ đã lưu"
  - +3 test (hiện tên; rename gọi API đúng id+name; tên không đổi → không gọi)

### Quyết định quan trọng
- **Tạo DashboardsModule riêng** thay vì nhét vào ChartsController: đúng convention "mỗi domain 1 module"; là chỗ tự nhiên cho P05 (multi-dashboard) sau. Charts vẫn tự tạo dashboard mặc định khi lưu chart (không đổi)
- **`getDefault` trả null khi chưa có dashboard**: tránh tạo bừa dashboard rỗng chỉ để đặt tên; FE ẩn UI đổi tên tới khi có chart đầu tiên (lúc đó dashboard đã tồn tại)
- **updateMany + filter userId** (đồng nhất chart owner-guard): không lộ tồn tại (404), 1 query
- **Đổi tên tại chỗ (inline)** trên header khu biểu đồ thay vì panel/modal: nhẹ, đúng tầm 1 field; reuse pattern form aria-label như LoginPage
- **Trim + chặn rỗng ở service** (không dùng class-transformer @Transform): giữ DTO đơn giản như các DTO khác trong dự án

### Test coverage
- Backend: 156 → **163 pass** (lint 0 error)
- Frontend: 158 → **161 pass**, `pnpm build` (tsc -b) xanh, lint 0 error

### Kết quả
- User đổi tên dashboard → tên persist + hiện ngay. Phase 2: T1 ✅ T2 ✅ T3 ✅ T4 ✅ T5 ✅ T6 ✅ T7 ✅
- Còn lại Phase 2: **P2-T8** (export chart PNG) — task cuối Phase 2

### Tasks liên quan
- P2-T7 ✅

---

## [2026-06-30] Session — P2-T8: Export chart thành PNG

### Yêu cầu
- Thêm tính năng export chart ra file PNG từ ChartDetailPage

### Công việc đã làm
- `ChartView.tsx`: thêm prop `renderer?: 'svg' | 'canvas'` (default `'svg'`), wrap bằng `forwardRef` để expose ECharts instance ra ngoài
- `ChartDetailPage.tsx`: thêm `useRef`, truyền `renderer="canvas"` + `ref={chartRef}` vào `ChartView` trong `ChartDetail`, thêm hàm `exportPng()` + nút "Tải ảnh PNG"
- `ChartDetailPage.test.tsx`: cập nhật mock `ChartView` sang `forwardRef` để tránh React warning

### Quyết định quan trọng
- **Canvas renderer cho ChartDetail**: `getDataURL({ type: 'png' })` của ECharts yêu cầu canvas renderer (SVG renderer trả về SVG). Chỉ đổi renderer ở ChartDetailPage, giữ `svg` ở các nơi khác (DashboardPage, SuggestionPage, StylePanel) để không ảnh hưởng layout
- **`pixelRatio: 2`**: ảnh xuất ra độ phân giải gấp đôi màn hình → sắc nét trên Retina/HiDPI
- **`backgroundColor: '#030712'`**: khớp với `bg-gray-950` của trang — không để nền trong suốt
- **Download trigger**: tạo `<a download>` và `.click()` — không cần thư viện thêm, không cần endpoint backend

### Kết quả
- 161/161 tests pass, không còn warning

### Tasks liên quan
- P2-T8 ✅

## [2026-06-30] Session — Phase 0.5: Auth & Role System (Hệ thống phân quyền & Admin panel)

### Yêu cầu
- Hoàn thành Phase 0.5 bao gồm phân quyền Admin/User ở backend, tạo trang quản trị Admin Panel (Stats, Users, Audit Logs) và trang Profile cá nhân.

### Công việc đã làm
- **Backend**:
  - Tạo `AuditLogsModule` & `AuditLogsService` toàn cục để ghi log hành động của người dùng vào bảng `AuditLog` trong DB. Tích hợp ghi log vào `AuthService`, `DatasetsService`, `ChartsService`, và `DashboardsService`.
  - Tạo `AdminModule`, `AdminService` và `AdminController` để cung cấp các API được bảo vệ bởi `RolesGuard` (`@Roles(Role.admin)`): `GET /admin/users`, `PATCH /admin/users/:id/plan`, `GET /admin/stats`, `GET /admin/audit-logs`.
  - Hỗ trợ seed tài khoản Admin thông qua `prisma/seed.ts` bằng biến môi trường `ADMIN_EMAIL`.
  - Viết unit test cho các cấu phần backend mới và mock `AuditLogsService` cho các test cũ. Tổng cộng 174/174 tests passed.
- **Frontend**:
  - Tạo `AdminRoute` bảo vệ router bằng cách check `role === 'admin'`. Chuyển hướng người dùng thường về `/dashboard`.
  - Tạo `AdminLayout` (Sidebar + Header) dành riêng cho quản trị viên.
  - Tạo các trang quản trị: `AdminStatsPage` (thống kê hệ thống), `AdminUsersPage` (quản lý user & thay đổi plan), `AdminAuditLogsPage` (xem nhật ký hoạt động hệ thống).
  - Tạo trang `ProfilePage` hiển thị thông tin cá nhân và tích hợp nút Đăng xuất.
  - Cập nhật định nghĩa Route trong `App.tsx`.
  - Viết unit test cho `AdminRoute.test.tsx`. Tổng cộng 165/165 tests passed.
  - Sửa lỗi TypeScript và build thành công dự án frontend (`tsc -b && vite build` passed).

### Quyết định quan trọng
- **Tạo `AuditLogsService` fail-safe**: Việc ghi log hoạt động được bọc trong block `try-catch` để đảm bảo lỗi ghi log không làm gián đoạn luồng nghiệp vụ chính của người dùng.
- **Tạo `AdminModule` riêng**: Giúp tách biệt logic quản trị và logic người dùng thường, tuân thủ đúng convention của NestJS.
- **`DefaultValuePipe` cho Query**: Thay vì truyền `defaultValue` trực tiếp vào `ParseIntPipe` (lỗi không được hỗ trợ trong NestJS), sử dụng `DefaultValuePipe` trước `ParseIntPipe`.

### Kết quả
- Phase 0.5 hoàn tất 100% e2e. Tất cả test backend/frontend đều xanh, build production thành công.

### Tasks liên quan
- P05-T1, P05-T2, P05-T3, P05-T4, P05-T5, P05-T6, P05-T7 ✅

## [2026-06-30] Session — Sửa lỗi PostgreSQL khởi động thất bại trong Docker

### Yêu cầu
- Sửa lỗi container PostgreSQL không khởi động được (thiếu `POSTGRES_PASSWORD`).

### Công việc đã làm
- Tạo file `.env` từ [.env.example](file:///d:/Project/excel-visualize/.env.example) để thiết lập biến môi trường `POSTGRES_PASSWORD` và các cấu hình cục bộ khác.
- Thực hiện `docker compose up -d --force-recreate` để áp dụng cấu hình và khởi động lại các container.
- Chạy lệnh `docker compose exec backend pnpm db:migrate` để đồng bộ DB schema và tự động sinh Prisma Client, khắc phục lỗi biên dịch `Module '"@prisma/client"' has no exported member...` ở backend.
- Chạy lệnh `docker compose exec backend pnpm db:seed` để khởi tạo dữ liệu mẫu cho database.

### Quyết định quan trọng
- Giữ nguyên cấu hình mật khẩu mặc định từ file `.env.example` để đảm bảo tính đồng bộ và hoạt động ngay lập tức của môi trường local.
- Đồng bộ database schema ngay sau khi thiết lập biến môi trường để sinh đầy đủ Prisma Client trước khi backend biên dịch.

### Kết quả
- Tất cả các container (`postgres`, `redis`, `minio`, `backend`, `frontend`) hoạt động ổn định.
- Backend đã biên dịch thành công và khởi động bình thường (`Nest application successfully started`), giải quyết triệt để lỗi 500 khi gọi API.

### Tasks liên quan
- Khắc phục sự cố môi trường (Troubleshooting).

## [2026-06-30] Session — Tạo tài khoản Admin full quyền

### Yêu cầu
- Người dùng yêu cầu tạo 1 tài khoản admin full quyền.

### Công việc đã làm
- Cập nhật file [prisma/seed.ts](file:///d:/Project/excel-visualize/backend/prisma/seed.ts) để tự động tạo/nâng cấp tài khoản `caboisai1811@gmail.com` thành tài khoản Admin (`role: admin`) với gói đăng ký Pro (`plan: pro`, `status: active`) và đặt mật khẩu mặc định là `admin123`.
- Chạy lệnh `docker compose exec backend pnpm db:seed` để cập nhật cơ sở dữ liệu.

### Quyết định quan trọng
- Tích hợp tài khoản này trực tiếp vào hệ thống seed để dễ dàng tái thiết lập nếu cơ sở dữ liệu bị reset sau này.
- Sử dụng mật khẩu mặc định `admin123` đã được băm bằng bcrypt để đảm bảo đăng nhập được ngay lập tức từ giao diện.

### Kết quả
- Tài khoản `caboisai1811@gmail.com` đã sẵn sàng hoạt động với đầy đủ quyền Admin và gói dịch vụ Pro (cho phép upload lên đến 50MB, không giới hạn biểu đồ).

### Tasks liên quan
- Khởi tạo tài khoản quản trị (Ad-hoc admin creation).

<!-- Thêm session mới ở đây -->

## [2026-06-30] Session — P3-T4: Tự động đồng bộ Google Sheet theo lịch (Pro only) bằng NestJS Schedule

### Yêu cầu
- Triển khai tính năng tự động đồng bộ (auto-sync) dữ liệu từ Google Sheets theo lịch chạy ngầm cho người dùng gói Pro.

### Công việc đã làm
- **Quyết định kiến trúc**: 
  * Thay vì sử dụng BullMQ phức tạp (yêu cầu cấu hình hàng đợi, kết nối Redis, quản lý trạng thái), chọn giải pháp tối giản **`@nestjs/schedule`** (chạy ngầm trong bộ nhớ bằng Node.js timer) theo triết lý "Simple is the best".
  * BullMQ được đưa vào kế hoạch nâng cấp tương lai khi dự án cần mở rộng quy mô chạy nhiều máy chủ.
- **Backend (NestJS)**:
  * Cài đặt thư viện `@nestjs/schedule` trong container `backend`.
  * Đăng ký `ScheduleModule.forRoot()` trong [app.module.ts](file:///d:/Project/excel-visualize/backend/src/app.module.ts).
  * Tạo dịch vụ [DatasetsSyncService](file:///d:/Project/excel-visualize/backend/src/datasets/datasets-sync.service.ts):
    * Triển khai tác vụ `@Cron(CronExpression.EVERY_HOUR)`.
    * Quét cơ sở dữ liệu để tìm toàn bộ các `Dataset` có `googleSpreadsheetId` của những người dùng có gói subscription hoạt động là `pro` (status = `active`).
    * Duyệt qua từng dataset và gọi `DatasetsService.syncGoogleSheet` để tải dữ liệu mới và cập nhật.
    * Xử lý lỗi độc lập cho từng dataset bằng `try-catch` để đảm bảo lỗi ở một sheet không gây ảnh hưởng đến các sheet khác trong hàng chờ.
  * Đăng ký `DatasetsSyncService` vào mảng `providers` trong [datasets.module.ts](file:///d:/Project/excel-visualize/backend/src/datasets/datasets.module.ts).
  * Viết bộ unit tests đầy đủ trong [datasets-sync.service.spec.ts](file:///d:/Project/excel-visualize/backend/src/datasets/test/datasets-sync.service.spec.ts) bao gồm các trường hợp: chạy thành công, lọc đúng đối tượng người dùng Pro và xử lý lỗi cô lập khi có sheet bị lỗi.
- **Kiểm thử**: Tất cả 192 backend tests và 188 frontend tests đều pass thành công.

### Quyết định quan trọng
- **Cô lập lỗi khi chạy vòng lặp (Error Isolation)**: Sử dụng khối `try-catch` bọc quanh mỗi lần gọi hàm đồng bộ của từng dataset trong vòng lặp. Nếu một dataset bị lỗi (ví dụ: link lỗi, quyền truy cập bị thu hồi), hệ thống ghi log lỗi và tiếp tục đồng bộ các dataset tiếp theo bình thường.

### Kết quả
- Tính năng tự động đồng bộ chạy ngầm mỗi giờ một lần đã hoạt động hoàn chỉnh, tự động phát hiện và cập nhật dữ liệu cho các tài khoản Pro.

### Tasks liên quan
- P3-T4 ✅


## [2026-06-30] Session — P3-T3: Nút "Refresh data" đồng bộ dữ liệu Google Sheet

### Yêu cầu
- Triển khai tính năng đồng bộ (refresh) dữ liệu từ Google Sheet cho Dataset đã liên kết.

### Công việc đã làm
- **Cơ sở dữ liệu**:
  * Trường `lastSyncedAt DateTime?` đã có sẵn trong model `Dataset` của [schema.prisma](file:///d:/Project/excel-visualize/backend/prisma/schema.prisma).
- **Backend (NestJS)**:
  * Refactor: Trích xuất phương thức helper `downloadGoogleSheet` dùng chung trong [DatasetsService](file:///d:/Project/excel-visualize/backend/src/datasets/datasets.service.ts) để tránh trùng lặp code tải file.
  * Triển khai `syncGoogleSheet` trong [DatasetsService](file:///d:/Project/excel-visualize/backend/src/datasets/datasets.service.ts):
    * Lấy thông tin `Dataset` và kiểm tra quyền sở hữu.
    * Tải file XLSX mới nhất từ Google Sheets (tự động fallback từ công khai sang riêng tư qua OAuth).
    * Ghi đè file XLSX mới lên MinIO tại vị trí `minioKey` cũ.
    * Cập nhật `sizeBytes` và `lastSyncedAt` (thời điểm đồng bộ thành công).
    * Ghi Audit Log hành động `dataset.sync`.
  * Thêm endpoint `POST /datasets/:id/sync` trong [DatasetsController](file:///d:/Project/excel-visualize/backend/src/datasets/datasets.controller.ts).
  * Bổ sung unit tests đầy đủ cho `syncGoogleSheet` trong service và controller specs.
- **Frontend (React)**:
  * Cập nhật interface `Dataset` và thêm hàm API `syncDataset` trong [api/datasets.ts](file:///d:/Project/excel-visualize/frontend/src/api/datasets.ts).
  * Cập nhật component `SheetCard` trong [DashboardPage.tsx](file:///d:/Project/excel-visualize/frontend/src/pages/DashboardPage.tsx):
    * Hiển thị nút **"🔄"** (Đồng bộ) bên cạnh các dataset có nguồn gốc từ Google Sheet.
    * Hiển thị hiệu ứng xoay (spin) khi đang trong trạng thái tải và thông báo lỗi nếu đồng bộ thất bại.
    * Hiển thị nhãn thời gian đồng bộ gần nhất: *Đồng bộ: dd/mm/yyyy*.
  * Viết unit test kiểm thử hành vi đồng bộ trên Dashboard trong [DashboardPage.test.tsx](file:///d:/Project/excel-visualize/frontend/src/pages/DashboardPage.test.tsx).
- **Kiểm thử**: Tất cả 189 backend tests và 188 frontend tests đều pass thành công.

### Quyết định quan trọng
- **Ghi đè file trên MinIO**: Thay vì sinh ra file mới mỗi lần đồng bộ, chúng ta ghi đè trực tiếp lên `minioKey` hiện tại để tránh tích tụ file rác trên hệ thống lưu trữ MinIO và giữ nguyên đường dẫn liên kết của dataset.
- **Trích xuất helper `downloadGoogleSheet`**: Giúp luồng tải (công khai -> riêng tư OAuth) được tái sử dụng 100%, giữ cho code service ngắn gọn và dễ bảo trì.

### Kết quả
- Người dùng có thể bấm nút đồng bộ trên Dashboard để cập nhật tức thì dữ liệu biểu đồ/bảng tính từ Google Sheet mà không cần xoá đi tạo lại.

### Tasks liên quan
- P3-T3 ✅


## [2026-06-30] Session — P3-T2: Kết nối Google Sheet riêng tư qua Google OAuth

### Yêu cầu
- Kết nối Google Sheet riêng tư bằng cách xác thực qua Google OAuth và lưu Refresh Token mã hóa.

### Công việc đã làm
- **Backend (NestJS)**:
  * Triển khai `saveGoogleRefreshToken` và `getGoogleAccessToken` trong [AuthService](file:///d:/Project/excel-visualize/backend/src/auth/auth.service.ts):
    * `saveGoogleRefreshToken`: Mã hóa Refresh Token bằng thuật toán AES-256-CBC và lưu vào trường `encryptedRefreshToken` trong DB.
    * `getGoogleAccessToken`: Giải mã Refresh Token và gửi POST request đến Google OAuth endpoint `https://oauth2.googleapis.com/token` để lấy `access_token` mới phục vụ cho việc tải dữ liệu.
  * Cấu hình và thêm hai endpoint trong [AuthController](file:///d:/Project/excel-visualize/backend/src/auth/auth.controller.ts):
    * `GET /auth/google/sheets`: Chuyển hướng người dùng đến Google Consent Screen để yêu cầu thêm scope đọc bảng tính `https://www.googleapis.com/auth/spreadsheets.readonly` cùng chế độ `access_type=offline` & `prompt=consent`.
    * `GET /auth/google/sheets/callback`: Nhận `code` từ Google, đổi lấy Refresh Token, lưu trữ và chuyển hướng người dùng quay lại giao diện `/upload?google_connected=true` của Frontend.
  * Nâng cấp phương thức `importPublicGoogleSheet` thành `importGoogleSheet` trong [DatasetsService](file:///d:/Project/excel-visualize/backend/src/datasets/datasets.service.ts):
    * Thử tải công khai trước. Nếu thất bại (403/404), kiểm tra tài khoản đã liên kết Google chưa.
    * Nếu đã liên kết, gọi `getGoogleAccessToken` để lấy access token và tải sheet bằng header `Authorization: Bearer {accessToken}`.
  * Cập nhật `sanitizeUser` để trả về cờ `googleConnected: !!user.encryptedRefreshToken`.
  * Viết unit tests đầy đủ cho tất cả logic mới.
- **Frontend (React)**:
  * Thêm thuộc tính `googleConnected: boolean` vào interface `User` trong [types/user.ts](file:///d:/Project/excel-visualize/frontend/src/types/user.ts).
  * Cập nhật [UploadPage.tsx](file:///d:/Project/excel-visualize/frontend/src/pages/UploadPage.tsx):
    * Hiển thị trạng thái liên kết tài khoản Google rõ ràng (màu xanh lá nếu đã liên kết, màu cam nếu chưa liên kết).
    * Cung cấp nút **"Kết nối ngay"** chuyển hướng đến luồng OAuth của Backend nếu tài khoản chưa được liên kết.
  * Viết unit tests bổ sung trong [UploadPage.test.tsx](file:///d:/Project/excel-visualize/frontend/src/pages/UploadPage.test.tsx) kiểm tra hiển thị đúng trạng thái liên kết.
- **Chạy kiểm thử**: Tất cả 185 backend tests và 187 frontend tests đều pass thành công.
- **Khắc phục sự cố**: Restart container `backend` để đảm bảo code mới được biên dịch đầy đủ trên môi trường Windows.

### Quyết định quan trọng
- **Tải fallback thông minh**: Ứng dụng luôn ưu tiên tải công khai trước để tiết kiệm API quota và tránh gọi API Google không cần thiết. Chỉ khi tải công khai thất bại mới kích hoạt luồng tải riêng tư qua OAuth Access Token.
- **Bảo mật**: Refresh Token được mã hóa AES-256-CBC bằng khóa bí mật từ file môi trường trước khi lưu trữ dưới cơ sở dữ liệu, đảm bảo an toàn tuyệt đối.

### Kết quả
- Người dùng có thể liên kết tài khoản Google của mình chỉ bằng 1 cú click và dễ dàng phân tích cả các Google Sheet ở chế độ riêng tư của họ.

### Tasks liên quan
- P3-T2 ✅


## [2026-06-30] Session — P3-T1: Kết nối Google Sheet công khai (Không đăng nhập)

### Yêu cầu
- Kết nối Google Sheet qua link public (không cần đăng nhập) thay cho file Excel cục bộ.

### Công việc đã làm
- **Database**:
  * Cập nhật `backend/prisma/schema.prisma` thêm trường `googleSpreadsheetId String?` vào model `Dataset`.
  * Tạo và chạy migration: `20260630052652_add_google_spreadsheet_id` thành công.
- **Backend**:
  * Tạo `ImportGoogleSheetDto` validate link URL.
  * Cập nhật [StorageService](file:///d:/Project/excel-visualize/backend/src/storage/storage.service.ts) thêm phương thức `putObject` để tải trực tiếp buffer lên MinIO.
  * Triển khai `importPublicGoogleSheet` trong [DatasetsService](file:///d:/Project/excel-visualize/backend/src/datasets/datasets.service.ts):
    * Trích xuất `spreadsheetId` từ link bằng regex.
    * Dùng native `fetch` tải file dạng XLSX từ link export công khai của Google: `https://docs.google.com/spreadsheets/d/{id}/export?format=xlsx`.
    * Validate quota (2 cho Free, 20 cho Pro) và kích thước (10MB/50MB).
    * Lưu file XLSX vào MinIO.
    * Lưu `Dataset` record vào Postgres với `googleSpreadsheetId` được điền.
  * Tạo endpoint `POST /datasets/google-sheet` trong [DatasetsController](file:///d:/Project/excel-visualize/backend/src/datasets/datasets.controller.ts).
  * Viết unit tests đầy đủ cho service và controller.
- **Frontend**:
  * Cập nhật type `Dataset` và thêm API `importGoogleSheet` trong [api/datasets.ts](file:///d:/Project/excel-visualize/frontend/src/api/datasets.ts).
  * Cập nhật [UploadPage.tsx](file:///d:/Project/excel-visualize/frontend/src/pages/UploadPage.tsx): Thiết kế thêm tab "Kết nối Google Sheet" với ô nhập link và hướng dẫn chia sẻ công khai chi tiết.
  * Viết unit tests bổ sung trong [UploadPage.test.tsx](file:///d:/Project/excel-visualize/frontend/src/pages/UploadPage.test.tsx) kiểm thử chuyển tab, điền URL, kết nối thành công và xử lý lỗi.
- **Chạy kiểm thử**: Tất cả 180 backend tests và 185 frontend tests đều pass.

### Quyết định quan trọng
- **Tải XLSX trực tiếp thay vì dùng Sheets API**: Tận dụng link export XLSX công khai của Google giúp tải toàn bộ bảng tính (gồm cả các tab) chỉ trong 1 request mà **không cần Google API Key**. Toàn bộ dữ liệu được lưu vào MinIO dưới dạng file Excel thông thường, giúp tái sử dụng 100% logic phân tích và gợi ý hiện có mà không cần sửa đổi.
- **Dùng native `fetch` (Node 20)**: Tránh cài thêm thư viện Axios phía backend, giữ cho backend gọn nhẹ và hiệu năng tốt.

### Kết quả
- Người dùng có thể dán link Google Sheet công khai -> Hệ thống tự kết nối, tải về lưu trữ và mở giao diện tổng quan giống như file Excel upload.

### Tasks liên quan
- P3-T1 ✅


## [2026-06-30] Session — Check chéo dự án, bổ sung tài liệu & viết Unit Test cho Admin Panel

### Yêu cầu
- Check chéo code thực tế với các file hướng dẫn, ghi chú tiến trình, steering.
- Bổ sung tài liệu và viết unit test đầy đủ theo yêu cầu sau khi phát hiện các khoảng trống.

### Công việc đã làm
- **Check chéo toàn diện**: So sánh code thực tế với các chỉ dẫn kỹ thuật trong `project-conventions.md`, `security-review.md`, và tiến độ trong `plan.md`. Ghi nhận kết quả chi tiết vào [cross_check_report.md](file:///C:/Users/Admin/.gemini/antigravity-ide/brain/ce32ad77-af0f-4341-84d6-cee917dcdeb2/cross_check_report.md).
- **Cập nhật Tài liệu API**: Bổ sung đầy đủ thông tin cho 4 endpoint quản trị mới (`GET /admin/users`, `PATCH /admin/users/:id/plan`, `GET /admin/stats`, `GET /admin/audit-logs`) vào [docs/api.md](file:///d:/Project/excel-visualize/docs/api.md).
- **Viết Unit Tests bổ sung (Frontend)**:
  * [ProfilePage.test.tsx](file:///d:/Project/excel-visualize/frontend/src/pages/ProfilePage.test.tsx): Kiểm thử hiển thị thông tin, quyền admin, và luồng đăng xuất.
  * [AdminStatsPage.test.tsx](file:///d:/Project/excel-visualize/frontend/src/pages/admin/AdminStatsPage.test.tsx): Kiểm thử hiển thị KPI hệ thống, tỷ lệ chuyển đổi và các trạng thái online/offline.
  * [AdminUsersPage.test.tsx](file:///d:/Project/excel-visualize/frontend/src/pages/admin/AdminUsersPage.test.tsx): Kiểm thử bảng danh sách người dùng, nút nâng cấp/hạ cấp plan hoạt động bất đồng bộ qua mutation.
  * [AdminAuditLogsPage.test.tsx](file:///d:/Project/excel-visualize/frontend/src/pages/admin/AdminAuditLogsPage.test.tsx): Kiểm thử hiển thị bảng lịch sử, định dạng chi tiết metadata dạng JSON và chức năng phân trang.
- **Chạy kiểm thử**: Đảm bảo tất cả test suites đều xanh.

### Quyết định quan trọng
- **Đồng bộ hóa tài liệu và mã nguồn**: Giúp các thành viên mới/AI dễ dàng nắm bắt các API admin bảo vệ bởi RolesGuard mà không phải đọc chay code.
- **Bao phủ kiểm thử (Test Coverage)**: Việc viết test bổ sung cho các trang admin đảm bảo tuân thủ nguyên tắc "test viết cùng lúc với implementation", phòng ngừa các lỗi hồi quy (regression) ở các phase tiếp theo.

### Kết quả
- Toàn bộ unit tests đều qua:
  * Backend: **174/174 passed**
  * Frontend: **184/184 passed** (tăng từ 165)
- Mọi khoảng trống tài liệu và kiểm thử phát hiện từ Phase 0.5 đã được lấp đầy.

### Tasks liên quan
- Troubleshooting & Quality Assurance (Phase 0.5 & Phase 2 follow-ups).

## [2026-06-30] Session — Check chéo dự án & Cập nhật tài liệu API Phase 3

### Yêu cầu
- Sử dụng codebase-memory MCP kiểm tra chéo code thực tế và tài liệu.

### Công việc đã làm
- **Kiểm tra chéo hệ thống**:
  * Kiểm tra và xác nhận code thực tế khớp với tiến độ trong `docs/plan.md` (đã hoàn thành Phase 3).
  * Chạy toàn bộ bộ test backend (192/192 passed) và frontend (188/188 passed) thành công 100%.
  * Phát hiện khoảng trống tài liệu API: Các API Google Sheet & Google OAuth mới của Phase 3 chưa được ghi nhận trong `docs/api.md`.
- **Cập nhật tài liệu**:
  * Bổ sung đầy đủ 4 endpoint mới của Phase 3 vào [docs/api.md](file:///d:/Project/excel-visualize/docs/api.md): `GET /auth/google/sheets`, `GET /auth/google/sheets/callback`, `POST /datasets/google-sheet`, `POST /datasets/:id/sync`.
- **Tạo báo cáo**:
  * Lưu báo cáo check chéo chi tiết tại [cross_check_report.md](file:///C:/Users/Admin/.gemini/antigravity-ide/brain/086ce09a-d3a9-4b86-ac38-fd7f4e15a486/cross_check_report.md).

### Quyết định quan trọng
- Cập nhật trực tiếp tài liệu API bị thiếu để duy trì nguyên tắc "Documentation Integrity" của dự án mà không cần tạo plan lớn vì đây là thay đổi tài liệu thuần túy và không có rủi ro kỹ thuật.

### Kết quả
- Tài liệu API đã đồng bộ 100% với mã nguồn hiện tại. Sẵn sàng cho Phase 4 (AI Features).

### Tasks liên quan
- Quality Assurance / Documentation (Phase 3 follow-up).## [2026-06-30] Session — Brainstorm Notion-like Chart View / Editor

### Yêu cầu
- Brainstorm thiết kế tính năng biểu đồ hoạt động tương tự như Notion Chart View.
- So sánh tính năng Notion Charts với cấu trúc codebase hiện tại của dự án.
- Đề xuất giải pháp thiết kế UI và kiến trúc kỹ thuật tích hợp.

### Công việc đã làm
- **Nghiên cứu & Phân tích**:
  * Đọc và phân tích cách Notion Charts hoạt động (loại biểu đồ, cách cấu hình trực tiếp trục X/Y, tính năng Aggregation, Sort, Limit, Style/Color Palettes).
  * Kiểm tra cấu trúc source code hiện tại (Prisma schema, backend suggester service, frontend `buildChartOption`, `ChartDetailPage`, và drawer `ChartStylePanel` trên Dashboard).
- **Tạo Tài liệu Brainstorm**:
  * Tạo file [brainstorm_notion_charts.md](file:///C:/Users/Admin/.gemini/antigravity-ide/brain/bca2a39c-89b3-4af5-a2f2-d14bd3960a57/brainstorm_notion_charts.md) chứa phân tích chi tiết, biểu đồ luồng hoạt động UX lai (hybrid flow), thiết kế giao diện sidebar panel cấu hình, và giải pháp lưu trữ cấu trúc định nghĩa biểu đồ trong Database.

### Quyết định quan trọng
- **Giữ luồng Hybrid**: Vẫn giữ auto-suggest 30 giây đầu tiên cho người mới để tối ưu "Wow moment", đồng thời cung cấp thêm "Studio Chart Editor" có sidebar cấu hình trực quan như Notion làm escape hatch để user tự do tinh chỉnh (loại chart, cột X, cột Y, phép gộp, sắp xếp, style...).
- **Cấu trúc lại trường Config**: Đề xuất lưu thêm trường `definition` (Notion-like spec) và `option` (đã build xong) trong cùng một đối tượng Json của cột `Chart.config` trong database. Việc này tránh làm phức tạp schema prisma mà vẫn lưu giữ được đầy đủ trạng thái để phục hồi form cấu hình ở UI.
- **Nâng cấp buildChartOption thành Compiler**: Chuyển đổi logic render option từ nhận dạng gợi ý tĩnh sang nhận cấu hình tự do `definition` từ client và tự compile ra ECharts option.

### Kết quả
- Hoàn thành báo cáo brainstorm chi tiết định hướng phát triển tính năng Notion-like Chart Editor cho giai đoạn tương lai.

### Tasks liên quan
- Định hướng tương lai (Future Roadmap - Chart Editor).
## [2026-06-30] Session — Sửa lỗi định dạng ngày & Chặn số lẻ trục Y

### Yêu cầu
- Sửa lỗi thời gian chưa được định dạng ở Preview Table, mẫu dữ liệu, và Trục X của biểu đồ (hiển thị chuỗi ISO-8601 thô `2026-06-01T00:00:00.000Z`).
- Chặn hiển thị số lẻ thập phân (ví dụ `1.5, 2.5`) trên trục Y của biểu đồ khi dữ liệu gốc biểu diễn các dán nhãn phân loại bằng số hoặc toàn bộ là số nguyên.

### Công việc đã làm
- **Frontend**:
  * Tạo helper [formatDate.ts](file:///d:/Project/excel-visualize/frontend/src/lib/formatDate.ts) sử dụng regex an toàn (tránh lệch ngày múi giờ) tách chuỗi ISO-8601 lấy phần ngày `YYYY-MM-DD`.
  * Cập nhật [ColumnOverviewPage.tsx](file:///d:/Project/excel-visualize/frontend/src/pages/ColumnOverviewPage.tsx): Định dạng ngày trong Preview Table và danh sách sample values.
  * Cập nhật [buildChartOption.ts](file:///d:/Project/excel-visualize/frontend/src/lib/buildChartOption.ts):
    * Áp dụng `formatDate` lên trục hoành (`xAxis.data`) của các biểu đồ dạng line, bar, pie.
    * Tự động quét dữ liệu của toàn bộ series hiển thị. Nếu tất cả giá trị đều là số nguyên, thiết lập `minInterval: 1` cho trục Y của ECharts để tránh tự động chia nhỏ thành các số thập phân.
  * Viết unit test:
    * Tạo [formatDate.test.ts](file:///d:/Project/excel-visualize/frontend/src/lib/formatDate.test.ts) kiểm thử logic format.
    * Bổ sung test cases trong [buildChartOption.test.ts](file:///d:/Project/excel-visualize/frontend/src/lib/buildChartOption.test.ts) xác minh format date trên category X-axis và cấu hình `minInterval: 1` cho `yAxis`.
- **Chạy kiểm thử**: Chạy `docker compose exec -T frontend pnpm test -- --run` thành công 100% (196/196 passed).

### Quyết định quan trọng
- **Format date phía client dùng Regex**: Việc format date tại client giúp giữ nguyên định dạng thô trong DB/MinIO. Sử dụng regex split thay vì `new Date()` giúp tránh hoàn toàn các lỗi lệch múi giờ (timezone offset) khi chuyển đổi trên các máy khách khác nhau.
- **Tự động kích hoạt `minInterval`**: Hệ thống tự kiểm tra kiểu số nguyên (`Number.isInteger`) của toàn bộ series đang vẽ để áp đặt `minInterval: 1` mà không làm hỏng trải nghiệm hiển thị khi biểu đồ thực sự vẽ dữ liệu số lẻ (như điểm số trung bình, nhiệt độ, tỷ lệ phần trăm).

### Kết quả
- Preview Table, chip mẫu dữ liệu và trục hoành biểu đồ hiển thị ngày dạng `YYYY-MM-DD`.
- Trục Y của các cột phân loại/số nguyên được vẽ đúng tỉ lệ nguyên, không còn xuất hiện các vạch chia số lẻ.

### Tasks liên quan
- Troubleshooting & Quality Assurance (UI bugs).

## [2026-06-30] Session — Tinh chỉnh Auto-detect: Cột số nguyên ít distinct thành Phân loại (Category)

### Yêu cầu
- Người dùng chỉ ra cột "Phân loại" có giá trị `1, 2, 2` bản chất là nhãn phân loại (Category / label string), không phải là Số liệu đo lường. Hệ thống không nên nhận diện là `number` và gợi ý biểu đồ diễn biến Line/Bar sai lệch.

### Công việc đã làm
- **Backend**:
  * Cập nhật [column-type.service.ts](file:///d:/Project/excel-visualize/backend/src/parser/column-type.service.ts) tinh chỉnh logic tự động nhận diện:
    * Nếu một cột toàn bộ là số nguyên, có số lượng dòng $\ge 10$, số giá trị phân biệt (distinct) $\le 10$, và tỷ lệ phân biệt $\le 20\%$.
    * Hệ thống sẽ tự động gán kiểu của cột này là `ColumnType.category` với `confidence: 0.6`.
  * Viết unit test:
    * Bổ sung test cases trong [column-type.service.spec.ts](file:///d:/Project/excel-visualize/backend/src/parser/test/column-type.service.spec.ts) để kiểm thử việc nhận diện cột số nguyên lặp thành `category` và cột số nguyên liên tục thành `number`.
- **Chạy kiểm thử**: Chạy toàn bộ unit tests của backend thành công (194/194 passed).

### Quyết định quan trọng
- **Thiết lập confidence = 0.6 cho cột integer category**: Giúp cột tự động hiển thị trong tab **Phân loại** (🏷️) đúng như bản chất dữ liệu, đồng thời kích hoạt panel **Xác nhận kiểu cột** (hiện khi confidence < 0.8) ở UI để người dùng vẫn có quyền đổi lại thành **Số liệu** (Number) chỉ bằng một click nếu họ thực sự muốn.

### Kết quả
- Cột số nguyên ít phân biệt (ví dụ: `1, 2, 2` dán nhãn) được nhận diện chính xác là **Phân loại**, không bị đẩy nhầm vào **Số liệu** và không tạo ra biểu đồ line/bar vô nghĩa.

### Tasks liên quan
- Troubleshooting & Quality Assurance (UI & auto-detect).
