# API Reference

> Cập nhật file này mỗi khi thêm hoặc sửa endpoint.
> Frontend gọi qua Vite proxy: `/api/...` → `backend:3000/...`

---

## Auth

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
