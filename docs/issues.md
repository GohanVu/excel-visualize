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

<!-- Thêm issues ở đây -->
