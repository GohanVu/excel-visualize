---
inclusion: manual
---

# Security Review Guide

## Mục đích
File này được dùng khi cần chạy security review cho toàn bộ repository. Kết quả review sẽ được lưu thành report trong `docs/security-reports/`.

## Khi nào dùng
- Review định kỳ (weekly/monthly)
- Trước khi release
- Sau khi thêm tính năng liên quan authentication/authorization
- Khi onboard dependency mới

## Checklist Security Review

### Authentication & Authorization
- [ ] Tất cả endpoints có yêu cầu authentication phù hợp
- [ ] RBAC/permission checks đúng ở mọi layer
- [ ] Token expiration và refresh flow hoạt động đúng
- [ ] Session management an toàn

### Input Validation
- [ ] Tất cả user input được validate và sanitize
- [ ] SQL injection protection (parameterized queries)
- [ ] XSS protection
- [ ] CSRF protection
- [ ] File upload validation (type, size, content)

### Data Protection
- [ ] Sensitive data được encrypt at rest
- [ ] Sensitive data được encrypt in transit (TLS)
- [ ] PII handling tuân thủ policy
- [ ] Secrets không bị hardcode trong source code
- [ ] .env files không bị commit

### Dependencies
- [ ] Không có known vulnerabilities trong dependencies
- [ ] Dependencies được pin version
- [ ] Không có unnecessary dependencies

### Infrastructure
- [ ] Least privilege principle cho IAM roles
- [ ] Network security groups configured đúng
- [ ] Logging đầy đủ cho security events
- [ ] Rate limiting cho public endpoints

### API Security
- [ ] API keys được rotate định kỳ
- [ ] CORS configuration restrictive
- [ ] Request size limits
- [ ] Error messages không leak internal info

## Output Format

Khi chạy security review, tạo report tại:
```
docs/security-reports/YYYY-MM-DD-security-review.md
```

Report phải bao gồm:
1. **Summary** — Tổng quan kết quả
2. **Critical Issues** — Cần fix ngay
3. **High Issues** — Cần fix trước release
4. **Medium Issues** — Nên fix
5. **Low Issues** — Nice to have
6. **Recommendations** — Đề xuất cải thiện

## Quy trình sau review
1. Tạo report file trong `docs/security-reports/`
2. Mở session mới và yêu cầu: "Fix tất cả critical và high issues trong security report mới nhất"
3. Ghi lại vào audit log
