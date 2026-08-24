import crypto from "node:crypto";
import type { Prisma } from "@ga/db";
import { env } from "../env";
import { VOTE_REFERENCE_PREFIX } from "@ga/shared";

type TxClient = Prisma.TransactionClient;

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

/**
 * رمز مقترن بالعضو ضمن تصويت محدد (HMAC أحادي الاتجاه بسرّ الخادم فقط) — يسمح
 * للخادم وحده بإيجاد "الجولة السابقة" لنفس العضو عند تفعيل تغيير التصويت
 * (allowVoteChange)، دون تخزين memberId مباشرة على سجل Vote في التصويت السري.
 */
export function computeVoterToken(votingId: string, memberId: string): string {
  return crypto.createHmac("sha256", env.VOTE_HASH_SECRET).update(`${votingId}:${memberId}`).digest("hex");
}

/** توليد رقم مرجعي فريد: VOTE-2026-000001 (تسلسلي ضمن السنة الحالية، ضمن نفس المعاملة لتفادي التعارض) */
export async function generateVoteReferenceNumber(tx: TxClient): Promise<string> {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const countThisYear = await tx.voteConfirmation.count({
      where: { referenceNumber: { startsWith: `${VOTE_REFERENCE_PREFIX}-${year}-` } },
    });
    const seq = (countThisYear + 1 + attempt).toString().padStart(6, "0");
    const candidate = `${VOTE_REFERENCE_PREFIX}-${year}-${seq}`;
    const exists = await tx.voteConfirmation.findUnique({ where: { referenceNumber: candidate } });
    if (!exists) return candidate;
  }
  throw new Error("تعذّر توليد رقم مرجعي فريد للتصويت");
}
