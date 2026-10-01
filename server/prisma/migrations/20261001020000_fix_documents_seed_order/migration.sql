-- Sua loi thu tu seed: cac migration truoc (sample_members_evaluations_documents va
-- more_sample_documents) tao IncomingDocument voi createdById tra theo username
-- 'Doanxaphucat.hni' — nhung tai khoan nay chi duoc tao boi seed.ts, chay SAU khi toan bo
-- migration da chay xong (migrate reset / npm run setup deu chay migration truoc, seed sau).
-- Ket qua: tren mot may moi (migrate reset tu dau), cau JOIN khong tim thay user nay nen
-- INSERT ... SELECT lang le chen 0 dong (khong bao loi) — thieu mat du lieu cong van mau.
--
-- Sua bang cach dung COALESCE: uu tien 'Doanxaphucat.hni' neu da ton tai (dung khi migration
-- nay chay sau khi da seed roi, nhu tren may hien tai), neu chua co thi fallback sang
-- 'bithu.bachthach' (tai khoan duoc tao boi 1 migration truoc do, luon san sang bat ke thu tu
-- seed) — dam bao luon tim duoc 1 nguoi dung hop le o ca 2 tinh huong.

INSERT INTO "IncomingDocument" (
  "number", "summary", "sender", "issuedDate", "receivedDate", "type", "status", "deadline",
  "unitId", "createdById", "createdAt", "updatedAt"
)
SELECT v.number, v.summary, v.sender, v.issued::date, v.received::date,
  v.doctype::"DocumentType", v.docstatus::"DocumentStatus", v.deadline::date,
  xa.id,
  COALESCE(
    (SELECT id FROM "User" WHERE username = 'Doanxaphucat.hni'),
    (SELECT id FROM "User" WHERE username = 'bithu.bachthach')
  ),
  now(), now()
FROM (VALUES
  ('05/CV-ĐTN', 'Về việc triển khai Tháng Thanh niên năm 2026', 'Đoàn cấp trên', '2026-02-20', '2026-02-22', 'CHI_DAO', 'DA_XU_LY', '2026-03-26'),
  ('12/TB-ĐTN', 'Thông báo kế hoạch tổ chức chiến dịch Mùa hè xanh năm 2026', 'Đoàn xã Phú Cát', '2026-05-10', '2026-05-10', 'THONG_BAO', 'DA_XU_LY', NULL),
  ('07/TB-ĐTN', 'Thông báo giới thiệu đoàn viên ưu tú tham gia lớp cảm tình Đảng', 'Đoàn xã Phú Cát', '2026-04-05', '2026-04-05', 'THONG_BAO', 'DA_XU_LY', NULL),
  ('18/GM-ĐTN', 'Giấy mời họp giao ban công tác Đoàn quý III/2026', 'Đoàn xã Phú Cát', '2026-09-15', '2026-09-15', 'MOI_HOP', 'DANG_XU_LY', '2026-09-25'),
  ('22/CV-ĐTN', 'Về việc rà soát, đánh giá xếp loại Đoàn viên năm 2026', 'Đoàn xã Phú Cát', '2026-09-20', '2026-09-20', 'CHI_DAO', 'DANG_XU_LY', '2026-10-15'),
  ('25/CV-ĐTN', 'Về việc chuẩn bị Đại hội Đoàn cơ sở nhiệm kỳ 2027 - 2029', 'Đoàn cấp trên', '2026-09-25', '2026-09-26', 'CHI_DAO', 'CHUA_XU_LY', '2026-11-01'),
  ('28/CV-ĐTN', 'Về việc tổng kết công tác Đoàn năm 2026', 'Đoàn cấp trên', '2026-09-20', '2026-09-22', 'CHI_DAO', 'DANG_XU_LY', '2026-09-28'),
  ('30/TB-ĐTN', 'Thông báo triển khai Tết trồng cây năm 2027', 'Đoàn cấp trên', '2026-12-20', '2026-12-22', 'THONG_BAO', 'CHUA_XU_LY', '2027-01-15'),
  ('33/TB-ĐTN', 'Thông báo kế hoạch Tháng Thanh niên năm 2027', 'Đoàn xã Phú Cát', '2027-01-10', '2027-01-10', 'THONG_BAO', 'CHUA_XU_LY', NULL)
) AS v(number, summary, sender, issued, received, doctype, docstatus, deadline)
JOIN "Unit" xa ON xa."name" = 'Xã Phú Cát'
WHERE NOT EXISTS (SELECT 1 FROM "IncomingDocument" d WHERE d."number" = v.number);

-- Cong van da xac nhan san (trang thai khoa)
INSERT INTO "IncomingDocument" (
  "number", "summary", "sender", "issuedDate", "receivedDate", "type", "status", "deadline",
  "unitId", "createdById", "confirmedAt", "confirmedById", "resultNote", "createdAt", "updatedAt"
)
SELECT '15/MH-ĐTN', 'Mời họp sơ kết công tác Đoàn 9 tháng đầu năm 2026', 'Đoàn cấp trên',
  DATE '2026-09-10', DATE '2026-09-10', 'MOI_HOP', 'DA_XU_LY', DATE '2026-09-15',
  xa.id,
  COALESCE((SELECT id FROM "User" WHERE username = 'Doanxaphucat.hni'), (SELECT id FROM "User" WHERE username = 'bithu.bachthach')),
  now(),
  COALESCE((SELECT id FROM "User" WHERE username = 'Doanxaphucat.hni'), (SELECT id FROM "User" WHERE username = 'bithu.bachthach')),
  'Đã tổ chức họp đúng kế hoạch, 100% đại biểu tham dự.', now(), now()
FROM "Unit" xa
WHERE xa."name" = 'Xã Phú Cát'
  AND NOT EXISTS (SELECT 1 FROM "IncomingDocument" d WHERE d."number" = '15/MH-ĐTN');

-- Cong van gan truc tiep o cap thon Long Phu (de test nut Chuyen tiep) — tao boi dung
-- Bi thu thon do (bithu.longphu), khong phu thuoc tai khoan seed nen khong gap loi thu tu.
INSERT INTO "IncomingDocument" (
  "number", "summary", "sender", "issuedDate", "receivedDate", "type", "status", "deadline",
  "unitId", "createdById", "createdAt", "updatedAt"
)
SELECT '20/CV-ĐTN', 'Về việc rà soát danh sách Đoàn viên năm 2026', 'Đoàn xã Phú Cát',
  DATE '2026-09-25', DATE '2026-09-26', 'CHI_DAO', 'CHUA_XU_LY', DATE '2026-10-10',
  u.id, usr.id, now(), now()
FROM "Unit" u JOIN "User" usr ON usr."username" = 'bithu.longphu'
WHERE u."name" = 'Đoàn cơ sở Thôn Long Phú'
  AND NOT EXISTS (SELECT 1 FROM "IncomingDocument" d WHERE d."number" = '20/CV-ĐTN');
