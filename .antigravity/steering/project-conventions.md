# Project Conventions & Patterns

## Mục đích
File này định hướng AI hiểu các quy ước riêng của project. Khi implement bất kỳ tính năng nào, AI PHẢI tuân theo các pattern đã được thiết lập ở đây.

## Nguyên tắc chung

1. **Reuse trước, tạo mới sau**: Trước khi tạo service/utility/pattern mới, PHẢI kiểm tra xem project đã có pattern tương tự chưa.
2. **Đọc context trước khi code**: Luôn đọc audit log, plan, và các steering files trước khi bắt đầu implement.
3. **Ghi lại quyết định**: Mọi quyết định kỹ thuật quan trọng phải được ghi vào audit log.

## Tham chiếu bắt buộc

Khi bắt đầu session mới hoặc implement task mới, AI PHẢI đọc:
- `docs/audit-log.md` — Lịch sử làm việc
- `docs/plan.md` — Plan, roadmap, phases, tasks
- `docs/api.md` — Danh sách API endpoints hiện tại

---

## Tech Stack

- **Frontend**: React 18 + Vite 5 + TailwindCSS 3 + React Router v6 + TanStack Query v5 + Axios
- **Backend**: NestJS 10 + Prisma 5 + PassportJS (Google OAuth2 + JWT)
- **Database**: PostgreSQL 16 (Prisma migrations), Redis 7 (BullMQ — Phase 3+)
- **Storage**: MinIO (S3-compatible, presigned URL pattern)
- **Auth**: Google OAuth2 → JWT httpOnly cookie (access_token + refresh_token)
- **Deployment**: Docker Compose (dev) → VPS + Traefik (prod, Phase 6)
- **Package manager**: pnpm 9.4.0, Node 20.14

---

## API Conventions

- **Style**: REST
- **Prefix**: không có prefix (`/auth/...`, `/datasets/...`, `/dashboards/...`)
- **Vite proxy**: Frontend gọi `/api/...` → Vite proxy → backend `:3000` (không hardcode URL backend)
- **Authentication**: JWT từ httpOnly cookie `access_token` — KHÔNG dùng Authorization header
- **Versioning**: chưa versioning ở phase hiện tại
- **Schema validation**: `class-validator` + `ValidationPipe` global (whitelist + forbidNonWhitelisted)
- **Error format**: NestJS default HttpException `{ statusCode, message, error }`
- **Controller pattern**: `@Controller('resource') @UseGuards(JwtAuthGuard)` trên class
- **Current user**: `@CurrentUser()` decorator lấy user từ JWT payload
- **PHẢI update `docs/api.md`** mỗi khi thêm hoặc sửa endpoint

---

## Database Conventions

- **ORM**: Prisma 5
- **Migration**: `prisma migrate dev` (dev), `prisma migrate deploy` (prod)
- **Naming**: snake_case cho table/column (`@@map("dataset_columns")`)
- **IDs**: CUID (`@default(cuid())`)
- **Soft delete**: không dùng ở phase hiện tại — dùng hard delete + cascade
- **JSONB**: chart config + position lưu dạng `Json` field
- **Enum**: khai báo trong schema (`Role`, `SubscriptionPlan`, v.v.)
- **Seed**: idempotent bằng `upsert` — chạy nhiều lần không sinh data trùng

---

## Backend Conventions (NestJS)

- **Module structure**: `src/{feature}/{feature}.module.ts|service.ts|controller.ts`
- **Tests**: `src/{feature}/test/{name}.spec.ts` (Jest + ts-jest)
- **Guards**: `JwtAuthGuard` (auth), `RolesGuard` (admin check)
- **Global**: `PrismaModule` là global — inject `PrismaService` trực tiếp không cần import module
- **Config**: `ConfigService` từ `@nestjs/config` — luôn dùng `config.getOrThrow()` cho required vars
- **Storage**: MinIO presigned PUT URL — frontend upload thẳng, backend không proxy file
- **Refresh token Google**: encrypt AES-256-CBC trước khi lưu DB
- **JWT**: `access_token` expiry 15m, `refresh_token` expiry 7d, path `/auth/refresh`

---

## Frontend Conventions (React)

- **Component library**: TailwindCSS thuần, không dùng component library bên ngoài
- **State management**: TanStack Query cho server state, `useState` cho local UI state
- **Routing**: React Router v6, pattern nested routes với `<Outlet />`
- **API client**: `src/api/client.ts` — axios instance, `withCredentials: true`, auto-refresh 401
- **Styling**: TailwindCSS utility classes, dark theme (`bg-gray-950`)
- **Forms**: controlled component với `useState`, validate trước khi gọi API
- **Auth**: `useAuth` hook (TanStack Query gọi `/api/auth/me`)
- **Route guard**: `PrivateRoute` (cần auth), `PublicRoute` (chỉ cho unauthenticated)
- **Tests**: Vitest 2.x + @testing-library/react + happy-dom

---

## Testing

- **Backend**: Jest + ts-jest, rootDir `src`, pattern `*.spec.ts`
- **Frontend**: Vitest 2.x + happy-dom + @testing-library/react
- **Convention**: Bug fix = test bắt buộc. Implementation = test viết CÙNG LÚC
- **Chạy backend tests**: `make test-backend` (trong Docker)
- **Chạy frontend tests**: `make test-frontend` (trong Docker)
- **Chạy tất cả**: `make test`
- **Mock DB**: jest.fn() — không cần DB thật cho unit tests
- **Mock MinIO**: jest.mock('minio', ...) — mock toàn bộ Client

---

## Environment & Portability

- **Containerization**: Docker Compose — mọi thứ chạy trong container
- **Node isolation**: node_modules trong anonymous volume (`backend_modules`, `frontend_modules`)
- **Reproduce command**: `make up` (sau `make setup` để kích hoạt Husky)
- **.gitignore**: cover `.env`, `node_modules`, `dist`, `coverage`
- **Environment variables**: `.env.example` (commit) + `.env` (gitignore)
- **Lock files**: `pnpm-lock.yaml` PHẢI commit ở cả backend và frontend
- **Không global packages**: corepack enable trong Dockerfile, không `npm install -g`

---

## Security & IAM

- **Auth flow**: Google OAuth2 → JWT httpOnly cookie (KHÔNG localStorage)
- **JWT secret**: `JWT_SECRET` + `JWT_REFRESH_SECRET` (2 secret riêng)
- **Google refresh token**: encrypt AES-256-CBC, key derive từ JWT_SECRET qua scrypt
- **RBAC**: `@Roles('admin')` decorator + `RolesGuard` — admin chỉ set thủ công trong DB
- **Refresh token path**: cookie `path: '/auth/refresh'` — browser chỉ gửi khi đúng endpoint
- **Helmet**: enabled trên NestJS app
- **CORS**: chỉ allow `FRONTEND_URL`

---

## Queue / Background Jobs

_(Chưa implement — sẽ dùng BullMQ + Redis từ Phase 3 cho auto-sync Google Sheets)_

---

## Logging

- **Backend**: NestJS built-in `Logger` cho service-level logs
- **Format**: structured log mặc định của NestJS

---

## Documentation

- Tham chiếu: `.kiro/steering/documentation-review.md`
- Khi thêm/sửa API → PHẢI update `docs/api.md`
- Khi thay đổi code → kiểm tra doc liên quan có cần update không
