-- CreateEnum
CREATE TYPE "TxDirection" AS ENUM ('out', 'in');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "transferDirection" "TxDirection";
