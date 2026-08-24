import { Router } from "express";
import { prisma } from "@ga/db";
import { authenticate } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { PERMISSIONS } from "@ga/shared";

const router = Router();
router.use(authenticate);

/**
 * قراءة فقط — لا يوجد أي مسار DELETE/PATCH لسجلات التدقيق في كامل النظام (Section 21).
 */
router.get(
  "/",
  requirePermission(PERMISSIONS.AUDIT_LOG_VIEW_ALL),
  asyncHandler(async (req, res) => {
    const { action, entity, userId, from, to, page = "1", pageSize = "50" } = req.query;
    const where: any = {};
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (userId) where.userId = userId;
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from as string) } : {}),
        ...(to ? { lte: new Date(to as string) } : {}),
      };
    }
    const take = Math.min(Number(pageSize), 200);
    const skip = (Number(page) - 1) * take;

    const [total, items] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { email: true, member: { select: { fullName: true } } } } },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);

    res.json({ items, total, page: Number(page), pageSize: take });
  }),
);

export default router;
