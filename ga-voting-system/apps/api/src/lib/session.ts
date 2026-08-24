import type { Response } from "express";
import { prisma } from "@ga/db";
import { signAccessToken, signRefreshToken } from "./jwt";
import { randomToken, sha256Hex } from "./crypto";
import { SESSION_DEFAULTS } from "@ga/shared";
import { isProd } from "../env";

const cookieBase = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax" as const,
  path: "/",
};

interface CreateSessionParams {
  userId: string;
  roleKey: string;
  memberId?: string;
  userAgent?: string;
  ipAddress?: string;
}

/** ينشئ جلسة جديدة (Access + Refresh + CSRF) ويضبط الكوكيز في الاستجابة */
export async function establishSession(res: Response, params: CreateSessionParams) {
  const session = await prisma.session.create({
    data: {
      userId: params.userId,
      refreshTokenHash: "PENDING",
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
      expiresAt: new Date(Date.now() + SESSION_DEFAULTS.REFRESH_TOKEN_TTL_DAYS * 86400 * 1000),
    },
  });

  const accessToken = signAccessToken({ sub: params.userId, roleKey: params.roleKey, memberId: params.memberId });
  const refreshToken = signRefreshToken({ sub: params.userId, sessionId: session.id });
  await prisma.session.update({
    where: { id: session.id },
    data: { refreshTokenHash: sha256Hex(refreshToken) },
  });

  const csrfToken = randomToken(16);

  res.cookie("ga_access", accessToken, {
    ...cookieBase,
    maxAge: SESSION_DEFAULTS.ACCESS_TOKEN_TTL_MINUTES * 60 * 1000,
  });
  res.cookie("ga_refresh", refreshToken, {
    ...cookieBase,
    maxAge: SESSION_DEFAULTS.REFRESH_TOKEN_TTL_DAYS * 86400 * 1000,
  });
  res.cookie("ga_csrf", csrfToken, {
    httpOnly: false, // يجب أن تقرأه الواجهة الأمامية لإرساله في Header
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DEFAULTS.REFRESH_TOKEN_TTL_DAYS * 86400 * 1000,
  });

  return { sessionId: session.id };
}

export function clearSessionCookies(res: Response) {
  res.clearCookie("ga_access", cookieBase);
  res.clearCookie("ga_refresh", cookieBase);
  res.clearCookie("ga_csrf", { ...cookieBase, httpOnly: false });
}
