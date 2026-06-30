# Project Instructions

> File này được đọc tự động bởi OpenAI Codex và Google Antigravity.

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
5. Rà soát danh sách sự cố — Trước khi kết thúc bất kỳ task nào, đối chiếu với [docs/issues.md](file:///d:/Project/excel-visualize/docs/issues.md) để tránh lặp lại các lỗi cũ đã biết (đặc biệt là lỗi môi trường Windows/Docker như hot-reload, volume db).

## Nguyên tắc Karpathy cho AI (Karpathy-Inspired Guidelines)

Để tránh các lỗi logic và sập môi trường chạy, AI bắt buộc phải tuân theo 4 nguyên tắc sau:

1. **Nghĩ trước khi viết (Think Before Coding)**:
   - Không tự ý đưa ra giả định về cấu hình hệ thống hoặc môi trường chạy (Docker, DB, API).
   - Nếu có nhiều cách giải quyết hoặc có điểm chưa rõ, bắt buộc phải dừng lại liệt kê các giải pháp/trade-offs và hỏi ý kiến người dùng.

2. **Tối giản mã nguồn (Simplicity First)**:
   - Chỉ viết lượng code tối thiểu để giải quyết yêu cầu. Không tự vẽ thêm các tính năng, helper, hoặc config tương lai.
   - Nếu viết 200 dòng code mà có thể tối giản xuống 50 dòng, bắt buộc phải tối giản.

3. **Can thiệp chính xác (Surgical Changes)**:
   - Chỉ sửa đổi đúng vùng code liên quan trực tiếp đến task. Bất kỳ refactor hay dọn dẹp code xung quanh phải báo cáo trước.
   - Giữ nguyên format và style code hiện tại của dự án.

4. **Xác minh hướng mục tiêu (Goal-Driven)**:
   - Mọi thay đổi về schema, API hay logic nghiệp vụ đều phải đi kèm unit test / integration test.
   - Đối với dự án chạy Docker: Sau khi thêm file mới hoặc thay đổi config `.env`, bắt buộc phải khởi động lại các container tương ứng (`docker compose restart/up`) và kiểm tra log khởi động (`docker compose logs`) để đảm bảo hệ thống không bị crash trước khi kết thúc lượt.


## Files quan trọng phải đọc

- docs/brainstorm.md — Lịch sử brainstorm, lý do thiết kế
- docs/plan.md — Plan hiện tại, phases, tasks, status
- docs/audit-log.md — Nhật ký làm việc, quyết định đã có
- docs/issues.md — Bugs đã phát hiện, lessons learned
- .antigravity/steering/project-conventions.md — Quy ước kỹ thuật (DB, API, testing...)

## Audit Log Format

Sau mỗi session, ghi vào docs/audit-log.md:

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

## Plan Format

Tasks trong docs/plan.md dùng status:
- ⬜ Todo
- 🔄 In Progress
- ✅ Done
- ❌ Blocked
- ⏭️ Skipped

## Khi bắt đầu session mới

Trả lời: "Tôi đã đọc [list files đã đọc]. Task tiếp theo là [task ID + mô tả]. Confirm để tôi bắt đầu."
