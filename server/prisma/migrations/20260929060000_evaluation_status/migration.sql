-- Trạng thái đợt đánh giá: hỗ trợ khóa/duyệt khi đã ở cấp cao nhất (Xã Phú Cát, không còn cấp
-- trên để chuyển tiếp) — xem thêm ở evaluations.controller.ts (approveEvaluation/reopenEvaluation).
-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('DANG_THUC_HIEN', 'DA_DUYET');

-- AlterTable
ALTER TABLE "MemberEvaluation" ADD COLUMN "status" "EvaluationStatus" NOT NULL DEFAULT 'DANG_THUC_HIEN';
