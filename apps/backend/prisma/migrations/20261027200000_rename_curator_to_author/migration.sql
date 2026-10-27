-- RenameColumn
ALTER TABLE "Note" RENAME COLUMN "curator" TO "author";

-- RenameIndex
ALTER INDEX "Note_curator_idx" RENAME TO "Note_author_idx";
