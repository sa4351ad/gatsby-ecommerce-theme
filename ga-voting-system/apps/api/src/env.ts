import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL مطلوب"),
  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET يجب أن يكون 16 حرفًا على الأقل"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET يجب أن يكون 16 حرفًا على الأقل"),
  VOTE_HASH_SECRET: z.string().min(16, "VOTE_HASH_SECRET يجب أن يكون 16 حرفًا على الأقل"),
  SETTINGS_ENCRYPTION_KEY: z
    .string()
    .min(32, "SETTINGS_ENCRYPTION_KEY يجب أن يكون 32 حرفًا على الأقل (256-bit)"),
  WEB_APP_URL: z.string().default("http://localhost:3000"),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),
  UPLOAD_DIR: z.string().default("./uploads"),
  DEFAULT_TIMEZONE: z.string().default("Asia/Riyadh"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("❌ متغيرات البيئة غير صحيحة:", parsed.error.flatten().fieldErrors);
  throw new Error("فشل التحقق من متغيرات البيئة (راجع .env)");
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
