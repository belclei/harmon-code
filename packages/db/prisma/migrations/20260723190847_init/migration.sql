-- CreateEnum
CREATE TYPE "Role" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "AvatarMode" AS ENUM ('dicebear', 'gravatar');

-- CreateEnum
CREATE TYPE "ThemePref" AS ENUM ('light', 'dark');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'disabled');

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('pending', 'approved', 'rejected', 'registered');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('awaiting_approval', 'approved', 'registered', 'rejected', 'expired');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('pending', 'accepted', 'rejected');

-- CreateEnum
CREATE TYPE "SharedItemType" AS ENUM ('account', 'credit_card');

-- CreateEnum
CREATE TYPE "SharePermission" AS ENUM ('view', 'edit');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('checking', 'savings', 'cash');

-- CreateEnum
CREATE TYPE "TxKind" AS ENUM ('income', 'expense', 'transfer');

-- CreateEnum
CREATE TYPE "TxSource" AS ENUM ('manual', 'import');

-- CreateEnum
CREATE TYPE "FulfillmentMethod" AS ENUM ('scheduled_confirm', 'manual', 'import_link');

-- CreateEnum
CREATE TYPE "ImportType" AS ENUM ('card_invoice', 'account_statement');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('pending', 'processing', 'extracted', 'reviewed', 'error');

-- CreateEnum
CREATE TYPE "ExtractedStatus" AS ENUM ('pending', 'confirmed', 'rejected');

-- CreateEnum
CREATE TYPE "FlagState" AS ENUM ('off', 'beta', 'on');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "birthDate" DATE NOT NULL,
    "passwordHash" TEXT,
    "googleId" TEXT,
    "role" "Role" NOT NULL DEFAULT 'user',
    "isBetaTester" BOOLEAN NOT NULL DEFAULT false,
    "avatarMode" "AvatarMode" NOT NULL DEFAULT 'dicebear',
    "themePref" "ThemePref" NOT NULL DEFAULT 'light',
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "onboardingCompletedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'pending',
    "registrationTokenHash" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "registeredUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "inviterUserId" TEXT NOT NULL,
    "inviteeName" TEXT NOT NULL,
    "inviteeEmail" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'awaiting_approval',
    "registrationTokenHash" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "registeredUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserConnection" (
    "id" TEXT NOT NULL,
    "requesterUserId" TEXT NOT NULL,
    "addresseeUserId" TEXT NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'pending',
    "connectionTokenHash" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedItem" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "sharedWithUserId" TEXT NOT NULL,
    "itemType" "SharedItemType" NOT NULL,
    "accountId" TEXT,
    "creditCardId" TEXT,
    "permission" "SharePermission" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "compeCode" TEXT,
    "logoAsset" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "institutionId" TEXT,
    "name" TEXT,
    "type" "AccountType" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "openingBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "overdraftLimitCents" INTEGER NOT NULL DEFAULT 0,
    "reconciledBalanceCents" INTEGER,
    "reconciledAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditCard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "name" TEXT,
    "limitCents" INTEGER NOT NULL,
    "closingDay" INTEGER NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "autoDebitAccountId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "kind" "TxKind" NOT NULL,
    "icon" TEXT NOT NULL,
    "colorToken" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT,
    "creditCardId" TEXT,
    "categoryId" TEXT,
    "kind" "TxKind" NOT NULL,
    "source" "TxSource" NOT NULL DEFAULT 'manual',
    "description" TEXT NOT NULL,
    "transactionDate" DATE NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "amountCents" INTEGER NOT NULL,
    "amountBRLCents" INTEGER NOT NULL,
    "fxRate" DECIMAL(18,8),
    "isScheduled" BOOLEAN NOT NULL DEFAULT false,
    "isFixedOverride" BOOLEAN,
    "transferPairId" TEXT,
    "installmentGroupId" TEXT,
    "installmentNumber" INTEGER,
    "installmentTotal" INTEGER,
    "installmentPurchaseAmountCents" INTEGER,
    "installmentHasInterest" BOOLEAN,
    "recurringTransactionId" TEXT,
    "importedDocumentId" TEXT,
    "portadorUserId" TEXT,
    "portadorSettled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "kind" "TxKind" NOT NULL,
    "accountId" TEXT,
    "creditCardId" TEXT,
    "categoryId" TEXT,
    "referenceAmountCents" INTEGER NOT NULL,
    "referenceAmountBRLCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "dayOfMonth" INTEGER NOT NULL,
    "isVariableAmount" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringFulfillment" (
    "id" TEXT NOT NULL,
    "recurringTransactionId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "transactionId" TEXT,
    "method" "FulfillmentMethod" NOT NULL,
    "fulfilledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringFulfillment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportedDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ImportType" NOT NULL,
    "accountId" TEXT,
    "creditCardId" TEXT,
    "contentHash" TEXT NOT NULL,
    "rawJson" JSONB,
    "status" "ImportStatus" NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "ImportedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractedTransaction" (
    "id" TEXT NOT NULL,
    "importedDocumentId" TEXT NOT NULL,
    "status" "ExtractedStatus" NOT NULL DEFAULT 'pending',
    "transactionDate" DATE NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "description" TEXT NOT NULL,
    "suggestedCategoryId" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "cardHolderRaw" TEXT,
    "suggestedPortadorUserId" TEXT,
    "installmentNumber" INTEGER,
    "installmentTotal" INTEGER,
    "duplicateOfTxId" TEXT,
    "suggestedRecurringId" TEXT,
    "confirmedTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtractedTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "type" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "properties" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageDailyRollup" (
    "id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "metric" TEXT NOT NULL,
    "dimension" TEXT,
    "value" INTEGER NOT NULL,

    CONSTRAINT "UsageDailyRollup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "state" "FlagState" NOT NULL DEFAULT 'off',
    "rolloutPercent" INTEGER NOT NULL DEFAULT 100,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "FeatureFlagOverride" (
    "id" TEXT NOT NULL,
    "flagKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "state" "FlagState" NOT NULL,

    CONSTRAINT "FeatureFlagOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Investment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentMovement" (
    "id" TEXT NOT NULL,
    "investmentId" TEXT NOT NULL,
    "amountBRLCents" INTEGER NOT NULL,
    "movementDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestmentMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "WaitlistEntry_email_idx" ON "WaitlistEntry"("email");

-- CreateIndex
CREATE INDEX "WaitlistEntry_status_idx" ON "WaitlistEntry"("status");

-- CreateIndex
CREATE INDEX "Invite_inviterUserId_idx" ON "Invite"("inviterUserId");

-- CreateIndex
CREATE INDEX "Invite_inviteeEmail_idx" ON "Invite"("inviteeEmail");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");

-- CreateIndex
CREATE INDEX "UserConnection_addresseeUserId_idx" ON "UserConnection"("addresseeUserId");

-- CreateIndex
CREATE UNIQUE INDEX "UserConnection_requesterUserId_addresseeUserId_key" ON "UserConnection"("requesterUserId", "addresseeUserId");

-- CreateIndex
CREATE INDEX "SharedItem_sharedWithUserId_idx" ON "SharedItem"("sharedWithUserId");

-- CreateIndex
CREATE UNIQUE INDEX "SharedItem_ownerUserId_sharedWithUserId_itemType_accountId__key" ON "SharedItem"("ownerUserId", "sharedWithUserId", "itemType", "accountId", "creditCardId");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_compeCode_key" ON "Institution"("compeCode");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "CreditCard_userId_idx" ON "CreditCard"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_userId_name_kind_key" ON "Category"("userId", "name", "kind");

-- CreateIndex
CREATE INDEX "Transaction_userId_transactionDate_idx" ON "Transaction"("userId", "transactionDate");

-- CreateIndex
CREATE INDEX "Transaction_accountId_idx" ON "Transaction"("accountId");

-- CreateIndex
CREATE INDEX "Transaction_creditCardId_idx" ON "Transaction"("creditCardId");

-- CreateIndex
CREATE INDEX "Transaction_transferPairId_idx" ON "Transaction"("transferPairId");

-- CreateIndex
CREATE INDEX "Transaction_installmentGroupId_idx" ON "Transaction"("installmentGroupId");

-- CreateIndex
CREATE INDEX "Transaction_recurringTransactionId_idx" ON "Transaction"("recurringTransactionId");

-- CreateIndex
CREATE INDEX "RecurringTransaction_userId_idx" ON "RecurringTransaction"("userId");

-- CreateIndex
CREATE INDEX "RecurringFulfillment_recurringTransactionId_idx" ON "RecurringFulfillment"("recurringTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringFulfillment_recurringTransactionId_year_month_key" ON "RecurringFulfillment"("recurringTransactionId", "year", "month");

-- CreateIndex
CREATE INDEX "ImportedDocument_userId_idx" ON "ImportedDocument"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportedDocument_userId_contentHash_key" ON "ImportedDocument"("userId", "contentHash");

-- CreateIndex
CREATE INDEX "ExtractedTransaction_importedDocumentId_idx" ON "ExtractedTransaction"("importedDocumentId");

-- CreateIndex
CREATE INDEX "DomainEvent_userId_createdAt_idx" ON "DomainEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DomainEvent_aggregateType_aggregateId_idx" ON "DomainEvent"("aggregateType", "aggregateId");

-- CreateIndex
CREATE INDEX "UsageEvent_name_createdAt_idx" ON "UsageEvent"("name", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UsageDailyRollup_day_metric_dimension_key" ON "UsageDailyRollup"("day", "metric", "dimension");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlagOverride_flagKey_userId_key" ON "FeatureFlagOverride"("flagKey", "userId");
