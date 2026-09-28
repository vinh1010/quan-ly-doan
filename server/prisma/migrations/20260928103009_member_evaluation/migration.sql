-- CreateTable
CREATE TABLE "MemberEvaluation" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "excellentCount" INTEGER NOT NULL DEFAULT 0,
    "goodCount" INTEGER NOT NULL DEFAULT 0,
    "fairCount" INTEGER NOT NULL DEFAULT 0,
    "averageCount" INTEGER NOT NULL DEFAULT 0,
    "weakCount" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "unitId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationForward" (
    "id" SERIAL NOT NULL,
    "evaluationId" INTEGER NOT NULL,
    "fromUnitId" INTEGER NOT NULL,
    "toUnitId" INTEGER NOT NULL,
    "forwardedById" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationForward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberEvaluation_unitId_year_idx" ON "MemberEvaluation"("unitId", "year");

-- CreateIndex
CREATE INDEX "MemberEvaluation_year_idx" ON "MemberEvaluation"("year");

-- CreateIndex
CREATE INDEX "EvaluationForward_evaluationId_createdAt_idx" ON "EvaluationForward"("evaluationId", "createdAt");

-- AddForeignKey
ALTER TABLE "MemberEvaluation" ADD CONSTRAINT "MemberEvaluation_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberEvaluation" ADD CONSTRAINT "MemberEvaluation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationForward" ADD CONSTRAINT "EvaluationForward_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "MemberEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationForward" ADD CONSTRAINT "EvaluationForward_fromUnitId_fkey" FOREIGN KEY ("fromUnitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationForward" ADD CONSTRAINT "EvaluationForward_toUnitId_fkey" FOREIGN KEY ("toUnitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationForward" ADD CONSTRAINT "EvaluationForward_forwardedById_fkey" FOREIGN KEY ("forwardedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
