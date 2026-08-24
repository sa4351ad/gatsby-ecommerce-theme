import rateLimit from "express-rate-limit";

/** حماية من Brute Force على مسارات تسجيل الدخول وطلب/التحقق من OTP */
export const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "عدد محاولات كبير جدًا، الرجاء المحاولة لاحقًا" },
});

export const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "عدد محاولات كبير جدًا، الرجاء المحاولة لاحقًا" },
});

export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "عدد محاولات كبير جدًا، الرجاء المحاولة لاحقًا" },
});

/** حد عام لكل طلبات API لمنع إساءة الاستخدام الآلي */
export const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});
