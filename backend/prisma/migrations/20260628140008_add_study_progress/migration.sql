-- CreateEnum
CREATE TYPE "StudyStatus" AS ENUM ('new', 'learning', 'known');

-- CreateTable
CREATE TABLE "study_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "sheet" TEXT NOT NULL DEFAULT '',
    "cardKey" TEXT NOT NULL,
    "status" "StudyStatus" NOT NULL DEFAULT 'new',
    "seenCount" INTEGER NOT NULL DEFAULT 0,
    "lastReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "study_progress_userId_datasetId_sheet_cardKey_key" ON "study_progress"("userId", "datasetId", "sheet", "cardKey");

-- AddForeignKey
ALTER TABLE "study_progress" ADD CONSTRAINT "study_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_progress" ADD CONSTRAINT "study_progress_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "datasets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
