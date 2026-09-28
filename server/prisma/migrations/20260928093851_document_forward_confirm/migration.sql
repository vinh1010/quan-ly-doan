-- AlterTable
ALTER TABLE "IncomingDocument" ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedById" INTEGER,
ADD COLUMN     "resultNote" TEXT;

-- CreateTable
CREATE TABLE "DocumentForward" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "fromUnitId" INTEGER NOT NULL,
    "toUnitId" INTEGER NOT NULL,
    "forwardedById" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentForward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentForward_documentId_createdAt_idx" ON "DocumentForward"("documentId", "createdAt");

-- AddForeignKey
ALTER TABLE "IncomingDocument" ADD CONSTRAINT "IncomingDocument_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentForward" ADD CONSTRAINT "DocumentForward_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "IncomingDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentForward" ADD CONSTRAINT "DocumentForward_fromUnitId_fkey" FOREIGN KEY ("fromUnitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentForward" ADD CONSTRAINT "DocumentForward_toUnitId_fkey" FOREIGN KEY ("toUnitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentForward" ADD CONSTRAINT "DocumentForward_forwardedById_fkey" FOREIGN KEY ("forwardedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
