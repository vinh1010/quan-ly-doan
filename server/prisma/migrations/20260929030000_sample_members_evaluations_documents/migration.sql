-- Dữ liệu mẫu (không phải data test) cho các menu còn trống sau khi dọn dữ liệu thử:
-- Đoàn viên (Member), Đánh giá xếp loại năm 2026 (MemberEvaluation/MemberGrade), Công văn (IncomingDocument).

-- 1) Đoàn viên mẫu, mỗi thôn 3 người, do đúng Bí thư thôn đó tạo.
INSERT INTO "Member" ("fullName", "dob", "gender", "status", "unitId", "createdById", "createdAt", "updatedAt")
SELECT v."fullName", v.dob::date, v.gender::"Gender", 'ACTIVE', u.id, usr.id, now(), now()
FROM (VALUES
  ('Đoàn cơ sở Thôn Bạch Thạch', 'bithu.bachthach', 'Nguyễn Thị Mai', '2002-03-14', 'FEMALE'),
  ('Đoàn cơ sở Thôn Bạch Thạch', 'bithu.bachthach', 'Trần Văn Nam', '2000-07-22', 'MALE'),
  ('Đoàn cơ sở Thôn Bạch Thạch', 'bithu.bachthach', 'Lê Thị Hương', '2003-11-05', 'FEMALE'),
  ('Đoàn cơ sở Thôn Đông Hạ', 'bithu.dongha', 'Phạm Văn Long', '2001-01-18', 'MALE'),
  ('Đoàn cơ sở Thôn Đông Hạ', 'bithu.dongha', 'Hoàng Thị Linh', '1999-09-09', 'FEMALE'),
  ('Đoàn cơ sở Thôn Đông Hạ', 'bithu.dongha', 'Vũ Văn Đạt', '2004-05-30', 'MALE'),
  ('Đoàn cơ sở Thôn Đông Thượng', 'bithu.dongthuong', 'Đặng Thị Thảo', '2002-12-02', 'FEMALE'),
  ('Đoàn cơ sở Thôn Đông Thượng', 'bithu.dongthuong', 'Bùi Văn Khoa', '2000-04-11', 'MALE'),
  ('Đoàn cơ sở Thôn Đông Thượng', 'bithu.dongthuong', 'Ngô Thị Yến', '2003-06-25', 'FEMALE'),
  ('Đoàn cơ sở Thôn Giã Cát', 'bithu.giacat', 'Dương Văn Hiếu', '2001-08-08', 'MALE'),
  ('Đoàn cơ sở Thôn Giã Cát', 'bithu.giacat', 'Lý Thị Nhung', '1998-10-17', 'FEMALE'),
  ('Đoàn cơ sở Thôn Giã Cát', 'bithu.giacat', 'Đỗ Văn Tài', '2005-02-27', 'MALE'),
  ('Đoàn cơ sở Thôn Hòa Phú', 'bithu.hoaphu', 'Hồ Thị Diệu', '2002-07-19', 'FEMALE'),
  ('Đoàn cơ sở Thôn Hòa Phú', 'bithu.hoaphu', 'Phan Văn Kiên', '2000-03-03', 'MALE'),
  ('Đoàn cơ sở Thôn Hòa Phú', 'bithu.hoaphu', 'Vũ Thị Ngọc', '2004-09-14', 'FEMALE'),
  ('Đoàn cơ sở Thôn Hòa Trúc', 'bithu.hoatruc', 'Trần Văn Phúc', '2001-11-23', 'MALE'),
  ('Đoàn cơ sở Thôn Hòa Trúc', 'bithu.hoatruc', 'Nguyễn Thị Trang', '1999-05-06', 'FEMALE'),
  ('Đoàn cơ sở Thôn Hòa Trúc', 'bithu.hoatruc', 'Lê Văn Vinh', '2003-01-30', 'MALE'),
  ('Đoàn cơ sở Thôn Long Phú', 'bithu.longphu', 'Hoàng Thị Duyên', '2002-02-15', 'FEMALE'),
  ('Đoàn cơ sở Thôn Long Phú', 'bithu.longphu', 'Phạm Văn Sáng', '2000-06-21', 'MALE'),
  ('Đoàn cơ sở Thôn Long Phú', 'bithu.longphu', 'Bùi Thị Hạnh', '2004-10-09', 'FEMALE'),
  ('Đoàn cơ sở Thôn Phú Mãn', 'bithu.phuman', 'Đặng Văn Quang', '2001-04-04', 'MALE'),
  ('Đoàn cơ sở Thôn Phú Mãn', 'bithu.phuman', 'Ngô Thị Thanh', '1999-12-12', 'FEMALE'),
  ('Đoàn cơ sở Thôn Phú Mãn', 'bithu.phuman', 'Dương Văn Tuấn', '2003-08-17', 'MALE'),
  ('Đoàn cơ sở Thôn Phú Sơn', 'bithu.phuson', 'Vũ Thị Kim', '2002-09-28', 'FEMALE'),
  ('Đoàn cơ sở Thôn Phú Sơn', 'bithu.phuson', 'Đỗ Văn Thịnh', '2000-01-07', 'MALE'),
  ('Đoàn cơ sở Thôn Phú Sơn', 'bithu.phuson', 'Lý Thị Hà', '2004-03-19', 'FEMALE'),
  ('Đoàn cơ sở Thôn Phú Thịnh', 'bithu.phuthinh', 'Nguyễn Văn Đức', '2001-07-07', 'MALE'),
  ('Đoàn cơ sở Thôn Phú Thịnh', 'bithu.phuthinh', 'Trần Thị Loan', '1998-11-26', 'FEMALE'),
  ('Đoàn cơ sở Thôn Phú Thịnh', 'bithu.phuthinh', 'Phan Văn Huy', '2003-05-13', 'MALE'),
  ('Đoàn cơ sở Thôn Thắng Đầu', 'bithu.thangdau', 'Lê Thị Xuân', '2002-06-06', 'FEMALE'),
  ('Đoàn cơ sở Thôn Thắng Đầu', 'bithu.thangdau', 'Hồ Văn Tân', '2000-02-14', 'MALE'),
  ('Đoàn cơ sở Thôn Thắng Đầu', 'bithu.thangdau', 'Hoàng Thị Nga', '2004-12-24', 'FEMALE'),
  ('Đoàn cơ sở Thôn Việt Yên', 'bithu.vietyen', 'Bùi Văn Cường', '2001-10-10', 'MALE'),
  ('Đoàn cơ sở Thôn Việt Yên', 'bithu.vietyen', 'Đặng Thị Mỹ', '1999-03-23', 'FEMALE'),
  ('Đoàn cơ sở Thôn Việt Yên', 'bithu.vietyen', 'Ngô Văn Sơn', '2003-09-01', 'MALE'),
  ('Đoàn cơ sở Thôn Yên Thái', 'bithu.yenthai', 'Phạm Thị Uyên', '2002-01-21', 'FEMALE'),
  ('Đoàn cơ sở Thôn Yên Thái', 'bithu.yenthai', 'Dương Văn Lâm', '2000-08-08', 'MALE'),
  ('Đoàn cơ sở Thôn Yên Thái', 'bithu.yenthai', 'Vũ Văn Hùng', '2004-04-16', 'MALE')
) AS v(unitname, username, "fullName", dob, gender)
JOIN "Unit" u ON u."name" = v.unitname
JOIN "User" usr ON usr."username" = v.username
WHERE NOT EXISTS (
  SELECT 1 FROM "Member" m WHERE m."fullName" = v."fullName" AND m."unitId" = u.id
);

-- 2) Đợt đánh giá Đoàn viên năm 2026, mỗi thôn 1 đợt.
INSERT INTO "MemberEvaluation" ("year", "unitId", "createdById", "createdAt", "updatedAt")
SELECT 2026, u.id, usr.id, now(), now()
FROM (VALUES
  ('Đoàn cơ sở Thôn Bạch Thạch', 'bithu.bachthach'),
  ('Đoàn cơ sở Thôn Đông Hạ', 'bithu.dongha'),
  ('Đoàn cơ sở Thôn Đông Thượng', 'bithu.dongthuong'),
  ('Đoàn cơ sở Thôn Giã Cát', 'bithu.giacat'),
  ('Đoàn cơ sở Thôn Hòa Phú', 'bithu.hoaphu'),
  ('Đoàn cơ sở Thôn Hòa Trúc', 'bithu.hoatruc'),
  ('Đoàn cơ sở Thôn Long Phú', 'bithu.longphu'),
  ('Đoàn cơ sở Thôn Phú Mãn', 'bithu.phuman'),
  ('Đoàn cơ sở Thôn Phú Sơn', 'bithu.phuson'),
  ('Đoàn cơ sở Thôn Phú Thịnh', 'bithu.phuthinh'),
  ('Đoàn cơ sở Thôn Thắng Đầu', 'bithu.thangdau'),
  ('Đoàn cơ sở Thôn Việt Yên', 'bithu.vietyen'),
  ('Đoàn cơ sở Thôn Yên Thái', 'bithu.yenthai')
) AS v(unitname, username)
JOIN "Unit" u ON u."name" = v.unitname
JOIN "User" usr ON usr."username" = v.username
WHERE NOT EXISTS (SELECT 1 FROM "MemberEvaluation" e WHERE e."unitId" = u.id AND e."year" = 2026);

-- 3) Xếp loại từng Đoàn viên trong đợt đánh giá 2026 của đúng thôn mình.
INSERT INTO "MemberGrade" ("evaluationId", "memberId", "grade", "createdAt", "updatedAt")
SELECT e.id, m.id, v.grade::"MemberGradeValue", now(), now()
FROM (VALUES
  ('Đoàn cơ sở Thôn Bạch Thạch', 'Nguyễn Thị Mai', 'TOT'),
  ('Đoàn cơ sở Thôn Bạch Thạch', 'Trần Văn Nam', 'KHA'),
  ('Đoàn cơ sở Thôn Bạch Thạch', 'Lê Thị Hương', 'XUAT_SAC'),
  ('Đoàn cơ sở Thôn Đông Hạ', 'Phạm Văn Long', 'TOT'),
  ('Đoàn cơ sở Thôn Đông Hạ', 'Hoàng Thị Linh', 'TOT'),
  ('Đoàn cơ sở Thôn Đông Hạ', 'Vũ Văn Đạt', 'KHA'),
  ('Đoàn cơ sở Thôn Đông Thượng', 'Đặng Thị Thảo', 'XUAT_SAC'),
  ('Đoàn cơ sở Thôn Đông Thượng', 'Bùi Văn Khoa', 'TOT'),
  ('Đoàn cơ sở Thôn Đông Thượng', 'Ngô Thị Yến', 'KHA'),
  ('Đoàn cơ sở Thôn Giã Cát', 'Dương Văn Hiếu', 'TOT'),
  ('Đoàn cơ sở Thôn Giã Cát', 'Lý Thị Nhung', 'TOT'),
  ('Đoàn cơ sở Thôn Giã Cát', 'Đỗ Văn Tài', 'TRUNG_BINH'),
  ('Đoàn cơ sở Thôn Hòa Phú', 'Hồ Thị Diệu', 'KHA'),
  ('Đoàn cơ sở Thôn Hòa Phú', 'Phan Văn Kiên', 'TOT'),
  ('Đoàn cơ sở Thôn Hòa Phú', 'Vũ Thị Ngọc', 'XUAT_SAC'),
  ('Đoàn cơ sở Thôn Hòa Trúc', 'Trần Văn Phúc', 'TOT'),
  ('Đoàn cơ sở Thôn Hòa Trúc', 'Nguyễn Thị Trang', 'KHA'),
  ('Đoàn cơ sở Thôn Hòa Trúc', 'Lê Văn Vinh', 'TOT'),
  ('Đoàn cơ sở Thôn Long Phú', 'Hoàng Thị Duyên', 'TOT'),
  ('Đoàn cơ sở Thôn Long Phú', 'Phạm Văn Sáng', 'KHA'),
  ('Đoàn cơ sở Thôn Long Phú', 'Bùi Thị Hạnh', 'XUAT_SAC'),
  ('Đoàn cơ sở Thôn Phú Mãn', 'Đặng Văn Quang', 'TOT'),
  ('Đoàn cơ sở Thôn Phú Mãn', 'Ngô Thị Thanh', 'TOT'),
  ('Đoàn cơ sở Thôn Phú Mãn', 'Dương Văn Tuấn', 'KHA'),
  ('Đoàn cơ sở Thôn Phú Sơn', 'Vũ Thị Kim', 'XUAT_SAC'),
  ('Đoàn cơ sở Thôn Phú Sơn', 'Đỗ Văn Thịnh', 'TOT'),
  ('Đoàn cơ sở Thôn Phú Sơn', 'Lý Thị Hà', 'KHA'),
  ('Đoàn cơ sở Thôn Phú Thịnh', 'Nguyễn Văn Đức', 'TOT'),
  ('Đoàn cơ sở Thôn Phú Thịnh', 'Trần Thị Loan', 'KHA'),
  ('Đoàn cơ sở Thôn Phú Thịnh', 'Phan Văn Huy', 'TOT'),
  ('Đoàn cơ sở Thôn Thắng Đầu', 'Lê Thị Xuân', 'TOT'),
  ('Đoàn cơ sở Thôn Thắng Đầu', 'Hồ Văn Tân', 'KHA'),
  ('Đoàn cơ sở Thôn Thắng Đầu', 'Hoàng Thị Nga', 'XUAT_SAC'),
  ('Đoàn cơ sở Thôn Việt Yên', 'Bùi Văn Cường', 'TOT'),
  ('Đoàn cơ sở Thôn Việt Yên', 'Đặng Thị Mỹ', 'TOT'),
  ('Đoàn cơ sở Thôn Việt Yên', 'Ngô Văn Sơn', 'KHA'),
  ('Đoàn cơ sở Thôn Yên Thái', 'Phạm Thị Uyên', 'KHA'),
  ('Đoàn cơ sở Thôn Yên Thái', 'Dương Văn Lâm', 'TOT'),
  ('Đoàn cơ sở Thôn Yên Thái', 'Vũ Văn Hùng', 'TOT')
) AS v(unitname, "fullName", grade)
JOIN "Unit" u ON u."name" = v.unitname
JOIN "MemberEvaluation" e ON e."unitId" = u.id AND e."year" = 2026
JOIN "Member" m ON m."unitId" = u.id AND m."fullName" = v."fullName"
WHERE NOT EXISTS (SELECT 1 FROM "MemberGrade" g WHERE g."evaluationId" = e.id AND g."memberId" = m.id);

-- 4) Công văn mẫu ở cấp Xã Phú Cát, người tạo là tài khoản cấp trên.
INSERT INTO "IncomingDocument" ("number", "summary", "sender", "issuedDate", "receivedDate", "type", "status", "deadline", "unitId", "createdById", "createdAt", "updatedAt")
SELECT v.number, v.summary, v.sender, v.issued::date, v.received::date, v.doctype::"DocumentType", v.docstatus::"DocumentStatus", v.deadline::date, u.id, usr.id, now(), now()
FROM (VALUES
  ('05/CV-ĐTN', 'Về việc triển khai Tháng Thanh niên năm 2026', 'Đoàn cấp trên', '2026-02-20', '2026-02-22', 'CHI_DAO', 'DA_XU_LY', '2026-03-26'),
  ('12/TB-ĐTN', 'Thông báo kế hoạch tổ chức chiến dịch Mùa hè xanh năm 2026', 'Đoàn xã Phú Cát', '2026-05-10', '2026-05-10', 'THONG_BAO', 'DA_XU_LY', NULL),
  ('07/TB-ĐTN', 'Thông báo giới thiệu đoàn viên ưu tú tham gia lớp cảm tình Đảng', 'Đoàn xã Phú Cát', '2026-04-05', '2026-04-05', 'THONG_BAO', 'DA_XU_LY', NULL),
  ('18/GM-ĐTN', 'Giấy mời họp giao ban công tác Đoàn quý III/2026', 'Đoàn xã Phú Cát', '2026-09-15', '2026-09-15', 'MOI_HOP', 'DANG_XU_LY', '2026-09-25'),
  ('22/CV-ĐTN', 'Về việc rà soát, đánh giá xếp loại Đoàn viên năm 2026', 'Đoàn xã Phú Cát', '2026-09-20', '2026-09-20', 'CHI_DAO', 'DANG_XU_LY', '2026-10-15'),
  ('25/CV-ĐTN', 'Về việc chuẩn bị Đại hội Đoàn cơ sở nhiệm kỳ 2027 - 2029', 'Đoàn cấp trên', '2026-09-25', '2026-09-26', 'CHI_DAO', 'CHUA_XU_LY', '2026-11-01')
) AS v(number, summary, sender, issued, received, doctype, docstatus, deadline)
JOIN "Unit" u ON u."name" = 'Xã Phú Cát'
JOIN "User" usr ON usr."username" = 'Doanxaphucat.hni'
WHERE NOT EXISTS (SELECT 1 FROM "IncomingDocument" d WHERE d."number" = v.number);
