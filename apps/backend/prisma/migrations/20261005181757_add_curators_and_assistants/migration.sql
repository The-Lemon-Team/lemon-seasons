-- CreateEnum
CREATE TYPE "AssistantSkill" AS ENUM ('IMAGE_GEN', 'NOTEBOOKLM_PODCAST', 'NOTE_FORMATTER', 'FEED_MAKER');

-- DropIndex
DROP INDEX "ChatThread_targetAgent_idx";

-- AlterTable
ALTER TABLE "ChatFolder" ADD COLUMN     "contextRules" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "imageStylePrompt" TEXT;

-- AlterTable
ALTER TABLE "ChatMessageRecord" ADD COLUMN     "mediaUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "payload" JSONB,
ADD COLUMN     "senderType" TEXT NOT NULL DEFAULT 'USER';

-- AlterTable
ALTER TABLE "ChatThread" ADD COLUMN     "assistantId" TEXT,
ADD COLUMN     "curatorId" TEXT,
ALTER COLUMN "type" SET DEFAULT 'TOPIC';

-- CreateTable
CREATE TABLE "Curator" (
    "id" TEXT NOT NULL,
    "folderId" TEXT,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "roleTitle" TEXT NOT NULL,
    "personality" TEXT,
    "systemPrompt" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '👤',
    "accentColor" TEXT NOT NULL DEFAULT '#10b981',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Curator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assistant" (
    "id" TEXT NOT NULL,
    "folderId" TEXT,
    "name" TEXT NOT NULL,
    "skillType" "AssistantSkill" NOT NULL DEFAULT 'IMAGE_GEN',
    "description" TEXT,
    "customPrompt" TEXT,
    "config" JSONB,
    "avatar" TEXT NOT NULL DEFAULT '🛠️',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Assistant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Curator_folderId_idx" ON "Curator"("folderId");

-- CreateIndex
CREATE INDEX "Curator_deletedAt_idx" ON "Curator"("deletedAt");

-- CreateIndex
CREATE INDEX "Assistant_folderId_idx" ON "Assistant"("folderId");

-- CreateIndex
CREATE INDEX "Assistant_skillType_idx" ON "Assistant"("skillType");

-- CreateIndex
CREATE INDEX "Assistant_deletedAt_idx" ON "Assistant"("deletedAt");

-- CreateIndex
CREATE INDEX "ChatThread_curatorId_idx" ON "ChatThread"("curatorId");

-- CreateIndex
CREATE INDEX "ChatThread_assistantId_idx" ON "ChatThread"("assistantId");

-- AddForeignKey
ALTER TABLE "Curator" ADD CONSTRAINT "Curator_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "ChatFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assistant" ADD CONSTRAINT "Assistant_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "ChatFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_curatorId_fkey" FOREIGN KEY ("curatorId") REFERENCES "Curator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "Assistant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
