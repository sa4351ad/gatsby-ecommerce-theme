import { Router } from "express";
import * as controller from "./groups.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { csrfProtection } from "../../middleware/csrf.middleware";
import { PERMISSIONS } from "@ga/shared";

const router = Router();
router.use(authenticate);

router.get("/", requirePermission(PERMISSIONS.GROUPS_VIEW), controller.list);
router.get("/:id", requirePermission(PERMISSIONS.GROUPS_VIEW), controller.get);
router.post("/", csrfProtection, requirePermission(PERMISSIONS.GROUPS_MANAGE), controller.create);
router.patch("/:id", csrfProtection, requirePermission(PERMISSIONS.GROUPS_MANAGE), controller.update);
router.post("/:id/members", csrfProtection, requirePermission(PERMISSIONS.GROUPS_MANAGE), controller.addMembers);
router.delete("/:id/members/:memberId", csrfProtection, requirePermission(PERMISSIONS.GROUPS_MANAGE), controller.removeMember);

export default router;
