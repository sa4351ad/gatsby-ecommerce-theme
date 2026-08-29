import { prisma } from "@ga/db";

/** التصويتات المفتوحة/القادمة/المنتهية الموجَّهة للعضو الحالي — للوحة العضو (Section 24/25) */
export async function listMyVotings(memberId: string) {
  const member = await prisma.member.findUniqueOrThrow({
    where: { id: memberId },
    include: { groupMemberships: true },
  });
  const groupIds = member.groupMemberships.map((g) => g.groupId);

  const openOrClosed = await prisma.voting.findMany({
    where: {
      status: { in: ["OPEN", "CLOSED"] },
      eligibilities: { some: { memberId, isEligible: true } },
    },
    orderBy: { startAt: "desc" },
  });

  const upcoming = await prisma.voting.findMany({
    where: {
      status: "SCHEDULED",
      OR: [
        { targetType: "ALL" },
        { targetType: "GROUP", targetGroupId: { in: groupIds } },
        { targetType: "SELECTED", targetMembers: { some: { memberId } } },
      ],
    },
    orderBy: { startAt: "asc" },
  });

  const confirmations = await prisma.voteConfirmation.findMany({
    where: { memberId, votingId: { in: openOrClosed.map((v) => v.id) }, supersededAt: null },
  });
  const confirmedVotingIds = new Set(confirmations.map((c) => c.votingId));

  const pending = openOrClosed.filter((v) => v.status === "OPEN" && !confirmedVotingIds.has(v.id));
  const completed = openOrClosed.filter((v) => confirmedVotingIds.has(v.id));
  const closedNotVoted = openOrClosed.filter((v) => v.status === "CLOSED" && !confirmedVotingIds.has(v.id));

  return { pending, completed, upcoming, closedNotVoted, pendingCount: pending.length };
}
