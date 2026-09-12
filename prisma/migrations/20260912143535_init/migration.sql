-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "originalCode" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "securityScore" INTEGER NOT NULL,
    "performanceScore" INTEGER NOT NULL,
    "maintainabilityScore" INTEGER NOT NULL,
    "readabilityScore" INTEGER NOT NULL,
    "issues" JSONB NOT NULL,
    "strengths" JSONB NOT NULL,
    "refactoredCode" TEXT NOT NULL,
    "finalRecommendation" TEXT NOT NULL,
    "aiProvider" TEXT NOT NULL DEFAULT 'mock',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlagiarismCheck" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Untitled comparison',
    "language" TEXT NOT NULL,
    "sourceCode" TEXT NOT NULL,
    "comparisonCode" TEXT NOT NULL,
    "similarityScore" INTEGER NOT NULL,
    "classification" TEXT NOT NULL,
    "rawTokenSimilarity" INTEGER NOT NULL DEFAULT 0,
    "normalizedTokenSimilarity" INTEGER NOT NULL DEFAULT 0,
    "matchedCoverage" INTEGER NOT NULL DEFAULT 0,
    "matchedSections" JSONB NOT NULL,
    "explanation" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlagiarismCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Review_language_idx" ON "Review"("language");

-- CreateIndex
CREATE INDEX "Review_overallScore_idx" ON "Review"("overallScore");

-- CreateIndex
CREATE INDEX "Review_createdAt_idx" ON "Review"("createdAt");

-- CreateIndex
CREATE INDEX "Review_userId_idx" ON "Review"("userId");

-- CreateIndex
CREATE INDEX "PlagiarismCheck_userId_idx" ON "PlagiarismCheck"("userId");

-- CreateIndex
CREATE INDEX "PlagiarismCheck_similarityScore_idx" ON "PlagiarismCheck"("similarityScore");

-- CreateIndex
CREATE INDEX "PlagiarismCheck_createdAt_idx" ON "PlagiarismCheck"("createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlagiarismCheck" ADD CONSTRAINT "PlagiarismCheck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
