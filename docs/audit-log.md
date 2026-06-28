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

<!-- Thêm session mới ở đây -->
