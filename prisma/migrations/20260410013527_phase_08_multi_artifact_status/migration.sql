-- AlterTable
ALTER TABLE "ScheduledDeck" ADD COLUMN     "audioCompletedAt" TIMESTAMP(3),
ADD COLUMN     "audioError" TEXT,
ADD COLUMN     "audioStatus" TEXT,
ADD COLUMN     "deckCompletedAt" TIMESTAMP(3),
ADD COLUMN     "deckError" TEXT,
ADD COLUMN     "deckStatus" TEXT,
ADD COLUMN     "infographicCompletedAt" TIMESTAMP(3),
ADD COLUMN     "infographicError" TEXT,
ADD COLUMN     "infographicStatus" TEXT,
ADD COLUMN     "notebookId" TEXT,
ADD COLUMN     "reportCompletedAt" TIMESTAMP(3),
ADD COLUMN     "reportError" TEXT,
ADD COLUMN     "reportStatus" TEXT;
