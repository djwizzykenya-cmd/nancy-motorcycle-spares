ALTER TABLE "payments"
ADD COLUMN "providerMerchantRequestId" TEXT,
ADD COLUMN "providerCheckoutRequestId" TEXT,
ADD COLUMN "providerPhone" TEXT;

CREATE UNIQUE INDEX "payments_providerMerchantRequestId_key"
ON "payments"("providerMerchantRequestId");

CREATE UNIQUE INDEX "payments_providerCheckoutRequestId_key"
ON "payments"("providerCheckoutRequestId");
