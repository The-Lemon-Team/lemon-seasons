-- AlterTable: Add privacy (default 'private') and publicFeedId to Note
ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "privacy" TEXT NOT NULL DEFAULT 'private';
ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "publicFeedId" TEXT;

-- Ensure all existing notes are explicitly set to privacy = 'private'
UPDATE "Note" SET "privacy" = 'private' WHERE "privacy" IS NULL OR "privacy" = '';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Note_privacy_idx" ON "Note"("privacy");
CREATE INDEX IF NOT EXISTS "Note_privacy_status_idx" ON "Note"("privacy", "status");
CREATE INDEX IF NOT EXISTS "Note_publicFeedId_idx" ON "Note"("publicFeedId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Note_publicFeedId_fkey'
    ) THEN
        ALTER TABLE "Note" ADD CONSTRAINT "Note_publicFeedId_fkey"
        FOREIGN KEY ("publicFeedId") REFERENCES "Feed"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
