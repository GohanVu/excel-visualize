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

## Session 3 — 2026-07-01 — Chart Studio Editor (Phase 3.5)

> Nguồn: thảo luận GitHub Copilot, export ở file `wed_jul_01_2026_notion_chart_view_alternatives_on_git_hub.json` (repo root).
> Lưu ý: yêu cầu ghi "phase 3.5 cho việc làm **chat**" — thực chất là **chart** (Chart Studio); toàn bộ thảo luận bàn về chart editor.
> Đây là bản CHI TIẾT HOÁ + THỰC THI của định hướng đã nêu ở Session 2 (Notion-like Chart View).

### Bối cảnh & Vấn đề

- Người dùng khảo sát các repo tham chiếu (ocean-dataview, react-json-chart-builder, Chart-Creator, Superset/Metabase) để định vị `excel-visualize`. Kết luận: repo đã vượt mức "demo chart", đang là **No-code Excel/Google Sheet visualization SaaS** — nên tiến tới trải nghiệm cấu hình biểu đồ kiểu **Notion Chart View**.
- **Vấn đề gốc phát hiện trong code:** hiện `Chart.config` lưu thẳng **ECharts option đã compile** (`saveChart(datasetId, type, title, option)` ở `ChartDetailPage`). ECharts option quá technical, khó migrate, AI khó sinh ổn định, UI khó map ngược → không phải nguồn sự thật tốt.

### Quyết định thiết kế cốt lõi

1. **Tách 2 lớp `definition` ↔ `option`.** `ChartDefinition` (chartType, xField, yFields, aggregation, seriesField, sort, limit, style) là **nguồn sự thật**; `option` chỉ là kết quả compile/cache. Compiler: `buildChartOptionFromDefinition(definition, rows) → ECharts option`.
2. **Làm TRƯỚC Phase 4 (AI).** AI suggester nên sinh ra `ChartDefinition` (kèm `reason` tiếng Việt), KHÔNG sinh ECharts option. Khi đó rule-based suggester + AI + Studio editor + dashboard render đều dùng CHUNG 1 schema.
3. **Không đổi schema Prisma.** `Chart.config Json` đủ linh hoạt; chỉ nâng cấu trúc thành `{ version:2, definition, option? }`. Chỉ thêm bảng sau này nếu cần query theo field / template / collaboration.
4. **Backward-compat bắt buộc.** Chart cũ (option thô) render qua path cũ; adapter `chartSuggestionToDefinition` + guard `isDefinitionConfig`; migrate mềm khi user mở Studio và bấm Lưu.
5. **Compiler phải tách nhỏ** (`lib/chart/`: aggregation/series/sort/limit/palettes) — không phình `buildChartOption.ts` (đang 187 dòng, sát ngưỡng 200).

### Đối chiếu code hiện tại (reuse-first)

| Đã có → REUSE | Còn thiếu → LÀM MỚI |
|---|---|
| 6 phép gộp (`reduceAgg`/`groupAggregate`) | `seriesField` "Tách nhóm" (split 1 cột phân loại thành nhiều series) |
| 4 bảng màu + theme sáng/tối (`chartCustomize`) | sort + limit Top N |
| multi-yField = nhiều series; toggle % (bar) | `ChartDefinition` type + compiler tách helper |
| `PATCH /charts/:id` (P2-T5) | `GET /charts/:id` (chưa có, chỉ có list) |
| ChartType bar/line/pie/scatter | config v2 `{version, definition}` + adapter back-compat |

### Trải nghiệm UI (Hybrid Flow)

- **Giữ triết lý cũ:** người mới "upload → thấy chart ngay" (auto-suggest 30s). Studio là lớp nâng cao **opt-in**, không bắt cấu hình từ đầu.
- **3 entry vào Studio:** Dashboard (gear/⋮ menu — chính) · Chart Detail sau khi chọn gợi ý ("Chỉnh thêm trong Studio") · (defer) từ card gợi ý.
- **Studio = route riêng full-screen** (không phải drawer): header (← Dashboard · Huỷ/Lưu) · trái = chart preview lớn + data preview table · phải = sidebar sticky 3 section.
- **Sidebar tiếng Việt theo mental model:** Dữ liệu (Kiểu biểu đồ / So sánh theo / Số liệu / Tính theo / Tách nhóm) · Sắp xếp (Sắp xếp theo / Thứ tự / Hiển thị Top N) · Giao diện (Tiêu đề / Bảng màu / Legend / Nhãn / Lưới / Nền tối).
- **Nguyên tắc:** chart hiện trước – control đứng sau; realtime preview nhưng **lưu-sau** (không autosave MVP); smart-default không để form trống; disable/hướng dẫn khi config vô lý (pie 1 số liệu, scatter cần 2 cột số); data table highlight cột đang dùng (x/y/series).
- **Field picker thông minh:** nhóm cột theo loại (Thời gian/Số liệu/Phân loại) + hiện sample values, không list phẳng.
- Mental model đích: câu "So sánh **[Doanh thu]** theo **[Tháng]**, tính bằng **[Tổng]**, tách nhóm **[Khu vực]**, hiển thị **[Top 10]**".

### Chốt phạm vi (đã quyết cho v1)

- **Chia 2 nhóm:** A = nền tảng (type/adapter/compiler/config v2), B = Studio UI. Làm A trước để không vỡ chart cũ.
- **Chart type v1:** giữ 4 loại đang có (bar/line/pie/scatter). `area` rẻ (line + areaStyle) có thể thêm; `table`/`kpi` **defer**.
- **`seriesField`** đưa vào plan nhưng là task advanced cuối cùng — tách lô được nếu cần giảm scope.
- Kết quả: repo chuyển từ "upload → app suggest chart" thành "upload → suggest → **user mở Studio chỉnh như Notion** → AI (sau) cũng sinh/chỉnh trên cùng schema".

### Tasks liên quan

- Phase 3.5 (P3.5-T1 → T12) trong `docs/plan.md`. Tiền đề cho Phase 4 (AI sinh `ChartDefinition`).

<!-- Thêm session mới ở đây -->
