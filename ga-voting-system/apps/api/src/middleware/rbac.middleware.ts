import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/apiError";

/**
 * تحقق صلاحيات على الخادم (Server-side authorization) — إلزامي على كل Endpoint حسّاس.
 * لا يُعتمد إطلاقًا على إخفاء عناصر الواجهة كوسيلة حماية (Section 31/47).
 */
export function requirePermission(...anyOf: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(new ApiError(401, "الرجاء تسجيل الدخول"));
    const hasPermission = anyOf.some((p) => req.auth!.permissions.has(p));
    if (!hasPermission) {
      return next(new ApiError(403, "لا تملك الصلاحية اللازمة لتنفيذ هذه العملية"));
    }
    next();
  };
}

export function requireRole(...anyOf: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(new ApiError(401, "الرجاء تسجيل الدخول"));
    if (!anyOf.includes(req.auth.roleKey)) {
      return next(new ApiError(403, "لا تملك الصلاحية اللازمة لتنفيذ هذه العملية"));
    }
    next();
  };
}
