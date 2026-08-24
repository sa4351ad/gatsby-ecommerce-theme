import { prisma } from "@ga/db";
import { ApiError } from "../../utils/apiError";
import { getQuestionStrategy, type VoteRowForTally } from "./question-types";

export interface QuorumEvaluation {
  required: boolean;
  type: string;
  targetValue: number | null;
  achievedCount: number;
  achievedWeight: number;
  achievedPercentageOfMembers: number;
  achievedPercentageOfWeight: number;
  isMet: boolean;
}

function evaluateQuorum(
  quorumType: string,
  quorumValue: number | null,
  eligibleCount: number,
  eligibleWeight: number,
  confirmedCount: number,
  confirmedWeight: number,
): QuorumEvaluation {
  const achievedPercentageOfMembers = eligibleCount > 0 ? (confirmedCount / eligibleCount) * 100 : 0;
  const achievedPercentageOfWeight = eligibleWeight > 0 ? (confirmedWeight / eligibleWeight) * 100 : 0;

  let isMet = true;
  if (quorumType === "PERCENTAGE_OF_MEMBERS") isMet = achievedPercentageOfMembers >= (quorumValue ?? 0);
  else if (quorumType === "FIXED_COUNT") isMet = confirmedCount >= (quorumValue ?? 0);
  else if (quorumType === "PERCENTAGE_OF_WEIGHT") isMet = achievedPercentageOfWeight >= (quorumValue ?? 0);

  return {
    required: quorumType !== "NONE",
    type: quorumType,
    targetValue: quorumValue,
    achievedCount: confirmedCount,
    achievedWeight: confirmedWeight,
    achievedPercentageOfMembers,
    achievedPercentageOfWeight,
    isMet,
  };
}

/**
 * يحسب نتائج التصويت الكاملة. الأهلية والمشاركة تُحسب دومًا من voting_eligibility
 * (الأعضاء المؤهلون لهذا التصويت تحديدًا) وليس من كل المستخدمين في النظام — Section 17.
 */
export async function computeResults(votingId: string) {
  const voting = await prisma.voting.findUnique({
    where: { id: votingId },
    include: { questions: { include: { options: true }, orderBy: { order: "asc" } } },
  });
  if (!voting) throw new ApiError(404, "التصويت غير موجود");

  const eligibilities = await prisma.votingEligibility.findMany({ where: { votingId, isEligible: true } });
  const eligibleCount = eligibilities.length;
  const eligibleWeight = eligibilities.reduce((s, e) => s + Number(e.snapshotWeight), 0);

  const confirmations = await prisma.voteConfirmation.findMany({ where: { votingId } });
  const confirmedMemberIds = new Set(confirmations.map((c) => c.memberId));
  const confirmedWeight = eligibilities
    .filter((e) => confirmedMemberIds.has(e.memberId))
    .reduce((s, e) => s + Number(e.snapshotWeight), 0);

  const quorum = evaluateQuorum(
    voting.quorumType,
    voting.quorumValue ? Number(voting.quorumValue) : null,
    eligibleCount,
    eligibleWeight,
    confirmedMemberIds.size,
    confirmedWeight,
  );

  const nonVotersCount = eligibleCount - confirmedMemberIds.size;
  const participationRate = eligibleCount > 0 ? (confirmedMemberIds.size / eligibleCount) * 100 : 0;

  const questionResults = [];
  for (const question of voting.questions) {
    // ملاحظة: سجلات Vote تُنشأ حصريًا داخل نفس معاملة الاعتماد (VoteConfirmation) — لا يوجد
    // أبدًا صوت "غير معتمد" مخزَّن. لكن عند allowVoteChange=true تبقى الجولة السابقة محفوظة
    // (Append-only) ومُعلَّمة supersededAt — يجب استبعادها من الاحتساب أو تتضاعف الأصوات.
    const votes = await prisma.vote.findMany({ where: { votingId, questionId: question.id, supersededAt: null } });

    const rows: VoteRowForTally[] = votes.map((v) => ({
      selectedOptionIds: (v.selectedOptionIds as string[]) ?? [],
      rankingJson: v.rankingJson,
      ratingValue: v.ratingValue,
      percentageValue: v.percentageValue ? Number(v.percentageValue) : null,
      weightAtVote: Number(v.weightAtVote),
    }));

    const strategy = getQuestionStrategy(question.type);
    const tally = strategy.tally(question, rows, voting.isWeighted);
    questionResults.push({ question, tally });
  }

  return {
    votingId,
    isSecret: voting.isSecret,
    isWeighted: voting.isWeighted,
    status: voting.status,
    closedAt: voting.closedAt,
    eligibleCount,
    eligibleWeight,
    confirmedCount: confirmedMemberIds.size,
    confirmedWeight,
    nonVotersCount,
    participationRate,
    quorum,
    questionResults,
  };
}

export async function computeAndCacheResults(votingId: string) {
  const results = await computeResults(votingId);
  await prisma.voting.update({
    where: { id: votingId },
    data: { resultsFinalizedAt: new Date(), resultsCacheJson: JSON.parse(JSON.stringify(results)) },
  });
  return results;
}

/** قائمة الأعضاء الذين لم يصوّتوا بعد — للمتابعة والتذكير (Section 29) */
export async function getNonVoters(votingId: string) {
  const eligibilities = await prisma.votingEligibility.findMany({
    where: { votingId, isEligible: true },
    include: { member: true },
  });
  const confirmed = await prisma.voteConfirmation.findMany({ where: { votingId }, select: { memberId: true } });
  const confirmedIds = new Set(confirmed.map((c) => c.memberId));
  return eligibilities.filter((e) => !confirmedIds.has(e.memberId)).map((e) => e.member);
}
