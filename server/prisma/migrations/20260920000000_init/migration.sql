-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SUPERIOR', 'SECRETARY');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'LOCKED');

-- CreateEnum
CREATE TYPE "UnitLevel" AS ENUM ('TINH', 'HUYEN', 'XA_PHUONG', 'CO_SO', 'CHI_DOAN');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "SecretaryPosition" AS ENUM ('BI_THU', 'PHO_BI_THU');

-- CreateEnum
CREATE TYPE "SecretaryStatus" AS ENUM ('ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGOUT', 'CHANGE_PASSWORD', 'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'SEARCH', 'EXPORT', 'LOCK_ACCOUNT', 'UNLOCK_ACCOUNT');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "fullName" TEXT,
    "email" TEXT,
    "unitId" INTEGER,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" SERIAL NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "level" "UnitLevel" NOT NULL,
    "parentId" INTEGER,
    "address" TEXT,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Secretary" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "unitId" INTEGER NOT NULL,
    "fullName" TEXT NOT NULL,
    "dob" DATE NOT NULL,
    "gender" "Gender" NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "cccd" TEXT NOT NULL,
    "cccdIssuedDate" DATE,
    "cccdIssuedPlace" TEXT,
    "ethnicity" TEXT,
    "religion" TEXT,
    "address" TEXT,
    "education" TEXT,
    "training" TEXT,
    "maritalStatus" TEXT,
    "avatarUrl" TEXT,
    "position" "SecretaryPosition" NOT NULL DEFAULT 'BI_THU',
    "termStart" DATE NOT NULL,
    "termEnd" DATE,
    "termLabel" TEXT,
    "status" "SecretaryStatus" NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Secretary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "action" "AuditAction" NOT NULL,
    "target" TEXT NOT NULL,
    "targetId" INTEGER,
    "detail" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE INDEX "User_unitId_idx" ON "User"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_code_key" ON "Unit"("code");

-- CreateIndex
CREATE INDEX "Unit_parentId_idx" ON "Unit"("parentId");

-- CreateIndex
CREATE INDEX "Unit_level_idx" ON "Unit"("level");

-- CreateIndex
CREATE INDEX "Unit_name_idx" ON "Unit"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Secretary_userId_key" ON "Secretary"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Secretary_cccd_key" ON "Secretary"("cccd");

-- CreateIndex
CREATE INDEX "Secretary_unitId_position_idx" ON "Secretary"("unitId", "position");

-- CreateIndex
CREATE INDEX "Secretary_fullName_idx" ON "Secretary"("fullName");

-- CreateIndex
CREATE INDEX "Secretary_phone_idx" ON "Secretary"("phone");

-- CreateIndex
CREATE INDEX "Secretary_status_deletedAt_idx" ON "Secretary"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "Secretary_termStart_termEnd_idx" ON "Secretary"("termStart", "termEnd");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_target_targetId_idx" ON "AuditLog"("target", "targetId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Secretary" ADD CONSTRAINT "Secretary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Secretary" ADD CONSTRAINT "Secretary_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Ràng buộc bổ sung (Prisma schema không biểu diễn được)
ALTER TABLE "Secretary" ADD CONSTRAINT "Secretary_term_check" CHECK ("termEnd" IS NULL OR "termEnd" >= "termStart");
ALTER TABLE "Secretary" ADD CONSTRAINT "Secretary_dob_check" CHECK ("dob" < "termStart");
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_memberCount_check" CHECK ("memberCount" >= 0);
