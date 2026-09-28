-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CHI_DAO', 'THONG_BAO', 'MOI_HOP', 'KHAC');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('CHUA_XU_LY', 'DANG_XU_LY', 'DA_XU_LY');

-- CreateTable
CREATE TABLE "IncomingDocument" (
    "id" SERIAL NOT NULL,
    "number" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "issuedDate" DATE NOT NULL,
    "receivedDate" DATE NOT NULL,
    "type" "DocumentType" NOT NULL DEFAULT 'KHAC',
    "status" "DocumentStatus" NOT NULL DEFAULT 'CHUA_XU_LY',
    "deadline" DATE,
    "assignedTo" TEXT,
    "note" TEXT,
    "unitId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncomingDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IncomingDocument_unitId_status_idx" ON "IncomingDocument"("unitId", "status");

-- CreateIndex
CREATE INDEX "IncomingDocument_number_idx" ON "IncomingDocument"("number");

-- CreateIndex
CREATE INDEX "IncomingDocument_receivedDate_idx" ON "IncomingDocument"("receivedDate");

-- CreateIndex
CREATE INDEX "IncomingDocument_deadline_idx" ON "IncomingDocument"("deadline");

-- AddForeignKey
ALTER TABLE "IncomingDocument" ADD CONSTRAINT "IncomingDocument_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomingDocument" ADD CONSTRAINT "IncomingDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
