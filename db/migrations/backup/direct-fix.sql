-- Direct fix for articles_used column
ALTER TABLE "user_usage" ADD COLUMN IF NOT EXISTS "articles_used" integer DEFAULT 0 NOT NULL;
ALTER TABLE "user_usage" ADD COLUMN IF NOT EXISTS "credits_used" integer DEFAULT 0 NOT NULL;
ALTER TABLE "user_usage" ADD COLUMN IF NOT EXISTS "payg_credits" integer DEFAULT 0 NOT NULL;

-- Update any existing rows to ensure they have values
UPDATE "user_usage" SET 
    "articles_used" = 0, 
    "credits_used" = 0, 
    "payg_credits" = 0
WHERE "articles_used" IS NULL OR "credits_used" IS NULL OR "payg_credits" IS NULL; 