import { Router } from "express";
import * as controller from "./settings.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { csrfProtection } from "../../middleware/csrf.middleware";
import { PERMISSIONS } from "@ga/shared";

const router = Router();
router.use(authenticate);

router.get("/general", requirePermission(PERMISSIONS.SETTINGS_GENERAL_MANAGE), controller.getGeneral);
router.put("/general", csrfProtection, requirePermission(PERMISSIONS.SETTINGS_GENERAL_MANAGE), controller.putGeneral);

router.get("/voting", requirePermission(PERMISSIONS.SETTINGS_VOTING_MANAGE), controller.getVoting);
router.put("/voting", csrfProtection, requirePermission(PERMISSIONS.SETTINGS_VOTING_MANAGE), controller.putVoting);

router.get("/security", requirePermission(PERMISSIONS.SECURITY_MANAGE), controller.getSecurity);
router.put("/security", csrfProtection, requirePermission(PERMISSIONS.SECURITY_MANAGE), controller.putSecurity);

router.get("/sms", requirePermission(PERMISSIONS.SETTINGS_SMS_MANAGE), controller.getSms);
router.put("/sms", csrfProtection, requirePermission(PERMISSIONS.SETTINGS_SMS_MANAGE), controller.putSms);
router.post("/sms/test", csrfProtection, requirePermission(PERMISSIONS.SETTINGS_SMS_MANAGE), controller.testSms);

router.get("/email", requirePermission(PERMISSIONS.SETTINGS_EMAIL_MANAGE), controller.getEmail);
router.put("/email", csrfProtection, requirePermission(PERMISSIONS.SETTINGS_EMAIL_MANAGE), controller.putEmail);
router.post("/email/test", csrfProtection, requirePermission(PERMISSIONS.SETTINGS_EMAIL_MANAGE), controller.testEmail);

export default router;
