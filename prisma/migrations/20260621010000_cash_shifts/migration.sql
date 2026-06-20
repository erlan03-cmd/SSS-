-- CreateEnum
CREATE TYPE "CashShiftStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "CashShift" (
    "id" TEXT NOT NULL,
    "status" "CashShiftStatus" NOT NULL DEFAULT 'OPEN',
    "openingCash" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "closingCash" DECIMAL(12,2),
    "cashSales" DECIMAL(12,2),
    "expectedCash" DECIMAL(12,2),
    "cashDifference" DECIMAL(12,2),
    "note" TEXT,
    "employeeId" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashShift_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN "shiftId" TEXT;

-- CreateIndex
CREATE INDEX "CashShift_employeeId_status_idx" ON "CashShift"("employeeId", "status");
CREATE INDEX "CashShift_openedAt_idx" ON "CashShift"("openedAt");
CREATE INDEX "Sale_shiftId_idx" ON "Sale"("shiftId");
CREATE UNIQUE INDEX "CashShift_one_open_per_employee" ON "CashShift"("employeeId") WHERE "status" = 'OPEN';

-- AddForeignKey
ALTER TABLE "CashShift" ADD CONSTRAINT "CashShift_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "CashShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
