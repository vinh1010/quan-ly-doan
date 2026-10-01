-- Dieu chinh nhiem ky cua 2 ho so mau de roi vao trong 90 ngay toi (tinh tu luc tao migration
-- nay, khoang thang 10/2026), phuc vu hien thi khoi "Nhiem ky sap het" tren Trang chu. Khong
-- phu thuoc tai khoan seed (cap nhat theo username da co san tu migration truoc) nen khong
-- gap loi thu tu nhu cac migration cong van.

UPDATE "Secretary" s
SET "termEnd" = DATE '2026-11-20', "termLabel" = '2024 - 2026'
FROM "User" u
WHERE s."userId" = u.id AND u.username = 'bithu.bachthach';

UPDATE "Secretary" s
SET "termEnd" = DATE '2026-12-10', "termLabel" = '2024 - 2026'
FROM "User" u
WHERE s."userId" = u.id AND u.username = 'pbt.dongha';
