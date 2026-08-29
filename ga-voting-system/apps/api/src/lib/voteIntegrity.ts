import crypto from "node:crypto";
import type { Prisma } from "@ga/db";
import { env } from "../env";
import { VOTE_REFERENCE_PREFIX } from "@ga/shared";

type TxClient = Prisma.TransactionClient;

interface HashableAnswer {
  questionId: string;
  selectedOptionIds: string[];
  rankingOptionIds?: string[];
  ratingValue?: number;
  percentageValue?: number;
  textValue?: string;
}

/**
 * Hash تكامل التصويت — HMAC-SHA256 يغطي كل حقول الإجابة الممكنة لكل أنواع الأسئلة
 * (اختيار، ترتيب، تقييم، نسبة، نص)، وليس selectedOptionIds فقط — وإلا يبقى التوقيع
 * صحيحًا رياضيًا حتى بعد تعديل قيمة تقييم/ترتيب/نسبة محفوظة، مما يُبطل الغرض من التكامل.
 */
export function computeVoteHash(params: {
  memberId: string;
  votingId: string;
  answers: HashableAnswer[];
  confirmedAt: Date;
}): string {
  const sortedAnswers = [...params.answers]
    .sort((a, b) => a.questionId.localeCompare(b.questionId))
    .map((a) => ({
      questionId: a.questionId,
      selectedOptionIds: [...a.selectedOptionIds].sort(),
      rankingOptionIds: a.rankingOptionIds ?? null,
      ratingValue: a.ratingValue ?? null,
      percentageValue: a.percentageValue ?? null,
      textValue: a.textValue ?? null,
    }));

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

/**
 * توليد رقم مرجعي فريد: VOTE-2026-000001. يعتمد على PostgreSQL SEQUENCE (nextval) بدل
 * "عدّ ثم تحقق" — العدّ وحده عرضة لتعارض بين معاملتين متزامنتين تريان نفس العدد وتحاولان
 * إنشاء نفس الرقم المرجعي، فتفشل إحداهما بصوت مُعتمَد بالكامل خلا هذه الخطوة الأخيرة فقط.
 * الـ Sequence ذرّي على مستوى قاعدة البيانات ولا يتعارض أبدًا مهما بلغ التزامن.
 */
export async function generateVoteReferenceNumber(tx: TxClient): Promise<string> {
  const year = new Date().getFullYear();
  const [{ seq }] = await tx.$queryRaw<Array<{ seq: bigint }>>`SELECT nextval('vote_reference_seq') AS seq`;
  return `${VOTE_REFERENCE_PREFIX}-${year}-${seq.toString().padStart(6, "0")}`;
}
