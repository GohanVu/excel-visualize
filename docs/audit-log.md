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

## [2026-06-27] Session 6 — GitHub Actions CI (P0-T7)

### Yêu cầu
- Tạo CI workflow: lint + test + build cho backend và frontend khi push/PR vào main

### Công việc đã làm
- Tạo `.github/workflows/ci.yml` — 2 job song song: `backend` và `frontend`
- Tạo `backend/.eslintrc.js` — config ESLint TypeScript cơ bản (rules chi tiết thêm ở P0-T8)
- Tạo `frontend/.eslintrc.cjs` — config ESLint React + TypeScript cơ bản

### Quyết định quan trọng
- **2 job song song**: backend và frontend không phụ thuộc nhau, chạy song song tiết kiệm thời gian
- **`pnpm/action-setup@v4` + `actions/setup-node@v4`**: kết hợp chuẩn, cache pnpm store giữa các run
- **`--frozen-lockfile`**: CI luôn dùng đúng versions trong lock file, không tự resolve khác
- **`prisma generate` trước khi lint/test**: generate Prisma client types để TypeScript không báo lỗi missing types
- **Không cần DB trong CI**: tất cả backend tests là unit tests với mock, không cần Postgres/Redis
- **`.eslintrc.cjs` cho frontend**: project frontend dùng `"type": "module"` nhưng ESLint 8 đọc được `.cjs` extension

### Kết quả
- `.github/workflows/ci.yml` — trigger khi push/PR vào main
- CI chạy: install → prisma generate → lint → test → build cho cả 2 packages

### Tasks liên quan
- P0-T7 ✅

## [2026-06-27] Session 7 — ESLint rules + Husky pre-commit (P0-T8)

### Yêu cầu
- ESLint enforce max-lines (200 soft / 400 hard), max-lines-per-function (50)
- Husky pre-commit hook để chặn commit vi phạm

### Công việc đã làm
- Tạo root `package.json` — khai báo workspace, husky + lint-staged devDeps
- Tạo `pnpm-workspace.yaml` — khai báo `backend` + `frontend` là workspace packages
- Tạo `.husky/pre-commit` — bash script kiểm tra 400-line hard limit + chạy lint-staged
- Update `backend/.eslintrc.js` — thêm max-lines/max-lines-per-function warn, bỏ `parserOptions.project`
- Update `frontend/.eslintrc.cjs` — thêm max-lines/max-lines-per-function warn
- Update `Makefile` — thêm `setup` (pnpm install), `lint` (cả 2 packages)

### Quyết định quan trọng
- **200 warn / 400 hard phân tách bằng 2 tầng**: ESLint warn tại 200 (hiện trong IDE), bash check tại 400 trong pre-commit (block commit)
- **Không dùng `parserOptions.project`** trong ESLint config: type-aware linting cần tsconfig context và rất chậm trong pre-commit; các rule hiện tại không cần type info
- **lint-staged dùng path tuyệt đối đến eslint của từng package**: `node backend/node_modules/.bin/eslint` — tránh dependency ESLint ở root, dùng đúng eslint version của mỗi package
- **`max-lines` với `skipBlankLines: true, skipComments: true`**: đếm code thực, không tính comment và dòng trống
- **`pnpm install` ở root** kích hoạt Husky qua `"prepare": "husky"` script — cần chạy 1 lần sau clone

### Setup cho developer mới
```sh
git clone ...
make setup   # pnpm install ở root → kích hoạt Husky
make up      # chạy stack
```

### Kết quả
- Commit với file > 400 dòng sẽ bị block
- IDE (VS Code, ...) hiển thị warning khi file > 200 dòng

### Tasks liên quan
- P0-T8 ✅

## [2026-06-27] Session 8 — Phase 1 start: Upload Excel/CSV (P1-T1)

### Yêu cầu
- Backend: presigned PUT URL cho MinIO, validate kích thước theo plan
- Frontend: drag-drop upload UI, progress, error handling
- Giới hạn: 10MB free / 50MB pro

### Công việc đã làm
- Bỏ qua P0-T9 (Traefik) — dời sang trước Phase 6 deploy
- `backend/src/storage/storage.service.ts` — MinIO client, auto-create bucket, presignedPutUrl
- `backend/src/storage/storage.module.ts`
- `backend/src/storage/test/storage.service.spec.ts` — 3 tests
- `backend/src/datasets/dto/presign-upload.dto.ts` — validate filename, contentType, fileSize
- `backend/src/datasets/dto/confirm-upload.dto.ts`
- `backend/src/datasets/datasets.service.ts` — size check theo plan, tạo Dataset record
- `backend/src/datasets/datasets.controller.ts` — POST /datasets/presign, POST /datasets, GET /datasets
- `backend/src/datasets/datasets.module.ts`
- `backend/src/datasets/test/datasets.service.spec.ts` — 6 tests
- `backend/src/datasets/test/datasets.controller.spec.ts` — 3 tests
- `frontend/src/api/datasets.ts` — presign + confirm + uploadFile helper
- `frontend/src/components/FileUpload.tsx` — drag-drop, validate, upload button
- `frontend/src/pages/UploadPage.tsx` — page wrapper, navigate sau upload
- `frontend/src/components/FileUpload.test.tsx` — 5 tests
- `frontend/src/pages/UploadPage.test.tsx` — 3 tests
- Cập nhật `App.tsx` — route `/upload` (PrivateRoute)
- Cập nhật `app.module.ts` — import DatasetsModule
- Thêm `minio: 7.1.3` vào backend package.json
- Thêm `MINIO_BUCKET`, `MINIO_PUBLIC_ENDPOINT` vào .env + docker-compose.yml

### Quyết định quan trọng
- **Presigned PUT URL**: browser upload thẳng vào MinIO, backend không làm proxy — tránh tốn RAM/bandwidth backend
- **`MINIO_PUBLIC_ENDPOINT`**: presigned URL từ MinIO SDK chứa internal hostname `minio:9000` — backend thay bằng `localhost:9000` trước khi trả về frontend. Cần thiết vì browser không resolve Docker internal hostname
- **Object key**: `{userId}/{timestamp}-{random}{ext}` — tránh collision, có thể trace về user
- **`@IsIn(ALLOWED_MIME)`** trong DTO: validate contentType ở server-side, không chỉ dựa vào extension
- **`baseName()`**: Dataset.name lưu tên file không có extension — đẹp hơn khi hiện trong UI
- **Route `/datasets/{id}/columns`**: UploadPage navigate về đây sau upload thành công — sẵn sàng cho P1-T4

### Test coverage
- Backend: 12 tests mới (storage: 3, datasets service: 6, datasets controller: 3)
- Frontend: 8 tests mới (FileUpload: 5, UploadPage: 3)

### Tasks liên quan
- P0-T9 ⏭️ Skipped
- P1-T1 ✅

## [2026-06-27] Session 6 — Email/password auth (ngoài kế hoạch, unblock dev)

### Yêu cầu
- Google OAuth lỗi `invalid_client` (chưa setup credentials) → cần login email/password để dev không bị block

### Công việc đã làm
- Prisma: thêm `passwordHash String?` vào User, migration `20260627125628_add_password_hash_to_users`
- Cài `bcryptjs` (pure JS, không cần native compile trong Docker)
- `AuthService`: `registerWithPassword`, `loginWithPassword`
- `AuthController`: `POST /auth/register`, `POST /auth/login` — set httpOnly cookie như Google OAuth
- `RegisterDto`, `LoginDto` với class-validator
- `LoginPage.tsx`: tab Đăng nhập / Đăng ký, form email+password, Google button vẫn giữ
- Fix: `aria-label="auth-form"` trên `<form>` để test phân biệt với tab button cùng tên

### Quyết định quan trọng
- **`passwordHash` nullable**: user Google OAuth không có password — hai auth method song song, không thay thế nhau
- **bcryptjs thay vì bcrypt**: không cần native addon, chạy được trong Docker Alpine không cần build tools
- **Cùng cookie flow**: `register` và `login` set cookie y hệt Google callback — frontend không cần biết auth method nào

### Test coverage
- 5 backend tests mới: register conflict, hash không lưu plaintext, login not found, wrong password, correct password
- 4 frontend tests mới: render form, switch tab, error display, gọi đúng endpoint
- 25/25 frontend pass, 48/50 backend pass (2 failures pre-existing: parser CSV encoding + storage TS type)

### Tasks liên quan
- Không nằm trong plan — hotfix unblock dev flow

## [2026-06-27] Session 7 — Dọn dẹp & commit code mồ côi

### Yêu cầu
- Phát hiện nhiều code đã viết (CI, husky, eslint, Phase 1 backend/frontend) nhưng chưa commit
- Dọn dẹp, fix lỗi, commit theo nhóm task

### Công việc đã làm
- Review toàn bộ code untracked, quét secret (sạch)
- Fix 2 backend test fail trước khi commit (tránh CI đỏ ngay lần push đầu):
  - `parser`: CSV decode UTF-8 (dấu tiếng Việt) + validate magic bytes (xlsx=PK/ZIP, xls=OLE2) chặn file rác
  - `storage` test: `EventEmitter` import tĩnh (TS type), emit event trong `setImmediate` để listener kịp attach
- Fix lint errors (CI chạy lint):
  - backend: `no-unused-vars` thêm `ignoreRestSiblings` cho idiom destructure-omit
  - frontend: bỏ `any` trong LoginPage catch
- Commit theo 4 nhóm: P0-T8 (tooling), P0-T7 (CI), P1 backend, P1 frontend
- Phát hiện FileUpload.tsx bị bỏ sót chưa commit ở session trước (test đã commit, component thì chưa) → bổ sung

### Quyết định quan trọng
- **Không commit code có test fail**: fix trước khi commit để CI xanh ngay từ đầu
- **Đánh dấu plan trung thực**: P1-T3 (column type detection) thực tế CHƯA làm — `columns` chỉ có name/index/sampleValues, không có type → giữ ⬜ Todo, không over-claim
- **Commit tách theo task**: mỗi nhóm 1 commit có message rõ task ID

### Test coverage
- 54/54 backend pass, 25/25 frontend pass, 0 lint error

### Tasks liên quan
- P0-T7 ✅, P0-T8 ✅, P1-T1 ✅, P1-T2 ✅ (P1-T3 vẫn Todo)

## [2026-06-27] Session 8 — Column type detection (P1-T3)

### Yêu cầu
- Phân loại cột: date / number / string / category (rule-based)

### Công việc đã làm
- `ColumnTypeService` trong parser module: `detect(values)` → ColumnType
- Tích hợp vào `datasets.service.parseDataset` — mỗi column có thêm `type`
- ParserModule export ColumnTypeService

### Quyết định quan trọng
- **Ngưỡng khớp 80%**: cột được coi là 1 kiểu nếu ≥80% giá trị non-empty khớp — chịu được vài ô lỗi/N/A
- **Thứ tự ưu tiên**: number → date → category → string (number check chặt nhất trước)
- **number bỏ dấu phẩy nghìn**: "1,000" → hợp lệ
- **category vs string**: category nếu distinct ≤20 và ≤50% tổng số dòng
- **date regex**: bắt cả ISO datetime ("...T00:00:00.000Z") vì parser trả Date cells dạng toISOString()

### Test coverage
- 11 test mới cho ColumnTypeService (number/date/category/string + edge cases)
- 65/65 backend pass

### Tasks liên quan
- P1-T3 ✅

<!-- Thêm session mới ở đây -->
