/*
  Warnings:

  - You are about to drop the column `averageCount` on the `MemberEvaluation` table. All the data in the column will be lost.
  - You are about to drop the column `excellentCount` on the `MemberEvaluation` table. All the data in the column will be lost.
  - You are about to drop the column `fairCount` on the `MemberEvaluation` table. All the data in the column will be lost.
  - You are about to drop the column `goodCount` on the `MemberEvaluation` table. All the data in the column will be lost.
  - You are about to drop the column `weakCount` on the `MemberEvaluation` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "MemberGradeValue" AS ENUM ('XUAT_SAC', 'TOT', 'KHA', 'TRUNG_BINH', 'YEU');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MOVED');

-- AlterTable
ALTER TABLE "MemberEvaluation" DROP COLUMN "averageCount",
DROP COLUMN "excellentCount",
DROP COLUMN "fairCount",
DROP COLUMN "goodCount",
DROP COLUMN "weakCount";

-- CreateTable
CREATE TABLE "MemberGrade" (
    "id" SERIAL NOT NULL,
    "evaluationId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "grade" "MemberGradeValue" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberGrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "dob" DATE,
    "gender" "Gender",
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "note" TEXT,
    "unitId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberGrade_evaluationId_idx" ON "MemberGrade"("evaluationId");

-- CreateIndex
CREATE INDEX "MemberGrade_memberId_idx" ON "MemberGrade"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberGrade_evaluationId_memberId_key" ON "MemberGrade"("evaluationId", "memberId");

-- CreateIndex
CREATE INDEX "Member_unitId_status_idx" ON "Member"("unitId", "status");

-- CreateIndex
CREATE INDEX "Member_fullName_idx" ON "Member"("fullName");

-- AddForeignKey
ALTER TABLE "MemberGrade" ADD CONSTRAINT "MemberGrade_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "MemberEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberGrade" ADD CONSTRAINT "MemberGrade_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
