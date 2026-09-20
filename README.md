# Quản lý Công tác Đoàn – Module 1 (Cán bộ Đoàn cấp trên)

FE (React + Vite + Tailwind) và BE (Express + Prisma + PostgreSQL) nằm chung một project, dùng npm workspaces.

## Yêu cầu
- Node.js 20+ (https://nodejs.org)
- PostgreSQL 16 — dùng Docker (`npm run db:up`) hoặc cài trực tiếp rồi sửa `DATABASE_URL` trong `server/.env`

## Chạy lần đầu
```bash
npm run db:up        # bật Postgres bằng Docker (bỏ qua nếu đã cài Postgres)
npm run setup        # cài package + tạo bảng + seed tài khoản
npm run dev          # chạy cả API (3000) và web (5173)
```
Mở http://localhost:5173. Tài khoản seed nằm trong `server/.env` (`SEED_USERNAME`, `SEED_PASSWORD`).

## Cấu trúc
```
client/   React: pages, components, api, hooks
server/   Express: routes, controllers, middleware, prisma/
```

## Phân quyền
- **ADMIN**: xem và thao tác toàn bộ, xem nhật ký của mọi người.
- **SUPERIOR** (Cán bộ Đoàn cấp trên): chỉ thao tác trong **đơn vị của mình và các đơn vị con** (cán bộ cấp huyện thấy cả các xã trực thuộc, cấp xã chỉ thấy xã mình). Áp dụng cho hồ sơ Bí thư, tài khoản, báo cáo, xuất Excel và danh sách đơn vị. Dữ liệu ngoài phạm vi trả 404 (sửa, xóa, xem) hoặc 403 (thêm, chuyển sang đơn vị ngoài phạm vi). Tài khoản chưa gán đơn vị thì không thấy dữ liệu nào. Chỉ xem nhật ký thao tác của chính mình.
- **SECRETARY** (Bí thư): chưa dùng được phần quản lý.
