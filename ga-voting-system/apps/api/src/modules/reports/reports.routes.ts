import { Router } from "express";
import * as controller from "./reports.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { PERMISSIONS } from "@ga/shared";

const router = Router();
router.use(authenticate, requirePermission(PERMISSIONS.REPORTS_VIEW));

router.get("/members", controller.members);
router.get("/votings/:votingId/participation", controller.votingParticipation);
router.get("/votings/:votingId/non-voters", controller.nonVoters);
router.get("/votings/:votingId/questions/:questionId/election-results", controller.electionResults);
router.get("/meetings/:meetingId/attendance", controller.attendance);
router.get("/audit-log", controller.audit);
router.get("/sms", controller.sms);
router.get("/email", controller.email);

export default router;
