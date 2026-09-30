# Quản lý Công tác Đoàn — Xã Phú Cát

Hệ thống quản lý nghiệp vụ công tác Đoàn TNCS Hồ Chí Minh, địa bàn cố định ở cấp Xã/Thôn (Xã Phú Cát + 13 thôn trực thuộc). FE (React + Vite + Tailwind) và BE (Express + Prisma + PostgreSQL) nằm chung 1 project, dùng npm workspaces.

## Mô tả nghiệp vụ

**Bối cảnh & địa bàn quản lý.** Hệ thống phục vụ công tác Đoàn ở đúng phạm vi thực tế: **Xã Phú Cát** là cấp cao nhất (không có Huyện/Tỉnh phía trên trong hệ thống), quản lý trực tiếp **13 thôn** — mỗi thôn là 1 đơn vị Đoàn cơ sở, có Ban Chấp hành riêng (Bí thư + Phó Bí thư). Cơ cấu này cố định, không có màn hình để tự thêm/sửa đơn vị.

**Ba nhóm người dùng:**
- **Bí thư/Phó Bí thư Đoàn cơ sở** (vai trò SECRETARY) — phụ trách 1 thôn: quản lý hồ sơ cá nhân, lập danh sách Đoàn viên của thôn, chấm điểm đánh giá xếp loại hàng năm.
- **Cán bộ Đoàn cấp trên** (vai trò SUPERIOR) — thường gán ở cấp Xã: theo dõi/quản lý toàn bộ 13 thôn (hoặc 1 phạm vi hẹp hơn nếu được gán riêng), xử lý công văn, quản lý tài khoản, tổng hợp báo cáo.
- **Quản trị hệ thống** (vai trò ADMIN) — toàn quyền, không giới hạn theo địa bàn.

**Các luồng nghiệp vụ chính:**
1. **Ban chấp hành đoàn cơ sở** — hồ sơ từng Bí thư/Phó Bí thư (thông tin cá nhân, lý luận chính trị, nhiệm kỳ...); hết nhiệm kỳ hoặc chuyển công tác thì cập nhật/xóa hồ sơ.
2. **Danh sách Đoàn viên** — mỗi Bí thư thôn tự lập, cập nhật danh sách Đoàn viên do thôn mình quản lý.
3. **Đánh giá, xếp loại Đoàn viên** — theo năm, theo từng Đoàn viên (không phải số liệu tổng hợp). Bí thư thôn chấm điểm → **chuyển lên Xã**; ở Xã (cấp cao nhất) không chuyển tiếp được nữa mà chỉ **Duyệt** (chốt kết quả, khóa lại) hoặc chấm/sửa lại trước khi duyệt.
4. **Nhận công văn** — công văn đến được gán cho 1 đơn vị phụ trách, có thể **chuyển tiếp** sang đơn vị khác (kể cả giao xuống 1 thôn cụ thể xử lý); đơn vị đang phụ trách **xác nhận đã thực hiện** thì khóa lại, không sửa/chuyển tiếp được nữa.
5. **Quản lý tài khoản & phân quyền** — theo mô hình lồng nhau: ADMIN toàn quyền → cán bộ cấp trên theo đúng phạm vi địa bàn được gán (đơn vị mình + toàn bộ đơn vị con) → Bí thư/Phó Bí thư chỉ trong phạm vi thôn mình.
6. **Báo cáo – Thống kê** — tổng hợp số Bí thư/Phó Bí thư đang hoạt động và số Đoàn viên theo từng khu vực, xuất Excel/PDF.
7. **Trợ lý AI soạn thảo** — hỗ trợ Bí thư/Phó Bí thư giảm tải việc soạn văn bản: gợi ý khung nội dung Kế hoạch/Chương trình/Báo cáo tổng kết, và chuyển 1 văn bản đã có thành bài viết ngắn gọn để đăng Fanpage/Cổng thông tin xã.
8. **Nhật ký hoạt động** — ghi lại các thao tác quan trọng (tạo/sửa/xóa/chuyển tiếp/đăng nhập...) để tra cứu, truy vết khi cần.

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
