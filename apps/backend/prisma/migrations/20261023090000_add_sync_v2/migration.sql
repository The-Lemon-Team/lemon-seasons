-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "fieldClocks" JSONB,
ADD COLUMN     "deletedHlc" TEXT;

-- CreateTable
CREATE TABLE "NoteAttachment" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "NoteAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncEventLog" (
    "eventId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "hlc" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncEventLog_pkey" PRIMARY KEY ("eventId")
);

-- CreateIndex
CREATE INDEX "NoteAttachment_noteId_deletedAt_idx" ON "NoteAttachment"("noteId", "deletedAt");

-- CreateIndex
CREATE INDEX "NoteAttachment_kind_idx" ON "NoteAttachment"("kind");

-- CreateIndex
CREATE INDEX "SyncEventLog_entityType_entityId_idx" ON "SyncEventLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "SyncEventLog_hlc_idx" ON "SyncEventLog"("hlc");

-- AddForeignKey
ALTER TABLE "NoteAttachment" ADD CONSTRAINT "NoteAttachment_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
