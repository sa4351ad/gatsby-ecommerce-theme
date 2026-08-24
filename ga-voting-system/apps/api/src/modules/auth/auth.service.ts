import bcrypt from "bcryptjs";
import type { Response } from "express";
import { prisma } from "@ga/db";
import { issueOtp, verifyOtp } from "../../lib/otp";
import { sendSms } from "../../lib/sms/sms.service";
import { establishSession, clearSessionCookies } from "../../lib/session";
import { verifyRefreshToken } from "../../lib/jwt";
import { sha256Hex } from "../../lib/crypto";
import { recordAudit, AUDIT_ACTIONS } from "../../lib/audit";
import { ApiError } from "../../utils/apiError";

async function findMemberByIdentifier(identifier: string) {
  return prisma.member.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { membershipNumberSystem: identifier },
        { membershipNumberReal: identifier },
        { nationalId: identifier },
      ],
    },
    include: { user: true },
  });
}

async function logAttempt(identifier: string, success: boolean, ip?: string, ua?: string, reason?: string) {
  await prisma.loginAttempt.create({
    data: { identifier, success, ipAddress: ip, userAgent: ua, reason },
  });
}

/** الخطوة 1 من رحلة العضو: طلب OTP. رسالة الاستجابة عامة دومًا لمنع اكتشاف وجود العضو (Enumeration) */
export async function requestMemberOtp(identifier: string, ip?: string, ua?: string) {
  const member = await findMemberByIdentifier(identifier);

  if (member && member.status === "ACTIVE") {
    const { code } = await issueOtp({
      purpose: "LOGIN",
      channel: "SMS",
      identifier: member.phone,
      userId: member.userId,
      requestIp: ip,
    });
    await sendSms({
      to: member.phone,
      message: `رمز التحقق الخاص بك: ${code} صالح لمدة 5 دقائق. لا تشاركه مع أحد.`,
      relatedMemberId: member.id,
    });
    await recordAudit({ userId: member.userId, action: AUDIT_ACTIONS.OTP_REQUESTED, entity: "Member", entityId: member.id, req: undefined });
  }
  await logAttempt(identifier, false, ip, ua, "OTP_REQUESTED");

  return { message: "إذا كانت البيانات صحيحة، سيصلك رمز التحقق عبر الرسائل القصيرة خلال لحظات" };
}

/** الخطوة 2: التحقق من OTP وإنشاء الجلسة */
export async function verifyMemberOtp(
  identifier: string,
  code: string,
  res: Response,
  ip?: string,
  ua?: string,
) {
  const member = await findMemberByIdentifier(identifier);
  if (!member || member.status !== "ACTIVE") {
    await logAttempt(identifier, false, ip, ua, "MEMBER_NOT_FOUND_OR_INACTIVE");
    throw new ApiError(400, "رمز التحقق غير صحيح أو منتهي الصلاحية");
  }

  try {
    await verifyOtp({ purpose: "LOGIN", identifier: member.phone, code });
  } catch (err) {
    await logAttempt(identifier, false, ip, ua, "OTP_INVALID");
    await recordAudit({ userId: member.userId, action: AUDIT_ACTIONS.OTP_FAILED, entity: "Member", entityId: member.id });
    throw err;
  }

  await prisma.user.update({ where: { id: member.userId }, data: { lastLoginAt: new Date(), lastLoginIp: ip } });
  await prisma.member.update({ where: { id: member.id }, data: { lastLoginAt: new Date() } });

  await establishSession(res, {
    userId: member.userId,
    roleKey: "MEMBER",
    memberId: member.id,
    userAgent: ua,
    ipAddress: ip,
  });

  await logAttempt(identifier, true, ip, ua, "OTP_VERIFIED");
  await recordAudit({ userId: member.userId, action: AUDIT_ACTIONS.LOGIN_SUCCESS, entity: "Member", entityId: member.id });

  return {
    member: {
      id: member.id,
      fullName: member.fullName,
      membershipNumberSystem: member.membershipNumberSystem,
    },
  };
}

/** دخول الإداريين: بريد + كلمة مرور، مع إمكانية اشتراط OTP إضافي حسب الإعدادات الأمنية */
export async function adminLogin(email: string, password: string, res: Response, ip?: string, ua?: string) {
  const user = await prisma.user.findUnique({ where: { email }, include: { role: true } });

  if (!user || !user.passwordHash || user.role.key === "MEMBER") {
    await logAttempt(email, false, ip, ua, "INVALID_CREDENTIALS");
    throw new ApiError(401, "بيانات الدخول غير صحيحة");
  }
  if (!user.isActive) {
    await logAttempt(email, false, ip, ua, "INACTIVE_ACCOUNT");
    throw new ApiError(403, "الحساب غير مفعّل");
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    await logAttempt(email, false, ip, ua, "INVALID_CREDENTIALS");
    await recordAudit({ userId: user.id, action: AUDIT_ACTIONS.LOGIN_FAILED, entity: "User", entityId: user.id });
    throw new ApiError(401, "بيانات الدخول غير صحيحة");
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), lastLoginIp: ip } });
  await establishSession(res, { userId: user.id, roleKey: user.role.key, userAgent: ua, ipAddress: ip });
  await logAttempt(email, true, ip, ua, "PASSWORD_LOGIN");
  await recordAudit({ userId: user.id, action: AUDIT_ACTIONS.LOGIN_SUCCESS, entity: "User", entityId: user.id });

  return { user: { id: user.id, email: user.email, role: user.role.key } };
}

export async function refreshSession(refreshToken: string, res: Response, ip?: string, ua?: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, "جلسة غير صالحة، الرجاء تسجيل الدخول مجددًا");
  }

  const session = await prisma.session.findUnique({ where: { id: payload.sessionId }, include: { user: { include: { role: true, member: true } } } });
  if (!session || session.revokedAt || session.expiresAt < new Date() || session.refreshTokenHash !== sha256Hex(refreshToken)) {
    throw new ApiError(401, "جلسة غير صالحة، الرجاء تسجيل الدخول مجددًا");
  }

  // تدوير Refresh Token: إبطال القديم فورًا لمنع إعادة الاستخدام
  await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });

  await establishSession(res, {
    userId: session.userId,
    roleKey: session.user.role.key,
    memberId: session.user.member?.id,
    userAgent: ua,
    ipAddress: ip,
  });
}

export async function logout(userId: string | undefined, refreshToken: string | undefined, res: Response) {
  if (refreshToken) {
    const hash = sha256Hex(refreshToken);
    await prisma.session.updateMany({ where: { refreshTokenHash: hash }, data: { revokedAt: new Date() } });
  }
  clearSessionCookies(res);
  if (userId) {
    await recordAudit({ userId, action: AUDIT_ACTIONS.LOGOUT, entity: "User", entityId: userId });
  }
}
