-- Enable PostgreSQL ltree extension
CREATE EXTENSION IF NOT EXISTS ltree;

-- CreateEnum
CREATE TYPE "NoteType" AS ENUM ('SINGLE', 'PERIOD', 'EVENT', 'FILM_RELEASE', 'MENTION', 'DONE');

-- CreateTable
CREATE TABLE "Feed" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Feed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "feedId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "NoteType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "sourceLink" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxonomyNode" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TaxonomyNode_pkey" PRIMARY KEY ("id")
);

-- Alter TaxonomyNode path column to native PostgreSQL ltree type
ALTER TABLE "TaxonomyNode" ALTER COLUMN "path" TYPE ltree USING "path"::ltree;

-- Create GiST Index on TaxonomyNode path for accelerated hierarchical queries
CREATE INDEX "TaxonomyNode_path_gist_idx" ON "TaxonomyNode" USING gist ("path");

-- CreateTable
CREATE TABLE "_NoteToTaxonomyNode" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_NoteToTaxonomyNode_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Feed_slug_key" ON "Feed"("slug");

-- CreateIndex
CREATE INDEX "Note_startDate_endDate_idx" ON "Note"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "Note_updatedAt_idx" ON "Note"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TaxonomyNode_path_key" ON "TaxonomyNode"("path");

-- CreateIndex
CREATE INDEX "_NoteToTaxonomyNode_B_index" ON "_NoteToTaxonomyNode"("B");

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "Feed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_NoteToTaxonomyNode" ADD CONSTRAINT "_NoteToTaxonomyNode_A_fkey" FOREIGN KEY ("A") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_NoteToTaxonomyNode" ADD CONSTRAINT "_NoteToTaxonomyNode_B_fkey" FOREIGN KEY ("B") REFERENCES "TaxonomyNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
