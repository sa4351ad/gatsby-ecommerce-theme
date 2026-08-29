-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "VotingStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'OPEN', 'CLOSED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VotingKind" AS ENUM ('STANDARD', 'ELECTION');

-- CreateEnum
CREATE TYPE "VotingTargetType" AS ENUM ('ALL', 'GROUP', 'SELECTED', 'CONDITIONAL');

-- CreateEnum
CREATE TYPE "QuorumType" AS ENUM ('NONE', 'PERCENTAGE_OF_MEMBERS', 'FIXED_COUNT', 'PERCENTAGE_OF_WEIGHT');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('DECISION_APPROVAL', 'YES_NO', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'ELECTION', 'RANKING', 'RATING_5', 'RATING_10', 'PERCENTAGE_VALUE');

-- CreateEnum
CREATE TYPE "MeetingMode" AS ENUM ('IN_PERSON', 'ONLINE', 'HYBRID');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_VOTING', 'VOTING_CLOSING_SOON', 'VOTING_CLOSED', 'VOTE_CONFIRMED', 'RESULTS_ANNOUNCED', 'GENERAL');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('LOGIN', 'VOTE_CONFIRMATION', 'PHONE_CHANGE', 'ADMIN_LOGIN');

-- CreateEnum
CREATE TYPE "OtpChannel" AS ENUM ('SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT,
    "roleId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "nationalId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "avatarUrl" TEXT,
    "membershipNumberReal" TEXT,
    "membershipNumberSystem" TEXT NOT NULL,
    "votingWeight" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "membershipStartDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "membershipEndDate" TIMESTAMP(3),
    "isVotingEligible" BOOLEAN NOT NULL DEFAULT true,
    "adminNotes" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'CUSTOM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "mode" "MeetingMode" NOT NULL DEFAULT 'IN_PERSON',
    "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingInvitee" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingInvitee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voting" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "legalText" TEXT,
    "kind" "VotingKind" NOT NULL DEFAULT 'STANDARD',
    "status" "VotingStatus" NOT NULL DEFAULT 'DRAFT',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Riyadh',
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "allowVoteChange" BOOLEAN NOT NULL DEFAULT false,
    "requiresFinalApproval" BOOLEAN NOT NULL DEFAULT false,
    "isWeighted" BOOLEAN NOT NULL DEFAULT true,
    "resultsVisibleToMembers" BOOLEAN NOT NULL DEFAULT true,
    "quorumType" "QuorumType" NOT NULL DEFAULT 'NONE',
    "quorumValue" DECIMAL(12,4),
    "targetType" "VotingTargetType" NOT NULL DEFAULT 'ALL',
    "targetGroupId" TEXT,
    "createdById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "resultsFinalizedAt" TIMESTAMP(3),
    "resultsCacheJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Voting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VotingTargetMember" (
    "id" TEXT NOT NULL,
    "votingId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "VotingTargetMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "votingId" TEXT,
    "meetingId" TEXT,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VotingQuestion" (
    "id" TEXT NOT NULL,
    "votingId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "type" "QuestionType" NOT NULL,
    "text" TEXT NOT NULL,
    "description" TEXT,
    "minSelections" INTEGER,
    "maxSelections" INTEGER,
    "seatsCount" INTEGER,
    "requireExactCount" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VotingQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VotingOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VotingOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "bio" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VotingEligibility" (
    "id" TEXT NOT NULL,
    "votingId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "snapshotWeight" DECIMAL(12,4) NOT NULL,
    "snapshotStatus" "MembershipStatus" NOT NULL,
    "isEligible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VotingEligibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoteParticipation" (
    "id" TEXT NOT NULL,
    "votingId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "participatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoteParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "votingId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "memberId" TEXT,
    "voterToken" TEXT NOT NULL,
    "castByProxyOfMemberId" TEXT,
    "selectedOptionIds" JSONB NOT NULL,
    "rankingJson" JSONB,
    "ratingValue" INTEGER,
    "percentageValue" DECIMAL(5,2),
    "textValue" TEXT,
    "weightAtVote" DECIMAL(12,4) NOT NULL,
    "supersededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoteConfirmation" (
    "id" TEXT NOT NULL,
    "votingId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "otpVerified" BOOLEAN NOT NULL DEFAULT false,
    "supersededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoteConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoteSignature" (
    "id" TEXT NOT NULL,
    "voteConfirmationId" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'SHA-256',
    "hash" TEXT NOT NULL,
    "payloadSummaryJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoteSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "memberId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "relatedVotingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsLog" (
    "id" TEXT NOT NULL,
    "toPhone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'PENDING',
    "providerResponse" JSONB,
    "errorMessage" TEXT,
    "relatedMemberId" TEXT,
    "relatedVotingId" TEXT,
    "sentById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'PENDING',
    "providerResponse" JSONB,
    "errorMessage" TEXT,
    "relatedMemberId" TEXT,
    "relatedVotingId" TEXT,
    "sentById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "channel" "OtpChannel" NOT NULL,
    "identifier" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "userId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "consumedAt" TIMESTAMP(3),
    "requestIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberImportJob" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedById" TEXT,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'PENDING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "invalidRows" INTEGER NOT NULL DEFAULT 0,
    "importedRows" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validRowsJson" JSONB,
    "committedAt" TIMESTAMP(3),

    CONSTRAINT "MemberImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberImportError" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "rawDataJson" JSONB NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberImportError_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_key_key" ON "Role"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_userId_key" ON "Member"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_nationalId_key" ON "Member"("nationalId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_phone_key" ON "Member"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Member_membershipNumberReal_key" ON "Member"("membershipNumberReal");

-- CreateIndex
CREATE UNIQUE INDEX "Member_membershipNumberSystem_key" ON "Member"("membershipNumberSystem");

-- CreateIndex
CREATE INDEX "Member_status_idx" ON "Member"("status");

-- CreateIndex
CREATE INDEX "Member_fullName_idx" ON "Member"("fullName");

-- CreateIndex
CREATE INDEX "GroupMember_memberId_idx" ON "GroupMember"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_groupId_memberId_key" ON "GroupMember"("groupId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingInvitee_meetingId_memberId_key" ON "MeetingInvitee"("meetingId", "memberId");

-- CreateIndex
CREATE INDEX "Voting_status_idx" ON "Voting"("status");

-- CreateIndex
CREATE INDEX "Voting_startAt_endAt_idx" ON "Voting"("startAt", "endAt");

-- CreateIndex
CREATE UNIQUE INDEX "VotingTargetMember_votingId_memberId_key" ON "VotingTargetMember"("votingId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_optionId_key" ON "Candidate"("optionId");

-- CreateIndex
CREATE INDEX "VotingEligibility_votingId_idx" ON "VotingEligibility"("votingId");

-- CreateIndex
CREATE UNIQUE INDEX "VotingEligibility_votingId_memberId_key" ON "VotingEligibility"("votingId", "memberId");

-- CreateIndex
CREATE INDEX "VoteParticipation_votingId_idx" ON "VoteParticipation"("votingId");

-- CreateIndex
CREATE UNIQUE INDEX "VoteParticipation_votingId_memberId_key" ON "VoteParticipation"("votingId", "memberId");

-- CreateIndex
CREATE INDEX "Vote_votingId_questionId_supersededAt_idx" ON "Vote"("votingId", "questionId", "supersededAt");

-- CreateIndex
CREATE INDEX "Vote_voterToken_idx" ON "Vote"("voterToken");

-- CreateIndex
CREATE UNIQUE INDEX "VoteConfirmation_referenceNumber_key" ON "VoteConfirmation"("referenceNumber");

-- CreateIndex
CREATE INDEX "VoteConfirmation_votingId_memberId_supersededAt_idx" ON "VoteConfirmation"("votingId", "memberId", "supersededAt");

-- CreateIndex
CREATE UNIQUE INDEX "VoteSignature_voteConfirmationId_key" ON "VoteSignature"("voteConfirmationId");

-- CreateIndex
CREATE INDEX "Notification_memberId_isRead_idx" ON "Notification"("memberId", "isRead");

-- CreateIndex
CREATE INDEX "SmsLog_relatedMemberId_idx" ON "SmsLog"("relatedMemberId");

-- CreateIndex
CREATE INDEX "EmailLog_relatedMemberId_idx" ON "EmailLog"("relatedMemberId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_category_key_key" ON "SystemSetting"("category", "key");

-- CreateIndex
CREATE INDEX "OtpCode_identifier_purpose_idx" ON "OtpCode"("identifier", "purpose");

-- CreateIndex
CREATE INDEX "LoginAttempt_identifier_createdAt_idx" ON "LoginAttempt"("identifier", "createdAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_ipAddress_createdAt_idx" ON "LoginAttempt"("ipAddress", "createdAt");

-- CreateIndex
CREATE INDEX "MemberImportError_jobId_idx" ON "MemberImportError"("jobId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingInvitee" ADD CONSTRAINT "MeetingInvitee_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingInvitee" ADD CONSTRAINT "MeetingInvitee_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voting" ADD CONSTRAINT "Voting_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voting" ADD CONSTRAINT "Voting_targetGroupId_fkey" FOREIGN KEY ("targetGroupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotingTargetMember" ADD CONSTRAINT "VotingTargetMember_votingId_fkey" FOREIGN KEY ("votingId") REFERENCES "Voting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotingTargetMember" ADD CONSTRAINT "VotingTargetMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_votingId_fkey" FOREIGN KEY ("votingId") REFERENCES "Voting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotingQuestion" ADD CONSTRAINT "VotingQuestion_votingId_fkey" FOREIGN KEY ("votingId") REFERENCES "Voting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotingOption" ADD CONSTRAINT "VotingOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "VotingQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "VotingOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotingEligibility" ADD CONSTRAINT "VotingEligibility_votingId_fkey" FOREIGN KEY ("votingId") REFERENCES "Voting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotingEligibility" ADD CONSTRAINT "VotingEligibility_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteParticipation" ADD CONSTRAINT "VoteParticipation_votingId_fkey" FOREIGN KEY ("votingId") REFERENCES "Voting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteParticipation" ADD CONSTRAINT "VoteParticipation_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_votingId_fkey" FOREIGN KEY ("votingId") REFERENCES "Voting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "VotingQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteConfirmation" ADD CONSTRAINT "VoteConfirmation_votingId_fkey" FOREIGN KEY ("votingId") REFERENCES "Voting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteConfirmation" ADD CONSTRAINT "VoteConfirmation_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteSignature" ADD CONSTRAINT "VoteSignature_voteConfirmationId_fkey" FOREIGN KEY ("voteConfirmationId") REFERENCES "VoteConfirmation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_relatedVotingId_fkey" FOREIGN KEY ("relatedVotingId") REFERENCES "Voting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsLog" ADD CONSTRAINT "SmsLog_relatedVotingId_fkey" FOREIGN KEY ("relatedVotingId") REFERENCES "Voting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_relatedVotingId_fkey" FOREIGN KEY ("relatedVotingId") REFERENCES "Voting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpCode" ADD CONSTRAINT "OtpCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberImportError" ADD CONSTRAINT "MemberImportError_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "MemberImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
