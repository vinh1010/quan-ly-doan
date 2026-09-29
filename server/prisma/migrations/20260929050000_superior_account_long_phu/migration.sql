-- Tài khoản cán bộ cấp trên (SUPERIOR) thử nghiệm gán ở mức cơ sở (Thôn Long Phú), để xem
-- mô hình phân quyền: phạm vi bị giới hạn đúng 1 thôn này (không thấy các thôn khác / cấp Xã),
-- nhưng có đủ quyền quản trị trong phạm vi đó (công văn, tài khoản, Bí thư/Phó Bí thư, báo cáo...).

INSERT INTO "User" ("username", "passwordHash", "role", "fullName", "unitId", "status", "createdAt", "updatedAt")
SELECT 'captren.longphu', '$2a$10$xoKEb171QGZ90Foeb14C5.WOoftO8r2XXRUran/Bkwt0WhfuMA1vO', 'SUPERIOR',
  'Cán bộ Đoàn cấp trên - Thôn Long Phú', u.id, 'ACTIVE', now(), now()
FROM "Unit" u
WHERE u."name" = 'Đoàn cơ sở Thôn Long Phú'
  AND NOT EXISTS (SELECT 1 FROM "User" WHERE "username" = 'captren.longphu');
