import { Router } from "express";
import * as controller from "./meetings.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { csrfProtection } from "../../middleware/csrf.middleware";
import { PERMISSIONS } from "@ga/shared";

const router = Router();
router.use(authenticate);

router.get("/", requirePermission(PERMISSIONS.MEETINGS_VIEW), controller.list);
router.get("/:id", requirePermission(PERMISSIONS.MEETINGS_VIEW), controller.get);
router.post("/", csrfProtection, requirePermission(PERMISSIONS.MEETINGS_MANAGE), controller.create);
router.patch("/:id", csrfProtection, requirePermission(PERMISSIONS.MEETINGS_MANAGE), controller.update);

export default router;
