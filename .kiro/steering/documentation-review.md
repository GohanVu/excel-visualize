---
inclusion: manual
---

# Documentation Review Guide

## Mục đích
File này được dùng khi cần review và cập nhật documentation của project. Đảm bảo docs luôn khớp với source code hiện tại.

## Khi nào dùng
- Review định kỳ (weekly/bi-weekly)
- Sau khi hoàn thành một phase trong plan
- Khi phát hiện doc outdated
- Trước khi onboard team member mới

## Nguồn thông tin để review

Khi review documentation, KHÔNG chỉ scan source code. Phải tham khảo thêm:
1. **Audit log** (`docs/audit-log.md`) — Lịch sử quyết định và thay đổi
2. **Git history** — Các commit gần đây
3. **Plan** (`docs/plan.md`) — Context về tại sao feature được thiết kế như vậy
4. **Brainstorm** (`docs/brainstorm.md`) — Ý tưởng ban đầu và lý do chọn approach

## Checklist Documentation Review

### Completeness
- [ ] README.md có đầy đủ thông tin setup
- [ ] Tất cả public APIs có documentation
- [ ] Architecture decision records (ADRs) được cập nhật
- [ ] Environment variables được document
- [ ] Database schema có documentation

### Accuracy
- [ ] API docs khớp với implementation hiện tại
- [ ] Setup instructions vẫn hoạt động
- [ ] Config examples đúng format
- [ ] Code examples trong docs chạy được
- [ ] Dependency versions trong docs khớp với thực tế

### Consistency
- [ ] Terminology nhất quán across docs
- [ ] Format và style nhất quán
- [ ] Links không bị broken
- [ ] Diagrams khớp với architecture hiện tại

### Coverage
- [ ] Mỗi module/service có doc riêng
- [ ] Error handling documentation
- [ ] Deployment process documentation
- [ ] Troubleshooting guide

## Output Format

Khi chạy documentation review, tạo report tại:
```
docs/doc-reviews/YYYY-MM-DD-doc-review.md
```

Report phải bao gồm:
1. **Summary** — Tổng quan tình trạng docs
2. **Outdated Docs** — Docs cần cập nhật, lý do
3. **Missing Docs** — Docs cần tạo mới
4. **Inconsistencies** — Mâu thuẫn giữa doc và code
5. **Action Items** — Danh sách việc cần làm, ưu tiên

## Quy trình sau review
1. Tạo report file trong `docs/doc-reviews/`
2. Mở session mới và yêu cầu: "Update documentation theo doc review report mới nhất"
3. Ghi lại vào audit log
