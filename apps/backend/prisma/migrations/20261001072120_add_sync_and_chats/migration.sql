-- CreateEnum
CREATE TYPE "ChatType" AS ENUM ('DIRECT', 'GROUP');

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "curator" TEXT,
ADD COLUMN     "parentNoteId" TEXT,
ADD COLUMN     "resonanceScore" INTEGER;

-- CreateTable
CREATE TABLE "ChatFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ChatFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatThread" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ChatType" NOT NULL DEFAULT 'DIRECT',
    "folderId" TEXT,
    "targetAgent" TEXT,
    "participantAgents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dateScope" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "lastMessageAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ChatThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessageRecord" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "avatar" TEXT,
    "text" TEXT NOT NULL,
    "resonanceScore" INTEGER,
    "sources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "resonanceNodes" JSONB,
    "groupSummary" JSONB,
    "suggestedCard" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncSession" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingChange" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncCommit" (
    "id" TEXT NOT NULL,
    "parentCommitIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deviceId" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "sessionId" TEXT,
    "summary" TEXT,
    "entitiesCount" INTEGER NOT NULL DEFAULT 0,
    "payloadJson" JSONB NOT NULL,
    "isPushed" BOOLEAN NOT NULL DEFAULT false,
    "pushedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncCommit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatFolder_path_key" ON "ChatFolder"("path");

-- CreateIndex
CREATE INDEX "ChatFolder_path_idx" ON "ChatFolder"("path");

-- CreateIndex
CREATE INDEX "ChatFolder_parentId_idx" ON "ChatFolder"("parentId");

-- CreateIndex
CREATE INDEX "ChatFolder_deletedAt_idx" ON "ChatFolder"("deletedAt");

-- CreateIndex
CREATE INDEX "ChatThread_folderId_idx" ON "ChatThread"("folderId");

-- CreateIndex
CREATE INDEX "ChatThread_type_idx" ON "ChatThread"("type");

-- CreateIndex
CREATE INDEX "ChatThread_targetAgent_idx" ON "ChatThread"("targetAgent");

-- CreateIndex
CREATE INDEX "ChatThread_isPinned_lastMessageAt_idx" ON "ChatThread"("isPinned", "lastMessageAt");

-- CreateIndex
CREATE INDEX "ChatThread_deletedAt_idx" ON "ChatThread"("deletedAt");

-- CreateIndex
CREATE INDEX "ChatMessageRecord_threadId_createdAt_idx" ON "ChatMessageRecord"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "SyncSession_status_idx" ON "SyncSession"("status");

-- CreateIndex
CREATE INDEX "SyncSession_deviceId_idx" ON "SyncSession"("deviceId");

-- CreateIndex
CREATE INDEX "SyncSession_startedAt_idx" ON "SyncSession"("startedAt");

-- CreateIndex
CREATE INDEX "PendingChange_sessionId_idx" ON "PendingChange"("sessionId");

-- CreateIndex
CREATE INDEX "PendingChange_entityType_entityId_idx" ON "PendingChange"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "SyncCommit_sessionId_key" ON "SyncCommit"("sessionId");

-- CreateIndex
CREATE INDEX "SyncCommit_deviceId_idx" ON "SyncCommit"("deviceId");

-- CreateIndex
CREATE INDEX "SyncCommit_createdAt_idx" ON "SyncCommit"("createdAt");

-- CreateIndex
CREATE INDEX "SyncCommit_isPushed_idx" ON "SyncCommit"("isPushed");

-- CreateIndex
CREATE INDEX "Note_curator_idx" ON "Note"("curator");

-- CreateIndex
CREATE INDEX "Note_resonanceScore_idx" ON "Note"("resonanceScore");

-- CreateIndex
CREATE INDEX "Note_parentNoteId_idx" ON "Note"("parentNoteId");

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_parentNoteId_fkey" FOREIGN KEY ("parentNoteId") REFERENCES "Note"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatFolder" ADD CONSTRAINT "ChatFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ChatFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "ChatFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessageRecord" ADD CONSTRAINT "ChatMessageRecord_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingChange" ADD CONSTRAINT "PendingChange_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SyncSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncCommit" ADD CONSTRAINT "SyncCommit_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SyncSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
