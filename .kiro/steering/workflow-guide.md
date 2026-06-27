# Workflow Guide — Cách làm việc với AI

## Workflow chuẩn của project

```
Brainstorm → Lưu context → Tạo steering → Tạo plan → Implement theo phase
```

**KHÔNG** làm theo kiểu: Prompt → Code ngay

## 1. Brainstorm Phase

Khi bắt đầu project hoặc feature mới:
- Brainstorm ý tưởng, CHƯA implement gì
- AI hỏi ngược lại để clarify requirements
- So sánh technical stack, phân tích trade-offs
- Khi đã đủ ý tưởng → lưu vào `docs/brainstorm.md`
- Cập nhật steering nếu có quy ước mới

## 2. Planning Phase

Sau brainstorm, tạo plan tại `docs/plan.md` bao gồm:
- Phases (P1, P2, P3...)
- Tasks trong mỗi phase (T1, T2, T3...)
- Dependencies giữa các phase
- Critical path
- Timeline ước tính

**Lưu ý:** Phase 1 (Setup) LUÔN phải bao gồm:
- Environment isolation (venv / Docker / Devcontainer)
- Đảm bảo portability: clone → 1 command → chạy toàn bộ
- .gitignore chuẩn, không commit artifacts local
- Lock files cho dependencies (pin versions)

## 3. Implementation Phase

Khi implement từng task:
1. Đọc steering + plan + audit log
2. Xác nhận task cần làm
3. Implement
4. Ghi kết quả vào audit log
5. Update plan (đánh dấu task done)

## 4. Review Phase (định kỳ)

- Security review: Gọi `#security-review` steering
- Documentation review: Gọi `#documentation-review` steering
- Kết quả lưu thành report trong repo

## Audit Log Convention

Mỗi session làm việc, ghi vào `docs/audit-log.md`:

```markdown
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
```
