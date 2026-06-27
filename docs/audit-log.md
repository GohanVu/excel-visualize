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

## [2026-06-27] Session 1 — Setup monorepo & Docker Compose

### Yêu cầu
- Brainstorm UI/UX cho web app Excel visualization
- Bắt đầu implement Phase 0: setup monorepo + Docker

### Công việc đã làm
- Brainstorm toàn bộ UX (user journey, chart suggestion flow, freemium gate)
- Ghi kết quả vào `docs/brainstorm.md`
- Tạo plan đầy đủ 6 phases vào `docs/plan.md`
- P0-T1: Tạo `backend/` (NestJS skeleton) + `frontend/` (React+Vite+Tailwind skeleton)
- P0-T2: Tạo `docker-compose.yml` với Postgres 16.3, Redis 7.2, MinIO, backend, frontend
- Tạo `Makefile` cho common Docker commands
- Tạo `.env.example` + `.env`

### Quyết định quan trọng
- **Docker-first**: không cài gì global, mọi thứ chạy trong container
- **corepack** dùng trong Dockerfile để kích hoạt pnpm (không phải `npm install -g pnpm`)
- **httpOnly cookie** cho JWT — không dùng localStorage
- **pnpm 9.4.0 + Node 20.14** — pin version cụ thể
- **anonymous volume** cho `node_modules` trong container (backend_modules, frontend_modules) — tránh conflict với host
- Frontend proxy `/api` → backend qua Vite proxy (dev) — frontend gọi `/api/...`, không hardcode backend URL

### Kết quả
- Chạy `make up` để khởi động toàn bộ stack
- Backend: `http://localhost:3000/health`
- Frontend: `http://localhost:5173`

### Tasks liên quan
- P0-T1 ✅, P0-T2 ✅

---

## [2026-06-27] Session 2 — Prisma schema (P0-T3)

### Yêu cầu
- Tạo Prisma schema đầy đủ cho toàn bộ project

### Công việc đã làm
- Tạo `backend/prisma/schema.prisma` với các model: User, Dataset, DatasetColumn, Dashboard, Chart, Subscription, AuditLog
- Tạo `backend/prisma/seed.ts` để seed admin user qua env `ADMIN_EMAIL`
- Thêm `DATABASE_URL` vào `.env.example` và `.env` (localhost:5433 cho dev ngoài container)
- Thêm `prisma.seed` config vào `backend/package.json`

### Quyết định quan trọng
- **Role enum**: `user` | `admin` lưu trong DB (không phải string)
- **SubscriptionPlan enum**: `free` | `pro` trong DB
- **Chart.config JSONB**: lưu toàn bộ ECharts config — linh hoạt, không cần migration khi đổi chart type
- **Chart.position JSONB**: lưu layout cho react-grid-layout
- **AuditLog.userId nullable**: action của hệ thống (không có user) vẫn ghi được
- **Seed idempotent**: dùng `upsert` — chạy nhiều lần không sinh data trùng
- **DATABASE_URL** cho dev ngoài container: port 5433 (postgres expose ra host)

### Kết quả
- Chạy migrate: `make db-migrate` (stack phải đang up)

### Tasks liên quan
- P0-T3 ✅

## [2026-06-27] Session 3 — Auth module backend (P0-T4)

### Yêu cầu
- Google OAuth2 + JWT access/refresh token + role guard

### Công việc đã làm
- `src/prisma/prisma.service.ts` + `prisma.module.ts` — PrismaService global
- `src/common/decorators/roles.decorator.ts` — `@Roles('admin')`
- `src/common/decorators/current-user.decorator.ts` — `@CurrentUser()`
- `src/common/guards/jwt-auth.guard.ts` — wrap `AuthGuard('jwt')`
- `src/common/guards/roles.guard.ts` — check `ROLES_KEY` từ reflector
- `src/auth/strategies/google.strategy.ts` — Passport Google OAuth2
- `src/auth/strategies/jwt.strategy.ts` — extract JWT từ httpOnly cookie `access_token`
- `src/auth/auth.service.ts` — findOrCreateGoogleUser, generateTokens, encrypt/decrypt refresh token
- `src/auth/auth.controller.ts` — GET /auth/google, /auth/google/callback, POST /auth/refresh, /auth/logout, GET /auth/me
- `src/auth/auth.module.ts` — wire tất cả lại
- Cập nhật `app.module.ts` import PrismaModule + AuthModule

### Quyết định quan trọng
- **JWT từ cookie**: `ExtractJwt.fromExtractors` đọc cookie `access_token` — không phải Authorization header
- **Refresh token path**: cookie `refresh_token` set `path: '/auth/refresh'` — browser chỉ gửi khi gọi đúng endpoint đó
- **Encrypt Google refresh token**: AES-256-CBC, key derive từ JWT_SECRET qua scrypt — stable across restarts
- **`/auth/me` không trả `encryptedRefreshToken`**: destructure loại bỏ field sensitive trước khi return
- **JwtModule.register({})**: không set secret ở module level — pass secret per-call trong AuthService để dễ dùng 2 secret (access vs refresh)

### Kết quả
- Endpoints: GET /auth/google → /auth/google/callback → redirect frontend/dashboard
- POST /auth/refresh (dùng cookie refresh_token) → set lại access_token cookie
- POST /auth/logout → clear cả 2 cookie
- GET /auth/me → trả user hiện tại (cần JWT hợp lệ)
- **24/24 unit tests pass** (`make test-backend`)

### Test coverage
- `src/auth/test/auth.service.spec.ts` — 12 tests: encrypt/decrypt roundtrip, findOrCreateUser, generateTokens, verifyRefreshToken
- `src/auth/test/auth.controller.spec.ts` — 7 tests: cookies httpOnly, redirect, refresh flow, logout, /me không lộ token
- `src/common/guards/test/roles.guard.spec.ts` — 5 tests: no-role passthrough, admin/user allow/block, null user block

### Thiếu sót & fix
- Ban đầu implement xong không có test — người dùng nhắc mới viết
- Fix: từ session sau, test phải viết **cùng lúc** với implementation, không phải sau

### Tasks liên quan
- P0-T4 ✅

## [2026-06-27] Session 4 — Auth flow UI (P0-T5)

### Yêu cầu
- Trang Login với Google Sign-In button, axios client, useAuth hook

### Công việc đã làm
- `src/types/user.ts` — type User, Role
- `src/api/client.ts` — axios instance withCredentials, interceptor tự động refresh 401 → gọi /auth/refresh → retry
- `src/hooks/useAuth.ts` — useQuery gọi /auth/me, trả về user/isLoading/isAuthenticated
- `src/pages/LoginPage.tsx` — trang login với Google Sign-In button (Google logo SVG inline)
- `src/App.tsx` — cập nhật route /login dùng LoginPage thật
- Setup vitest 2.x + happy-dom + @testing-library/react
- `src/pages/LoginPage.test.tsx` — 4 tests
- `src/hooks/useAuth.test.ts` — 3 tests
- Thêm `make test-frontend` và `make test` vào Makefile

### Quyết định quan trọng
- **happy-dom thay vì jsdom**: jsdom@29 có ESM conflict với Node CJS — happy-dom nhẹ hơn và không có vấn đề này
- **vitest 2.x** (không phải 4.x): Vite 5 chỉ tương thích với vitest 2.x
- **Axios interceptor**: 401 → tự gọi /auth/refresh (dùng cookie refresh_token) → retry request gốc → nếu vẫn fail thì redirect /login
- **Google button là `<a>` tag**: redirect thẳng đến backend /api/auth/google, không cần JS handler
- **`/api/auth/google`**: Vite proxy `/api` → backend:3000, nên frontend gọi /api/auth/google → backend GET /auth/google

### Test coverage
- `src/pages/LoginPage.test.tsx` — 4 tests: render tên app, render button, href đúng, tagline tiếng Việt
- `src/hooks/useAuth.test.ts` — 3 tests: trả user khi 200, trả null khi 401, isLoading ban đầu true
- **7/7 tests pass** (`make test-frontend`)

### Tasks liên quan
- P0-T5 ✅

## [2026-06-27] Session 5 — Route guard FE (P0-T6)

### Yêu cầu
- Route guard: redirect /login nếu chưa đăng nhập, redirect /dashboard nếu đã đăng nhập

### Công việc đã làm
- `src/components/PrivateRoute.tsx` — bọc protected routes, redirect /login nếu unauthenticated, spinner khi loading
- `src/components/PublicRoute.tsx` — bọc public-only routes, redirect /dashboard nếu đã authenticated
- Cập nhật `App.tsx` — wire PrivateRoute + PublicRoute vào Routes tree
- `PrivateRoute.test.tsx` — 3 tests: spinner, render khi auth, redirect khi không auth
- `PublicRoute.test.tsx` — 3 tests: spinner, render khi không auth, redirect khi đã auth

### Quyết định quan trọng
- **Dùng `<Outlet />`** thay vì `children` prop — pattern chuẩn của React Router v6 cho nested routes
- **Spinner inline** trong guard thay vì global loading overlay — đơn giản, đủ dùng ở phase này

### Test coverage
- 13/13 tests pass (`make test-frontend`)

### Kết quả
- Commit `5b58040` push lên https://github.com/GohanVu/excel-visualize

### Tasks liên quan
- P0-T6 ✅

<!-- Thêm session mới ở đây -->
