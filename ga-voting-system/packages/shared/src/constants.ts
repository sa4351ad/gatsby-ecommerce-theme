export const DEFAULT_TIMEZONE = "Asia/Riyadh";

export const OTP_DEFAULTS = {
  LENGTH: 6,
  TTL_SECONDS: 300, // 5 دقائق
  MAX_VERIFY_ATTEMPTS: 5,
  RESEND_COOLDOWN_SECONDS: 60,
  MAX_OTP_PER_HOUR: 5,
};

export const SESSION_DEFAULTS = {
  ACCESS_TOKEN_TTL_MINUTES: 15,
  REFRESH_TOKEN_TTL_DAYS: 7,
};

export const RATE_LIMIT_DEFAULTS = {
  LOGIN_WINDOW_MINUTES: 15,
  LOGIN_MAX_ATTEMPTS: 8,
};

export const MEMBERSHIP_NUMBER_PREFIX = "M";

export const VOTE_REFERENCE_PREFIX = "VOTE";

export const FILE_UPLOAD_LIMITS = {
  IMAGE_MAX_BYTES: 3 * 1024 * 1024, // 3MB
  EXCEL_MAX_BYTES: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_MIME: ["image/jpeg", "image/png", "image/webp"],
  ALLOWED_EXCEL_MIME: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
  ],
};

export const MEMBER_IMPORT_COLUMNS = [
  "الاسم",
  "الهوية",
  "الجوال",
  "البريد الإلكتروني",
  "وزن الصوت",
  "رقم العضوية الفعلي",
] as const;
