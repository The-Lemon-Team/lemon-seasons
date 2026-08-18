/*
  Warnings:

  - You are about to alter the column `path` on the `TaxonomyNode` table. The data in that column could be lost. The data in that column will be cast from `ltree` to `Text`.

*/
-- DropIndex
DROP INDEX "TaxonomyNode_path_gist_idx";

-- AlterTable
ALTER TABLE "TaxonomyNode" ALTER COLUMN "path" SET DATA TYPE TEXT;
