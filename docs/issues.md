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

<!-- Thêm issues ở đây -->
