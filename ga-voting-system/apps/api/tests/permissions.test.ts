import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { createTestMember } from "./helpers/fixtures";
import { loginAsMember } from "./helpers/testAuth";

const app = createApp();

describe("RBAC — تحقق الصلاحيات من جهة الخادم (Section 31/47)", () => {
  it("يرفض وصول عضو عادي إلى مسارات إدارة الأعضاء", async () => {
    const member = await createTestMember();
    const auth = await loginAsMember(app, member.nationalId);

    const res = await request(app).get("/api/v1/members").set("Cookie", auth.cookieHeader);
    expect(res.status).toBe(403);
  });

  it("يرفض وصول عضو عادي إلى إنشاء تصويت جديد حتى بإرسال Request مباشر", async () => {
    const member = await createTestMember();
    const auth = await loginAsMember(app, member.nationalId);

    const res = await request(app)
      .post("/api/v1/votings")
      .set("Cookie", auth.cookieHeader)
      .set("x-csrf-token", auth.csrfToken)
      .send({
        title: "محاولة غير مصرح بها",
        startAt: new Date().toISOString(),
        endAt: new Date(Date.now() + 3600_000).toISOString(),
        questions: [{ type: "YES_NO", text: "؟", options: [] }],
      });
    expect(res.status).toBe(403);
  });

  it("يرفض طلبات التعديل بدون رمز CSRF حتى مع وجود جلسة صالحة", async () => {
    const member = await createTestMember();
    const auth = await loginAsMember(app, member.nationalId);

    const res = await request(app).post("/api/v1/auth/logout").set("Cookie", auth.cookieHeader); // بدون x-csrf-token
    expect(res.status).toBe(403);
  });

  it("يرفض جلسة مزوَّرة (JWT بتوقيع غير صحيح)", async () => {
    const res = await request(app).get("/api/v1/auth/me").set("Cookie", "ga_access=invalid.jwt.token");
    expect(res.status).toBe(401);
  });
});
