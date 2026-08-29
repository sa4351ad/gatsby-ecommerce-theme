import { Router } from "express";
import { prisma } from "@ga/db";
import { authenticate } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { PERMISSIONS } from "@ga/shared";

const router = Router();
router.use(authenticate);

/** إحصائيات لوحة تحكم المدير — Section 9 */
router.get(
  "/",
  requirePermission(PERMISSIONS.MEMBERS_VIEW, PERMISSIONS.VOTINGS_VIEW),
  asyncHandler(async (_req, res) => {
    const [
      totalMembers,
      activeMembers,
      inactiveMembers,
      openVotings,
      closedVotings,
      scheduledVotings,
      recentAudit,
    ] = await Promise.all([
      prisma.member.count({ where: { deletedAt: null } }),
      prisma.member.count({ where: { deletedAt: null, status: "ACTIVE" } }),
      prisma.member.count({ where: { deletedAt: null, status: { not: "ACTIVE" } } }),
      prisma.voting.count({ where: { status: "OPEN" } }),
      prisma.voting.count({ where: { status: "CLOSED" } }),
      prisma.voting.count({ where: { status: "SCHEDULED" } }),
      prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    ]);

    const openVotingRows = await prisma.voting.findMany({
      where: { status: "OPEN" },
      include: { _count: { select: { eligibilities: true, confirmations: true } } },
    });
    const totalEligibleAcrossOpen = openVotingRows.reduce((s, v) => s + v._count.eligibilities, 0);
    const totalVotedAcrossOpen = openVotingRows.reduce((s, v) => s + v._count.confirmations, 0);

    res.json({
      totalMembers,
      activeMembers,
      inactiveMembers,
      openVotings,
      closedVotings,
      scheduledVotings,
      votedCountOpen: totalVotedAcrossOpen,
      notVotedCountOpen: totalEligibleAcrossOpen - totalVotedAcrossOpen,
      participationRateOpen: totalEligibleAcrossOpen > 0 ? (totalVotedAcrossOpen / totalEligibleAcrossOpen) * 100 : 0,
      recentAudit,
    });
  }),
);

export default router;
