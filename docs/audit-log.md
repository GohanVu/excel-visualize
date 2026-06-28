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

<!-- Thêm session mới ở đây -->
