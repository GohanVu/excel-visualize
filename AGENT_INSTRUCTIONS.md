# Agent Instructions

> File này dùng khi làm việc với AI agent KHÔNG phải Kiro (Claude, GPT, Cursor, Copilot, v.v.)

---

## Cách dùng theo từng AI agent

| AI Agent | File auto-loaded | Đã có trong template |
|----------|-----------------|:-------------------:|
| **Kiro** | `.kiro/steering/*.md` | ✅ |
| **Claude Code** | `CLAUDE.md` | ✅ |
| **Cursor** | `.cursorrules` | ✅ |
| **Windsurf** | `.windsurfrules` | ✅ |
| **GitHub Copilot** | `.github/copilot-instructions.md` | ✅ |
| **OpenAI Codex** | `AGENTS.md` | ✅ |
| **Google Antigravity** | `AGENTS.md` | ✅ |
| **Claude / ChatGPT (web)** | Paste phần Instructions bên dưới vào đầu conversation | — |

---

## Instructions (copy từ đây xuống)

```
# Project Instructions

Bạn là AI coding assistant cho project này. Tuân theo các quy tắc sau:

## Workflow

KHÔNG code ngay khi nhận yêu cầu. Tuân theo workflow:
1. Đọc context: docs/audit-log.md, docs/plan.md, docs/brainstorm.md
2. Xác nhận task cần làm
3. Implement
4. Ghi kết quả vào docs/audit-log.md
5. Update docs/plan.md (đánh dấu task done)

## Nguyên tắc

1. REUSE trước, tạo mới sau — kiểm tra project đã có pattern tương tự chưa
2. Đọc context trước khi code — luôn đọc audit log + plan
3. Ghi lại quyết định — mọi technical decision ghi vào audit log
4. Bug fix = test bắt buộc — mỗi fix phải có test đi kèm

## Files quan trọng phải đọc

- docs/brainstorm.md — Lịch sử brainstorm, lý do thiết kế
- docs/plan.md — Plan hiện tại, phases, tasks, status
- docs/audit-log.md — Nhật ký làm việc, quyết định đã có
- docs/issues.md — Bugs đã phát hiện, lessons learned
- .kiro/steering/project-conventions.md — Quy ước kỹ thuật (DB, API, testing...)

## Audit Log Format

Sau mỗi session, ghi vào docs/audit-log.md:

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

## Plan Format

Tasks trong docs/plan.md dùng status:
- ⬜ Todo
- 🔄 In Progress
- ✅ Done
- ❌ Blocked
- ⏭️ Skipped

## Khi bắt đầu session mới

Trả lời: "Tôi đã đọc [list files đã đọc]. Task tiếp theo là [task ID + mô tả]. Confirm để tôi bắt đầu."
```

---

## Notes

- Phần `Instructions` ở trên là bản tổng hợp rút gọn từ tất cả steering files
- Nếu project đã fill `project-conventions.md` (sau brainstorm), nên append thêm nội dung đó vào instructions
- Không cần copy nguyên văn security-review hay documentation-review — chỉ dùng khi cần review cụ thể
