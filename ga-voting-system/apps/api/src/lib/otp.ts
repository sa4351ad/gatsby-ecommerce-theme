import crypto from "node:crypto";
import { prisma, OtpPurpose, OtpChannel } from "@ga/db";
import { OTP_DEFAULTS } from "@ga/shared";
import { sha256Hex } from "./crypto";
import { ApiError } from "../utils/apiError";

function generateNumericCode(length: number): string {
  const max = 10 ** length;
  const n = crypto.randomInt(0, max);
  return n.toString().padStart(length, "0");
}

interface IssueOtpParams {
  purpose: OtpPurpose;
  channel: OtpChannel;
  identifier: string; // phone or email
  userId?: string;
  requestIp?: string;
  ttlSeconds?: number;
  maxAttempts?: number;
}

/** إصدار OTP جديد مع تطبيق حد أقصى لعدد الرسائل خلال الساعة ومهلة إعادة الإرسال */
export async function issueOtp(params: IssueOtpParams) {
  const ttlSeconds = params.ttlSeconds ?? OTP_DEFAULTS.TTL_SECONDS;
  const maxAttempts = params.maxAttempts ?? OTP_DEFAULTS.MAX_VERIFY_ATTEMPTS;

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await prisma.otpCode.count({
    where: { identifier: params.identifier, purpose: params.purpose, createdAt: { gte: oneHourAgo } },
  });
  if (recentCount >= OTP_DEFAULTS.MAX_OTP_PER_HOUR) {
    throw new ApiError(429, "تم تجاوز الحد الأقصى لعدد رسائل التحقق خلال ساعة، الرجاء المحاولة لاحقًا");
  }

  const last = await prisma.otpCode.findFirst({
    where: { identifier: params.identifier, purpose: params.purpose },
    orderBy: { createdAt: "desc" },
  });
  if (last && Date.now() - last.createdAt.getTime() < OTP_DEFAULTS.RESEND_COOLDOWN_SECONDS * 1000) {
    const waitSeconds = Math.ceil(
      (OTP_DEFAULTS.RESEND_COOLDOWN_SECONDS * 1000 - (Date.now() - last.createdAt.getTime())) / 1000,
    );
    throw new ApiError(429, `الرجاء الانتظار ${waitSeconds} ثانية قبل إعادة إرسال الرمز`);
  }

  const code = generateNumericCode(OTP_DEFAULTS.LENGTH);
  const codeHash = sha256Hex(code);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  const otp = await prisma.otpCode.create({
    data: {
      purpose: params.purpose,
      channel: params.channel,
      identifier: params.identifier,
      codeHash,
      userId: params.userId,
      expiresAt,
      maxAttempts,
      requestIp: params.requestIp,
    },
  });

  return { otpId: otp.id, code, expiresAt };
}

interface VerifyOtpParams {
  purpose: OtpPurpose;
  identifier: string;
  code: string;
}

/** التحقق من OTP مع منع Brute Force عبر عدّاد محاولات لكل رمز */
export async function verifyOtp(params: VerifyOtpParams) {
  const otp = await prisma.otpCode.findFirst({
    where: { identifier: params.identifier, purpose: params.purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) throw new ApiError(400, "لا يوجد رمز تحقق فعّال، الرجاء طلب رمز جديد");
  if (otp.expiresAt < new Date()) throw new ApiError(400, "انتهت صلاحية رمز التحقق");
  if (otp.attempts >= otp.maxAttempts) {
    throw new ApiError(429, "تم تجاوز عدد المحاولات المسموح بها، الرجاء طلب رمز جديد");
  }

  const providedHash = sha256Hex(params.code);
  if (providedHash !== otp.codeHash) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw new ApiError(400, "رمز التحقق غير صحيح");
  }

  await prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
  return otp;
}
