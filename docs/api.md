# API Reference

> Cập nhật file này mỗi khi thêm hoặc sửa endpoint.
> Frontend gọi qua Vite proxy: `/api/...` → `backend:3000/...`

---

## Auth

### POST /auth/register
Đăng ký bằng email + mật khẩu.  
**Auth**: không cần  
**Body**: `{ "email": "...", "password": "≥6 ký tự", "name": "..." }`  
**Set cookies**: `access_token` + `refresh_token` (như Google callback)  
**Response**: user đã sanitize (không có passwordHash / encryptedRefreshToken)  
**Errors**: `409` nếu email đã tồn tại

---

### POST /auth/login
Đăng nhập bằng email + mật khẩu.  
**Auth**: không cần  
**Body**: `{ "email": "...", "password": "..." }`  
**Set cookies**: `access_token` + `refresh_token`  
**Response**: user đã sanitize  
**Errors**: `401` nếu sai email/mật khẩu

---

### GET /auth/google
Bắt đầu Google OAuth2 flow.  
**Auth**: không cần  
**Redirect**: Google consent screen → `/auth/google/callback`

---

### GET /auth/google/callback
Callback sau khi Google xác thực.  
**Auth**: không cần  
**Set cookies**: `access_token` (15m, httpOnly), `refresh_token` (7d, httpOnly, path=/auth/refresh)  
**Redirect**: `FRONTEND_URL/dashboard`

---

### POST /auth/refresh
Lấy access token mới từ refresh token.  
**Auth**: cookie `refresh_token` (tự động gửi khi path khớp)  
**Set cookie**: `access_token` mới  
**Response**: `200 OK`

---

### POST /auth/logout
Xoá cả 2 cookies.  
**Auth**: không cần  
**Response**: `200 OK`

---

### GET /auth/me
Trả về user hiện tại.  
**Auth**: JWT (cookie `access_token`)  
**Response**:
```json
{
  "id": "string",
  "email": "string",
  "name": "string",
  "avatarUrl": "string | null",
  "role": "user | admin",
  "createdAt": "ISO date"
}
```

---

## Datasets

> Tất cả endpoints `/datasets/*` đều yêu cầu JWT.

### POST /datasets/presign
Tạo presigned PUT URL để upload file lên MinIO.  
**Auth**: JWT  
**Body**:
```json
{
  "filename": "report.xlsx",
  "contentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "fileSize": 102400
}
```
**Allowed contentType**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/vnd.ms-excel`, `text/csv`  
**Size limit**: 10MB (free) / 50MB (pro)  
**Response**:
```json
{
  "presignedUrl": "http://localhost:9000/chartly-datasets/user-id/...",
  "objectKey": "user-id/1719500000000-abc123.xlsx"
}
```
**Errors**: `400` nếu file quá lớn hoặc extension không hợp lệ

---

### POST /datasets
Xác nhận upload thành công, tạo Dataset record trong DB.  
**Auth**: JWT  
**Body**:
```json
{
  "objectKey": "user-id/1719500000000-abc123.xlsx",
  "originalFilename": "report.xlsx",
  "fileSize": 102400,
  "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
}
```
**Response**: Dataset object
```json
{
  "id": "cuid",
  "userId": "string",
  "name": "report",
  "originalName": "report.xlsx",
  "mimeType": "string",
  "sizeBytes": 102400,
  "minioKey": "user-id/...",
  "rowCount": null,
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### GET /datasets
Lấy danh sách datasets của user hiện tại.  
**Auth**: JWT  
**Response**: `Dataset[]` (sorted by `createdAt` desc)

---

### DELETE /datasets/:id
Xoá dataset (file) của user.  
**Auth**: JWT  
**Side effects**: xoá kèm charts của dataset (Chart.datasetId là Restrict) + columns + study_progress (cascade) + object trên MinIO (best-effort)  
**Response**: `{ "id": "...", "deleted": true }`  
**Errors**: `404` nếu không phải của user

---

### GET /datasets/:id/columns
Parse file → trả tổng quan cột (kiểu, confidence), preview, danh sách tab.  
**Auth**: JWT  
**Query**:
- `sheet` (optional) — tên tab cần đọc; không truyền → tab đầu tiên
- `headerRow` (optional) — ép dòng header (0-based, user override khi auto sai); clamp trong range

**Response**:
```json
{
  "datasetId": "cuid",
  "name": "report",
  "totalRows": 500,
  "sheets": ["HSK 1", "214 bộ thủ"],
  "activeSheet": "HSK 1",
  "headerRowIndex": 1,
  "headerConfident": false,
  "learnable": true,
  "columns": [
    { "name": "STT", "index": 0, "type": "number", "confidence": 1, "sampleValues": ["1", "2", "3"] }
  ],
  "previewRows": [ { "STT": "1" } ]
}
```
**Ghi chú**: `headerConfident=false` / `confidence` thấp → FE gợi ý user xác nhận. Cột rỗng hoàn toàn bị loại; header trống → tên `Cột N`. `learnable=true` khi ≥2 cột chữ (string/category) → FE hiện lối vào "Học" (flashcard/quiz).

---

### GET /datasets/:id/rows
Trả toàn bộ dòng (key theo tên hiển thị) để render chart full / flashcard.  
**Auth**: JWT  
**Query**: `sheet` + `headerRow` (optional) — PHẢI khớp với view ở /columns, nếu không key cột lệch → giá trị rỗng (Issue-008)  
**Response**:
```json
{ "datasetId": "cuid", "rows": [ { "STT": "1", "Chữ Hán": "八" } ] }
```

---

### POST /datasets/:id/suggest
Nhận cột đã chọn → trả danh sách chart gợi ý (tối đa 4, mô tả tiếng Việt).  
**Auth**: JWT  
**Body**:
```json
{
  "columns": [0, 1],
  "sheet": "HSK 1",
  "headerRow": 1,
  "typeOverrides": [{ "index": 0, "type": "category" }]
}
```
`columns`: mảng index cột (≥1). `sheet`/`headerRow` (optional): khớp view ở /columns. `typeOverrides` (optional): kiểu cột user sửa tay (`date|number|string|category`).  
**Response**:
```json
{
  "datasetId": "cuid",
  "suggestions": [
    { "type": "line", "title": "Xu hướng theo thời gian", "description": "...", "encoding": { "x": "Ngày", "y": ["Doanh thu"] } }
  ]
}
```

---

## Charts

> Tất cả endpoints `/charts/*` đều yêu cầu JWT.

### POST /charts
Lưu chart vào dashboard mặc định (tự tạo nếu chưa có).  
**Auth**: JWT  
**Body**:
```json
{ "datasetId": "cuid", "type": "line", "title": "Doanh thu", "config": { } }
```
`config`: ECharts option (JSONB).  
**Response**: `{ "chart": { "id": "cuid", ... }, "dashboardId": "cuid" }`  
**Quota (Free tier gate)**: gói Free tối đa **3 biểu đồ/dashboard** → biểu đồ thứ 4 trả `400` với message nudge nâng cấp Pro. Pro không giới hạn.

---

### GET /charts
Lấy các chart đã lưu của user (qua dashboard), cũ → mới.  
**Auth**: JWT  
**Response**:
```json
{ "charts": [ { "id": "cuid", "type": "line", "title": "...", "config": { }, "position": { }, "createdAt": "ISO date" } ], "limit": 3 }
```
`limit`: số biểu đồ tối đa/dashboard theo gói (Free=3, Pro=`null` = không giới hạn) — FE dùng để hiện locked slot (P2-T4).

---

### PATCH /charts/layout
Lưu vị trí/kích thước các chart sau khi kéo-thả/resize (react-grid-layout). updateMany lọc `dashboard.userId` (owner-guard).  
**Auth**: JWT  
**Body**:
```json
{ "layout": [ { "id": "cuid", "x": 0, "y": 0, "w": 6, "h": 7 } ] }
```
**Response**: `{ "updated": 2 }`

---

### PATCH /charts/:id
Cập nhật 1 chart từ panel tuỳ chỉnh (P2-T5): đổi tiêu đề và/hoặc config (màu, nền). Chỉ field gửi lên mới bị ghi đè. updateMany lọc `dashboard.userId` (owner-guard).  
**Auth**: JWT  
**Body** (cả hai optional):
```json
{ "title": "Tên mới", "config": { } }
```
`config`: ECharts option đầy đủ (JSONB) đã áp bảng màu/nền.  
**Response**: `{ "updated": true }`  
**Lỗi**: `404` nếu chart không thuộc về user.

---

### DELETE /charts/:id
Xoá 1 chart khỏi dashboard. deleteMany lọc `dashboard.userId` (owner-guard).  
**Auth**: JWT  
**Response**: `{ "deleted": true }`  
**Lỗi**: `404` nếu chart không thuộc về user.

---

## Dashboards

> Hiện mỗi user có 1 dashboard mặc định (tạo lười khi lưu chart đầu tiên). Tất cả yêu cầu JWT.

### GET /dashboards/default
Dashboard mặc định (đầu tiên theo thứ tự tạo) của user.  
**Auth**: JWT  
**Response**: `{ "dashboard": { "id": "cuid", "name": "Dashboard của tôi" } | null }` (null nếu chưa lưu chart nào).

---

### PATCH /dashboards/:id
Đổi tên dashboard (P2-T7). updateMany lọc `userId` (owner-guard). Tên được trim; rỗng → `400`.  
**Auth**: JWT  
**Body**:
```json
{ "name": "Báo cáo doanh số 2026" }
```
**Response**: `{ "id": "cuid", "name": "Báo cáo doanh số 2026" }`  
**Lỗi**: `400` tên rỗng; `404` nếu dashboard không thuộc về user.

---

## Study Progress

> Tiến độ học (flashcard/quiz) per user/dataset/sheet/thẻ. Tất cả yêu cầu JWT.
> `cardKey` do FE tính (hash giá trị dòng) — ổn định qua re-parse (đổi header/sheet).

### POST /study-progress
Lưu/cập nhật tiến độ 1 thẻ (upsert theo `userId+datasetId+sheet+cardKey`). seenCount tăng mỗi lần ôn.  
**Auth**: JWT  
**Body**:
```json
{ "datasetId": "cuid", "sheet": "HSK 1", "cardKey": "hash", "status": "known" }
```
`sheet` optional (mặc định `""`). `status`: `new | learning | known`.  
**Response**: bản ghi `StudyProgress` (id, status, seenCount, lastReviewedAt, ...).  
**Lỗi**: `404` nếu dataset không thuộc về user.

---

### GET /study-progress/:datasetId
Đọc tiến độ của 1 dataset (theo tab). FE map theo `cardKey` để hiện "đã thuộc X/Y".  
**Auth**: JWT  
**Query**: `sheet` (optional, mặc định `""`)  
**Response**:
```json
{ "items": [ { "cardKey": "hash", "status": "known", "seenCount": 2, "lastReviewedAt": "ISO date" } ] }
```
**Lỗi**: `404` nếu dataset không thuộc về user.

---

## Admin

> Tất cả endpoints `/admin/*` đều yêu cầu JWT và quyền admin (`role === 'admin'`).

### GET /admin/users
Lấy danh sách tất cả người dùng trong hệ thống kèm thông tin gói đăng ký (subscription).  
**Auth**: JWT (Role: admin)  
**Response**: `UserItem[]`
```json
[
  {
    "id": "string",
    "email": "string",
    "name": "string | null",
    "avatarUrl": "string | null",
    "role": "user | admin",
    "createdAt": "ISO date",
    "updatedAt": "ISO date",
    "subscription": {
      "plan": "free | pro",
      "status": "active | canceled | past_due",
      "currentPeriodEnd": "ISO date | null"
    } | null
  }
]
```

---

### PATCH /admin/users/:id/plan
Thay đổi (override) gói đăng ký của một người dùng cụ thể. Hành động này sẽ được ghi nhận vào nhật ký hệ thống (audit log).  
**Auth**: JWT (Role: admin)  
**Body**:
```json
{
  "plan": "free | pro"
}
```
**Response**: Bản ghi `Subscription` sau khi cập nhật.

---

### GET /admin/stats
Lấy các số liệu thống kê tổng quan của hệ thống phục vụ dashboard quản trị.  
**Auth**: JWT (Role: admin)  
**Response**:
```json
{
  "totalUsers": 10,
  "totalCharts": 25,
  "totalDatasets": 15,
  "proUsers": 3
}
```

---

### GET /admin/audit-logs
Lấy danh sách nhật ký hoạt động của toàn hệ thống (phân trang).  
**Auth**: JWT (Role: admin)  
**Query**:
- `page` (optional, mặc định `1`) — số trang
- `limit` (optional, mặc định `50`) — số bản ghi mỗi trang
**Response**:
```json
{
  "logs": [
    {
      "id": "string",
      "userId": "string | null",
      "action": "string",
      "entity": "string | null",
      "entityId": "string | null",
      "metadata": {},
      "ipAddress": "string | null",
      "createdAt": "ISO date",
      "user": {
        "email": "string",
        "name": "string | null"
      } | null
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 50,
  "totalPages": 2
}
```

---

## Upload Flow (end-to-end)

```
1. POST /datasets/presign  →  nhận { presignedUrl, objectKey }
2. PUT {presignedUrl}       →  upload file thẳng lên MinIO (không qua backend)
3. POST /datasets           →  tạo record trong DB, nhận Dataset object
4. Navigate /datasets/{id}/columns
```

---

## Error Format

NestJS default:
```json
{
  "statusCode": 400,
  "message": "Mô tả lỗi",
  "error": "Bad Request"
}
```

---

## Status Codes

| Code | Nghĩa |
|------|-------|
| 200 | OK |
| 201 | Created (POST tạo resource) |
| 400 | Bad Request (validation fail) |
| 401 | Unauthorized (không có / hết hạn JWT) |
| 403 | Forbidden (không đủ quyền) |
| 500 | Internal Server Error |
