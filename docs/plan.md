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
