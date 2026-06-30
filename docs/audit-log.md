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

## [2026-06-27] Session 9 — Column overview screen (P1-T4)

### Yêu cầu
- Màn FE hiện 3 nhóm cột, preview 3 dòng đầu, auto pre-select cột date đầu + number đầu

### Công việc đã làm
- `ColumnOverviewPage` (route `/datasets/:id/columns`, protected): 3 nhóm cột, toggle chọn, preview table, nút Tiếp tục
- `lib/columnGrouping.ts`: helper thuần `groupColumns` + `autoSelectColumns`
- `api/datasets.ts`: `fetchColumns` + types `DatasetOverview`, `DatasetColumn`
- Route mới trong App.tsx

### Quyết định quan trọng
- **Gộp 4 type backend → 3 nhóm UI**: category + string → "Phân loại" (user không cần phân biệt 2 loại này)
- **Tách logic ra helper thuần**: groupColumns/autoSelectColumns test riêng, component gọn hơn
- **Fallback auto-select**: không có date thì lấy cột label đầu làm trục + number đầu
- **Nút Tiếp tục truyền selectedColumns qua router state** → sẵn cho P1-T6 (chart suggestion)

### Test coverage
- 12 test mới: 6 helper (group/auto-select + edge cases) + 6 page (render, auto-select, toggle, preview, loading)
- 37/37 frontend pass

### Tasks liên quan
- P1-T4 ✅

## [2026-06-27] Session 10 — Rule-based chart suggester (P1-T5)

### Yêu cầu
- Backend nhận cột đã chọn → trả danh sách chart types hợp lệ + mô tả tiếng Việt

### Công việc đã làm
- `ChartSuggesterService` (suggester module): rule-based theo tổ hợp kiểu cột
- DTO `SuggestChartsDto` (columns: number[], validate)
- `datasets.service.suggestCharts`: parse dataset → map index→type → gọi suggester
- Endpoint `POST /datasets/:id/suggest`
- SuggesterModule wired vào DatasetsModule

### Quyết định quan trọng
- **Rules**: date+number→line/bar; category+number→bar(+pie nếu 1 số liệu); number+number→scatter
- **pie chỉ khi 1 số liệu**: pie nhiều series không có nghĩa
- **Tối đa 4 gợi ý** (MAX_SUGGESTIONS), khớp giới hạn UI P1-T6
- **suggestCharts reuse parseDataset**: không lặp logic đọc file + detect type
- **Encoding {x, y[]}**: chuẩn bị sẵn cho ECharts render (P1-T7)

### Test coverage
- 11 test mới: 8 suggester (mỗi tổ hợp + edge + cap 4 + tiếng Việt) + 2 suggestCharts + 1 update
- 76/76 backend pass

### Tasks liên quan
- P1-T5 ✅

## [2026-06-27] Session 11 — Chart suggestion screen (P1-T6)

### Yêu cầu
- FE render 4 thumbnail bằng data thật + mô tả tiếng Việt cho mỗi gợi ý

### Công việc đã làm
- Cài `echarts` (echarts-for-react đã có sẵn)
- `lib/buildChartOption.ts`: dựng ECharts option cho line/bar/pie/scatter — thuần
- `components/ChartView.tsx`: wrapper echarts-for-react (SVG renderer), dùng chung cho P1-T7
- `ChartSuggestionPage` (route `/datasets/:id/charts`): fetch suggest + preview, render cards
- `api/datasets.ts`: `suggestCharts` + types ChartSuggestion/SuggestResponse
- eslintrc frontend: override cho phép `any` trong test files

### Quyết định quan trọng
- **Thumbnail dùng previewRows (data thật)**: không placeholder, đúng yêu cầu plan
- **buildChartOption tách thuần**: test không cần DOM/canvas; ChartView mock được trong page test
- **SVG renderer**: nhẹ, không cần canvas — thân thiện test môi trường happy-dom
- **Redirect khi thiếu state**: vào thẳng `/charts` (reload) mà không có selectedColumns → về `/columns`
- **ChartView tái dùng cho P1-T7**: full render chỉ cần truyền data đầy đủ thay previewRows

### Test coverage
- 11 test mới: 6 buildChartOption (4 loại chart + coerce số + dấu phẩy) + 5 page (redirect, render cards, thumbnail, gọi API, empty)
- 48/48 frontend pass

### Tasks liên quan
- P1-T6 ✅

## [2026-06-27] Session 12 — Full chart rendering (P1-T7)

### Yêu cầu
- Khi user click "Chọn biểu đồ này" → render full chart với toàn bộ data (không chỉ 3 previewRows)

### Công việc đã làm
- Backend: `DatasetsService.getRows()` + `GET /datasets/:id/rows` — trả toàn bộ rows dưới dạng Record[]
- Frontend: `ChartDetailPage` mới tại `/datasets/:id/chart`:
  - Nhận `suggestion` + `selectedColumns` từ router state
  - Gọi `fetchRows` → build ECharts option từ all rows → render full chart (480px)
  - Back button → `/charts` kèm selectedColumns để không mất selection
- Update `SuggestionCard` — nút "Chọn biểu đồ này" navigate tới ChartDetailPage
- Fix pre-existing test race condition: `ColumnOverviewPage` auto-select test cần `waitFor`
  (`findByRole` chờ element hiện, nhưng `useEffect` set selection chạy sau → cần waitFor thêm lần nữa)

### Quyết định quan trọng
- **Endpoint riêng `/rows`** thay vì sửa `/columns` — giữ previewRows nhỏ (10 dòng) cho column overview page, `/rows` trả all khi user đã quyết định
- **Router state** truyền suggestion (không dùng URL param) — suggestion là transient state, không cần bookmark-able
- **buildChartOption reuse** — cùng 1 function cho thumbnail (previewRows) và full render (allRows), chỉ khác data

### Test coverage
- 3 backend tests mới: getRows NotFoundException, all rows returned, controller delegation
- 7 frontend tests mới: redirect, spinner, title, ChartView, row count, back button, error
- Fix 1 test: ColumnOverviewPage auto-select cần `waitFor`
- 83 backend + 58 frontend = 141 tests pass

### Kết quả
- Commit `d25e880` push lên https://github.com/GohanVu/excel-visualize

### Tasks liên quan
- P1-T7 ✅

## [2026-06-27] Session 13 — Lưu chart vào DB (P1-T8)

### Yêu cầu
- Khi user click "Lưu vào dashboard" → tạo Dashboard (nếu chưa có) + Chart record trong DB

### Công việc đã làm
- Backend: `ChartsModule` mới (`charts.service.ts`, `charts.controller.ts`, `dto/save-chart.dto.ts`)
  - `POST /charts`: verify dataset ownership → tìm/tạo default dashboard → tạo Chart record với config JSONB
  - Cast `dto.config as Prisma.InputJsonValue` để giải quyết TS type mismatch với Prisma Json field
- Frontend: nút "Lưu vào dashboard" trong `ChartDetailPage`
  - Loading → "Đã lưu!" → navigate `/dashboard` sau 1.2s
  - Error message khi save fail
  - `api/charts.ts`: `saveChart()` function mới

### Quyết định quan trọng
- **Auto-create default dashboard**: lần đầu user lưu chart → tạo dashboard "Dashboard của tôi", lần sau reuse — không bắt user tạo dashboard thủ công ở phase này (P2 sẽ thêm tính năng tạo nhiều dashboard)
- **config lưu JSONB**: toàn bộ ECharts option object lưu nguyên vào `config` field — flexible, không cần migration khi đổi chart type
- **Prisma.InputJsonValue cast**: Prisma `Json` field type không nhận `Record<string, unknown>` trực tiếp, cần cast

### Test coverage
- 6 backend tests: NotFoundException, tạo dashboard mới, reuse dashboard, đúng fields, trả chart+dashboardId, controller delegation
- 4 frontend tests: gọi đúng args, feedback "Đã lưu!", navigate /dashboard, error message
- Fix: `vi.useFakeTimers()` không tương thích với `userEvent` → dùng real timers + `waitFor` timeout 2500ms
- 89 backend + 62 frontend = 151 tests pass

### Kết quả
- Commit `6f42276` push lên https://github.com/GohanVu/excel-visualize

### Tasks liên quan
- P1-T8 ✅

## [2026-06-28] Session 14 — Load dashboard từ DB (P1-T9) — Phase 1 hoàn thành

### Yêu cầu
- User quay lại `/dashboard` vẫn thấy các chart đã lưu trước đó

### Công việc đã làm
- Backend: `ChartsService.listCharts()` + `GET /charts`
  - Query qua quan hệ `dashboard.userId`, order `createdAt asc`
  - `select` chỉ field cần (id, type, title, config, createdAt)
- Frontend: viết lại `DashboardPage`
  - `useQuery(listCharts)` → render grid `ChartView` từ config JSONB
  - Empty state (welcome + Upload) khi chưa có chart
  - Khi có chart: header "Biểu đồ của bạn" + count + nút "Thêm biểu đồ"
  - `api/charts.ts`: `listCharts()` + type `DashboardChart`

### Quyết định quan trọng
- **config JSONB render thẳng**: chart đã lưu nguyên ECharts option → không cần fetch lại dataset rows, render `ChartView` trực tiếp từ config — nhanh, ít round-trip
- **Query qua `dashboard.userId`** thay vì lấy dashboardId riêng: ở phase này 1 user = 1 dashboard mặc định, query nested relation gọn hơn
- **React Query staleTime mặc định (0)**: navigate từ ChartDetailPage về /dashboard sẽ refetch → chart mới lưu hiện ngay

### Test coverage
- 3 backend tests: list charts của user, empty array, controller delegation
- 4 frontend tests: empty state, render saved charts, chart count, navigate "Thêm biểu đồ"
- 92 backend + 66 frontend = 158 tests pass

### Kết quả
- Commit `fcf4f25` push lên https://github.com/GohanVu/excel-visualize
- **Phase 1 (Core Data Flow MVP) HOÀN THÀNH**: upload → parse → detect type → suggest → render → lưu → load lại end-to-end

### Tasks liên quan
- P1-T9 ✅ → Phase 1 done (P1-T1 đến P1-T9 tất cả ✅)

## [2026-06-28] Session 15 — Chẩn đoán file HSK + lập mini-phase Parsing Robustness & Aggregation

### Yêu cầu
- User upload file thật "0. Từ vựng HSK" (501 dòng, 14 cột) → UI hiển thị rác, không hiểu được file có gì
- Hỏi: làm sao app đọc hiểu tốt hơn với file toàn chữ

### Chẩn đoán (từ 2 screenshot: app UI + Excel gốc)
**Bug thật:**
1. Dòng 1 là banner gộp ô "TONG HOP TU VUNG HSK 1" bị hiểu nhầm là header (parser lấy cứng raw[0]) → lệch toàn bộ cột
2. Cột "Thời gian / Ngày bắt đầu" là date GIẢ — `column-type.detect` tính ratio chỉ trên ô non-empty, cột gần rỗng + vài ô lọt regex → vượt ngưỡng 80%. Thiếu guard độ lấp đầy
3. Cột rỗng (K/L/M chứa ảnh nét chữ) vẫn hiện trên UI
4. Ô gộp dọc (STT nhảy 3,5,8...) → SheetJS trả rỗng ở ô dưới → sample lệch

**Bản chất dữ liệu:** bảng tra cứu từ vựng — text duy nhất, không có số liệu đo lường. Cột số duy nhất (STT) vô nghĩa khi vẽ. Suggester hiện KHÔNG gợi ý gì khi chỉ có category (cần cột number làm y) → ra "chưa có gợi ý".

### Quyết định quan trọng
- **Đi hướng A+B** (user chốt): A = parsing robustness (bug thật, ảnh hưởng mọi file Excel VN có banner/merge), B = aggregation charts (đếm số dòng theo category) để dữ liệu toàn chữ vẫn vẽ được
- **Tạo Phase 1.5** giữa Phase 1 và Phase 2 — 7 task (A: T1-T4, B: T5-T7)
- **Aggregation qua field `aggregation: 'count'`** trên ChartSuggestion, encoding y rỗng; buildChartOption (FE) thực hiện group-by + đếm — giữ kiến trúc hiện tại (suggester rule-based, FE shape data)
- **Target aggregation là cột `category`** (Từ loại, Nhóm), KHÔNG phải string nhiều distinct (Chữ Hán unique → 500 cột vô nghĩa)

### Brainstorm bổ sung — Hybrid auto + manual (50/50)
User đề xuất: dò header / xác định cột nên kết hợp auto + chút thủ công cho chính xác. Tinh chỉnh thành:
- **"50/50" = chia vai, không chia đều công sức**: auto chạy 100% như bản nháp; manual là sửa-khi-cần (corrective), KHÔNG phải wizard setup bắt buộc — giữ wow < 30s
- **Áp manual vào cấu trúc dữ liệu** (header, kiểu cột — user hiểu data của họ); **giữ AUTO cho chọn chart** (user không rành bar/line/pie). Đừng đảo ngược
- **Confidence-gated**: control chỉ nổi khi auto không chắc → file sạch im lặng hoàn toàn, file rác mới hiện chip đổi kiểu + nút đổi header
- **Scope v1 (user chốt)**: chỉ sửa header row + kiểu cột. Thêm/bỏ/đổi tên cột → để tính năng Pro sau (persist qua `DatasetColumn` đang bỏ trống)
- **Override mức gọn**: truyền type override trong request `/suggest`, chưa đụng DB

### Kết quả
- Plan cập nhật: Phase 1.5 nắn lại thành 9 task, 3 nhóm (A auto-parse+confidence, B assisted-correction gated, C aggregation) + mục "tính năng Pro tương lai"
- Chưa code — phiên sau bắt đầu P1.5-T1 (header detection + confidence)

### Tasks liên quan
- Phase 1.5 (mới) — P1.5-T1 đến P1.5-T9

## [2026-06-28] Session 16 — Header detection + confidence (P1.5-T1)

### Yêu cầu
- Bắt đầu Phase 1.5: dò dòng header thật, bỏ qua banner gộp ô; trả confidence để FE biết khi nào nhắc user

### Công việc đã làm
- `parser.service.ts`:
  - `detectHeaderRow()`: quét tối đa 10 dòng đầu, header = dòng đầu tiên có ≥2 ô non-empty → banner/title gộp ô (1 ô) bị bỏ
  - `parse()` trả thêm `headerRowIndex` + `headerConfident`
  - `parse()` nhận optional `headerRow` (clamp range) để re-parse khi user override
- `datasets.service.parseDataset`: expose `headerRowIndex` + `headerConfident` trong overview

### Quyết định quan trọng
- **confident = (headerRowIndex === 0)**: nếu phải bỏ qua dòng nào để tìm header → không chắc → FE sẽ hiện control cho user xác nhận. File header sạch ở dòng đầu → im lặng. Đúng triết lý confidence-gated
- **Ngưỡng ≥2 ô non-empty**: banner gộp ô chỉ có 1 ô giá trị, header thật nhiều ô → tách được. File 1 cột rơi vào fallback dùng dòng đầu (confident)
- **headerRow override → confident=true tuyệt đối**: user đã quyết thì tin, không tự đoán lại
- **headerRowIndex theo mảng đã đọc** (sau blankrows:false), ổn định để re-parse vì options đồng nhất

### Test coverage
- 4 parser tests mới: skip banner (index 1, confident false), header dòng 0 (confident true), override ghi đè auto, clamp out-of-range
- Cập nhật mock + assertion trong datasets.service.spec
- 96 backend tests pass

### Kết quả
- Commit `157fc15` push lên https://github.com/GohanVu/excel-visualize

### Tasks liên quan
- P1.5-T1 ✅ → tiếp theo P1.5-T3 (min fill-ratio guard + confidence mỗi cột)

## [2026-06-28] Session 17 — Fill-ratio guard + confidence mỗi cột (P1.5-T3)

### Yêu cầu
- Sửa bug "date/number giả" (cột "Ngày bắt đầu" trong file HSK) + trả confidence mỗi cột

### Công việc đã làm
- `column-type.service.ts`:
  - `MIN_FILL_RATIO = 0.3`: cột phải có ≥30% ô (trên TỔNG dòng) có dữ liệu mới được gán number/date
  - `detect()` đổi return từ `ColumnType` → `ColumnDetection { type, confidence }`
  - Công thức confidence: number/date = match ratio; category = 1 − distinctRatio; string = 1 − max(number,date) ratio
- `datasets.service.parseDataset`: mỗi column expose thêm `confidence`

### Quyết định quan trọng
- **Guard trên TỔNG dòng, không phải nonEmpty**: bug cũ tính ratio chỉ trên ô non-empty → cột 2/500 ô vẫn 100% khớp. Giờ fillRatio = nonEmpty/total chặn cột thưa
- **Guard chỉ áp cho number/date, KHÔNG cho category**: category sparse vẫn hợp lệ (vd cột nhãn thưa)
- **string confidence = 1 − max ratio**: cột 60% số (chưa đủ 80%) → string confidence 0.4 → thấp → FE sẽ hỏi user. Đây là tín hiệu "mơ hồ, cần xác nhận" đúng tinh thần confidence-gated
- **detect() đổi return shape**: cập nhật caller (parseDataset) + toàn bộ test cũ sang `.type`

### Test coverage
- 6 tests mới: sparse không thành date, sparse không thành number, đủ fill (≥30%) vẫn date, confidence cao cho number sạch, confidence thấp cho cột mơ hồ, confidence cao cho category rõ
- Cập nhật ~10 test cũ sang `.type`
- 102 backend tests pass

### Kết quả
- Commit `6aadcf6` push lên https://github.com/GohanVu/excel-visualize

### Tasks liên quan
- P1.5-T3 ✅ → tiếp theo P1.5-T2 (loại cột rỗng khỏi overview)

## [2026-06-28] Session 18 — Loại cột rỗng + tên fallback (P1.5-T2)

### Yêu cầu
- Bỏ cột rỗng hoàn toàn (cột ảnh K/L/M, cột tách trống `, ,`) khỏi overview

### Công việc đã làm
- `datasets.service.parseDataset`:
  - Filter bỏ cột mọi giá trị đều rỗng — không đưa lên UI
  - **Giữ nguyên `index` gốc** trên cột còn lại → `/suggest` map đúng cột
  - Header trống → tên hiển thị `Cột N` (fallback)
  - `previewRows` build từ cột đã giữ, key theo tên hiển thị (không còn cột rỗng + không trùng key)

### Quyết định quan trọng
- **Chỉ bỏ cột 0% dữ liệu**, không bỏ cột thưa có data → bảo toàn cột nhãn ít giá trị
- **Index gốc bất biến**: FE chọn cột theo `index` (không phải vị trí mảng), nên giữ index gốc để selection + /suggest không lệch sau khi filter
- **displayNames tính 1 lần, dùng chung columns + previewRows**: tránh key rỗng trùng nhau (2 cột header '' → Object.fromEntries nuốt mất 1) — đây là lý do phải đặt tên fallback trước khi build preview

### Test coverage
- 2 tests mới: drop cột rỗng nhưng giữ index gốc + preview sạch, fallback name "Cột 2" cho header trống
- 104 backend tests pass

### Kết quả
- Commit `c578bee` push lên https://github.com/GohanVu/excel-visualize
- **Nhóm A (parsing robustness) xong phần lõi**: T1 header + T3 fill-guard + T2 drop-empty. T4 (merged cells) để defer.

### Tasks liên quan
- P1.5-T2 ✅ → tiếp theo Nhóm B: P1.5-T5 (UI sửa header/kiểu cột, confidence-gated)

## [2026-06-28] Session 19 — Brainstorm multi-tab + dataset quota

### Yêu cầu
- User: file có nhiều tab → cho chọn qua lại; mỗi "sheet" là 1 phần riêng; free 2 sheet, đầy thì xoá cũ; pro 5-10; lưu theo tài khoản

### Phân tích — tách 2 khái niệm bị gộp
- **"tab"** = worksheet trong 1 file (HSK 1, 214 bộ thủ) → sub-navigation
- **"sheet"** = 1 file upload = `Dataset` → đơn vị quota
- → Chốt: **quota đếm theo FILE (Dataset)**, tab là điều hướng con miễn phí. File 2 tab vẫn = 1 sheet

### Gap phát hiện
- Parser chỉ đọc `SheetNames[0]` → tab "214 bộ thủ" đang **bị bỏ hoàn toàn** (mất data)
- Quota chưa enforce (presign chỉ check dung lượng, chưa đếm số dataset)
- "Lưu theo tài khoản" phần lớn ĐÃ CÓ (`Dataset.userId` + MinIO)

### Quyết định quan trọng
- **Đầy quota → CHẶN + user tự chọn xoá** (user chốt), KHÔNG tự xoá FIFO. Lý do: tránh mất data, vướng `Chart.datasetId onDelete: Restrict` (file có chart không xoá được tự động), và MinIO chưa có hàm xoá object
- **Thứ tự (Claude tự sắp, user uỷ quyền)**:
  - Multi-tab làm trước trong Phase 1.5 (đụng lại `parse()` — context nóng; đang mất data thật; đổi contract /columns mà T5 sẽ build lên → tránh rework UI 2 lần)
  - Gộp tab-switcher vào T5 (cùng sửa ColumnOverviewPage 1 lần)
  - Quota/quản lý file tách Phase 1.7 riêng (tầng freemium, độc lập, làm sau khi luồng lõi xong)
- **1 file = 1 Dataset, nhiều tab bên trong**; tab truy cập qua `?sheet=`, lưu `activeSheet`

### Kết quả
- Plan: thêm Nhóm D (P1.5-T10 multi-tab backend) vào Phase 1.5; cập nhật T5 (thêm tab switcher); thêm Phase 1.7 (4 task quota + quản lý file)
- Chưa code — phiên sau bắt đầu P1.5-T10

### Tasks liên quan
- P1.5-T10 (mới), Phase 1.7 T1-T4 (mới)

## [2026-06-28] Session 20 — Đọc nhiều tab / multi-sheet (P1.5-T10)

### Yêu cầu
- File Excel có nhiều tab (HSK 1, 214 bộ thủ) — parser chỉ đọc tab đầu → mất data tab 2

### Công việc đã làm
- `parser.service.ts`:
  - `parse()` đổi signature: `(buffer, mime, opts: { sheetName?, headerRow? })` — gom param thay vì positional
  - Trả thêm `sheets[]` (mọi tab) + `sheetName` (tab đang đọc)
  - Tách `readWorkbook()` + `resolveSheet()` (ưu tiên tab yêu cầu nếu tồn tại, fallback tab đầu)
- `datasets.service`: `parseDataset/getRows/suggestCharts` nhận `sheetName`; overview expose `sheets` + `activeSheet`; `getRows` key theo displayName cho khớp encoding
- Controller: `/columns` & `/rows` nhận `?sheet=`; `/suggest` nhận `sheet` trong body; `SuggestChartsDto` thêm `sheet` optional
- `docs/api.md`: bổ sung /columns, /rows, /suggest (param sheet) + /charts (vốn đang thiếu trong doc)

### Quyết định quan trọng
- **KHÔNG làm `GET /datasets/:id/sheets` riêng** (dù plan ghi vậy): `parse()` đã trả `sheets[]` nên gộp luôn vào response `/columns` — 1 round-trip, không đọc workbook 2 lần. FE lấy danh sách tab từ chính overview
- **`parse()` dùng options object**: chuẩn bị mở rộng (sheetName + headerRow + sau này thêm), tránh positional param khó đọc. Cập nhật test cũ `parse(buf, mime, 1)` → `{ headerRow: 1 }`
- **`/suggest` cần `sheet`**: column index là per-tab, suggest phải parse đúng tab user đang xem → thêm vào DTO
- **`activeSheet` persist DEFER**: stateless (FE truyền `?sheet=` mỗi request) đủ cho MVP, tránh migration. Persist để chung với lưu column-selection sau
- **1 file = 1 Dataset**, tab là sub-navigation — không đụng quota

### Test coverage
- 6 tests mới: list tab, đọc tab mặc định, đọc theo tên, fallback khi tab không tồn tại, service truyền sheetName + trả sheets/activeSheet, controller default sheet=undefined
- 110 backend tests pass

### Kết quả
- Commit `4db5165` push lên https://github.com/GohanVu/excel-visualize

### Tasks liên quan
- P1.5-T10 ✅ → tiếp theo P1.5-T5 (FE: ColumnOverviewPage — tab switcher + correction UI gated)

## [2026-06-28] Session 21 — Brainstorm Learning Mode (flashcard + quiz)

### Yêu cầu
- User nhận ra file HSK (toàn chữ, không số) không visualize được, nhưng hợp để tạo flashcard/quiz giúp học

### Phân tích & quyết định
- **Reframe quan trọng**: KHÔNG coi là sản phẩm thứ 2. Vẫn 1 sản phẩm "Excel → thứ hữu ích", **output thích nghi theo data**: số→chart, chữ→học. Là tổng quát hoá nguyên tắc "đừng hỏi user, app suggest" — giờ suggest cả KIỂU output
- **Rẻ hơn tưởng**: hạ tầng parse + column-selection + /rows đã có; flashcard MVP thuần client, tái dùng ColumnOverviewPage
- **Rủi ro cảnh báo**: focus (đừng bỏ dở luồng đang làm); learning PHỤ THUỘC parsing đang hoàn thiện → làm sau Phase 1.5. Tên "ChartLy" có thể phải đổi nếu learning thành trụ cột — defer
- **Thị trường**: HSK/TOEIC/vocab qua Excel rất phổ biến ở VN — tiềm năng lớn, ứng viên Pro tốt

### Quyết định (user)
- v1 scope: **cả flashcard + quiz + theo dõi tiến độ** (cần schema + migration)
- Thứ tự: user uỷ quyền Claude tự sắp "miễn là phải làm"

### Quyết định sắp xếp (Claude, có lý do)
- **Learning Mode = Phase 1.6**, thực thi: Phase 1.5 → 1.6 (Learning) → 1.7 (quota)
- Learning ĐẶT TRÊN quota: là tính năng user muốn + cứu bế tắc file chữ; quota là cổng chặn vô hình, chưa launch nên chưa gấp
- Vẫn xong 1.5 trước: tab switcher (T5) phục vụ cả học (chọn tab); không phí
- Phase number khớp thứ tự (1.6 < 1.7)

### Cấu trúc Phase 1.6 (7 task)
- A: T1 output routing (phát hiện data hợp học → đề xuất Học song song chart)
- B: T2 flashcard (chọn front/back + lật/shuffle), T3 đánh dấu thuộc/chưa
- C: T4 quiz trắc nghiệm (đáp án + 3 distractor)
- D: T5 schema StudyProgress + migration, T6 API progress, T7 wire + verify HSK

### Kết quả
- Plan: thêm Phase 1.6 đầy đủ giữa 1.5 và 1.7
- Chưa code — luồng hiện tại vẫn là P1.5-T5 (tiếp tục Phase 1.5)

### Tasks liên quan
- Phase 1.6 (mới) T1-T7

## [2026-06-28] Session 22 — Tab switcher + sửa header (P1.5-T5)

### Yêu cầu
- FE: thanh đổi tab (multi-sheet) + cho user sửa dòng header khi auto không chắc (confidence-gated)

### Công việc đã làm
- Backend: `/columns` nhận `?headerRow=` (parseInt + clamp); `parseDataset` nhận `headerRow`
- FE `api/datasets.ts`: `DatasetOverview` thêm sheets/activeSheet/headerRowIndex/headerConfident + `column.confidence`; `fetchColumns(id, { sheet?, headerRow? })` (axios params)
- `ColumnOverviewPage`:
  - `SheetTabs`: hiện khi >1 tab, đổi tab → refetch `?sheet=`, reset header override
  - `HeaderControl`: CHỈ hiện khi `!headerConfident` (hoặc đã chỉnh) — nudge ▲▼ dòng header → refetch `?headerRow=`, preview cập nhật live (chính nó là feedback)
  - "Tiếp tục" truyền `sheet` + `headerRow` qua router state cho T6
- `api.md`: thêm `?headerRow`

### Quyết định quan trọng
- **Regroup T5/T6**: T5 = tab + header (functional e2e); chip đổi KIỂU cột dời sang T6 (cùng phần API /suggest override) → mỗi task ship trọn vẹn, tránh UI "đổi mà không tác dụng"
- **Header override = nudge ▲▼ thay vì picker**: không cần lộ raw rows; preview table + tên cột cập nhật live khi nudge = feedback trực quan, MVP gọn
- **showHeaderControl = !headerConfident || headerRow != null**: file sạch im lặng; đã chỉnh thì giữ control để chỉnh tiếp (vì backend trả confident=true sau override)
- **Chưa thread sheet/headerRow vào ChartSuggestionPage/Detail** (chỉ truyền qua state): để T6 — chấp nhận tạm: đổi tab rồi vẽ chart vẫn dùng tab mặc định cho tới T6

### Test coverage
- 6 FE tests mới: tab show/hide/click-refetch, header gated hide/show/nudge-refetch
- 1 BE test: parse headerRow query thành number
- 111 backend + 72 frontend = 183 tests pass

### Kết quả
- Commit `829e316` push lên https://github.com/GohanVu/excel-visualize

### Tasks liên quan
- P1.5-T5 ✅ → tiếp theo P1.5-T6 (chip đổi kiểu cột + /suggest type override + thread sheet vào chart pages)

## [2026-06-28] Session 23 — Sửa kiểu cột + thread sheet/header vào chart (P1.5-T6)

### Yêu cầu
- User sửa kiểu cột (gated) → gợi ý chart dùng kiểu mới; đổi tab/header → chart dùng đúng view

### Công việc đã làm
- Backend:
  - `SuggestChartsDto`: thêm `headerRow` + `typeOverrides: [{index, type}]` (nested `@ValidateNested` + `@Type`, dựa `transform:true`)
  - `suggestCharts(opts)`: áp `typeOverrides` (Map index→type) trước khi gọi suggester; nhận `sheetName`+`headerRow` → parseDataset đúng view
- FE api: `suggestCharts(id, cols, { sheet, headerRow, typeOverrides })`; `fetchRows(id, sheet?)`
- `ColumnOverviewPage`: `TypeReview` panel — CHỈ hiện cột `confidence < 0.8`, dropdown đổi kiểu; `effectiveColumns` áp override → re-group live; reset override khi đổi tab/header; "Tiếp tục" truyền `typeOverrides`
- `ChartSuggestionPage`: đọc sheet/headerRow/typeOverrides từ state → fetchColumns + suggestCharts; truyền `sheet` sang ChartDetailPage
- `ChartDetailPage`: `fetchRows` theo `sheet` → chart full dùng đúng tab
- `api.md`: /suggest body thêm headerRow + typeOverrides

### Quyết định quan trọng
- **TypeReview panel thay vì chip inline editable**: chip hiện là `<button>` toggle chọn cột — nhét `<select>` vào trong gây nested-interactive + xung đột click. Panel riêng (gated theo confidence<0.8) sạch hơn, không refactor chip
- **effectiveColumns = columns áp override**: group + suggest đều dùng kiểu đã sửa → đổi kiểu thì cột tự nhảy nhóm đúng (feedback trực quan)
- **Reset typeOverrides khi đổi tab/header**: index cột là per-view, override cũ vô nghĩa khi view đổi
- **opts object cho suggestCharts**: param phình (sheet+headerRow+overrides) → gom vào opts, test cũ `(…, [0,1])` vẫn chạy
- **Hoàn tất thread multi-tab → chart**: ChartSuggestion + ChartDetail giờ nhận sheet → đổi tab rồi vẽ chart không còn lệch (khắc phục caveat ghi ở T5)

### Test coverage
- 2 BE tests: override áp dụng (date→category đổi gợi ý), truyền sheet+headerRow vào parseDataset
- 3 FE tests: type selector chỉ hiện cột low-confidence, panel ẩn khi tự tin, đổi kiểu có hiệu lực; + forward sheet/overrides ở ChartSuggestionPage; sửa assertion suggestCharts cũ
- 113 backend + 76 frontend = 189 tests pass

### Kết quả
- Commit `c4f5a67` push lên https://github.com/GohanVu/excel-visualize
- **Nhóm B (assisted correction) xong**: T5 (tab+header) + T6 (kiểu cột + thread). Tiếp theo Nhóm C aggregation (T7).

### Tasks liên quan
- P1.5-T6 ✅ → tiếp theo P1.5-T7 (suggester: rule đếm theo category + field aggregation)

## [2026-06-28] Session 24 — Aggregation charts: đếm theo category (P1.5-T7+T8)

### Yêu cầu
- Biến data toàn chữ (không có cột số) thành chart vẽ được bằng cách ĐẾM số dòng theo nhóm

### Công việc đã làm
- Suggester (T7): rule mới — `numbers.length===0 && categories.length>=1` → "Số lượng theo X" (bar) + "Tỷ trọng theo X" (pie); field `aggregation:'count'`, `encoding.y=[]`
- buildChartOption (T8): nhánh `aggregation==='count'` — `countBy()` group rows theo x; bar = trục x distinct + counts; pie = `{name,value}`; ô trống → "(trống)"
- `ChartSuggestion` type (BE interface + FE) thêm `aggregation?: 'count'`

### Quyết định quan trọng
- **Làm gộp T7+T8 một commit**: emit count (BE) mà FE chưa render thì thumbnail trống → dính chặt, gộp để main luôn chạy
- **Chỉ đếm theo `category`, KHÔNG `string`**: string nhiều distinct (Chữ Hán unique) → 500 nhóm vô nghĩa. Nếu cột bị detect nhầm string, user sửa qua TypeReview (T6) → category → count hiện ra (synergy với T6)
- **Count chỉ khi không có cột số**: tránh chclutter case numeric (đã có bar/pie theo số). Đếm là "cứu cánh" cho data toàn chữ
- **Thumbnail đếm trên previewRows (10 dòng), chart full đếm trên all rows** — nhất quán pattern hiện có (thumbnail là preview)

### Test coverage
- 3 BE: count bar+pie cho category-only, không count khi có number, không count string
- 3 FE: count bar (distinct+counts), count pie ({name,value}), ô trống → "(trống)"
- 116 backend + 79 frontend = 195 tests pass

### Kết quả
- Commit `265b9d1` push lên https://github.com/GohanVu/excel-visualize
- **Nhóm C (aggregation) xong**. Còn P1.5-T9 (verify browser — user test) + T4 (merged cells, optional)

### Tasks liên quan
- P1.5-T7 ✅, P1.5-T8 ✅ → P1.5-T9 (user verify trên browser)

## [2026-06-28] Session 25 — Brainstorm aggregation suite (đầy đủ phép gộp)

### Yêu cầu
- User: bảng báo giá có nhiều phép tính (median, percent, mean, total, count). Hiện chỉ có count

### Phân tích
- **Phát hiện lỗi ẩn**: category+number hiện vẽ raw (mỗi dòng 1 cột) → nhóm bị LẶP ("Bò Úc" 5 dòng) hiển thị 5 cột trùng tên, SAI. Aggregation không chỉ là feature mà là sửa đúng đắn
- **Tách 3 trục bị gộp**: GỘP THẾ NÀO (count/sum/avg/median/min/max) · HIỂN THỊ (bar/pie/% toggle) · GỘP CÁI GÌ (cột số)
- **"percent" = hiển thị, không phải phép gộp**: pie "Tỷ trọng" vốn đã là %
- **median khó hiểu với người không chuyên** → để power-user/Pro; sum+average là core
- **Bẫy UX**: mỗi agg × mỗi chart = bùng nổ card → phá "ít quyết định". Giải: 1 default thông minh + switcher trên chart
- **Default thông minh**: heuristic theo tên cột (giá→TB, số lượng→Tổng); AI (Phase 4) làm tốt hơn

### Quyết định
- **Scope (user)**: TẤT CẢ phép gộp + step verify giá trị từ user (= switcher để đổi/xác nhận)
- **Sắp xếp (Claude, user uỷ quyền)**: Phase 1.8 mới, thực thi **1.5 → 1.6 (Learning) → 1.7 (Quota) → 1.8 (Aggregation)**. Learning vẫn next (khác biệt lớn nhất); quota nhỏ dọn trước; aggregation là khối lớn cohesive làm tập trung sau
- **switcher = bước verify**: user thấy default, đổi phép gộp được → vừa power vừa giữ wow-moment

### Cấu trúc Phase 1.8 (5 task)
- T1 generalize aggregation enum + groupAggregate (sửa nhóm-lặp)
- T2 suggester default agg thông minh theo tên cột
- T3 switcher verify/đổi trên ChartDetailPage
- T4 toggle % tổng cho bar
- T5 verify e2e

### Kết quả
- Plan: thêm Phase 1.8 trước Phase 2
- Chưa code — next coding task vẫn là Phase 1.6-T1 (Learning Mode)

### Tasks liên quan
- Phase 1.8 (mới) T1-T5

## [2026-06-28] Session 26 — Learning Mode: output routing (P1.6-T1)

### Yêu cầu
- Bắt đầu Phase 1.6. Phát hiện data hợp để học → đề xuất "Học" song song chart

### Công việc đã làm
- Backend: `parseDataset` trả `learnable` = (số cột string/category ≥ 2) → bảng từ vựng/tra cứu nhận diện được
- FE: `DatasetOverview` thêm `learnable`; `ColumnOverviewPage` hiện nút "🎴 Học với dữ liệu này" (gated) cạnh "Tiếp tục" → navigate `/datasets/:id/learn`
- Route `/datasets/:id/learn` (placeholder inline, T2 build LearnPage thật)
- `api.md`: /columns thêm `learnable`

### Quyết định quan trọng
- **learnable = ≥2 cột chữ**: đủ để ghép mặt trước/sau flashcard. Heuristic đơn giản; offer "Học" là lựa chọn THỨ HAI (không ép) nên sai chút cũng vô hại — chart CTA vẫn còn
- **Lối vào ở ColumnOverviewPage** (không phải ChartSuggestion): đây là nơi user hiểu data + chọn hướng. "Tiếp tục"→chart (xanh), "Học"→learning (tím) — output adapts to data đúng triết lý
- **Placeholder route cho T1**: T1 lo routing/detection/entry; T2 build flashcard thật → tránh tạo file LearnPage rồi viết lại
- **Học không cần selectedColumns**: learning chọn front/back riêng (T2), nên nút Học enabled bất kể chọn cột; chỉ truyền sheet/headerRow

### Test coverage
- 2 BE: learnable true (2 cột chữ), false (numeric)
- 3 FE: nút Học ẩn khi không learnable, hiện khi learnable, navigate /learn
- 118 backend + 82 frontend = 200 tests pass

### Kết quả
- Commit `58582d7` push lên https://github.com/GohanVu/excel-visualize

### Tasks liên quan
- P1.6-T1 ✅ → tiếp theo P1.6-T2 (LearnPage: chọn cột front/back + flashcard lật/shuffle)

## [2026-06-28] Session 27 — Flashcard (P1.6-T2)

### Yêu cầu
- Màn học bằng thẻ: chọn cột mặt trước/sau, lật thẻ, next/prev, shuffle

### Công việc đã làm
- `LearnPage` tại `/datasets/:id/learn`:
  - Fetch columns + rows theo `sheet`/`headerRow` (từ router state khi bấm "Học")
  - Chọn **Mặt trước** (select 1 cột) + **Mặt sau** (toggle nhiều cột)
  - Thẻ: nhấn để lật; ← Trước / Sau → (vòng tròn); đếm i/N; 🔀 Trộn thẻ (Fisher-Yates)
  - Fallback khi data < 2 cột hoặc 0 dòng
- `App.tsx`: route /learn dùng LearnPage thật (thay placeholder T1)

### Quyết định quan trọng
- **Thuần client, tái dùng `/rows`**: không endpoint mới — mỗi dòng = 1 thẻ. Đúng nhận định brainstorm "chi phí biên thấp vì pipeline đã có"
- **Mặt sau nhiều cột** (toggle): flashcard giá trị nhất khi back = phiên âm + nghĩa (Bính âm + Nghĩa), không chỉ 1
- **Không có bước "Bắt đầu" riêng**: đổi front/back cập nhật thẻ live → mượt, ít quyết định
- **Order array + shuffle**: giữ rows gốc, chỉ hoán vị index → shuffle không phá data; đổi front/back/flip reset về mặt trước
- **State sheet/headerRow truyền vào /learn**: học đúng tab + header user đã chọn

### Test coverage
- 7 FE tests: front mặc định + đếm, lật ra sau, next sang thẻ 2, đổi front cập nhật, thêm cột mặt sau, shuffle control, fallback thiếu data
- 89 frontend tests pass (backend không đổi: 118)

### Kết quả
- Commit `7db0e46` push lên https://github.com/GohanVu/excel-visualize

### Tasks liên quan
- P1.6-T2 ✅ → tiếp theo P1.6-T3 (đánh dấu đã thuộc/chưa thuộc mỗi thẻ — local trước)

## [2026-06-28] Session 28 — Fix Issue-008: flashcard/chart trống khi override header

### Yêu cầu
- User: file "Báo giá thịt", trang Học toàn trống trơn

### Chẩn đoán
- Trang cột: 26 dòng, header dòng 5 (user nudge). Trang học: "7 / 27" → **27 ≠ 26** = /rows và /columns đọc header KHÁC dòng
- Root cause: `fetchRows`/`/rows`/`getRows` không nhận `headerRow` → user override header thì /columns đúng nhưng /rows auto-detect lệch → key cột (displayNames) lệch → `row[front]` undefined → rỗng

### Công việc đã làm
- Thread `headerRow` xuyên /rows: `getRows(…, headerRow)`, controller `?headerRow=`, `fetchRows(id, { sheet, headerRow })`
- Cập nhật caller: LearnPage + ChartDetailPage đọc headerRow từ state; ChartSuggestionPage truyền headerRow sang ChartDetail
- Bonus: flashcard default mặt trước/sau ưu tiên cột chữ (string/category), không phải số (STT)
- Ghi Issue-008 + api.md

### Quyết định quan trọng
- **Lesson (ghi Issue-008)**: param ảnh hưởng PARSE (sheet, headerRow) phải thread vào MỌI endpoint đọc cùng dataset. Triệu chứng lệch: tổng số dòng khác nhau giữa các trang
- **fetchRows đổi sang opts object** `{ sheet, headerRow }` — đồng bộ với fetchColumns

### Test coverage
- 3 regression: getRows truyền sheet+headerRow vào parser, controller rows headerRow + default undefined
- 120 backend + 89 frontend = 209 tests pass

### Kết quả
- Commit `f3a8b40` push. Bug đã fix — user hard refresh + thử lại

### Tasks liên quan
- Issue-008 (fix). Sau đó tiếp P1.6-T3 (đánh dấu thuộc/chưa thuộc)

## [2026-06-28] Session 29 — Trang chủ "Sheet của tôi" (P1.7-T1, kéo lên sớm)

### Yêu cầu
- User vẽ mockup: trang chủ hiện các sheet (file) đã load + ô "+" để thêm; đăng nhập lại vẫn thấy

### Quyết định sắp xếp
- **Kéo P1.7-T1 lên trước** (xen vào giữa Learning Mode): lỗ hổng điều hướng nền tảng — trước đây đăng nhập lại KHÔNG mở lại được file đã upload (Dashboard chỉ hiện chart đã lưu). Quick win vì `GET /datasets` + lưu DB theo account đã có sẵn, chỉ thiếu UI

### Công việc đã làm
- Viết lại `DashboardPage`:
  - Section chính "Sheet của tôi": card mỗi dataset (tên + ngày), click → `/datasets/:id/columns` (mở lại); ô "+" → `/upload`
  - Section phụ "Biểu đồ đã lưu" xuống dưới (chỉ hiện nếu có)
  - Bỏ EmptyState cũ — ô "+" tự là empty state
- Dùng `fetchDatasets` (GET /datasets) đã có, không đụng backend

### Quyết định quan trọng
- **Sheet làm trung tâm trang chủ**: dataset là entry point (từ đó vẽ chart / học), nên home ưu tiên list sheet hơn list chart
- **Không đụng backend**: persistence đã xong từ Phase 1 (Dataset.userId). Đúng nhận định lúc brainstorm Session 19 "lưu theo account phần lớn đã có"

### Test coverage
- 8 FE tests: section luôn hiện + nút thêm, list sheet + count, mở sheet → columns, "+" → upload, chart phụ hiện/ẩn
- 90 frontend tests pass (backend 120 không đổi)

### Kết quả
- Commit `94f616a` push. Đăng nhập lại giờ thấy + mở lại được file đã load

### Tasks liên quan
- P1.7-T1 ✅ (kéo sớm) → quay lại Learning Mode P1.6-T3; phần còn lại Phase 1.7 (quota/xoá) sau

## [2026-06-28] Session 30 — Đánh dấu thuộc/chưa + lọc thẻ rỗng (P1.6-T3)

### Yêu cầu
- Đánh dấu "đã thuộc / chưa thuộc" mỗi thẻ + đếm tiến độ; gộp lọc thẻ trống

### Công việc đã làm
- `LearnPage`/FlashcardDeck:
  - Nút "✓ Đã thuộc" / "↻ Chưa thuộc" → đánh dấu + tự sang thẻ kế
  - Tiến độ "Đã thuộc X / Y" (đếm theo deck); thẻ đã thuộc viền xanh
  - `known: Set<number>` theo index gốc của rows → giữ qua shuffle + đổi front
  - **Lọc thẻ rỗng mặt trước**: `deck` = useMemo lọc rows có front non-empty; đổi front → deck đổi → useEffect reset order/pos
  - Guard `total===0` (cột front toàn trống)

### Quyết định quan trọng
- **known key theo index gốc** (không phải vị trí order): shuffle/đổi front không làm mất trạng thái đã thuộc
- **deck phụ thuộc front**: lọc theo cột mặt trước hiện tại; useEffect([deck]) reset thứ tự khi front đổi (known KHÔNG reset — thuộc là về thẻ, không về front)
- **Lọc "front rỗng" thay vì "back rỗng"**: thẻ không có mặt trước là vô dụng; dòng nhóm có front (tên nhóm) vẫn giữ — đơn giản, defensible
- **Local state (chưa DB)**: T5/T6 thêm schema + API để persist

### Test coverage
- 3 FE tests mới: mark known (tiến độ +1 + advance), chưa thuộc (advance không tăng), skip dòng trống mặt trước (3 dòng → 2 thẻ)
- 93 frontend tests pass

### Kết quả
- Commit `fe430dc` push lên https://github.com/GohanVu/excel-visualize

### Tasks liên quan
- P1.6-T3 ✅ → tiếp theo P1.6-T4 (quiz trắc nghiệm)

## [2026-06-28] Session 31 — Quiz trắc nghiệm + chế độ Thẻ/Quiz (P1.6-T4)

### Yêu cầu
- Sinh quiz trắc nghiệm từ data + chấm điểm

### Công việc đã làm
- Refactor `LearnPage`: tách shell (back + `ModeTabs` "🎴 Thẻ / 📝 Quiz"); `FlashcardDeck` thành body fragment (bỏ page-shell riêng)
- `QuizMode` (file mới):
  - Chọn cột **Câu hỏi** + **Đáp án** (single, smart default text col)
  - `buildOptions`: đáp án đúng + tối đa 3 nhiễu (distinct từ dòng khác, != đúng), xáo trộn
  - Chấm điểm "Đúng X / Y"; chọn xong tô xanh đáp án đúng / đỏ nếu sai; "Câu tiếp"
  - deck lọc dòng có cả câu hỏi + đáp án; reset khi đổi cột

### Quyết định quan trọng
- **Chế độ Thẻ/Quiz dùng chung setup pattern nhưng tách component**: QuizMode setup khác (1 cột đáp án thay vì multi-back) → tách file riêng, không nhồi vào FlashcardDeck (tránh vượt 400 dòng + isolation)
- **Refactor shell lên LearnPage**: cả 2 mode share back button + tabs; deck con chỉ render body → DRY, mode switch mượt. Test cũ không query shell nên an toàn
- **options xáo trộn qua useMemo([pos])**: ổn định trong 1 câu, đổi câu mới tính lại — tránh re-shuffle mỗi render
- **Thuần client**: tái dùng /rows, không endpoint mới (như flashcard)

### Test coverage
- 3 FE tests mới: switch sang quiz + hiện options, chấm đúng (+1), chấm sai (0)
- 96 frontend tests pass (backend 120 không đổi)

### Kết quả
- Commit `3d740ce` push lên https://github.com/GohanVu/excel-visualize

### Tasks liên quan
- P1.6-T4 ✅ → tiếp theo P1.6-T5 (schema StudyProgress + migration) — bắt đầu phần persist tiến độ

## [2026-06-28] Session 32 — Schema StudyProgress + migration (P1.6-T5)

### Yêu cầu
- Schema lưu tiến độ học (thuộc/chưa) per user/dataset/sheet/card

### Công việc đã làm
- `schema.prisma`:
  - `enum StudyStatus { new, learning, known }`
  - `model StudyProgress`: userId, datasetId, sheet (default ""), cardKey, status, seenCount, lastReviewedAt + timestamps
  - relations `onDelete: Cascade` từ User + Dataset; `@@unique([userId, datasetId, sheet, cardKey])`
- Migration `20260628140008_add_study_progress` applied + Prisma Client regenerated

### Quyết định quan trọng
- **cardKey = định danh thẻ ổn định qua re-parse** (không dùng rowIndex vì lệch khi đổi header/sheet). FE sẽ tính cardKey = hash giá trị dòng ở T7 — schema chỉ cần String
- **sheet trong unique key**: tiến độ tách theo tab (file 2 tab học riêng)
- **seenCount + status** (không knownCount riêng): status đủ biểu diễn thuộc/chưa; seenCount để dành SRS sau
- **Cascade từ Dataset**: xoá file → xoá tiến độ (khác Chart đang Restrict — tiến độ không cần giữ)
- **T5 schema-only, không unit test**: logic + test ở T6 (API). Verify: migration applied + 120 backend tests vẫn xanh sau regenerate

### Kết quả
- Commit `11edef1` push lên https://github.com/GohanVu/excel-visualize

### Tasks liên quan
- P1.6-T5 ✅ → tiếp theo P1.6-T6 (API lưu/đọc tiến độ — StudyProgress module)

## [2026-06-28] Session 33 — Xoá sheet (P1.7-T3, kéo lên sớm)

### Yêu cầu
- User: 17 sheet trùng (upload thử nhiều lần), chưa có nút xoá

### Quyết định sắp xếp
- **Kéo P1.7-T3 lên** (xen giữa Learning Mode): user đang cần dọn file rác ngay, lại là phần còn thiếu của trang chủ vừa làm (P1.7-T1)

### Công việc đã làm
- Backend:
  - `StorageService.removeObject()` — xoá object MinIO
  - `DatasetsService.deleteDataset()`: verify owner; `$transaction` xoá charts (Chart.datasetId Restrict) + dataset; columns/study_progress tự cascade; `removeObject` best-effort (catch → không chặn)
  - `DELETE /datasets/:id`
- FE: `deleteDataset()`; `DashboardPage` tách `SheetCard` có nút ✕ → **xác nhận 2 bước** (Xoá/Huỷ); `useMutation` + invalidate `['datasets']`
- `api.md`: DELETE endpoint

### Quyết định quan trọng
- **Xoá kèm charts trong transaction**: Chart→Dataset là Restrict (chặn xoá). Chart dựng từ data này, data mất thì chart vô nghĩa → xoá cùng. studyProgress/columns cascade tự động
- **MinIO best-effort**: xoá DB record trước (transaction), removeObject sau với `.catch()` — nếu MinIO lỗi vẫn coi như xoá thành công (tránh record mồ côi)
- **Xác nhận 2 bước inline** thay vì window.confirm: sạch + testable, đúng nguyên tắc confirm trước hành động phá huỷ
- **Quota (T2) chưa làm**: xoá giải quyết file rác hiện tại; quota chặn tích luỹ tương lai — làm sau

### Test coverage
- 4 BE: NotFound, xoá charts+dataset+object đúng, best-effort khi MinIO lỗi, controller delegate
- 2 FE: xoá sau xác nhận 2 bước (waitFor vì mutation async), huỷ không gọi delete
- 124 backend + 98 frontend = 222 tests pass

### Kết quả
- Commit `65ef746` push. User hard refresh → mỗi card có nút ✕ để xoá

### Tasks liên quan
- P1.7-T3 ✅ (kéo sớm) → quay lại Learning Mode P1.6-T6 (API progress). Còn P1.7-T2 (quota) + T4 (UX đầy quota)

## [2026-06-28] Session 34 — Quota số sheet + UX đầy quota (P1.7-T2 + T4)

### Yêu cầu
- Chặn tích luỹ file rác: enforce giới hạn số sheet; user thấy lý do khi bị chặn

### Công việc đã làm
- T2: `presignUpload` đếm dataset của user trước khi cấp URL; Free=2, Pro=20 → chặn với message "Đã đạt giới hạn N sheet (gói ...). Xoá bớt sheet để thêm mới."
- T4: `FileUpload.apiErrorMessage()` lấy `response.data.message` (NestJS) thay vì message axios generic ("Request failed with status code 400") → user thấy đúng lý do quota + cách xử lý

### Quyết định quan trọng
- **Chặn ở presignUpload** (không phải confirmUpload): chặn sớm nhất trước khi upload file lên MinIO, tránh rác
- **Free=2, Pro=20**: khớp brainstorm (Free 2) + Session 19 (Pro 5-10+). Constant, có thể chuyển env sau
- **T4 reactive, không proactive**: hiện message rõ khi bị chặn (đủ "chặn + user tự xoá" của Session 19). Proactive "X/limit" trên Dashboard cần expose limit theo plan → để sau, không cần cho MVP
- **apiErrorMessage dùng chung**: fix chung cho mọi lỗi upload (không chỉ quota) hiện đúng message backend

### Test coverage
- 2 BE: free đầy 2 sheet → chặn, pro vượt free quota vẫn ok
- 1 FE: FileUpload hiện message quota từ response.data.message
- 126 backend + 99 frontend = 225 tests pass

### Kết quả
- Commit `c592107` push
- **Phase 1.7 (Dataset Management & Quota) HOÀN THÀNH**: T1 trang chủ + T2 quota + T3 xoá + T4 UX

### Tasks liên quan
- P1.7-T2 ✅, P1.7-T4 ✅ → Phase 1.7 done. Quay lại Learning Mode P1.6-T6 (API progress)

## [2026-06-28] Session 35 — Fix Issue-009: sheet mới không hiện tới khi F5

### Yêu cầu
- Upload sheet mới → quay lại trang chủ chưa thấy, phải F5

### Chẩn đoán
- QueryClient `staleTime: 30_000` → query `['datasets']` "fresh" 30s sau upload → Dashboard không refetch khi mount → file mới ẩn

### Công việc đã làm
- `UploadPage.handleSuccess`: `queryClient.invalidateQueries({ queryKey: ['datasets'] })` trước navigate
- Test: invalidate + navigate on success
- Ghi Issue-009

### Quyết định quan trọng
- **Lesson**: với `staleTime > 0`, mutation THÊM/XOÁ/SỬA list phải invalidate thủ công query đọc list đó. Delete đã invalidate (DashboardPage), thiếu cho create (UploadPage) — giờ đủ
- **invalidate ở UploadPage** (nguồn tạo dataset) thay vì refetchOnMount toàn cục: chỉ refresh khi thực sự có thay đổi, không phá staleTime cache cho điều hướng thường

### Test coverage
- 1 FE test; 126 backend + 100 frontend = 226 tests pass

### Kết quả
- Commit `60c2b84` push

### Tasks liên quan
- Issue-009 (fix) → tiếp tục Learning Mode P1.6-T6

## [2026-06-28] Session 36 — Forward-fill ô gộp dọc (P1.5-T4)

### Yêu cầu
- Làm tiếp Phase 1.5 — task code còn lại: forward-fill vertical merge

### Công việc đã làm
- `ParserService.fillVerticalMerges(sheet)`: đọc `sheet['!merges']`, với mỗi range gộp DỌC (cùng cột `s.c===e.c`, nhiều dòng `e.r>s.r`) copy ô trên-trái xuống các ô rỗng bên dưới. Gọi trước `sheet_to_json`
- CSV không có `!merges` → no-op tự nhiên

### Quyết định quan trọng
- **CHỈ fill merge DỌC, không fill merge ngang**: banner gộp ô ngang phải giữ đúng 1 ô non-empty để `detectHeaderRow` bỏ qua (nếu fill ngang → banner thành nhiều ô → bị nhận nhầm là header). Đây là lý do tách bạch vertical-only
- **Fill trước sheet_to_json** (mức worksheet, dùng địa chỉ ô tuyệt đối): `blankrows:false` loại dòng trống làm lệch index so với `!merges` (toạ độ tuyệt đối) → phải xử lý trước khi convert
- **Copy nguyên cell object** (`{...topCell}`): giữ type (date cell `t:'d'` với `cellDates:true`) thay vì chỉ copy value

### Test coverage
- 2 BE tests mới: fill merge dọc (cột "Nhóm" gộp A2:A3 → dòng dưới = "Bò Úc" không rỗng); merge ngang (banner A1:C1) KHÔNG fill, header vẫn detect ở dòng 2 (confident=false)
- 128 backend tests pass (126 → +2)

### Kết quả
- Phase 1.5 nhóm A–D code xong. Còn P1.5-T9 (verify e2e browser — user test)

### Tasks liên quan
- P1.5-T4 ✅ → còn P1.5-T9 (verify e2e file HSK trên browser). Sau đó quay lại P1.6-T6 (API progress)

## [2026-06-28] Session 37 — API lưu/đọc tiến độ học (P1.6-T6)

### Yêu cầu
- Task code tiếp: StudyProgress module — POST/GET tiến độ học theo dataset

### Công việc đã làm
- Module mới `src/study-progress/` (service + controller + dto + tests), đăng ký vào `app.module.ts`
- `POST /study-progress`: upsert 1 thẻ theo unique `userId_datasetId_sheet_cardKey`; create → seenCount=1, update → increment; set lastReviewedAt
- `GET /study-progress/:datasetId?sheet=`: trả `{ items: [{cardKey,status,seenCount,lastReviewedAt}] }`
- Owner-guard `assertDatasetOwner` (dataset.findFirst id+userId → 404) cho cả đọc lẫn ghi
- `dto/save-progress.dto.ts`: datasetId, sheet?(default ""), cardKey, status(enum StudyStatus)
- `docs/api.md`: thêm mục Study Progress (POST + GET)

### Quyết định quan trọng
- **Upsert thay vì create/update tách**: 1 thẻ = 1 record (unique 4 field). Idempotent — FE gọi mỗi lần đánh dấu, không sợ trùng
- **sheet default ""** ở cả DTO/service/controller: khớp default schema (Session 32), tiến độ tách theo tab
- **Owner-guard ở service** (không chỉ controller): chặn user ghi/đọc tiến độ dataset người khác — 404 (không lộ tồn tại)
- **seenCount increment ở update**: đếm số lần ôn để dành SRS sau; status đủ biểu diễn thuộc/chưa
- **cardKey do FE tính (T7)**: backend chỉ nhận String — ổn định qua re-parse (đổi header/sheet không lệch như rowIndex)

### Test coverage
- 9 BE tests mới: service (owner 404 cho save+get, upsert đúng compound key + sheet default, sheet override, get trả items + filter, sheet default); controller (delegate save, get có sheet, get default "")
- 137 backend tests pass (128 → +9). `tsc --noEmit` sạch

### Kết quả
- Module hoạt động; chờ FE wire ở T7

### Tasks liên quan
- P1.6-T6 ✅ → tiếp theo P1.6-T7 (wire flashcard+quiz vào API progress; hiện "đã thuộc X/Y"; verify e2e file HSK)

## [2026-06-29] Session — Setup môi trường sau fresh clone (chạy stack lần đầu)

### Yêu cầu
- Người dùng vừa `git clone` về máy mới (Windows), yêu cầu kiểm tra trạng thái và start dự án

### Công việc đã làm
- Kiểm tra toolchain: Node v20.16.0 OK; pnpm/docker ban đầu chưa có. Người dùng tự cài Docker Desktop (WSL2 backend, v29.5.3)
- Tạo `.env` từ `.env.example` với JWT_SECRET/JWT_REFRESH_SECRET random (Google OAuth vẫn placeholder)
- `docker compose up --build -d` → build backend+frontend, pull postgres/redis/minio
- Fix healthcheck MinIO (xem Issue-010) → stack chạy được
- `pnpm db:generate` + `prisma migrate deploy` trong container backend (dev Dockerfile KHÔNG tự generate/migrate)
- Re-init volume postgres do P1010 (xem Issue-011), migrate lại thành công (2 migrations)
- Restart backend → "Nest application successfully started", Prisma kết nối OK

### Quyết định quan trọng
- **Disk**: ổ C: đầy 0GB khiến buildkit read-only → người dùng tự xử lý (chuyển/dọn). Project ở D: (87GB trống)
- **MinIO healthcheck**: đổi `mc ready local` → `curl -f http://localhost:9000/minio/health/live` (mc config trong image lỗi, curl có sẵn)
- **Prisma generate/migrate thủ công**: dev container chỉ chạy `nest start --watch`. Sau fresh clone phải chạy `make db-generate` (hoặc `pnpm db:generate`) + `db-migrate`/`migrate deploy` 1 lần

### Kết quả
- Stack chạy: FE :5174 (200), BE :3000 (routes OK), Postgres :5433, Redis :6379, MinIO :9000/:9001 — tất cả healthy
- Lưu ý: Google OAuth chưa cấu hình → login Google chưa hoạt động cho tới khi điền `GOOGLE_CLIENT_ID/SECRET` thật

### Tasks liên quan
- Setup/onboarding — không thuộc task plan cụ thể. Next dev task vẫn là P1.6-T7

## [2026-06-29] Session — P1.6-T7: Wire flashcard + quiz vào API tiến độ học

### Yêu cầu
- Nối flashcard (T2/T3) và quiz (T4) đang dùng local state vào StudyProgress API (T6); hiện "đã thuộc X/Y" từ tiến độ đã lưu

### Công việc đã làm
- `lib/cardKey.ts`: `rowCardKey(row, columnNames)` — FNV-1a hash theo cặp `tên=giá trị` (sort theo tên cột) → ổn định qua re-parse, không phụ thuộc thứ tự cột/rowIndex
- `api/study-progress.ts`: client `fetchProgress(datasetId, sheet?)` + `saveProgress({datasetId, sheet?, cardKey, status})`
- `LearnPage`: thêm useQuery đọc progress (non-blocking) + useMutation lưu; truyền `progress` + `onMark` xuống 2 chế độ
- `FlashcardDeck`: tính `cardKeys` (memo theo columns/rows), seed Set "đã thuộc" từ items status='known' (match cardKey), mark→onMark('known'|'learning')
- `QuizMode`: thêm `onMark`; trả lời đúng→'known', sai→'learning'
- Tests: 22 FE pass (17 LearnPage gồm seed-from-server + persist known/learning + quiz persist; 5 cardKey unit)
- **Bonus (Issue-012)**: sửa frontend build đỏ pre-existing (3 fixture stale + vite.config type) → `pnpm build` xanh trở lại

### Quyết định quan trọng
- **cardKey = hash giá trị dòng (canonical sort theo tên cột)**: ổn định khi đổi header/sheet/thêm dòng; FE tính (khớp ghi chú schema T5)
- **Quiz đúng = 'known'**: 1 lần trả lời đúng coi như thuộc (đơn giản; SRS tinh vi để Phase sau). Sai = 'learning' (đã ôn)
- **Không invalidate progress query sau khi lưu**: seed local 1 lần khi vào, giữ state phiên hiện tại (tránh refetch reset/nháy); lần vào sau GET mới seed lại đúng
- **memo cardKeys theo [columns, rows]** (ref query ổn định) thay vì `names` (mảng mới mỗi render) → tránh effect seed chạy lại reset known

### Kết quả
- Tiến độ học persist qua DB; quay lại thấy "đã thuộc X/Y" đúng. Logic phủ unit test. Build/lint/test FE xanh
- Còn lại: verify e2e trên browser với file HSK thật (cần tài khoản đăng nhập + upload) — gộp chung với P1.5-T9

### Tasks liên quan
- P1.6-T7 ✅ → Phase 1.6 hoàn tất (trừ e2e browser). Next: P1.8 (aggregation suite) hoặc các verify e2e tồn đọng

## [2026-06-29] Session — P1.8-T1: Generalize aggregation + groupAggregate (sửa nhóm-lặp)

### Yêu cầu
- Mở rộng phép gộp (count→sum/average/median/min/max), thêm `groupAggregate`, sửa lỗi category+number vẽ raw → nhóm lặp (vd "Bò Úc" 5 dòng = 5 cột trùng tên)

### Công việc đã làm
- `api/datasets.ts`: type `Aggregation = count|sum|average|median|min|max`; `ChartSuggestion.aggregation?` dùng type này (thay `'count'`)
- `lib/buildChartOption.ts`: thêm `reduceAgg(values, fn)` + `groupAggregate(rows, x, yKey, fn)` (export). Gộp nhánh `aggregation === 'count'` cũ thành `if (aggregation)` chung → mọi phép gộp nhóm theo x distinct rồi áp hàm; bỏ `countBy` (count đi qua groupAggregate)
- Sửa lỗi nhóm-lặp: 1 giá trị x distinct = đúng 1 cột (Map giữ thứ tự xuất hiện đầu)
- Tests: buildChartOption 10→19 (sum/avg/median/min/max trên bảng báo giá thịt + groupAggregate trực tiếp + dedup). Full FE 119 pass, build xanh

### Quyết định quan trọng
- **aggregation rỗng = nhánh raw** (time-series line: mỗi dòng 1 điểm, KHÔNG gộp). Chỉ gộp khi có aggregation → giữ nguyên line theo ngày, fix category+number khi T2 set agg
- **count thống nhất qua groupAggregate** (yKey rỗng, đếm length) thay vì hàm riêng — ít code, hành vi count y hệt cũ (test cũ vẫn xanh)
- **median chẵn = TB 2 giá trị giữa**; nhóm rỗng giá trị → 0 (đồng nhất với `num()`)

### Kết quả
- buildChartOption đủ phép gộp, sửa nhóm-lặp. Backend chưa set agg cho category+number (đó là T2) nên hiệu ứng fix nhóm-lặp e2e sẽ thấy sau T2

### Tasks liên quan
- P1.8-T1 ✅ → tiếp P1.8-T2 (suggester BE: category+number → default agg theo tên cột; encoding mang yCol + aggregation)

## [2026-06-29] Session — P1.8-T2: Suggester default aggregation theo tên cột

### Yêu cầu
- Category+number: chọn phép gộp mặc định thông minh theo tên cột số (giá→TB; số lượng/doanh thu/thành tiền→Tổng); suggestion mang aggregation

### Công việc đã làm
- `chart-suggester.service.ts`: type `Aggregation` (broaden từ `'count'`); `defaultAggregation(name)` heuristic (AVG_HINTS gồm giá/đơn giá/tỉ lệ/phần trăm/...; "giá trị"→sum; mặc định sum). Gắn agg + label (Tổng/Trung bình) vào bar & pie nhánh category+number, description phản ánh phép gộp
- `buildChartOption.ts` (FE): nhánh aggregation cho bar giờ tạo **1 series mỗi cột số** (count → y rỗng → 1 series). Tránh mất cột khi category + nhiều number (T2 set agg cho cả case này)
- Tests: +5 BE suggester (sum default, average cho giá/đơn giá, "giá trị"→sum, description) = 16; +1 FE (multi-number → 2 series). BE 141, FE 120, cả 2 build xanh

### Quyết định quan trọng
- **Heuristic tên cột (rẻ)** thay vì AI: đủ cho default, user verify/đổi ở T3, AI ở Phase 4. Loại trừ "giá trị" (value) khỏi nhóm "giá" (price)
- **agg theo y[0]** cho nhãn/label; nhưng FE render mọi cột y (mỗi cột 1 series cùng phép gộp) → không mất dữ liệu khi multi-number
- **count vẫn 1 series** (y rỗng → cols=['']) — tương thích test cũ

### Kết quả
- Category+number giờ gộp đúng (hết nhóm-lặp) với phép gộp mặc định hợp lý. Sẵn sàng cho T3 (switcher đổi phép gộp)

### Tasks liên quan
- P1.8-T2 ✅ → tiếp P1.8-T3 (switcher trên ChartDetailPage để user verify/đổi phép gộp → re-render)

## [2026-06-29] Session — P1.8-T3: Switcher phép gộp trên ChartDetailPage

### Yêu cầu
- User verify/đổi phép gộp (Đếm/Tổng/TB/Trung vị/Min/Max) trên trang chi tiết → chart re-render. Quyết định: hiện đủ 6, CHƯA gate Free/Pro

### Công việc đã làm
- `ChartDetailPage.tsx`: state `agg` (init từ `suggestion.aggregation`); `activeSuggestion = {...suggestion, aggregation: agg}`; build option theo agg → đổi nút là re-render. Lưu giữ phép gộp đã chọn (option lưu phản ánh agg)
- Switcher 6 nút (AGG_ORDER + AGG_LABELS tiếng Việt), `role="group" aria-label="Phép gộp"`, active = aria-pressed
- `canSwitch = aggregation != null && encoding.y.length > 0` → ẩn switcher cho chart "đếm" thuần (không có cột số) và time-series raw
- Tests: +3 FE (ẩn với time-series; hiện + đổi sum→average re-render qua data-option mock; lưu giữ agg đã đổi). FE 123, build xanh

### Quyết định quan trọng
- **Chưa gate Free/Pro** (user chốt) — để dành task riêng; giờ hiện cả 6
- **Switcher ẩn khi y rỗng**: count thuần (data toàn chữ) không có gì để Tổng/TB → đổi sẽ ra 0, nên không cho đổi
- **Đọc option qua ChartView mock** (`data-option` JSON) để test re-render mà không cần render echarts thật

### Kết quả
- "Step verify giá trị" hoạt động: user đổi phép gộp thấy chart đổi ngay, lưu đúng. Còn T4 (% tổng) + T5 (e2e báo giá)

### Tasks liên quan
- P1.8-T3 ✅ → tiếp P1.8-T4 (toggle "% tổng" cho bar) rồi P1.8-T5 (verify e2e)

## [2026-06-29] Session — P1.8-T4: Toggle "% tổng" cho bar

### Yêu cầu
- Toggle hiển thị bar theo % tổng (pie vốn đã %). Là cách HIỂN THỊ, không phải phép gộp

### Công việc đã làm
- `buildChartOption.ts`: thêm tham số `opts.percent`; helper `maybePercent` (mỗi series → giá trị/tổng series ×100, làm tròn 1 chữ số) + `valueAxis(percent)` (trục hậu tố `{value}%`). Áp cho bar ở cả nhánh gộp lẫn raw; pie/line bỏ qua (`percent && type==='bar'`)
- `ChartDetailPage.tsx`: state `percent` + checkbox "Hiển thị % tổng" (chỉ khi type=bar); truyền `{percent}` vào buildChartOption
- Tests: +4 buildChartOption (bar gộp %, bar raw làm tròn, pie không áp, line bỏ qua) +2 ChartDetailPage (toggle đổi %, ẩn với line). FE 129, build xanh

### Quyết định quan trọng
- **% theo từng series** (mỗi series tự chuẩn hoá về 100%) — đơn giản, đúng cho case 1 series category (tỷ trọng). Multi-series mỗi series riêng
- **percent chỉ bar**: pie đã là %, line theo thời gian % vô nghĩa → chặn ở buildChartOption (`type==='bar'`) lẫn UI (`canTogglePercent`)
- **Làm tròn 1 chữ số** ngay trong data để tooltip/trục gọn

### Kết quả
- Phase 1.8 còn T5 (verify e2e báo giá). T1–T4 đủ: phép gộp + switcher + % tổng, sửa nhóm-lặp

### Tasks liên quan
- P1.8-T4 ✅ → P1.8-T5 (verify e2e với bảng báo giá — thủ công, cần login + file)

## [2026-06-29] Session — P1.8-T5: Verify e2e trên stack thật + Issue-013

### Yêu cầu
- Verify e2e Phase 1.8 (báo giá: nhóm-lặp + phép gộp) + các verify tồn đọng, "cùng nhau"

### Công việc đã làm
- Script `e2e.mjs` (scratchpad) chạy luồng thật qua API stack đang chạy: register→presign→PUT MinIO→confirm→/columns→/suggest→/rows→study-progress save/get→owner-guard. Dùng 2 file CSV (báo giá có nhóm lặp Bò Úc; HSK từ vựng)
- Kết quả 19/19 PASS: suggest mang `aggregation` (Giá→average đúng heuristic T2); rows xác nhận nhóm-lặp; study-progress lưu/đọc 'known' (T6/T7 BE); owner-guard 404; HSK learnable
- **Phát hiện Issue-013**: dev server KHÔNG hot-reload trên Windows (bind mount không truyền inotify) → backend chạy code cũ, e2e ban đầu fail. Restart backend+frontend → code mới live → 19/19
- Tạo tài khoản test e2e (email e2e-<ts>@chartly.local) — KHÔNG đụng tài khoản caboisai1811

### Quyết định quan trọng
- **E2e qua API + CSV** thay vì browser tự động: parser nhận CSV (nhanh, không cần dựng .xlsx); verify được toàn bộ data pipeline thật. Render chart là FE (đã unit-test buildChartOption + ChartDetailPage + build)
- **Restart container sau khi sửa code** là bắt buộc trên Windows để verify (Issue-013)

### Kết quả
- Phase 1.8 HOÀN TẤT (T1–T5). Study-progress (P1.6-T7) cũng verified e2e phần BE. Data pipeline upload→gộp→học chạy thật end-to-end
- Còn lại thuần browser-visual (chart render, switcher, % toggle) — unit-tested, có thể xem trực tiếp ở :5174 nếu cần

### Tasks liên quan
- P1.8-T5 ✅ → Phase 1.8 done. Tiếp: Phase 0.5 (Admin) hoặc Phase 2 (Dashboard builder). P1.5-T9 (multi-tab/header-edit browser) vẫn để ngỏ phần visual

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

<!-- Thêm session mới ở đây -->
