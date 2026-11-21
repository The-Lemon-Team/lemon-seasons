-- AlterTable
ALTER TABLE "Feed" ADD COLUMN "ownerUserId" TEXT;

-- AlterTable
ALTER TABLE "Note" ADD COLUMN "ownerUserId" TEXT;

-- AlterTable
ALTER TABLE "Stream" ADD COLUMN "ownerUserId" TEXT;

-- CreateTable
CREATE TABLE "NoteShare" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "granteeUserId" TEXT NOT NULL,
    "grantedByUserId" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL DEFAULT 'USER',
    "scopeRef" TEXT,
    "canReadMedia" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoteShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedShare" (
    "id" TEXT NOT NULL,
    "feedId" TEXT NOT NULL,
    "granteeUserId" TEXT NOT NULL,
    "grantedByUserId" TEXT NOT NULL,
    "permission" TEXT NOT NULL DEFAULT 'READ',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Feed_ownerUserId_idx" ON "Feed"("ownerUserId");

-- CreateIndex
CREATE INDEX "Note_ownerUserId_privacy_idx" ON "Note"("ownerUserId", "privacy");

-- CreateIndex
CREATE INDEX "Stream_ownerUserId_idx" ON "Stream"("ownerUserId");

-- CreateIndex
CREATE INDEX "NoteShare_granteeUserId_idx" ON "NoteShare"("granteeUserId");

-- CreateIndex
CREATE INDEX "NoteShare_noteId_idx" ON "NoteShare"("noteId");

-- CreateIndex
CREATE INDEX "NoteShare_scopeRef_idx" ON "NoteShare"("scopeRef");

-- CreateIndex
CREATE UNIQUE INDEX "NoteShare_noteId_granteeUserId_scopeType_scopeRef_key" ON "NoteShare"("noteId", "granteeUserId", "scopeType", "scopeRef");

-- CreateIndex
CREATE INDEX "FeedShare_granteeUserId_idx" ON "FeedShare"("granteeUserId");

-- CreateIndex
CREATE UNIQUE INDEX "FeedShare_feedId_granteeUserId_key" ON "FeedShare"("feedId", "granteeUserId");

-- AddForeignKey
ALTER TABLE "Feed" ADD CONSTRAINT "Feed_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stream" ADD CONSTRAINT "Stream_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteShare" ADD CONSTRAINT "NoteShare_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteShare" ADD CONSTRAINT "NoteShare_granteeUserId_fkey" FOREIGN KEY ("granteeUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteShare" ADD CONSTRAINT "NoteShare_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedShare" ADD CONSTRAINT "FeedShare_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "Feed"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedShare" ADD CONSTRAINT "FeedShare_granteeUserId_fkey" FOREIGN KEY ("granteeUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
