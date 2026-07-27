-- AlterEnum - add new values to AvatarMode
ALTER TYPE "AvatarMode" ADD VALUE IF NOT EXISTS 'auto';
ALTER TYPE "AvatarMode" ADD VALUE IF NOT EXISTS 'google';

-- AlterTable - add googleAvatarUrl column
ALTER TABLE "User" ADD COLUMN "googleAvatarUrl" TEXT;
