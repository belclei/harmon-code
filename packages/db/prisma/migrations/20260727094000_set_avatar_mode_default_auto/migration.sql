-- Set avatarMode DB default to 'auto' (must be in second transaction after enum value was added)
ALTER TABLE "User" ALTER COLUMN "avatarMode" SET DEFAULT 'auto';
