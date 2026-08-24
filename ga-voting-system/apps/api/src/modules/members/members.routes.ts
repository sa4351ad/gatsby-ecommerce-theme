import { Router } from "express";
import * as controller from "./members.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { csrfProtection } from "../../middleware/csrf.middleware";
import { excelUpload, imageUpload } from "../../lib/upload";
import { PERMISSIONS } from "@ga/shared";

const router = Router();
router.use(authenticate);

router.get("/", requirePermission(PERMISSIONS.MEMBERS_VIEW), controller.list);
router.get("/:id", requirePermission(PERMISSIONS.MEMBERS_VIEW), controller.get);
router.post("/", csrfProtection, requirePermission(PERMISSIONS.MEMBERS_CREATE), controller.create);
router.patch("/:id", csrfProtection, requirePermission(PERMISSIONS.MEMBERS_UPDATE), controller.update);
router.delete("/:id", csrfProtection, requirePermission(PERMISSIONS.MEMBERS_DELETE), controller.disable);
router.post(
  "/:id/avatar",
  csrfProtection,
  requirePermission(PERMISSIONS.MEMBERS_UPDATE, PERMISSIONS.SELF_UPDATE_LIMITED),
  imageUpload.single("avatar"),
  controller.uploadAvatar,
);

router.post(
  "/import/preview",
  csrfProtection,
  requirePermission(PERMISSIONS.MEMBERS_IMPORT),
  excelUpload.single("file"),
  controller.previewImport,
);
router.post("/import/commit", csrfProtection, requirePermission(PERMISSIONS.MEMBERS_IMPORT), controller.commitImport);
router.get(
  "/import/:jobId/errors-report",
  requirePermission(PERMISSIONS.MEMBERS_IMPORT),
  controller.importErrorsReport,
);

export default router;
