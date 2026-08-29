import { Router } from "express";
import * as controller from "./auth.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { csrfProtection } from "../../middleware/csrf.middleware";
import { otpRequestLimiter, otpVerifyLimiter, adminLoginLimiter } from "../../middleware/rateLimit.middleware";

const router = Router();

router.post("/login/request-otp", otpRequestLimiter, controller.requestOtp);
router.post("/login/verify-otp", otpVerifyLimiter, controller.verifyOtp);
router.post("/admin/login", adminLoginLimiter, controller.adminLogin);
router.post("/refresh", controller.refresh);
router.post("/logout", authenticate, csrfProtection, controller.logout);
router.get("/me", authenticate, controller.me);

export default router;
