# Quản lý Công tác Đoàn — Xã Phú Cát

Hệ thống quản lý nghiệp vụ công tác Đoàn TNCS Hồ Chí Minh, địa bàn cố định ở cấp Xã/Thôn (Xã Phú Cát + 13 thôn trực thuộc). FE (React + Vite + Tailwind) và BE (Express + Prisma + PostgreSQL) nằm chung 1 project, dùng npm workspaces.

## Tính năng chính
- Ban chấp hành đoàn cơ sở (hồ sơ Bí thư/Phó Bí thư), Quản lý tài khoản, Quản lý cán bộ cấp trên
- Nhận công văn (chuyển tiếp giữa các đơn vị, xác nhận đã xử lý)
- Danh sách Đoàn viên + Đánh giá, xếp loại Đoàn viên (chấm điểm theo từng người, chuyển lên cấp trên, duyệt khi đã ở cấp cao nhất)
- Trợ lý AI soạn thảo (Kế hoạch/Báo cáo + chuyển thành bài viết Fanpage) — dùng Gemini API
- Báo cáo – Thống kê, Nhật ký hoạt động
- 3 vai trò: **ADMIN**, **SUPERIOR** (cán bộ cấp trên), **SECRETARY** (Bí thư/Phó Bí thư)

## Yêu cầu
- Node.js 20+ (https://nodejs.org)
- PostgreSQL 16 — dùng Docker (`npm run db:up`) hoặc cài trực tiếp rồi sửa `DATABASE_URL` trong `server/.env`

## Cài đặt & chạy lần đầu
```bash
git clone <repo-url> quan-ly-doan
cd quan-ly-doan
cp server/.env.example server/.env   # sửa lại các giá trị bên dưới nếu cần
npm run db:up                        # bật Postgres bằng Docker (bỏ qua nếu đã tự cài Postgres)
npm run setup                        # cài package + tạo bảng + seed dữ liệu (xem mục dưới)
npm run dev                          # chạy cả API (:3000) và web (:5173)
```
Mở http://localhost:5173.

### Các biến trong `server/.env` cần biết
| Biến | Bắt buộc | Ghi chú |
|---|---|---|
| `DATABASE_URL` | ✅ | Chuỗi kết nối Postgres |
| `JWT_SECRET` | ✅ | Đổi thành chuỗi bí mật ngẫu nhiên bất kỳ |
| `SEED_USERNAME` / `SEED_PASSWORD` | ✅ | Tài khoản **SUPERIOR** (cán bộ cấp trên) mặc định, gán ở Xã Phú Cát |
| `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` | tùy chọn | Khai báo cả 2 để seed tạo thêm 1 tài khoản **ADMIN** đầu tiên |
| `GEMINI_API_KEY` | tùy chọn | Bật tính năng "Trợ lý AI soạn thảo" — lấy miễn phí tại https://aistudio.google.com/apikey. Để trống thì mục AI báo lỗi khi dùng, các chức năng khác vẫn chạy bình thường |
| `GEMINI_MODEL` | tùy chọn | Mặc định `gemini-3.5-flash-lite` (rẻ nhất) nếu để trống |

## Có sẵn data mẫu ngay sau khi `npm run setup` — không cần tự chạy SQL
Toàn bộ dữ liệu mẫu (cơ cấu Xã Phú Cát + 13 thôn, 13 Bí thư, 13 Phó Bí thư, 39 Đoàn viên, các đợt đánh giá, vài công văn mẫu) đã được viết sẵn thành **migration Prisma** trong `server/prisma/migrations/`. Lệnh `npm run setup` (chạy `prisma migrate dev`) tự động áp dụng toàn bộ migration này vào CSDL — **không cần mở psql/pgAdmin để chạy tay bất kỳ câu SQL nào**.

Sau khi setup xong, đăng nhập thử với:
- **Cán bộ cấp trên**: username theo `SEED_USERNAME` trong `.env` (mặc định `Doanxaphucat.hni`), mật khẩu theo `SEED_PASSWORD` (mặc định `Abc@123`)
- **Bí thư mẫu** (13 thôn): username dạng `bithu.<tênthônkhôngdấu>` (vd `bithu.bachthach`), mật khẩu `Abc123`
- **Phó Bí thư mẫu** (13 thôn): username dạng `pbt.<tênthônkhôngdấu>`, mật khẩu `Abc123`

Nếu muốn CSDL **sạch, không có data mẫu** (chỉ tạo đúng tài khoản cấp trên theo `.env`), đặt `SEED_SAMPLES=false` trong `server/.env` trước khi chạy `npm run setup` — lưu ý cách này chỉ bỏ qua phần mẫu bổ sung trong `seed.ts`, cơ cấu Xã Phú Cát + 13 thôn và data mẫu nằm trong migration vẫn luôn được tạo (đây là dữ liệu cố định của hệ thống, không phải data thử).

## Cấu trúc
```
client/   React: pages, components, api, hooks
server/   Express: routes, controllers, middleware, prisma/ (schema + migrations + seed.ts)
```

## Phân quyền
- **ADMIN**: xem và thao tác toàn bộ hệ thống, xem nhật ký của mọi người.
- **SUPERIOR** (Cán bộ Đoàn cấp trên): chỉ thao tác trong **đơn vị của mình và các đơn vị con** (gán ở Xã Phú Cát thì thấy cả 13 thôn; gán ở 1 thôn cụ thể thì chỉ thấy thôn đó). Áp dụng cho hồ sơ Bí thư, tài khoản, công văn, đánh giá, báo cáo. Dữ liệu ngoài phạm vi trả 404 (sửa/xóa/xem) hoặc 403 (thêm/chuyển sang đơn vị ngoài phạm vi). Chưa gán đơn vị thì không thấy dữ liệu nào. Chỉ xem nhật ký thao tác của chính mình.
- **SECRETARY** (Bí thư/Phó Bí thư): tự quản lý hồ sơ của mình, Danh sách Đoàn viên và Đánh giá, xếp loại Đoàn viên trong đơn vị mình. Không truy cập được Nhận công văn, Quản lý tài khoản, Quản lý cán bộ cấp trên, Báo cáo, Nhật ký hoạt động.

## Tạo tài khoản cán bộ cấp trên
- Trang **Quản trị → Quản lý cán bộ cấp trên**: ADMIN tạo được ADMIN hoặc cán bộ cấp trên ở mọi đơn vị; cán bộ cấp trên chỉ tạo và quản lý tài khoản thuộc đơn vị trong phạm vi của mình (khóa, kích hoạt, đặt lại mật khẩu).
- Tạo ADMIN đầu tiên: khai báo `SEED_ADMIN_USERNAME` và `SEED_ADMIN_PASSWORD` (trong `server/.env` hoặc biến môi trường trên host) rồi chạy seed. Nếu tài khoản đã tồn tại thì seed không ghi đè mật khẩu.

## Triển khai (Render + Neon)
Dự án đang chạy thật trên Render (`render.yaml`), CSDL PostgreSQL trên Neon. Lệnh khởi động (`npm run start -w server`) tự chạy `prisma migrate deploy && prisma db seed` mỗi lần deploy — chỉ cần khai báo đủ biến môi trường ở mục trên trên Render Dashboard (tab Environment), không cần thao tác gì thêm trên CSDL.
