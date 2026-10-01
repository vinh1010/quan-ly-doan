-- Them vai cong van mau da dang hon (loai, trang thai, han xu ly khac nhau) de co du lieu chup
-- man hinh/kiem thu: 1 cai da qua han (hien do tren Trang chu), 1 cai da xac nhan san (trang thai
-- khoa), 1 cai gan truc tiep o cap thon (de test nut Chuyen tiep tu thon len Xa).

INSERT INTO "IncomingDocument" (
  "number", "summary", "sender", "issuedDate", "receivedDate", "type", "status", "deadline",
  "unitId", "createdById", "createdAt", "updatedAt"
)
SELECT v.number, v.summary, v.sender, v.issued::date, v.received::date,
  v.doctype::"DocumentType", v.docstatus::"DocumentStatus", v.deadline::date,
  u.id, usr.id, now(), now()
FROM (VALUES
  ('28/CV-ĐTN', 'Về việc tổng kết công tác Đoàn năm 2026', 'Đoàn cấp trên', '2026-09-20', '2026-09-22', 'CHI_DAO', 'DANG_XU_LY', '2026-09-28'),
  ('30/TB-ĐTN', 'Thông báo triển khai Tết trồng cây năm 2027', 'Đoàn cấp trên', '2026-12-20', '2026-12-22', 'THONG_BAO', 'CHUA_XU_LY', '2027-01-15'),
  ('33/TB-ĐTN', 'Thông báo kế hoạch Tháng Thanh niên năm 2027', 'Đoàn xã Phú Cát', '2027-01-10', '2027-01-10', 'THONG_BAO', 'CHUA_XU_LY', NULL)
) AS v(number, summary, sender, issued, received, doctype, docstatus, deadline)
JOIN "Unit" u ON u."name" = 'Xã Phú Cát'
JOIN "User" usr ON usr."username" = 'Doanxaphucat.hni'
WHERE NOT EXISTS (SELECT 1 FROM "IncomingDocument" d WHERE d."number" = v.number);

-- Cong van da xac nhan san (trang thai khoa) de co ngay du lieu chup Hinh 4.11
INSERT INTO "IncomingDocument" (
  "number", "summary", "sender", "issuedDate", "receivedDate", "type", "status", "deadline",
  "unitId", "createdById", "confirmedAt", "confirmedById", "resultNote", "createdAt", "updatedAt"
)
SELECT '15/MH-ĐTN', 'Mời họp sơ kết công tác Đoàn 9 tháng đầu năm 2026', 'Đoàn cấp trên',
  DATE '2026-09-10', DATE '2026-09-10', 'MOI_HOP', 'DA_XU_LY', DATE '2026-09-15',
  u.id, usr.id, now(), usr.id, 'Đã tổ chức họp đúng kế hoạch, 100% đại biểu tham dự.', now(), now()
FROM "Unit" u JOIN "User" usr ON usr."username" = 'Doanxaphucat.hni'
WHERE u."name" = 'Xã Phú Cát'
  AND NOT EXISTS (SELECT 1 FROM "IncomingDocument" d WHERE d."number" = '15/MH-ĐTN');

-- Cong van gan truc tiep o cap thon (Long Phu) de test nut Chuyen tiep tu thon len Xa
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
