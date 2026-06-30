# Issues & Bug Tracking

> Ghi lại bugs, root cause analysis, và bài học rút ra.
> Khi AI fix bug → PHẢI ghi vào đây + viết test đi kèm.

---

## Format

```markdown
### [Issue-XXX] Tiêu đề ngắn

- **Status**: 🔴 Open / 🟡 In Progress / 🟢 Fixed
- **Severity**: Critical / High / Medium / Low
- **Phát hiện**: [Ngày] — [Ai phát hiện, trong context nào]
- **Root cause**: [Nguyên nhân gốc]
- **Fix**: [Mô tả cách fix]
- **Test added**: [File test và test name]
- **Lesson learned**: [Bài học rút ra để tránh lặp]
```

---

### [Lesson-001] Test phải viết cùng lúc với implementation

- **Status**: 🟢 Fixed (quy trình)
- **Severity**: Medium
- **Phát hiện**: 2026-06-27 — Người dùng hỏi "test case ở đâu, điều gì đảm bảo code chạy ổn" sau khi P0-T4 implement xong mà không có test
- **Root cause**: Viết implementation trước, ghi audit log, sau đó mới viết test — test bị bỏ sót nếu không nhắc
- **Fix**: Thêm test (24 tests) cho AuthService, AuthController, RolesGuard. Tất cả pass.
- **Test added**: `src/auth/test/auth.service.spec.ts`, `src/auth/test/auth.controller.spec.ts`, `src/common/guards/test/roles.guard.spec.ts`
- **Lesson learned**: Từ session sau — mỗi task phải có test đi kèm **trong cùng một lần implement**, không phải bước riêng. Ghi test coverage vào audit log ngay khi hoàn thành task.

---

### [Issue-002] Bỏ qua bước đọc context bắt buộc khi bắt đầu session

- **Status**: 🟢 Fixed (quy trình)
- **Severity**: Critical
- **Phát hiện**: 2026-06-27 — Người dùng phát hiện sau khi AI làm nhiều tasks mà không đọc `docs/brainstorm.md`, `docs/issues.md`, `project-conventions.md`
- **Root cause**: AI chỉ đọc 2/4 files bắt buộc (`audit-log.md` + `plan.md`), bỏ qua `brainstorm.md` và `issues.md`. Hệ quả: không phát hiện `project-conventions.md` còn để trống, không check API doc rule ("PHẢI update docs/api.md"), và thiếu context từ issues đã biết.
- **Fix**: Đọc đủ 4 files theo thứ tự. Tạo `docs/api.md` + fill `project-conventions.md` cho đúng hiện trạng.
- **Test added**: N/A (quy trình, không phải code bug)
- **Lesson learned**: Bước đọc context là **không thể bỏ qua**, kể cả khi bắt đầu từ câu "oke làm tiếp". CLAUDE.md đã quy định rõ — không có ngoại lệ.

### [Issue-003] Axios interceptor gây infinite reload loop trên trang login

- **Status**: 🟢 Fixed
- **Severity**: High
- **Phát hiện**: 2026-06-27 — Mở localhost:5174/login, trang liên tục reload không dừng
- **Root cause**: Interceptor bắt 401 từ `/auth/me` → thử `/auth/refresh` → cũng 401 → `window.location.href = '/login'` → reload → lặp lại mãi. `/auth/me` vốn trả 401 khi chưa đăng nhập — đây là hành vi bình thường, không phải lỗi cần retry.
- **Fix**: Hai điều kiện bảo vệ trong `src/api/client.ts`:
  1. Skip auto-refresh nếu request là `/auth/me` (endpoint check auth status, 401 = chưa login, không cần retry)
  2. Chỉ redirect `/login` nếu `window.location.pathname !== '/login'`
- **Test added**: Covered bởi `src/hooks/useAuth.test.ts` — test "returns null when /auth/me returns 401" xác nhận 401 không throw, trả về `isAuthenticated = false`
- **Lesson learned**: Endpoint dùng để **kiểm tra** trạng thái auth (`/auth/me`) phải được loại ra khỏi interceptor refresh — 401 ở đây là expected, không phải lỗi. Redirect trong interceptor phải luôn kèm guard `window.location.pathname !== '/login'` để tránh reload loop.

### [Lesson-004] Đặt tên button trùng với tab label gây test ambiguity

- **Status**: 🟢 Fixed
- **Severity**: Low
- **Phát hiện**: 2026-06-27 — LoginPage có tab "Đăng nhập" và submit button "Đăng nhập" → `getByRole('button', { name: 'Đăng nhập' })` tìm thấy 2 elements
- **Fix**: Submit form bằng `fireEvent.submit(screen.getByRole('form'))` thay vì click button. Thêm `aria-label="auth-form"` vào `<form>` để `getByRole('form')` hoạt động.
- **Test added**: `LoginPage.test.tsx`
- **Lesson learned**: Khi có nhiều interactive element cùng text, dùng `fireEvent.submit(form)` thay vì click button. Thêm `aria-label` vào `<form>` khi cần query form trong test.

### [Issue-005] `/auth/me` lộ passwordHash ra client

- **Status**: 🟢 Fixed
- **Severity**: Critical
- **Phát hiện**: 2026-06-27 — User mở DevTools Network thấy response `/auth/me` chứa `passwordHash` (bcrypt hash)
- **Root cause**: Khi thêm `passwordHash` vào User (Session 6), `me()` chỉ destructure loại `encryptedRefreshToken`, quên loại `passwordHash`. Field nhạy cảm mới thêm không được cập nhật vào nơi sanitize.
- **Fix**: Tạo `AuthService.sanitizeUser()` loại bỏ cả `passwordHash` + `encryptedRefreshToken`, dùng chung cho `/me`, register, login (DRY — 1 nơi sanitize duy nhất)
- **Test added**: `auth.controller.spec.ts` "does not return passwordHash (security)"; `auth.service.spec.ts` "sanitizeUser strips passwordHash and encryptedRefreshToken"
- **Lesson learned**: Mỗi khi thêm field nhạy cảm vào model, PHẢI rà soát tất cả nơi serialize user ra ngoài. Tốt nhất: 1 hàm `sanitizeUser` duy nhất thay vì destructure rải rác — thêm field mới chỉ sửa 1 chỗ. Khi bcrypt hash lộ ra, kẻ tấn công có thể brute-force offline.

### [Issue-006] Upload MinIO 403 — presigned URL string-replace host làm hỏng chữ ký

- **Status**: 🟢 Fixed
- **Severity**: High
- **Phát hiện**: 2026-06-27 — Upload file thật, PUT lên `localhost:9000` trả 403 Forbidden → kéo theo GET columns 500 (file không có trên MinIO)
- **Root cause**: StorageService presign URL với host nội bộ `minio:9000` rồi `.replace('minio:9000','localhost:9000')`. AWS Sig v4 ký cả host header → đổi host sau khi ký làm chữ ký không khớp → MinIO 403.
- **Fix**: Tạo `presignClient` riêng cấu hình `endPoint = host công khai` (localhost), `region: 'us-east-1'` (tránh GetBucketLocation). Ký bằng client này → URL dùng trực tiếp từ browser, không string-replace.
- **Test added**: `storage.service.spec.ts` — "returns signed URL as-is", "constructs presign client using localhost"
- **Lesson learned**: KHÔNG BAO GIỜ string-replace host/path trên presigned URL — chữ ký Sig v4 phụ thuộc host. Phải presign đúng host mà client sẽ gọi. Verify end-to-end bằng PUT thật, không chỉ unit test.

### [Issue-007] CSV: date bị convert thành Excel serial number

- **Status**: 🟢 Fixed
- **Severity**: Medium
- **Phát hiện**: 2026-06-27 — Sau khi upload chạy, cột "Ngày" (2024-01-01) bị detect là `number` với giá trị `45292`
- **Root cause**: Path đọc CSV (`XLSX.read(str, { type:'string', raw:false })`) thiếu `cellDates: true` → SheetJS convert "2024-01-01" thành Excel serial number 45292 → ColumnTypeService thấy số → number. Hệ quả: chart suggester không nhận ra date+number → gợi ý sai.
- **Fix**: Thêm `cellDates: true` vào path CSV (path xlsx đã có sẵn). Date thành Date object → toISOString → detect đúng `date`.
- **Test added**: `parser.service.spec.ts` — "keeps date strings as dates, not Excel serial numbers"
- **Lesson learned**: SheetJS auto-convert date khác nhau giữa buffer (xlsx) và string (csv). Mọi path đọc phải set `cellDates: true` nhất quán. Bug này chỉ lộ khi test bằng data thật có cột ngày.

### [Issue-008] Flashcard/chart trống khi user chỉnh dòng header

- **Status**: 🟢 Fixed
- **Severity**: High
- **Phát hiện**: 2026-06-28 — User upload "Báo giá thịt" (banner đầu sheet), chỉnh header sang dòng 5. Trang cột hiện 26 dòng đúng, nhưng trang Học hiện "7 / 27" và mọi giá trị thẻ trống trơn
- **Root cause**: `/rows` (và `fetchRows`) KHÔNG nhận `headerRow`. Khi user override header, `/columns` parse đúng dòng 5 nhưng `/rows` vẫn auto-detect (lệch 1 dòng) → key cột (displayNames) lệch giữa 2 endpoint → `row[front]`/`row[back]` không tồn tại → rỗng. Dấu hiệu: số dòng lệch (27 vs 26)
- **Fix**: Thread `headerRow` xuyên suốt `/rows`: `getRows(…, headerRow)` + controller `?headerRow=` + `fetchRows(id, { sheet, headerRow })`. Cập nhật caller LearnPage + ChartDetailPage (đọc headerRow từ router state); ChartSuggestionPage truyền headerRow sang ChartDetail
- **Test added**: `datasets.service.spec` — "passes sheetName + headerRow to the parser"; `datasets.controller.spec` — rows truyền headerRow + default undefined
- **Lesson learned**: Khi thêm 1 tham số ảnh hưởng cách PARSE (sheet, headerRow), phải thread vào MỌI endpoint đọc dữ liệu cùng dataset (`/columns`, `/rows`, `/suggest`) — nếu không các view parse khác nhau → lệch key. Triệu chứng kinh điển: tổng số dòng khác nhau giữa các trang.

### [Issue-009] Sheet mới không hiện ở trang chủ tới khi F5

- **Status**: 🟢 Fixed
- **Severity**: Medium
- **Phát hiện**: 2026-06-28 — Upload sheet mới → quay lại trang chủ chưa thấy record, phải F5 mới hiện
- **Root cause**: QueryClient có `staleTime: 30_000` (30s). Sau upload, query `['datasets']` vẫn "fresh" trong 30s → quay lại Dashboard không refetch → file mới chưa hiện. F5 = full reload nên fetch mới
- **Fix**: `UploadPage.handleSuccess` gọi `queryClient.invalidateQueries({ queryKey: ['datasets'] })` trước khi navigate → đánh dấu stale → Dashboard refetch khi mount
- **Test added**: `UploadPage.test.tsx` — "invalidates the datasets list + navigates on upload success"
- **Lesson learned**: Khi `staleTime > 0`, mọi thao tác THÊM/XOÁ/SỬA làm thay đổi list phải `invalidateQueries` thủ công cho query liên quan (đã làm cho delete ở DashboardPage; thiếu cho create ở UploadPage). Mutation thay đổi data → luôn invalidate query đọc data đó.

### [Issue-010] MinIO báo unhealthy → backend không start (sau fresh clone)

- **Status**: 🟢 Fixed
- **Severity**: Medium
- **Phát hiện**: 2026-06-29 — `docker compose up` lần đầu: minio "Up (unhealthy)", backend bị chặn vì `depends_on: minio condition: service_healthy`
- **Root cause**: Healthcheck dùng `mc ready local` nhưng `mc` trong image minio chưa có alias `local` cấu hình → `mc: <ERROR> Unable to load config`. MinIO server thực ra chạy bình thường ("1 Online")
- **Fix**: Đổi healthcheck sang `curl -f http://localhost:9000/minio/health/live` (curl có sẵn trong image, endpoint health chuẩn của MinIO) — `docker-compose.yml`
- **Lesson learned**: Healthcheck phải dùng công cụ thực sự hoạt động trong image. `mc ready` cần alias đã config; endpoint `/minio/health/live` đáng tin hơn cho healthcheck.

### [Issue-011] Prisma P1010 "User chartly was denied access on chartly.public" dù là superuser

- **Status**: 🟢 Fixed
- **Severity**: High
- **Phát hiện**: 2026-06-29 — `prisma migrate deploy` và app runtime (PrismaService.onModuleInit) đều ném P1010, dù `chartly` là superuser, có đủ quyền (psql tạo/xoá bảng OK, `has_schema_privilege` đều true)
- **Root cause**: Volume `postgres_data` bị khởi tạo ở trạng thái dở dang trong lần `up` đầu (lúc build backend fail vì C: đầy). DB ở trạng thái lỗi khiến cả schema-engine lẫn query-engine của Prisma báo P1010 (lỗi bị map sai từ quaint). GRANT/ALTER OWNER không cứu được vì gốc là DB hỏng
- **Fix**: Re-init riêng volume postgres (clone trắng, không mất data): `docker compose stop postgres && rm -f postgres && docker volume rm excel-visualize_postgres_data && up -d postgres` → migrate deploy thành công, restart backend hết P1010
- **Lesson learned**: Nếu một lần `up` thất bại giữa chừng (vd hết disk), volume DB có thể init lỗi. Triệu chứng: P1010/quyền sai dù user đủ quyền thực tế. Với môi trường chưa có data, re-init volume là cách nhanh & sạch nhất. Kiểm tra `docker volume inspect ... CreatedAt` để xác định volume tạo trong lần chạy lỗi.

### [Issue-012] Frontend `pnpm build` đỏ do fixture test stale (từ P1.6-T1)

- **Status**: 🟢 Fixed
- **Severity**: High (CI frontend build fail)
- **Phát hiện**: 2026-06-29 — khi chạy `pnpm build` lúc làm P1.6-T7. `vitest run` (test) xanh nhưng `tsc -b` (trong build) đỏ
- **Root cause**: `tsconfig.app.json` include cả file test. Khi thêm field bắt buộc vào type (`learnable` ở P1.6-T1, `confidence` ở P1.5-T3) thì các fixture test cũ thiếu field → lỗi type. Ngoài ra `ChartDetailPage.test` dùng global `it/expect` mà không import; `vite.config.ts` dùng `defineConfig` từ `vite` (không có type `test`). Build đã đỏ từ P1.6-T1 nhưng các session T2–T6 chỉ chạy `pnpm test` (vitest) chứ không chạy `build` nên không lộ
- **Fix**: thêm `learnable` (ChartSuggestionPage.test), `confidence` (columnGrouping.test); import `describe/it/expect/beforeEach` ở ChartDetailPage.test; `vite.config.ts` import `defineConfig` từ `vitest/config`
- **Lesson learned**: `pnpm test` (vitest, có `globals:true`) KHÔNG bằng `tsc -b` về type — fixture stale chỉ lộ khi build. Sau khi thêm field bắt buộc vào shared type (vd DatasetOverview, DatasetColumn), phải grep mọi fixture test dùng type đó. Nên chạy `pnpm build` (không chỉ test) trước khi coi task FE là done. Cân nhắc thêm bước `typecheck`/`build` vào pre-commit để bắt sớm.

### [Issue-013] Dev server không hot-reload trên Windows (bind mount + inotify)

- **Status**: 🟡 Workaround (chưa fix tận gốc)
- **Severity**: Medium (dev experience — dễ verify nhầm code cũ)
- **Phát hiện**: 2026-06-29 — chạy e2e thấy `aggregation` undefined dù T2 đã code. Backend đang chạy **JS compile từ code CŨ**: sửa file `.ts` không trigger `nest start --watch` recompile
- **Root cause**: Bind mount `./backend:/app` trên Docker Desktop Windows (WSL2) KHÔNG truyền inotify event từ host vào container → file watcher (nest/vite) không thấy thay đổi. Chỉ `pnpm test`/`pnpm build` (chạy mới mỗi lần) mới phản ánh code mới nhất; dev server live thì đứng yên
- **Workaround**: sau khi sửa code backend/frontend mà muốn test trên server đang chạy → `docker compose restart backend` (hoặc frontend). Hoặc bật polling: thêm `CHOKIDAR_USEPOLLING=true` (vite) / `WATCHPACK_POLLING=true` và nest `--watch` với polling cho tsc (cấu hình sau)
- **Lesson learned**: Trên Windows, KHÔNG tin dev server đã reload. Khi verify e2e/thủ công sau khi sửa code → restart container trước. Unit test (`pnpm test`) luôn đúng vì compile mới. Cân nhắc thêm polling env vào docker-compose để fix hẳn (follow-up).

### [Issue-014] Khởi động mới (fresh setup) gây lỗi 500 ở Backend do chưa chạy Migrate & Generate

- **Status**: 🟢 Fixed
- **Severity**: High
- **Phát hiện**: 2026-06-30 — Người dùng báo lỗi 500 khi đăng nhập sau khi khôi phục môi trường (fresh state).
- **Root cause**: 
  1. Thiếu file `.env` chứa `POSTGRES_PASSWORD` (do file này nằm trong `.gitignore`), làm container Postgres không khởi chạy được.
  2. Sau khi tạo `.env` và Postgres chạy lên, database vẫn trống và Prisma Client chưa được sinh ra (`generate`) trong `node_modules` của container backend. Backend NestJS bị lỗi biên dịch TypeScript, dẫn đến lỗi 500 khi gọi API.
- **Fix**:
  1. Tạo file `.env` từ [.env.example](file:///d:/Project/excel-visualize/.env.example).
  2. Chạy `docker compose exec backend pnpm db:migrate` để đồng bộ DB schema và tự động sinh Prisma Client.
  3. Cấu hình lại `docker-compose.yml` để container `backend` tự động chạy `pnpm db:migrate` trước khi khởi động `pnpm start:dev` (sử dụng `command: sh -c "pnpm db:migrate && pnpm start:dev"`).
- **Test added**: N/A (Môi trường / Cấu hình Docker)
- **Lesson learned**: Để đảm bảo nguyên lý "Clone -> 1 command -> chạy" của dự án, các container chạy môi trường dev có sử dụng ORM (như Prisma) nên được cấu hình tự động chạy migration và sinh client tại thời điểm khởi động (sau khi database dependency đã healthy). Khi gặp lỗi database, cần xử lý trọn gói từ việc sửa kết nối (cấu hình biến môi trường) cho đến đồng bộ hóa schema.

<!-- Thêm issues ở đây -->

