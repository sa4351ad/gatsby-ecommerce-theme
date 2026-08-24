import type { Express } from "express";
import request from "supertest";

export interface AuthedAgent {
  cookieHeader: string;
  csrfToken: string;
}

function parseCookies(setCookieHeaders: string[]): { cookieHeader: string; csrfToken: string } {
  const jar: Record<string, string> = {};
  for (const raw of setCookieHeaders) {
    const [pair] = raw.split(";");
    const [name, value] = pair.split("=");
    jar[name] = value;
  }
  return { cookieHeader: Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; "), csrfToken: jar.ga_csrf };
}

/** يسجّل دخول عضو عبر رحلة OTP الحقيقية عبر HTTP (يستخدم debugCode المتاح فقط في NODE_ENV=test) */
export async function loginAsMember(app: Express, identifier: string): Promise<AuthedAgent> {
  const otpRes = await request(app).post("/api/v1/auth/login/request-otp").send({ identifier });
  const code = otpRes.body.debugCode;
  if (!code) throw new Error("تعذّر الحصول على رمز OTP للاختبار — تأكد من NODE_ENV=test");

  const verifyRes = await request(app).post("/api/v1/auth/login/verify-otp").send({ identifier, code });
  if (verifyRes.status !== 200) throw new Error(`فشل تسجيل الدخول: ${JSON.stringify(verifyRes.body)}`);

  const setCookie = verifyRes.headers["set-cookie"] as unknown as string[];
  return parseCookies(setCookie);
}

export async function loginAsAdmin(app: Express, email: string, password: string): Promise<AuthedAgent> {
  const res = await request(app).post("/api/v1/auth/admin/login").send({ email, password });
  if (res.status !== 200) throw new Error(`فشل تسجيل دخول المدير: ${JSON.stringify(res.body)}`);
  const setCookie = res.headers["set-cookie"] as unknown as string[];
  return parseCookies(setCookie);
}
