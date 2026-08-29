import { z } from "zod";

export const requestOtpSchema = z.object({
  identifier: z.string().min(3, "الرجاء إدخال رقم العضوية أو رقم الهوية"),
});

export const verifyOtpSchema = z.object({
  identifier: z.string().min(3),
  code: z.string().length(6, "رمز التحقق يجب أن يتكون من 6 أرقام"),
});

export const adminLoginSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صحيح"),
  password: z.string().min(8, "كلمة المرور قصيرة جدًا"),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
