import crypto from "node:crypto";
import { prisma } from "@ga/db";
import { env } from "../env";
import { VOTE_REFERENCE_PREFIX } from "@ga/shared";

/** Hash تكامل التصويت — SHA-256(memberId + votingId + الإجابات مرتّبة + timestamp + سرّ خادم) */
export function computeVoteHash(params: {
  memberId: string;
  votingId: string;
  answers: Array<{ questionId: string; selectedOptionIds: string[] }>;
  confirmedAt: Date;
}): string {
  const sortedAnswers = [...params.answers]
    .sort((a, b) => a.questionId.localeCompare(b.questionId))
    .map((a) => ({ questionId: a.questionId, selectedOptionIds: [...a.selectedOptionIds].sort() }));

  const payload = JSON.stringify({
    memberId: params.memberId,
    votingId: params.votingId,
    answers: sortedAnswers,
    confirmedAt: params.confirmedAt.toISOString(),
  });

  return crypto.createHmac("sha256", env.VOTE_HASH_SECRET).update(payload).digest("hex");
}

/** توليد رقم مرجعي فريد: VOTE-2026-000001 (تسلسلي ضمن السنة الحالية) */
export async function generateVoteReferenceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const countThisYear = await prisma.voteConfirmation.count({
    where: { referenceNumber: { startsWith: `${VOTE_REFERENCE_PREFIX}-${year}-` } },
  });
  const seq = (countThisYear + 1).toString().padStart(6, "0");
  return `${VOTE_REFERENCE_PREFIX}-${year}-${seq}`;
}
