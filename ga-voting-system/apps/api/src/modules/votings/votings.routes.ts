import { Router } from "express";
import * as controller from "./votings.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { csrfProtection } from "../../middleware/csrf.middleware";
import { PERMISSIONS } from "@ga/shared";

const router = Router();
router.use(authenticate);

// مسارات العضو (يجب أن تُعرَّف قبل /:id لتفادي تعارض المسارات)
router.get("/mine", requirePermission(PERMISSIONS.VOTINGS_VIEW_ASSIGNED), controller.mine);

router.get("/", requirePermission(PERMISSIONS.VOTINGS_VIEW), controller.list);
router.post("/", csrfProtection, requirePermission(PERMISSIONS.VOTINGS_CREATE), controller.create);
router.get("/:id", requirePermission(PERMISSIONS.VOTINGS_VIEW, PERMISSIONS.VOTINGS_VIEW_ASSIGNED), controller.get);
router.patch("/:id", csrfProtection, requirePermission(PERMISSIONS.VOTINGS_UPDATE), controller.update);

router.post("/:id/publish", csrfProtection, requirePermission(PERMISSIONS.VOTINGS_PUBLISH), controller.publish);
router.post("/:id/open", csrfProtection, requirePermission(PERMISSIONS.VOTINGS_PUBLISH), controller.open);
router.post("/:id/close", csrfProtection, requirePermission(PERMISSIONS.VOTINGS_CLOSE), controller.close);
router.post("/:id/cancel", csrfProtection, requirePermission(PERMISSIONS.VOTINGS_CANCEL), controller.cancel);

router.post("/:id/validate", csrfProtection, requirePermission(PERMISSIONS.VOTES_CAST), controller.validateAnswers);
router.post("/:id/confirm/request-otp", csrfProtection, requirePermission(PERMISSIONS.VOTES_CONFIRM), controller.requestConfirmOtp);
router.post("/:id/confirm", csrfProtection, requirePermission(PERMISSIONS.VOTES_CAST, PERMISSIONS.VOTES_CONFIRM), controller.confirm);
router.get("/:id/my-status", requirePermission(PERMISSIONS.VOTES_CAST), controller.myStatus);

router.get("/:id/results", requirePermission(PERMISSIONS.RESULTS_VIEW, PERMISSIONS.VOTINGS_VIEW_ASSIGNED), controller.results);
router.get("/:id/non-voters", requirePermission(PERMISSIONS.RESULTS_VIEW), controller.nonVoters);

export default router;
