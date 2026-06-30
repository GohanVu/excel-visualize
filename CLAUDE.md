# CLAUDE.md — Project Instructions for Claude Code

> File này được Claude Code tự động đọc khi bắt đầu conversation.
> Tổng hợp từ `.antigravity/steering/` — xem chi tiết tại các file gốc.

---

## Khi bắt đầu session mới

PHẢI đọc theo thứ tự trước khi làm bất cứ gì:

1. `docs/audit-log.md` — Lịch sử làm việc, quyết định đã có
2. `docs/plan.md` — Plan hiện tại, phases, tasks, status
3. `docs/brainstorm.md` — Lý do thiết kế ban đầu
4. `docs/issues.md` — Bugs đã biết, lessons learned

> Nếu vừa có thay đổi code lớn / đổi branch từ phiên trước → chạy `detect_changes` của codebase-memory MCP; nếu danh sách file đổi dài thì `index_repository` lại trước khi tin `file:line` từ MCP (graph là snapshot, có thể stale).

Sau khi đọc, trả lời: "Tôi đã đọc [list files]. Task tiếp theo là [task ID + mô tả]. Confirm để tôi bắt đầu."

---

## Workflow

**KHÔNG code ngay khi nhận yêu cầu.** Tuân theo thứ tự:

1. Đọc context (audit-log, plan, brainstorm)
2. Xác nhận task với người dùng
3. Implement
4. Ghi kết quả vào `docs/audit-log.md`
5. Update `docs/plan.md` (đánh dấu task done)

---

## Nguyên tắc

1. **Reuse trước, tạo mới sau** — kiểm tra project đã có pattern tương tự chưa
2. **Đọc context trước khi code** — luôn đọc audit log + plan
3. **Ghi lại quyết định** — mọi technical decision ghi vào audit log
4. **Bug fix = test bắt buộc** — mỗi fix phải có test đi kèm

---

## Memory vs Audit Log

| Lưu vào | Khi nào |
|---------|---------|
| `docs/audit-log.md` | Technical decisions, session records — versioned, dùng chung |
| Memory (`~/.claude/projects/...`) | Current phase, user preferences, non-obvious patterns — truy cập nhanh giữa sessions |

---

## Audit Log Format

```markdown
## [YYYY-MM-DD] Session Title

### Yêu cầu
- Người dùng yêu cầu gì

### Công việc đã làm
- Đã thực hiện những gì

### Quyết định quan trọng
- Technical decisions và lý do

### Kết quả
- Summary

### Tasks liên quan
- Task IDs từ plan
```

---

## Plan Status Legend

- ⬜ Todo
- 🔄 In Progress
- ✅ Done
- ❌ Blocked
- ⏭️ Skipped

---

## Review

- **Security review**: Dùng `/security-review` skill. Output → `docs/security-reports/YYYY-MM-DD-security-review.md`
- **Documentation review**: Yêu cầu trực tiếp "review docs". Output → `docs/doc-reviews/YYYY-MM-DD-doc-review.md`
- Trigger: định kỳ, trước release, sau thêm auth feature, sau hoàn thành một phase

---

## Environment & Portability

- Không cài global packages (`pip install` không có venv, `npm install -g`)
- Mọi dependency trong container hoặc virtual environment
- Clone → 1 command → chạy. Không cần setup manual.
- Chi tiết: `.antigravity/steering/project-conventions.md`
