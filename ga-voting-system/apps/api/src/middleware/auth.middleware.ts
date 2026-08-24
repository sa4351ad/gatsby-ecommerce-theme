import type { NextFunction, Request, Response } from "express";
import { prisma } from "@ga/db";
import { verifyAccessToken } from "../lib/jwt";
import { ApiError } from "../utils/apiError";

export interface AuthContext {
  userId: string;
  roleKey: string;
  permissions: Set<string>;
  memberId?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

/**
 * يتحقق من صلاحية الجلسة على الخادم في كل طلب — لا اعتماد على أي شيء قادم
 * من الواجهة الأمامية لتحديد هوية المستخدم أو دوره.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.ga_access as string | undefined;
  if (!token) return next(new ApiError(401, "الرجاء تسجيل الدخول"));

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return next(new ApiError(401, "جلسة غير صالحة أو منتهية"));
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: {
      role: { include: { rolePermissions: { include: { permission: true } } } },
      member: { select: { id: true, status: true, deletedAt: true } },
    },
  });

  if (!user || !user.isActive) return next(new ApiError(401, "الحساب غير مفعّل"));
  if (user.member && (user.member.deletedAt || user.member.status !== "ACTIVE")) {
    return next(new ApiError(403, "عضويتك غير نشطة حاليًا، الرجاء التواصل مع إدارة الجمعية"));
  }

  req.auth = {
    userId: user.id,
    roleKey: user.role.key,
    permissions: new Set(user.role.rolePermissions.map((rp) => rp.permission.key)),
    memberId: user.member?.id,
  };
  next();
}

/** يسمح بالمتابعة سواء وُجدت جلسة أم لا (لصفحات عامة تحتاج معرفة الهوية إن وجدت) */
export async function authenticateOptional(req: Request, res: Response, next: NextFunction) {
  if (!req.cookies?.ga_access) return next();
  return authenticate(req, res, next);
}
