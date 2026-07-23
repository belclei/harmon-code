-- Harmon: CHECK constraints documented in IMPLEMENTACAO.md §1.2 and §1.4 that
-- Prisma's schema DSL cannot express natively. Applied as raw SQL, per the
-- documented convention (comments in schema.prisma point here).

-- §1.2 SharedItem: exactly one of accountId/creditCardId is set, matching itemType.
ALTER TABLE "SharedItem"
  ADD CONSTRAINT "SharedItem_itemType_target_check"
  CHECK (
    ("itemType" = 'account' AND "accountId" IS NOT NULL AND "creditCardId" IS NULL)
    OR
    ("itemType" = 'credit_card' AND "creditCardId" IS NOT NULL AND "accountId" IS NULL)
  );

-- §1.4 Transaction: exactly one of accountId/creditCardId is set (XOR).
ALTER TABLE "Transaction"
  ADD CONSTRAINT "Transaction_account_xor_card_check"
  CHECK (("accountId" IS NULL) <> ("creditCardId" IS NULL));

-- §1.4 Transaction: amountCents is always positive — sign comes from `kind`, never the value.
ALTER TABLE "Transaction"
  ADD CONSTRAINT "Transaction_amountCents_positive_check"
  CHECK ("amountCents" > 0);
