import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { createTestMember } from "./helpers/fixtures";
import { loginAsMember } from "./helpers/testAuth";

const app = createApp();

describe("OTP login flow", () => {
  it("يسمح بتسجيل الدخول برمز OTP صحيح وينشئ جلسة", async () => {
    const member = await createTestMember();
    const auth = await loginAsMember(app, member.nationalId);
    expect(auth.cookieHeader).toContain("ga_access=");
    expect(auth.csrfToken).toBeTruthy();

    const me = await request(app).get("/api/v1/auth/me").set("Cookie", auth.cookieHeader);
    expect(me.status).toBe(200);
    expect(me.body.member.id).toBe(member.id);
  });

  it("يرفض رمز OTP خاطئ", async () => {
    const member = await createTestMember();
    await request(app).post("/api/v1/auth/login/request-otp").send({ identifier: member.nationalId });
    const res = await request(app)
      .post("/api/v1/auth/login/verify-otp")
      .send({ identifier: member.nationalId, code: "000000" });
    expect(res.status).toBe(400);
  });

  it("يرفض الوصول لمسار محمي بدون جلسة", async () => {
    const res = await request(app).get("/api/v1/members");
    expect(res.status).toBe(401);
  });

  it("لا يكشف عن عدم وجود العضو — رسالة عامة موحّدة لمنع Enumeration", async () => {
    const res = await request(app).post("/api/v1/auth/login/request-otp").send({ identifier: "9999999999" });
    expect(res.status).toBe(200);
    expect(res.body.message).toContain("إذا كانت البيانات صحيحة");
    expect(res.body.debugCode).toBeUndefined(); // لا يوجد كود لأن العضو غير موجود
  });

  it("يمنع تجاوز الحد الأقصى لمحاولات التحقق من نفس الرمز (Brute Force)", async () => {
    const member = await createTestMember();
    const otpRes = await request(app).post("/api/v1/auth/login/request-otp").send({ identifier: member.nationalId });
    const wrongAttempts = Array.from({ length: 6 }, () =>
      request(app).post("/api/v1/auth/login/verify-otp").send({ identifier: member.nationalId, code: "111111" }),
    );
    const results = [];
    for (const attempt of wrongAttempts) results.push(await attempt);
    const lastResult = results[results.length - 1];
    expect(lastResult.status).toBe(429);
    void otpRes;
  });
});
