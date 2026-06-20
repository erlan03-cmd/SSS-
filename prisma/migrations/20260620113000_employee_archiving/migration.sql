ALTER TABLE "Employee" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "Employee_deletedAt_idx" ON "Employee"("deletedAt");
