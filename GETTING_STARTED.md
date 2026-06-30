# Getting Started — Hướng dẫn sử dụng template

## Trước khi bắt đầu

Bạn cần:
- [Antigravity](https://github.com/google-deepmind) (AI-powered Coding Assistant)
- Git
- Ý tưởng project muốn build 🚀

## Bước 1: Clone template

```bash
# GitHub "Use this template" button hoặc:
git clone https://github.com/YOUR_USERNAME/antigravity-project-template.git my-project
cd my-project
rm -rf .git
git init
git add .
git commit -m "init: from antigravity-project-template"
```

## Bước 2: Brainstorm

Mở Antigravity và chat:

```
Tôi muốn build [mô tả project]. Brainstorm cùng tôi.
```

**AI sẽ:**
1. Hỏi clarify requirements (platform, users, features...)
2. Đề xuất tech stack + so sánh trade-offs
3. Draft database schema
4. Xác nhận MVP features

**Bạn nên:**
- Trả lời cụ thể, đừng nói "terserah"
- Nếu không biết → nói "tư vấn giúp tôi"
- Khi ổn → bảo AI "ghi lại vào brainstorm"

## Bước 3: Plan

Sau brainstorm:

```
Tạo plan cho project này, chia phases và tasks
```

**AI sẽ:**
- Tạo phases trong `docs/plan.md`
- Fill `project-conventions.md` với tech stack đã chọn
- Xác định critical path

## Bước 4: Implement

```
Bắt đầu implement Phase 1
```

hoặc cụ thể hơn:

```
Implement T1: [mô tả task]
```

**Sau mỗi session, AI sẽ ghi audit log.**

## Bước 5: Review (định kỳ)

Khi muốn review security:
```
#security-review — Chạy security review cho project
```

Khi muốn review docs:
```
#documentation-review — Review documentation
```

## Tips & Tricks

### 💡 Context là tất cả
AI càng có nhiều context → code càng tốt. Đó là lý do template này tồn tại.

### 💡 Brainstorm kỹ
Đừng vội code. 30 phút brainstorm tốt = tiết kiệm hàng giờ debug sau.

### 💡 Ghi issues
Phát hiện bug? Ghi vào `docs/issues.md` trước. AI sẽ đọc và tránh lặp.

### 💡 Đừng xóa audit log
Audit log là "bộ nhớ" của AI giữa các session. Xóa = mất context.

### 💡 Steering có thể thêm
Nếu project có quy ước riêng (VD: code style, naming convention) → thêm file `.md` mới trong `.antigravity/steering/`.

## FAQ

**Q: AI không đọc steering?**
A: Kiểm tra file không có `inclusion: manual` trong front-matter. Mặc định steering luôn được đọc.

**Q: AI quên context session trước?**
A: Bảo AI "đọc audit log và plan trước khi tiếp tục". Template đã có rule này nhưng nhắc lại không thừa.

**Q: Muốn thêm team member?**
A: Share repo. Steering + docs = đủ context cho AI mới hiểu project. Chạy `#documentation-review` trước khi onboard.
