# Kiro Project Template

> Template khởi đầu cho các dự án sử dụng AI (Kiro) làm coding partner.
> Clone → brainstorm → plan → implement. Không code tay từ đầu.

## Cấu trúc

```
.kiro/
└── steering/
    ├── workflow-guide.md          ← Quy trình làm việc với AI
    ├── project-conventions.md     ← Quy ước kỹ thuật (fill sau brainstorm)
    ├── security-review.md         ← Checklist security review
    └── documentation-review.md    ← Checklist documentation review

docs/
├── brainstorm.md                  ← Ghi lại brainstorm sessions
├── plan.md                        ← Plan & roadmap (phases, tasks)
├── audit-log.md                   ← Nhật ký làm việc với AI
├── issues.md                      ← Bug tracking & lessons learned
├── security-reports/.gitkeep      ← Output security reviews
└── doc-reviews/.gitkeep           ← Output doc reviews
```

## Cách sử dụng

### Bước 1: Clone / Use Template
```bash
# Option A: GitHub "Use this template"
# Option B: Clone
git clone https://github.com/YOUR_USERNAME/kiro-project-template.git my-new-project
cd my-new-project
rm -rf .git && git init
```

### Bước 2: Brainstorm
Mở Kiro và bắt đầu:
```
"Tôi muốn build [mô tả project]. Brainstorm cùng tôi."
```
AI sẽ:
- Hỏi clarify requirements
- So sánh tech stack
- Phân tích trade-offs
- Ghi kết quả vào `docs/brainstorm.md`

### Bước 3: Planning
Sau brainstorm, yêu cầu:
```
"Tạo plan cho project này"
```
AI sẽ:
- Tạo phases & tasks trong `docs/plan.md`
- Fill `project-conventions.md` với tech stack đã chọn

### Bước 4: Implement
```
"Bắt đầu implement T1"
```
AI sẽ implement theo plan, ghi audit log sau mỗi session.

## Workflow tổng quan

```
Brainstorm → Lưu context → Tạo steering → Tạo plan → Implement theo phase
                                                              ↓
                                                    Review (security/doc)
```

## Conventions

- Steering files luôn được AI đọc tự động (trừ file có `inclusion: manual`)
- Mỗi session làm việc → ghi audit log
- Mỗi bug fix → phải có test đi kèm
- Mỗi quyết định kỹ thuật → ghi lại lý do

## Tips

- **Đừng vội code** — brainstorm đầy đủ trước, càng nhiều context AI có càng code tốt
- **Dùng `#` context** — tag file khi chat để AI đọc đúng file cần thiết
- **Review định kỳ** — gọi `#security-review` hoặc `#documentation-review` để review
- **Ghi issues** — khi phát hiện bug, ghi vào issues.md trước khi fix

