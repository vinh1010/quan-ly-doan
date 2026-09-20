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
