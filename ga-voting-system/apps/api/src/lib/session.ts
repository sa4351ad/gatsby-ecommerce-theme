import type { Response } from "express";
import { prisma } from "@ga/db";
import { signAccessToken, signRefreshToken } from "./jwt";
import { randomToken, sha256Hex } from "./crypto";
import { SESSION_DEFAULTS } from "@ga/shared";
import { isProd, env } from "../env";

// عند نشر الواجهة والـ API على نطاقات فرعية مختلفة تشترك في نطاق أب واحد (مثال:
// app.example.com وapi.example.com)، اضبط COOKIE_DOMAIN=.example.com مع الإبقاء على
// SameSite=Lax الافتراضي. أما عند نشرهما على نطاقين مستقلّين تمامًا لا يشتركان في نطاق أب
// (كما هو الحال مع خدمتي Render المنفصلتين *.onrender.com في بيئة التجربة الحالية)، فإن
// SameSite=Lax يمنع المتصفح من إرسال الكوكيز في طلبات fetch/XHR العابرة للمواقع (يُرسَل فقط
// في التنقّل المباشر GET)، فتبدو عملية الدخول ناجحة (تُضبط الكوكيز في استجابة الدخول) لكن أول
// طلب لاحق (auth/me) يصل بلا كوكيز فيُعاد المستخدم لصفحة الدخول. الحل: اضبط
// COOKIE_SAMESITE=none (يتطلب Secure=true، مضمون هنا لأن isProd يفرضه تلقائيًا).
const sameSite = env.COOKIE_SAMESITE;
const cookieBase = {
  httpOnly: true,
  secure: isProd || sameSite === "none",
  sameSite,
  path: "/",
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
};

interface CreateSessionParams {
  userId: string;
  roleKey: string;
  memberId?: string;
  userAgent?: string;
  ipAddress?: string;
}

/**
 * ينشئ جلسة جديدة (Access + Refresh + CSRF) ويضبط الكوكيز في الاستجابة.
 * يُعاد csrfToken أيضًا في القيمة المرجعة (وليس فقط كـ Cookie) لأن جافاسكربت في واجهة
 * الويب لا يستطيع قراءة document.cookie لكوكيز صادرة عن نطاق مختلف تمامًا (لا نطاق أب
 * مشترك) — تحديدًا حالة نشر الواجهة والـ API على نطاقين onrender.com منفصلين. المتصفح
 * يرسل الكوكيز نفسها للخادم بشكل صحيح (وهذا ما يتحقق منه csrfProtection من جهة الخادم)،
 * لكن قراءتها من JS العميل تفشل بصمت. لذا تُخزَّن الواجهة القيمة المُعادة هنا وتستخدمها
 * كبديل عند تعذّر قراءة الكوكي (راجع apps/web/src/lib/apiClient.ts).
 */
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

  return { sessionId: session.id, csrfToken };
}

export function clearSessionCookies(res: Response) {
  res.clearCookie("ga_access", cookieBase);
  res.clearCookie("ga_refresh", cookieBase);
  res.clearCookie("ga_csrf", { ...cookieBase, httpOnly: false });
}
