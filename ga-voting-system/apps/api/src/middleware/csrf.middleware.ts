import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/apiError";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * حماية CSRF بنمط Double-Submit Cookie: عند تسجيل الدخول يُصدَر Cookie غير
 * httpOnly يحتوي رمزًا عشوائيًا، ويجب على الواجهة إعادة إرساله في Header
 * `x-csrf-token` مع كل طلب يغيّر البيانات. لا يكفي وجود الجلسة (Cookie) وحدها.
 */
export function csrfProtection(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();
  const cookieToken = req.cookies?.ga_csrf as string | undefined;
  const headerToken = req.headers["x-csrf-token"] as string | undefined;
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(new ApiError(403, "فشل التحقق الأمني، الرجاء إعادة تحميل الصفحة"));
  }
  next();
}
