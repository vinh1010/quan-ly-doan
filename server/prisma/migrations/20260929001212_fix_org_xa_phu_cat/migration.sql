-- Cố định địa bàn quản lý về đúng cấp Xã/Thôn theo yêu cầu: Xã Phú Cát làm cấp cao nhất
-- (bỏ Huyện phía trên), 13 thôn thật là đơn vị con trực tiếp. Đơn vị xã và 3 thôn giả định
-- trong dữ liệu mẫu ban đầu (Phúc Hạ, Phúc Thượng, THCS Phúc Cát) không khớp danh sách thật
-- nên đổi tên / xóa theo đúng thứ tự khóa ngoại RESTRICT vào Unit: EvaluationForward,
-- MemberEvaluation, DocumentForward, IncomingDocument, Member, AuditLog(qua User), Secretary, User.
--
-- Bản sửa lần 2: bản đầu tiên (chạy trên Render) thiếu bước dọn EvaluationForward/MemberEvaluation
-- (và các bảng phòng hờ Member/DocumentForward/IncomingDocument) nên bị chặn giữa chừng do những
-- đánh giá Đoàn viên thử đã tạo trước đó vẫn còn tham chiếu tới 3 đơn vị cũ. Lần chạy đó chưa đổi
-- được dữ liệu nào (Postgres tự rollback toàn bộ), nên bổ sung đủ bước rồi chạy lại là an toàn.

-- 1) Đổi tên đơn vị xã cũ thành "Xã Phú Cát", bỏ cha (Huyện) để trở thành cấp cao nhất.
UPDATE "Unit" SET "name" = 'Xã Phú Cát', "parentId" = NULL
WHERE "name" = 'Đoàn xã Phúc Cát';

-- Nếu môi trường nào đó chưa từng seed (không có "Đoàn xã Phúc Cát") thì tạo mới luôn.
INSERT INTO "Unit" ("name", "level", "parentId", "memberCount", "isActive", "createdAt", "updatedAt")
SELECT 'Xã Phú Cát', 'XA_PHUONG', NULL, 0, true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "Unit" WHERE "name" = 'Xã Phú Cát');

-- 2) Dọn dữ liệu mẫu gắn với 3 đơn vị cơ sở giả định cũ (không có trong danh sách thôn thật),
--    theo đúng thứ tự khóa ngoại RESTRICT/CASCADE để không bị chặn khi xóa Unit ở bước 3.

--    2a) Lịch sử chuyển tiếp đánh giá Đoàn viên có liên quan tới 1 trong 3 đơn vị cũ (dù đánh giá
--    hiện đang nằm ở đơn vị nào) — EvaluationForward.fromUnitId/toUnitId đều RESTRICT vào Unit.
DELETE FROM "EvaluationForward" WHERE "fromUnitId" IN (
  SELECT "id" FROM "Unit"
  WHERE "name" IN ('Đoàn cơ sở Thôn Phúc Hạ', 'Đoàn cơ sở Thôn Phúc Thượng', 'Đoàn cơ sở Trường THCS Phúc Cát')
) OR "toUnitId" IN (
  SELECT "id" FROM "Unit"
  WHERE "name" IN ('Đoàn cơ sở Thôn Phúc Hạ', 'Đoàn cơ sở Thôn Phúc Thượng', 'Đoàn cơ sở Trường THCS Phúc Cát')
);

--    2b) Đợt đánh giá Đoàn viên đang đứng tên 1 trong 3 đơn vị cũ (MemberEvaluation.unitId RESTRICT).
--    Xóa đợt này sẽ tự xóa theo điểm xếp loại (MemberGrade) và lịch sử chuyển tiếp còn sót (CASCADE).
DELETE FROM "MemberEvaluation" WHERE "unitId" IN (
  SELECT "id" FROM "Unit"
  WHERE "name" IN ('Đoàn cơ sở Thôn Phúc Hạ', 'Đoàn cơ sở Thôn Phúc Thượng', 'Đoàn cơ sở Trường THCS Phúc Cát')
);

--    2c) Đoàn viên đang đứng tên 1 trong 3 đơn vị cũ (Member.unitId RESTRICT) — phòng hờ, hiện có
--    thể chưa có dữ liệu nhưng dọn cho chắc để không chặn xóa Unit ở bước 3.
DELETE FROM "Member" WHERE "unitId" IN (
  SELECT "id" FROM "Unit"
  WHERE "name" IN ('Đoàn cơ sở Thôn Phúc Hạ', 'Đoàn cơ sở Thôn Phúc Thượng', 'Đoàn cơ sở Trường THCS Phúc Cát')
);

--    2d) Lịch sử chuyển tiếp công văn có liên quan tới 1 trong 3 đơn vị cũ (DocumentForward RESTRICT).
DELETE FROM "DocumentForward" WHERE "fromUnitId" IN (
  SELECT "id" FROM "Unit"
  WHERE "name" IN ('Đoàn cơ sở Thôn Phúc Hạ', 'Đoàn cơ sở Thôn Phúc Thượng', 'Đoàn cơ sở Trường THCS Phúc Cát')
) OR "toUnitId" IN (
  SELECT "id" FROM "Unit"
  WHERE "name" IN ('Đoàn cơ sở Thôn Phúc Hạ', 'Đoàn cơ sở Thôn Phúc Thượng', 'Đoàn cơ sở Trường THCS Phúc Cát')
);

--    2e) Công văn đang đứng tên 1 trong 3 đơn vị cũ (IncomingDocument.unitId RESTRICT) — xóa sẽ tự
--    xóa theo lịch sử chuyển tiếp còn sót của chính nó (CASCADE, phòng hờ thêm lần nữa).
DELETE FROM "IncomingDocument" WHERE "unitId" IN (
  SELECT "id" FROM "Unit"
  WHERE "name" IN ('Đoàn cơ sở Thôn Phúc Hạ', 'Đoàn cơ sở Thôn Phúc Thượng', 'Đoàn cơ sở Trường THCS Phúc Cát')
);

--    2f) Xóa nhật ký hoạt động của các tài khoản Bí thư thuộc 3 đơn vị đó trước (AuditLog.userId RESTRICT).
DELETE FROM "AuditLog" WHERE "userId" IN (
  SELECT s."userId" FROM "Secretary" s
  JOIN "Unit" u ON u."id" = s."unitId"
  WHERE u."name" IN ('Đoàn cơ sở Thôn Phúc Hạ', 'Đoàn cơ sở Thôn Phúc Thượng', 'Đoàn cơ sở Trường THCS Phúc Cát')
    AND s."userId" IS NOT NULL
);

--    2g) Xóa hồ sơ Bí thư thuộc 3 đơn vị đó (Secretary.unitId RESTRICT nên phải xóa trước khi xóa Unit).
DELETE FROM "Secretary" WHERE "unitId" IN (
  SELECT "id" FROM "Unit"
  WHERE "name" IN ('Đoàn cơ sở Thôn Phúc Hạ', 'Đoàn cơ sở Thôn Phúc Thượng', 'Đoàn cơ sở Trường THCS Phúc Cát')
);

--    2h) Xóa tài khoản đăng nhập gắn với hồ sơ Bí thư vừa xóa ở trên (lấy theo unitId cũ của User,
--    không liệt kê cứng tên đăng nhập, để đúng cả với môi trường có thêm tài khoản thử khác).
--    Tài khoản cấp trên (SUPERIOR/ADMIN) lỡ gán vào 1 trong 3 đơn vị này thì KHÔNG xóa, chỉ mất
--    đơn vị (unitId tự chuyển NULL theo khóa ngoại) — người dùng tự gán lại đơn vị khác nếu cần.
DELETE FROM "User" WHERE "role" = 'SECRETARY' AND "unitId" IN (
  SELECT "id" FROM "Unit"
  WHERE "name" IN ('Đoàn cơ sở Thôn Phúc Hạ', 'Đoàn cơ sở Thôn Phúc Thượng', 'Đoàn cơ sở Trường THCS Phúc Cát')
);

--    2i) Xóa 3 đơn vị cơ sở giả định cũ.
DELETE FROM "Unit"
WHERE "name" IN ('Đoàn cơ sở Thôn Phúc Hạ', 'Đoàn cơ sở Thôn Phúc Thượng', 'Đoàn cơ sở Trường THCS Phúc Cát');

-- 3) Xóa đơn vị Huyện cũ (không còn đơn vị con nào tham chiếu tới sau khi xã đã tách cha ở bước 1).
DELETE FROM "Unit" WHERE "name" = 'Huyện đoàn Phúc Thọ';

-- 4) Tạo 13 thôn thật là đơn vị con trực tiếp của Xã Phú Cát (bỏ qua nếu đã có tên trùng).
INSERT INTO "Unit" ("name", "level", "parentId", "memberCount", "isActive", "createdAt", "updatedAt")
SELECT t.name, 'CO_SO', (SELECT "id" FROM "Unit" WHERE "name" = 'Xã Phú Cát'), 0, true, now(), now()
FROM (VALUES
  ('Đoàn cơ sở Thôn Bạch Thạch'),
  ('Đoàn cơ sở Thôn Đông Hạ'),
  ('Đoàn cơ sở Thôn Đông Thượng'),
  ('Đoàn cơ sở Thôn Giã Cát'),
  ('Đoàn cơ sở Thôn Hòa Phú'),
  ('Đoàn cơ sở Thôn Hòa Trúc'),
  ('Đoàn cơ sở Thôn Long Phú'),
  ('Đoàn cơ sở Thôn Phú Mãn'),
  ('Đoàn cơ sở Thôn Phú Sơn'),
  ('Đoàn cơ sở Thôn Phú Thịnh'),
  ('Đoàn cơ sở Thôn Thắng Đầu'),
  ('Đoàn cơ sở Thôn Việt Yên'),
  ('Đoàn cơ sở Thôn Yên Thái')
) AS t(name)
WHERE NOT EXISTS (SELECT 1 FROM "Unit" u WHERE u."name" = t.name);
