-- Dữ liệu mẫu: thêm 1 Phó Bí thư cho mỗi thôn (đủ bộ với 13 Bí thư đã có ở migration
-- cleanup_test_and_seed_thon), đúng mô hình Ban Chấp hành Đoàn cơ sở thực tế.

INSERT INTO "User" ("username", "passwordHash", "role", "fullName", "unitId", "status", "createdAt", "updatedAt")
SELECT v.username, '$2a$10$xoKEb171QGZ90Foeb14C5.WOoftO8r2XXRUran/Bkwt0WhfuMA1vO', 'SECRETARY', v."fullName", u.id, 'ACTIVE', now(), now()
FROM (VALUES
  ('pbt.bachthach', 'Trịnh Văn An', 'Đoàn cơ sở Thôn Bạch Thạch'),
  ('pbt.dongha', 'Đinh Thị Bích', 'Đoàn cơ sở Thôn Đông Hạ'),
  ('pbt.dongthuong', 'Tạ Văn Cảnh', 'Đoàn cơ sở Thôn Đông Thượng'),
  ('pbt.giacat', 'Lâm Thị Diễm', 'Đoàn cơ sở Thôn Giã Cát'),
  ('pbt.hoaphu', 'Chu Văn Đông', 'Đoàn cơ sở Thôn Hòa Phú'),
  ('pbt.hoatruc', 'Cao Thị Giang', 'Đoàn cơ sở Thôn Hòa Trúc'),
  ('pbt.longphu', 'Vương Văn Hải', 'Đoàn cơ sở Thôn Long Phú'),
  ('pbt.phuman', 'Đoàn Thị Huệ', 'Đoàn cơ sở Thôn Phú Mãn'),
  ('pbt.phuson', 'Kiều Văn Khang', 'Đoàn cơ sở Thôn Phú Sơn'),
  ('pbt.phuthinh', 'Tô Thị Lài', 'Đoàn cơ sở Thôn Phú Thịnh'),
  ('pbt.thangdau', 'Nghiêm Văn Phát', 'Đoàn cơ sở Thôn Thắng Đầu'),
  ('pbt.vietyen', 'Lương Thị Quỳnh', 'Đoàn cơ sở Thôn Việt Yên'),
  ('pbt.yenthai', 'Trương Văn Sang', 'Đoàn cơ sở Thôn Yên Thái')
) AS v(username, "fullName", unitname)
JOIN "Unit" u ON u."name" = v.unitname
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE "username" = v.username);

INSERT INTO "Secretary" (
  "userId", "unitId", "fullName", "dob", "gender", "phone", "email", "cccd", "ethnicity", "address",
  "education", "training", "politicalTheory", "hometownProvince", "hometownWard", "residenceProvince", "residenceWard",
  "unionJoinDate", "unionJoinPlace", "cardIssuePlace", "occupation", "position", "termStart", "termEnd", "termLabel", "status",
  "createdAt", "updatedAt"
)
SELECT usr.id, u.id, v."fullName", v.dob::date, v.gender::"Gender", v.phone, v.email, v.cccd, 'Kinh', 'Xã Phú Cát, Hà Nội',
  'Hệ 12/12', 'Trung cấp', 'Sơ cấp', 'Thành phố Hà Nội', 'Xã Phú Cát', 'Thành phố Hà Nội', 'Xã Phú Cát',
  DATE '2012-03-26', 'Xã Phú Cát', 'Xã Phú Cát', 'Cán bộ Đoàn', 'PHO_BI_THU', DATE '2024-01-01', DATE '2027-01-01', '2024 - 2027', 'ACTIVE',
  now(), now()
FROM (VALUES
  ('pbt.bachthach', 'Đoàn cơ sở Thôn Bạch Thạch', 'Trịnh Văn An', '1999-04-12', 'MALE', '0920000000', 'pbt.bachthach@example.com', '002019999000'),
  ('pbt.dongha', 'Đoàn cơ sở Thôn Đông Hạ', 'Đinh Thị Bích', '2001-06-18', 'FEMALE', '0920000001', 'pbt.dongha@example.com', '002020019001'),
  ('pbt.dongthuong', 'Đoàn cơ sở Thôn Đông Thượng', 'Tạ Văn Cảnh', '2000-09-25', 'MALE', '0920000002', 'pbt.dongthuong@example.com', '002020009002'),
  ('pbt.giacat', 'Đoàn cơ sở Thôn Giã Cát', 'Lâm Thị Diễm', '2002-02-08', 'FEMALE', '0920000003', 'pbt.giacat@example.com', '002020029003'),
  ('pbt.hoaphu', 'Đoàn cơ sở Thôn Hòa Phú', 'Chu Văn Đông', '1998-12-03', 'MALE', '0920000004', 'pbt.hoaphu@example.com', '002019989004'),
  ('pbt.hoatruc', 'Đoàn cơ sở Thôn Hòa Trúc', 'Cao Thị Giang', '2001-05-21', 'FEMALE', '0920000005', 'pbt.hoatruc@example.com', '002020019005'),
  ('pbt.longphu', 'Đoàn cơ sở Thôn Long Phú', 'Vương Văn Hải', '1999-08-14', 'MALE', '0920000006', 'pbt.longphu@example.com', '002019999006'),
  ('pbt.phuman', 'Đoàn cơ sở Thôn Phú Mãn', 'Đoàn Thị Huệ', '2000-03-30', 'FEMALE', '0920000007', 'pbt.phuman@example.com', '002020009007'),
  ('pbt.phuson', 'Đoàn cơ sở Thôn Phú Sơn', 'Kiều Văn Khang', '2002-07-09', 'MALE', '0920000008', 'pbt.phuson@example.com', '002020029008'),
  ('pbt.phuthinh', 'Đoàn cơ sở Thôn Phú Thịnh', 'Tô Thị Lài', '1999-11-17', 'FEMALE', '0920000009', 'pbt.phuthinh@example.com', '002019999009'),
  ('pbt.thangdau', 'Đoàn cơ sở Thôn Thắng Đầu', 'Nghiêm Văn Phát', '2001-01-26', 'MALE', '0920000010', 'pbt.thangdau@example.com', '002020019010'),
  ('pbt.vietyen', 'Đoàn cơ sở Thôn Việt Yên', 'Lương Thị Quỳnh', '2000-10-05', 'FEMALE', '0920000011', 'pbt.vietyen@example.com', '002020009011'),
  ('pbt.yenthai', 'Đoàn cơ sở Thôn Yên Thái', 'Trương Văn Sang', '1998-06-22', 'MALE', '0920000012', 'pbt.yenthai@example.com', '002019989012')
) AS v(username, unitname, "fullName", dob, gender, phone, email, cccd)
JOIN "Unit" u ON u."name" = v.unitname
JOIN "User" usr ON usr."username" = v.username
WHERE NOT EXISTS (SELECT 1 FROM "Secretary" WHERE "cccd" = v.cccd);
