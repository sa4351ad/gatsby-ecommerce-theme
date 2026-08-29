import { Router } from "express";
import * as controller from "./notifications.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { csrfProtection } from "../../middleware/csrf.middleware";
import { PERMISSIONS } from "@ga/shared";

const router = Router();
router.use(authenticate);

router.get("/mine", controller.mine);
router.patch("/:id/read", csrfProtection, controller.markRead);
router.post("/broadcast", csrfProtection, requirePermission(PERMISSIONS.NOTIFICATIONS_SEND), controller.broadcast);

export default router;
