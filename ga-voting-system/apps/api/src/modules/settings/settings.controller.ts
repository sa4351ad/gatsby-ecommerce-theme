import type { Request, Response } from "express";
import {
  smsSettingsSchema,
  emailSettingsSchema,
  generalSettingsSchema,
  securitySettingsSchema,
  votingSettingsSchema,
} from "@ga/shared";
import { getSettingsCategory, setSettingsCategory } from "../../lib/settingsStore";
import { maskSecret } from "../../lib/crypto";
import { testSmsSettings } from "../../lib/sms/sms.service";
import { testEmailSettings } from "../../lib/email/email.service";
import { recordAudit, AUDIT_ACTIONS } from "../../lib/audit";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/apiError";
import { z } from "zod";

const SMS_SECRET_KEYS = ["apiKey", "apiSecret", "password"];
const EMAIL_SECRET_KEYS = ["password"];

function maskCategory(values: Record<string, unknown>, secretKeys: string[]) {
  const masked = { ...values };
  for (const key of secretKeys) {
    if (typeof masked[key] === "string" && masked[key]) masked[key] = maskSecret(masked[key] as string);
  }
  return masked;
}

function makeGetHandler(category: string, secretKeys: string[] = []) {
  return asyncHandler(async (_req: Request, res: Response) => {
    const values = await getSettingsCategory(category);
    res.json(maskCategory(values, secretKeys));
  });
}

function makePutHandler(category: string, schema: z.ZodTypeAny, secretKeys: string[] = []) {
  return asyncHandler(async (req: Request, res: Response) => {
    const input = schema.parse(req.body);
    // لا تُستبدل القيمة الحسّاسة إن أُرسلت كنسخة مُقنَّعة (مثال: "****1234") دون تغيير فعلي من المستخدم
    const sanitized = { ...input };
    for (const key of secretKeys) {
      if (typeof sanitized[key] === "string" && sanitized[key].startsWith("****")) {
        delete sanitized[key];
      }
    }
    await setSettingsCategory(category, sanitized, secretKeys, req.auth?.userId);
    await recordAudit({ userId: req.auth?.userId, action: AUDIT_ACTIONS.SETTINGS_UPDATED, entity: "SystemSetting", entityId: category, newValue: maskCategory(sanitized, secretKeys) });
    res.json({ message: "تم حفظ الإعدادات بنجاح" });
  });
}

export const getGeneral = makeGetHandler("general");
export const putGeneral = makePutHandler("general", generalSettingsSchema);

export const getVoting = makeGetHandler("voting");
export const putVoting = makePutHandler("voting", votingSettingsSchema);

export const getSecurity = makeGetHandler("security");
export const putSecurity = makePutHandler("security", securitySettingsSchema);

export const getSms = makeGetHandler("sms", SMS_SECRET_KEYS);
export const putSms = makePutHandler("sms", smsSettingsSchema, SMS_SECRET_KEYS);

export const getEmail = makeGetHandler("email", EMAIL_SECRET_KEYS);
export const putEmail = makePutHandler("email", emailSettingsSchema, EMAIL_SECRET_KEYS);

export const testSms = asyncHandler(async (req: Request, res: Response) => {
  const to = z.string().min(5).parse(req.body.to);
  const result = await testSmsSettings(to, req.auth?.userId);
  if (!result.success) throw new ApiError(422, "فشل إرسال رسالة الاختبار — تحقق من إعدادات المزود");
  res.json({ message: "تم إرسال رسالة الاختبار بنجاح" });
});

export const testEmail = asyncHandler(async (req: Request, res: Response) => {
  const to = z.string().email().parse(req.body.to);
  const result = await testEmailSettings(to, req.auth?.userId);
  if (!result.success) throw new ApiError(422, result.errorMessage || "فشل إرسال البريد الاختباري");
  res.json({ message: "تم إرسال البريد الاختباري بنجاح" });
});
