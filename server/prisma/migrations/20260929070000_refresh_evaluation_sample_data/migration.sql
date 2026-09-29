-- Xóa dữ liệu Đánh giá Đoàn viên mẫu cũ (13 đợt năm 2026, cascade xóa theo MemberGrade +
-- EvaluationForward), tạo lại data mới đa dạng trạng thái để test luồng Duyệt vừa thêm:
-- - 8 thôn: đợt còn ở thôn (chưa chuyển) — thử Chấm điểm/Sửa/Chuyển lên.
-- - 3 thôn: đợt đã chuyển lên Xã, đang chờ — thử nút Duyệt.
-- - 2 thôn: đợt đã chuyển lên Xã VÀ đã duyệt — xem trạng thái khóa + nút Mở lại.

-- 1) Xóa toàn bộ đợt đánh giá mẫu cũ.
DELETE FROM "MemberEvaluation" WHERE "deletedAt" IS NULL;

-- 2) Nhóm A (8 thôn) — đợt còn ở thôn, chưa chuyển.
INSERT INTO "MemberEvaluation" ("year", "note", "status", "unitId", "createdById", "createdAt", "updatedAt")
SELECT 2026, NULL, 'DANG_THUC_HIEN', u.id, usr.id, now(), now()
FROM (VALUES
  ('Đoàn cơ sở Thôn Bạch Thạch', 'bithu.bachthach'),
  ('Đoàn cơ sở Thôn Đông Hạ', 'bithu.dongha'),
  ('Đoàn cơ sở Thôn Đông Thượng', 'bithu.dongthuong'),
  ('Đoàn cơ sở Thôn Giã Cát', 'bithu.giacat'),
  ('Đoàn cơ sở Thôn Hòa Phú', 'bithu.hoaphu'),
  ('Đoàn cơ sở Thôn Hòa Trúc', 'bithu.hoatruc'),
  ('Đoàn cơ sở Thôn Long Phú', 'bithu.longphu'),
  ('Đoàn cơ sở Thôn Phú Mãn', 'bithu.phuman')
) AS v(unitname, username)
JOIN "Unit" u ON u."name" = v.unitname
JOIN "User" usr ON usr."username" = v.username;

-- 3) Nhóm B (3 thôn) — đợt đã chuyển lên Xã, đang chờ duyệt.
INSERT INTO "MemberEvaluation" ("year", "note", "status", "unitId", "createdById", "createdAt", "updatedAt")
SELECT 2026, NULL, 'DANG_THUC_HIEN', xa.id, usr.id, now(), now()
FROM (VALUES
  ('bithu.phuson'),
  ('bithu.phuthinh'),
  ('bithu.thangdau')
) AS v(username)
JOIN "User" usr ON usr."username" = v.username
JOIN "Unit" xa ON xa."name" = 'Xã Phú Cát';

INSERT INTO "EvaluationForward" ("evaluationId", "fromUnitId", "toUnitId", "forwardedById", "note", "createdAt")
SELECT e.id, thon.id, xa.id, usr.id, NULL, now()
FROM (VALUES
  ('Đoàn cơ sở Thôn Phú Sơn', 'bithu.phuson'),
  ('Đoàn cơ sở Thôn Phú Thịnh', 'bithu.phuthinh'),
  ('Đoàn cơ sở Thôn Thắng Đầu', 'bithu.thangdau')
) AS v(unitname, username)
JOIN "Unit" thon ON thon."name" = v.unitname
JOIN "Unit" xa ON xa."name" = 'Xã Phú Cát'
JOIN "User" usr ON usr."username" = v.username
JOIN "MemberEvaluation" e ON e."unitId" = xa.id AND e."createdById" = usr.id AND e."year" = 2026;

-- 4) Nhóm C (2 thôn) — đợt đã chuyển lên Xã VÀ đã duyệt (trạng thái cuối, khóa).
INSERT INTO "MemberEvaluation" ("year", "note", "status", "unitId", "createdById", "createdAt", "updatedAt")
SELECT 2026, NULL, 'DA_DUYET', xa.id, usr.id, now(), now()
FROM (VALUES
  ('bithu.vietyen'),
  ('bithu.yenthai')
) AS v(username)
JOIN "User" usr ON usr."username" = v.username
JOIN "Unit" xa ON xa."name" = 'Xã Phú Cát';

INSERT INTO "EvaluationForward" ("evaluationId", "fromUnitId", "toUnitId", "forwardedById", "note", "createdAt")
SELECT e.id, thon.id, xa.id, usr.id, NULL, now()
FROM (VALUES
  ('Đoàn cơ sở Thôn Việt Yên', 'bithu.vietyen'),
  ('Đoàn cơ sở Thôn Yên Thái', 'bithu.yenthai')
) AS v(unitname, username)
JOIN "Unit" thon ON thon."name" = v.unitname
JOIN "Unit" xa ON xa."name" = 'Xã Phú Cát'
JOIN "User" usr ON usr."username" = v.username
JOIN "MemberEvaluation" e ON e."unitId" = xa.id AND e."createdById" = usr.id AND e."year" = 2026 AND e."status" = 'DA_DUYET';

-- 5) Xếp loại cho từng Đoàn viên (39 người, đã có sẵn ở bảng Member) trong đúng đợt của thôn mình,
-- bất kể đợt hiện đang ở thôn hay đã chuyển lên Xã (nối theo createdById để xác định đúng đợt).
INSERT INTO "MemberGrade" ("evaluationId", "memberId", "grade", "createdAt", "updatedAt")
SELECT e.id, m.id, v.grade::"MemberGradeValue", now(), now()
FROM (VALUES
  ('Đoàn cơ sở Thôn Bạch Thạch', 'bithu.bachthach', 'Nguyễn Thị Mai', 'TOT'),
  ('Đoàn cơ sở Thôn Bạch Thạch', 'bithu.bachthach', 'Trần Văn Nam', 'KHA'),
  ('Đoàn cơ sở Thôn Bạch Thạch', 'bithu.bachthach', 'Lê Thị Hương', 'XUAT_SAC'),
  ('Đoàn cơ sở Thôn Đông Hạ', 'bithu.dongha', 'Phạm Văn Long', 'TOT'),
  ('Đoàn cơ sở Thôn Đông Hạ', 'bithu.dongha', 'Hoàng Thị Linh', 'TOT'),
  ('Đoàn cơ sở Thôn Đông Hạ', 'bithu.dongha', 'Vũ Văn Đạt', 'KHA'),
  ('Đoàn cơ sở Thôn Đông Thượng', 'bithu.dongthuong', 'Đặng Thị Thảo', 'XUAT_SAC'),
  ('Đoàn cơ sở Thôn Đông Thượng', 'bithu.dongthuong', 'Bùi Văn Khoa', 'TOT'),
  ('Đoàn cơ sở Thôn Đông Thượng', 'bithu.dongthuong', 'Ngô Thị Yến', 'KHA'),
  ('Đoàn cơ sở Thôn Giã Cát', 'bithu.giacat', 'Dương Văn Hiếu', 'TOT'),
  ('Đoàn cơ sở Thôn Giã Cát', 'bithu.giacat', 'Lý Thị Nhung', 'TOT'),
  ('Đoàn cơ sở Thôn Giã Cát', 'bithu.giacat', 'Đỗ Văn Tài', 'TRUNG_BINH'),
  ('Đoàn cơ sở Thôn Hòa Phú', 'bithu.hoaphu', 'Hồ Thị Diệu', 'KHA'),
  ('Đoàn cơ sở Thôn Hòa Phú', 'bithu.hoaphu', 'Phan Văn Kiên', 'TOT'),
  ('Đoàn cơ sở Thôn Hòa Phú', 'bithu.hoaphu', 'Vũ Thị Ngọc', 'XUAT_SAC'),
  ('Đoàn cơ sở Thôn Hòa Trúc', 'bithu.hoatruc', 'Trần Văn Phúc', 'TOT'),
  ('Đoàn cơ sở Thôn Hòa Trúc', 'bithu.hoatruc', 'Nguyễn Thị Trang', 'KHA'),
  ('Đoàn cơ sở Thôn Hòa Trúc', 'bithu.hoatruc', 'Lê Văn Vinh', 'TOT'),
  ('Đoàn cơ sở Thôn Long Phú', 'bithu.longphu', 'Hoàng Thị Duyên', 'TOT'),
  ('Đoàn cơ sở Thôn Long Phú', 'bithu.longphu', 'Phạm Văn Sáng', 'KHA'),
  ('Đoàn cơ sở Thôn Long Phú', 'bithu.longphu', 'Bùi Thị Hạnh', 'XUAT_SAC'),
  ('Đoàn cơ sở Thôn Phú Mãn', 'bithu.phuman', 'Đặng Văn Quang', 'TOT'),
  ('Đoàn cơ sở Thôn Phú Mãn', 'bithu.phuman', 'Ngô Thị Thanh', 'TOT'),
  ('Đoàn cơ sở Thôn Phú Mãn', 'bithu.phuman', 'Dương Văn Tuấn', 'KHA'),
  ('Đoàn cơ sở Thôn Phú Sơn', 'bithu.phuson', 'Vũ Thị Kim', 'XUAT_SAC'),
  ('Đoàn cơ sở Thôn Phú Sơn', 'bithu.phuson', 'Đỗ Văn Thịnh', 'TOT'),
  ('Đoàn cơ sở Thôn Phú Sơn', 'bithu.phuson', 'Lý Thị Hà', 'KHA'),
  ('Đoàn cơ sở Thôn Phú Thịnh', 'bithu.phuthinh', 'Nguyễn Văn Đức', 'TOT'),
  ('Đoàn cơ sở Thôn Phú Thịnh', 'bithu.phuthinh', 'Trần Thị Loan', 'KHA'),
  ('Đoàn cơ sở Thôn Phú Thịnh', 'bithu.phuthinh', 'Phan Văn Huy', 'TOT'),
  ('Đoàn cơ sở Thôn Thắng Đầu', 'bithu.thangdau', 'Lê Thị Xuân', 'TOT'),
  ('Đoàn cơ sở Thôn Thắng Đầu', 'bithu.thangdau', 'Hồ Văn Tân', 'KHA'),
  ('Đoàn cơ sở Thôn Thắng Đầu', 'bithu.thangdau', 'Hoàng Thị Nga', 'XUAT_SAC'),
  ('Đoàn cơ sở Thôn Việt Yên', 'bithu.vietyen', 'Bùi Văn Cường', 'TOT'),
  ('Đoàn cơ sở Thôn Việt Yên', 'bithu.vietyen', 'Đặng Thị Mỹ', 'TOT'),
  ('Đoàn cơ sở Thôn Việt Yên', 'bithu.vietyen', 'Ngô Văn Sơn', 'KHA'),
  ('Đoàn cơ sở Thôn Yên Thái', 'bithu.yenthai', 'Phạm Thị Uyên', 'KHA'),
  ('Đoàn cơ sở Thôn Yên Thái', 'bithu.yenthai', 'Dương Văn Lâm', 'TOT'),
  ('Đoàn cơ sở Thôn Yên Thái', 'bithu.yenthai', 'Vũ Văn Hùng', 'TOT')
) AS v(unitname, username, "fullName", grade)
JOIN "Unit" thon ON thon."name" = v.unitname
JOIN "User" usr ON usr."username" = v.username
JOIN "Member" m ON m."unitId" = thon.id AND m."fullName" = v."fullName"
JOIN "MemberEvaluation" e ON e."createdById" = usr.id AND e."year" = 2026;
