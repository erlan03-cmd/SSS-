-- CreateEnum
CREATE TYPE "CashMovementType" AS ENUM ('CASH_IN', 'CASH_OUT', 'EXPENSE');

-- AlterTable
ALTER TABLE "CashShift"
ADD COLUMN "cashIn" DECIMAL(12,2),
ADD COLUMN "cashOut" DECIMAL(12,2),
ADD COLUMN "expenses" DECIMAL(12,2);

-- CreateTable
CREATE TABLE "SalePayment" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashMovement" (
    "id" TEXT NOT NULL,
    "type" "CashMovementType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CashMovement_pkey" PRIMARY KEY ("id")
);

-- Backfill every historical sale so old reports keep their payment totals.
INSERT INTO "SalePayment" ("id", "saleId", "method", "amount", "createdAt")
SELECT CONCAT('legacy_', "id"), "id", "paymentMethod", "total", "createdAt"
FROM "Sale";

-- CreateIndex
CREATE INDEX "SalePayment_saleId_idx" ON "SalePayment"("saleId");
CREATE INDEX "SalePayment_method_createdAt_idx" ON "SalePayment"("method", "createdAt");
CREATE INDEX "CashMovement_shiftId_type_idx" ON "CashMovement"("shiftId", "type");
CREATE INDEX "CashMovement_employeeId_createdAt_idx" ON "CashMovement"("employeeId", "createdAt");

-- AddForeignKey
ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "CashShift"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
