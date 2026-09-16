-- DropForeignKey
ALTER TABLE "Note" DROP CONSTRAINT "Note_feedId_fkey";

-- DropIndex
DROP INDEX "Folder_path_key";

-- AlterTable
ALTER TABLE "Folder" ADD COLUMN     "containerId" TEXT,
ADD COLUMN     "privacy" TEXT NOT NULL DEFAULT 'public';

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "containerId" TEXT,
ADD COLUMN     "filePath" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "feedId" DROP NOT NULL,
ALTER COLUMN "type" SET DEFAULT 'SINGLE',
ALTER COLUMN "startDate" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Container" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'obsidian',
    "description" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "ownerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Container_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoteVersion" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "content" TEXT NOT NULL,
    "commitHash" TEXT,
    "authorName" TEXT,
    "authorEmail" TEXT,
    "commitMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoteVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Container_ownerUserId_idx" ON "Container"("ownerUserId");

-- CreateIndex
CREATE INDEX "Container_visibility_idx" ON "Container"("visibility");

-- CreateIndex
CREATE INDEX "NoteVersion_noteId_idx" ON "NoteVersion"("noteId");

-- CreateIndex
CREATE INDEX "NoteVersion_commitHash_idx" ON "NoteVersion"("commitHash");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserKey_key_key" ON "UserKey"("key");

-- CreateIndex
CREATE INDEX "UserKey_userId_idx" ON "UserKey"("userId");

-- CreateIndex
CREATE INDEX "UserKey_provider_idx" ON "UserKey"("provider");

-- CreateIndex
CREATE INDEX "Folder_containerId_idx" ON "Folder"("containerId");

-- CreateIndex
CREATE INDEX "Folder_deletedAt_idx" ON "Folder"("deletedAt");

-- CreateIndex
CREATE INDEX "Hashtag_deletedAt_idx" ON "Hashtag"("deletedAt");

-- CreateIndex
CREATE INDEX "Note_feedId_idx" ON "Note"("feedId");

-- CreateIndex
CREATE INDEX "Note_containerId_idx" ON "Note"("containerId");

-- CreateIndex
CREATE INDEX "Note_feedId_deletedAt_idx" ON "Note"("feedId", "deletedAt");

-- CreateIndex
CREATE INDEX "Note_deletedAt_idx" ON "Note"("deletedAt");

-- CreateIndex
CREATE INDEX "Note_type_idx" ON "Note"("type");

-- CreateIndex
CREATE INDEX "TaxonomyNode_path_idx" ON "TaxonomyNode"("path");

-- CreateIndex
CREATE INDEX "TaxonomyNode_deletedAt_idx" ON "TaxonomyNode"("deletedAt");

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "Feed"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "Container"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "Container"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Container" ADD CONSTRAINT "Container_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteVersion" ADD CONSTRAINT "NoteVersion_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserKey" ADD CONSTRAINT "UserKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
