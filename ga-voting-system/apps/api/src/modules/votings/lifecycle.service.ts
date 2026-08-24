import { prisma, type Voting } from "@ga/db";
import { ApiError } from "../../utils/apiError";
import { recordAudit, AUDIT_ACTIONS } from "../../lib/audit";
import { computeAndCacheResults } from "./results.service";

/** يحدد الأعضاء المستهدَفين فعليًا بناءً على targetType — Section 10 */
export async function resolveTargetMembers(votingId: string) {
  const voting = await prisma.voting.findUniqueOrThrow({ where: { id: votingId } });

  const baseWhere = { deletedAt: null, status: "ACTIVE" as const, isVotingEligible: true };

  if (voting.targetType === "ALL") {
    return prisma.member.findMany({ where: baseWhere, select: { id: true, votingWeight: true, status: true } });
  }
  if (voting.targetType === "GROUP" && voting.targetGroupId) {
    return prisma.member.findMany({
      where: { ...baseWhere, groupMemberships: { some: { groupId: voting.targetGroupId } } },
      select: { id: true, votingWeight: true, status: true },
    });
  }
  if (voting.targetType === "SELECTED") {
    const targets = await prisma.votingTargetMember.findMany({ where: { votingId }, include: { member: true } });
    return targets
      .map((t) => t.member)
      .filter((m) => !m.deletedAt && m.status === "ACTIVE" && m.isVotingEligible)
      .map((m) => ({ id: m.id, votingWeight: m.votingWeight, status: m.status }));
  }
  // CONDITIONAL: نقطة توسّع — حاليًا تعادل ALL مع الشرط الأساسي (isVotingEligible)، يمكن توسيعها لاحقًا بمحرك شروط
  return prisma.member.findMany({ where: baseWhere, select: { id: true, votingWeight: true, status: true } });
}

export async function publishVoting(id: string, userId?: string) {
  const voting = await prisma.voting.findUniqueOrThrow({ where: { id } });
  if (voting.status !== "DRAFT") throw new ApiError(409, "لا يمكن نشر تصويت إلا من حالة مسودة");

  const updated = await prisma.voting.update({ where: { id }, data: { status: "SCHEDULED", publishedAt: new Date() } });
  await recordAudit({ userId, action: AUDIT_ACTIONS.VOTING_PUBLISHED, entity: "Voting", entityId: id });
  return updated;
}

/** فتح التصويت: تثبيت Snapshot لأهلية ووزن كل عضو مستهدَف — Section 37 (لا تتأثر النتائج بتغييرات لاحقة) */
export async function openVoting(id: string, userId?: string) {
  const voting = await prisma.voting.findUniqueOrThrow({ where: { id } });
  if (voting.status !== "SCHEDULED" && voting.status !== "DRAFT") {
    throw new ApiError(409, "لا يمكن فتح هذا التصويت من حالته الحالية");
  }

  const targets = await resolveTargetMembers(id);

  await prisma.$transaction(async (tx) => {
    for (const m of targets) {
      await tx.votingEligibility.upsert({
        where: { votingId_memberId: { votingId: id, memberId: m.id } },
        create: { votingId: id, memberId: m.id, snapshotWeight: m.votingWeight, snapshotStatus: m.status, isEligible: true },
        update: {},
      });
    }
    await tx.voting.update({ where: { id }, data: { status: "OPEN", openedAt: new Date() } });
  });

  await recordAudit({
    userId,
    action: AUDIT_ACTIONS.VOTING_OPENED,
    entity: "Voting",
    entityId: id,
    newValue: { eligibleCount: targets.length },
  });

  return prisma.voting.findUniqueOrThrow({ where: { id } });
}

export async function closeVoting(id: string, userId?: string) {
  const voting = await prisma.voting.findUniqueOrThrow({ where: { id } });
  if (voting.status !== "OPEN") throw new ApiError(409, "التصويت ليس مفتوحًا حاليًا");

  const updated = await prisma.voting.update({ where: { id }, data: { status: "CLOSED", closedAt: new Date() } });
  await computeAndCacheResults(id);
  await recordAudit({ userId, action: AUDIT_ACTIONS.VOTING_CLOSED, entity: "Voting", entityId: id });
  return updated;
}

export async function cancelVoting(id: string, userId?: string) {
  const voting = await prisma.voting.findUniqueOrThrow({ where: { id } });
  if (voting.status === "CLOSED" || voting.status === "ARCHIVED") {
    throw new ApiError(409, "لا يمكن إلغاء تصويت مغلق أو مؤرشف");
  }
  const updated = await prisma.voting.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
  await recordAudit({ userId, action: AUDIT_ACTIONS.VOTING_CANCELLED, entity: "Voting", entityId: id });
  return updated;
}

/** يُستدعى قبل أي محاولة تصويت أو عرض تفاصيل — يضمن أن الحالة المخزَّنة محدَّثة بوقت الخادم الفعلي */
export async function ensureLifecycleFresh(votingId: string): Promise<Voting> {
  const voting = await prisma.voting.findUniqueOrThrow({ where: { id: votingId } });
  if (voting.status === "SCHEDULED" || voting.status === "OPEN") {
    return autoTransition(voting);
  }
  return voting;
}

/**
 * انتقال تلقائي دفاعي بناءً على الوقت — يُستدعى من الـ Cron (كل دقيقة) ومن مسار
 * التصويت نفسه دفاعيًا، لضمان أن الحالة المخزَّنة لا تتأخر أبدًا عن وقت الخادم الفعلي.
 */
export async function autoTransition(voting: Voting): Promise<Voting> {
  const now = new Date();
  if (voting.status === "SCHEDULED" && now >= voting.startAt && now <= voting.endAt) {
    return openVoting(voting.id);
  }
  if ((voting.status === "OPEN" || voting.status === "SCHEDULED") && now > voting.endAt) {
    if (voting.status === "SCHEDULED") {
      // انتهى الوقت قبل أن يُفتح فعليًا (لم يزره أحد) — نفتحه ونغلقه فورًا لتثبيت Snapshot أهلية فارغ منطقيًا
      await openVoting(voting.id);
    }
    return closeVoting(voting.id);
  }
  return voting;
}
