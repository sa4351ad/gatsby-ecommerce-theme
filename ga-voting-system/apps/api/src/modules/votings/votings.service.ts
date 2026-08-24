import { prisma } from "@ga/db";
import type { CreateVotingInput } from "@ga/shared";
import { ApiError } from "../../utils/apiError";
import { recordAudit, AUDIT_ACTIONS } from "../../lib/audit";
import { resolveTargetMembers } from "./lifecycle.service";

const DEFAULT_OPTIONS: Record<string, string[]> = {
  DECISION_APPROVAL: ["موافق", "غير موافق", "ممتنع"],
  YES_NO: ["نعم", "لا"],
};

export async function listVotings(filters: { status?: string; meetingId?: string }) {
  return prisma.voting.findMany({
    where: {
      ...(filters.status ? { status: filters.status as any } : {}),
      ...(filters.meetingId ? { meetingId: filters.meetingId } : {}),
    },
    include: { _count: { select: { questions: true, confirmations: true, eligibilities: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/** عرض إداري كامل — يتضمن قوائم الاستهداف (Section 3: مخصَّص للأدوار الإدارية فقط) */
export async function getVoting(id: string) {
  const voting = await prisma.voting.findUnique({
    where: { id },
    include: {
      questions: { include: { options: { include: { candidate: true } } }, orderBy: { order: "asc" } },
      targetGroup: true,
      targetMembers: { include: { member: true } },
      meeting: true,
    },
  });
  if (!voting) throw new ApiError(404, "التصويت غير موجود");
  return voting;
}

/**
 * عرض مخصّص للعضو نفسه — لا يتضمن أبدًا سجلات أعضاء آخرين (كانت تُسرَّب عبر targetMembers:
 * الاسم/الهوية/الجوال/البريد/الملاحظات الإدارية لكل عضو مستهدف). كما يتحقق أن العضو
 * مستهدَف/مؤهَّل فعليًا لهذا التصويت قبل إعادة أي تفاصيل — بدل الاعتماد فقط على أن الدور
 * يملك صلاحية "votings.view.assigned" (تلك الصلاحية تعني "يمكنه رؤية تصويتاته هو"، وليست
 * تصريحًا لرؤية أي تصويت في النظام).
 */
export async function getVotingForMember(id: string, memberId: string) {
  const voting = await prisma.voting.findUnique({
    where: { id },
    include: {
      questions: { include: { options: { include: { candidate: true } } }, orderBy: { order: "asc" } },
      meeting: true,
    },
  });
  if (!voting) throw new ApiError(404, "التصويت غير موجود");
  if (voting.status === "DRAFT") throw new ApiError(404, "التصويت غير موجود");

  const authorized = await isMemberAuthorizedForVoting(voting.id, voting.status, memberId);
  if (!authorized) throw new ApiError(403, "غير مصرح لك بالوصول إلى هذا التصويت");

  return voting;
}

async function isMemberAuthorizedForVoting(votingId: string, status: string, memberId: string): Promise<boolean> {
  const eligibility = await prisma.votingEligibility.findUnique({
    where: { votingId_memberId: { votingId, memberId } },
  });
  if (eligibility) return eligibility.isEligible;
  if (status !== "SCHEDULED" && status !== "CANCELLED") return false; // لا Snapshot ولا حالة تسمح بتحقق حي

  // لم يُفتح التصويت بعد — لا يوجد Snapshot أهلية، تحقّق حيّ من الاستهداف (معاينة فقط، غير نهائي)
  const targets = await resolveTargetMembers(votingId);
  return targets.some((t) => t.id === memberId);
}

export async function createVoting(input: CreateVotingInput, userId?: string) {
  const voting = await prisma.$transaction(async (tx) => {
    const created = await tx.voting.create({
      data: {
        title: input.title,
        description: input.description,
        legalText: input.legalText,
        meetingId: input.meetingId || undefined,
        kind: input.kind,
        startAt: new Date(input.startAt),
        endAt: new Date(input.endAt),
        timezone: input.timezone,
        isSecret: input.isSecret,
        allowVoteChange: input.allowVoteChange,
        requiresFinalApproval: input.requiresFinalApproval,
        isWeighted: input.isWeighted,
        resultsVisibleToMembers: input.resultsVisibleToMembers,
        quorumType: input.quorumType,
        quorumValue: input.quorumValue,
        targetType: input.targetType,
        targetGroupId: input.targetType === "GROUP" ? input.targetGroupId : undefined,
        createdById: userId,
        status: "DRAFT",
        targetMembers:
          input.targetType === "SELECTED" && input.targetMemberIds
            ? { create: input.targetMemberIds.map((memberId) => ({ memberId })) }
            : undefined,
      },
    });

    for (let i = 0; i < input.questions.length; i += 1) {
      const q = input.questions[i];
      const options = q.options.length > 0 ? q.options : (DEFAULT_OPTIONS[q.type] ?? []).map((label) => ({ label }));

      await tx.votingQuestion.create({
        data: {
          votingId: created.id,
          order: i,
          type: q.type,
          text: q.text,
          description: q.description,
          minSelections: q.minSelections,
          maxSelections: q.maxSelections,
          seatsCount: q.seatsCount,
          requireExactCount: q.requireExactCount,
          options: {
            create: options.map((opt, idx) => ({
              order: idx,
              label: opt.label,
              description: (opt as any).description,
              candidate:
                q.type === "ELECTION" && ((opt as any).candidateBio || (opt as any).candidatePhotoUrl)
                  ? { create: { bio: (opt as any).candidateBio, photoUrl: (opt as any).candidatePhotoUrl } }
                  : undefined,
            })),
          },
        },
      });
    }

    return created;
  });

  await recordAudit({ userId, action: AUDIT_ACTIONS.VOTING_CREATED, entity: "Voting", entityId: voting.id, newValue: voting });
  return getVoting(voting.id);
}

export async function updateVoting(id: string, input: Partial<CreateVotingInput>, userId?: string) {
  const existing = await getVoting(id);
  if (existing.status !== "DRAFT") {
    throw new ApiError(409, "لا يمكن تعديل تصويت بعد نشره — يمكن إلغاؤه وإنشاء تصويت جديد");
  }
  const updated = await prisma.voting.update({
    where: { id },
    data: {
      title: input.title,
      description: input.description,
      legalText: input.legalText,
      startAt: input.startAt ? new Date(input.startAt) : undefined,
      endAt: input.endAt ? new Date(input.endAt) : undefined,
      isSecret: input.isSecret,
      allowVoteChange: input.allowVoteChange,
      requiresFinalApproval: input.requiresFinalApproval,
      isWeighted: input.isWeighted,
      resultsVisibleToMembers: input.resultsVisibleToMembers,
      quorumType: input.quorumType,
      quorumValue: input.quorumValue,
    },
  });
  await recordAudit({ userId, action: AUDIT_ACTIONS.VOTING_UPDATED, entity: "Voting", entityId: id, oldValue: existing, newValue: updated });
  return getVoting(id);
}
