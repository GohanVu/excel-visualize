# Project Conventions & Patterns

## Mục đích
File này định hướng AI (Kiro) hiểu các quy ước riêng của project. Khi implement bất kỳ tính năng nào, AI PHẢI tuân theo các pattern đã được thiết lập ở đây.

> **NOTE:** File này được fill SAU brainstorm session đầu tiên. AI sẽ cập nhật dựa trên tech stack đã chọn.

## Nguyên tắc chung

1. **Reuse trước, tạo mới sau**: Trước khi tạo bất kỳ service/utility/pattern nào mới, PHẢI kiểm tra xem project đã có pattern tương tự chưa. Nếu có → reuse.
2. **Đọc context trước khi code**: Luôn đọc audit log, plan, và các steering files trước khi bắt đầu implement.
3. **Ghi lại quyết định**: Mọi quyết định kỹ thuật quan trọng phải được ghi vào audit log.

## Tham chiếu bắt buộc

Khi bắt đầu một session mới hoặc implement task mới, AI PHẢI đọc:
- `docs/audit-log.md` — Lịch sử làm việc với AI
- `docs/plan.md` — Plan, roadmap, phases, tasks
- `docs/brainstorm.md` — Kết quả brainstorm ban đầu (nếu có)
- `.kiro/steering/` — Tất cả steering files

## Tech Stack
<!-- Fill sau brainstorm -->
- [ ] Frontend:
- [ ] Backend:
- [ ] Database:
- [ ] Auth:
- [ ] Deployment:

## Database Conventions
- [ ] ORM / Query builder:
- [ ] Migration tool:
- [ ] Naming convention (tables, columns):
- [ ] Soft delete pattern:

## API Conventions
- [ ] API style (REST / GraphQL / gRPC):
- [ ] Prefix:
- [ ] Versioning strategy:
- [ ] Error response format:
- [ ] Authentication method:
- [ ] Schema validation:
- [ ] Router/Controller pattern:
- Khi thêm/sửa API → PHẢI update API documentation

## Frontend Conventions
- [ ] Component library / UI framework:
- [ ] State management:
- [ ] Routing:
- [ ] Styling approach (CSS modules / Tailwind / styled-components):
- [ ] Form handling:
- [ ] API client (axios / fetch / tanstack-query):

## Queue / Background Jobs
<!-- Cập nhật khi project có queue -->
- [ ] Queue system:
- [ ] Job naming convention:
- [ ] Retry policy:
- [ ] Dead letter queue:
- Nếu project đã có queue system → PHẢI reuse, KHÔNG tự tạo mechanism khác.

## Event System
<!-- Cập nhật khi project có event-driven architecture -->
- [ ] Event bus / broker:
- [ ] Event naming convention:
- [ ] Event schema:

## Security & IAM
- Tham chiếu: `.kiro/steering/security-review.md`
- [ ] Authentication flow:
- [ ] Password hashing:
- [ ] RBAC pattern:
- [ ] Secret management:

## Testing
- [ ] Backend test framework:
- [ ] Frontend test framework:
- [ ] Test strategy:
- [ ] Convention: Mỗi bug fix PHẢI có test đi kèm
- [ ] Chạy backend tests:
- [ ] Chạy frontend tests:
- [ ] Coverage target:
- [ ] E2E tests:

## Logging
- [ ] Logging library:
- [ ] Log levels usage:
- [ ] Structured logging format:

## Documentation
- Tham chiếu: `.kiro/steering/documentation-review.md`
- Khi thay đổi code → kiểm tra doc liên quan có cần update không.
