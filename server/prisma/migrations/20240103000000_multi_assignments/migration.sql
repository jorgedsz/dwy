-- CreateTable
CREATE TABLE "ClientAssignment" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "ClientAssignment_pkey" PRIMARY KEY ("id")
);

-- Migrate existing data
INSERT INTO "ClientAssignment" ("clientId", "userId", "role")
SELECT "id", "csUserId", 'cs' FROM "Client" WHERE "csUserId" IS NOT NULL;

INSERT INTO "ClientAssignment" ("clientId", "userId", "role")
SELECT "id", "opsUserId", 'ops' FROM "Client" WHERE "opsUserId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "Client" DROP CONSTRAINT IF EXISTS "Client_csUserId_fkey";
ALTER TABLE "Client" DROP CONSTRAINT IF EXISTS "Client_opsUserId_fkey";

-- AlterTable
ALTER TABLE "Client" DROP COLUMN IF EXISTS "csUserId";
ALTER TABLE "Client" DROP COLUMN IF EXISTS "opsUserId";

-- CreateIndex
CREATE UNIQUE INDEX "ClientAssignment_clientId_userId_role_key" ON "ClientAssignment"("clientId", "userId", "role");

-- AddForeignKey
ALTER TABLE "ClientAssignment" ADD CONSTRAINT "ClientAssignment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAssignment" ADD CONSTRAINT "ClientAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
