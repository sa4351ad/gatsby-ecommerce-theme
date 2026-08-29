import crypto from "node:crypto";
import { env } from "../env";

const ALGO = "aes-256-gcm";

/** مفتاح تشفير ثابت الطول من SETTINGS_ENCRYPTION_KEY (لتشفير أسرار الإعدادات: مفاتيح SMS/SMTP) */
function getKey(): Buffer {
  return crypto.createHash("sha256").update(env.SETTINGS_ENCRYPTION_KEY).digest();
}

/** تشفير قيمة حساسة قبل تخزينها في system_settings (isSecret=true) */
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decryptSecret(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("صيغة القيمة المشفّرة غير صحيحة");
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/** إخفاء جزء من القيمة الحساسة عند عرضها للمستخدمين المصرح لهم (مثال: عرض آخر 4 خانات فقط) */
export function maskSecret(plain: string): string {
  if (plain.length <= 4) return "****";
  return `${"*".repeat(plain.length - 4)}${plain.slice(-4)}`;
}

export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}
