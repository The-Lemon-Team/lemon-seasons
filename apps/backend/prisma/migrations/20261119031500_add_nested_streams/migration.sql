-- AlterTable
ALTER TABLE "Stream" ADD COLUMN "childStreamIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "StreamTab" ADD COLUMN "targetStreamId" TEXT;

-- CreateIndex
CREATE INDEX "StreamTab_targetStreamId_idx" ON "StreamTab"("targetStreamId");

-- CreateIndex
CREATE UNIQUE INDEX "StreamTab_streamId_targetStreamId_key" ON "StreamTab"("streamId", "targetStreamId");

-- AddForeignKey
ALTER TABLE "StreamTab" ADD CONSTRAINT "StreamTab_targetStreamId_fkey" FOREIGN KEY ("targetStreamId") REFERENCES "Stream"("id") ON DELETE CASCADE ON UPDATE CASCADE;
