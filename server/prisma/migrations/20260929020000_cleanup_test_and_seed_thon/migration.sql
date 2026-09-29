-- Theo yêu cầu người dùng (đã xác nhận qua các câu hỏi xác nhận): dọn dữ liệu thử nghiệm còn
-- sót ở "Xã Phú Cát" sau khi cố định địa bàn (xem migration fix_org_xa_phu_cat), và tạo dữ liệu
-- mẫu (1 Bí thư/thôn) cho 13 thôn thật vừa thêm để có dữ liệu xem/thử ngay.

-- 1) Xóa đợt đánh giá Đoàn viên thử (tạo bởi 2 tài khoản Bí thư thử vinh1010/linhtrieu) — Cascade
--    tự xóa theo MemberGrade + EvaluationForward liên quan.
DELETE FROM "MemberEvaluation" WHERE "unitId" = (SELECT "id" FROM "Unit" WHERE "name" = 'Xã Phú Cát')
  AND "createdById" IN (SELECT "id" FROM "User" WHERE "username" IN ('vinh1010', 'linhtrieu'));

-- 2) Xóa công văn thử (số 00120, trích yếu "Test") — Cascade tự xóa theo DocumentForward liên quan.
DELETE FROM "IncomingDocument" WHERE "number" = '00120' AND "summary" = 'Test';

-- 3) Xóa nhật ký hoạt động của 3 tài khoản thử trước (AuditLog.userId RESTRICT vào User).
DELETE FROM "AuditLog" WHERE "userId" IN (
  SELECT "id" FROM "User" WHERE "username" IN ('vinh1010', 'linhtrieu', 'Doancosothonphucha')
);

-- 4) Xóa hồ sơ Bí thư thử (vinh1010, linhtrieu) rồi xóa 3 tài khoản thử (2 Bí thư + 1 tài khoản
--    cấp trên mồ côi "Doancosothonphucha" gắn với đơn vị thôn giả cũ đã xóa, không còn dùng được).
DELETE FROM "Secretary" WHERE "userId" IN (
  SELECT "id" FROM "User" WHERE "username" IN ('vinh1010', 'linhtrieu')
);
DELETE FROM "User" WHERE "username" IN ('vinh1010', 'linhtrieu', 'Doancosothonphucha');

-- 5) Tạo 13 tài khoản + hồ sơ Bí thư mẫu, mỗi thôn 1 người (mật khẩu chung: Abc123 — nên đổi khi dùng thật).
INSERT INTO "User" ("username", "passwordHash", "role", "fullName", "unitId", "status", "createdAt", "updatedAt")
SELECT v.username, '$2a$10$xoKEb171QGZ90Foeb14C5.WOoftO8r2XXRUran/Bkwt0WhfuMA1vO', 'SECRETARY', v."fullName", u.id, 'ACTIVE', now(), now()
FROM (VALUES
  ('bithu.bachthach', 'Nguyễn Văn Bình', 'Đoàn cơ sở Thôn Bạch Thạch'),
  ('bithu.dongha', 'Trần Thị Cúc', 'Đoàn cơ sở Thôn Đông Hạ'),
  ('bithu.dongthuong', 'Lê Văn Dũng', 'Đoàn cơ sở Thôn Đông Thượng'),
  ('bithu.giacat', 'Phạm Thị Hoa', 'Đoàn cơ sở Thôn Giã Cát'),
  ('bithu.hoaphu', 'Hoàng Văn Hùng', 'Đoàn cơ sở Thôn Hòa Phú'),
  ('bithu.hoatruc', 'Vũ Thị Lan', 'Đoàn cơ sở Thôn Hòa Trúc'),
  ('bithu.longphu', 'Đặng Văn Minh', 'Đoàn cơ sở Thôn Long Phú'),
  ('bithu.phuman', 'Bùi Thị Nga', 'Đoàn cơ sở Thôn Phú Mãn'),
  ('bithu.phuson', 'Đỗ Văn Phong', 'Đoàn cơ sở Thôn Phú Sơn'),
  ('bithu.phuthinh', 'Ngô Thị Quyên', 'Đoàn cơ sở Thôn Phú Thịnh'),
  ('bithu.thangdau', 'Dương Văn Sơn', 'Đoàn cơ sở Thôn Thắng Đầu'),
  ('bithu.vietyen', 'Lý Thị Thu', 'Đoàn cơ sở Thôn Việt Yên'),
  ('bithu.yenthai', 'Mai Văn Tùng', 'Đoàn cơ sở Thôn Yên Thái')
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
  DATE '2012-03-26', 'Xã Phú Cát', 'Xã Phú Cát', 'Cán bộ Đoàn', 'BI_THU', DATE '2024-01-01', DATE '2027-01-01', '2024 - 2027', 'ACTIVE',
  now(), now()
FROM (VALUES
  ('bithu.bachthach', 'Đoàn cơ sở Thôn Bạch Thạch', 'Nguyễn Văn Bình', '1992-02-14', 'MALE', '0910000000', 'bithu.bachthach@example.com', '001919929000'),
  ('bithu.dongha', 'Đoàn cơ sở Thôn Đông Hạ', 'Trần Thị Cúc', '1994-05-20', 'FEMALE', '0910000001', 'bithu.dongha@example.com', '001919949001'),
  ('bithu.dongthuong', 'Đoàn cơ sở Thôn Đông Thượng', 'Lê Văn Dũng', '1991-08-09', 'MALE', '0910000002', 'bithu.dongthuong@example.com', '001919919002'),
  ('bithu.giacat', 'Đoàn cơ sở Thôn Giã Cát', 'Phạm Thị Hoa', '1996-01-30', 'FEMALE', '0910000003', 'bithu.giacat@example.com', '001919969003'),
  ('bithu.hoaphu', 'Đoàn cơ sở Thôn Hòa Phú', 'Hoàng Văn Hùng', '1993-11-11', 'MALE', '0910000004', 'bithu.hoaphu@example.com', '001919939004'),
  ('bithu.hoatruc', 'Đoàn cơ sở Thôn Hòa Trúc', 'Vũ Thị Lan', '1995-03-17', 'FEMALE', '0910000005', 'bithu.hoatruc@example.com', '001919959005'),
  ('bithu.longphu', 'Đoàn cơ sở Thôn Long Phú', 'Đặng Văn Minh', '1990-07-22', 'MALE', '0910000006', 'bithu.longphu@example.com', '001919909006'),
  ('bithu.phuman', 'Đoàn cơ sở Thôn Phú Mãn', 'Bùi Thị Nga', '1997-09-05', 'FEMALE', '0910000007', 'bithu.phuman@example.com', '001919979007'),
  ('bithu.phuson', 'Đoàn cơ sở Thôn Phú Sơn', 'Đỗ Văn Phong', '1992-12-01', 'MALE', '0910000008', 'bithu.phuson@example.com', '001919929008'),
  ('bithu.phuthinh', 'Đoàn cơ sở Thôn Phú Thịnh', 'Ngô Thị Quyên', '1994-04-25', 'FEMALE', '0910000009', 'bithu.phuthinh@example.com', '001919949009'),
  ('bithu.thangdau', 'Đoàn cơ sở Thôn Thắng Đầu', 'Dương Văn Sơn', '1993-06-18', 'MALE', '0910000010', 'bithu.thangdau@example.com', '001919939010'),
  ('bithu.vietyen', 'Đoàn cơ sở Thôn Việt Yên', 'Lý Thị Thu', '1996-10-10', 'FEMALE', '0910000011', 'bithu.vietyen@example.com', '001919969011'),
  ('bithu.yenthai', 'Đoàn cơ sở Thôn Yên Thái', 'Mai Văn Tùng', '1991-01-27', 'MALE', '0910000012', 'bithu.yenthai@example.com', '001919919012')
) AS v(username, unitname, "fullName", dob, gender, phone, email, cccd)
JOIN "Unit" u ON u."name" = v.unitname
JOIN "User" usr ON usr."username" = v.username
WHERE NOT EXISTS (SELECT 1 FROM "Secretary" WHERE "cccd" = v.cccd);
