import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { createTestMember, createTestVoting } from "./helpers/fixtures";
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

  it("يرفض عضوًا غير مستهدَف من قراءة تفاصيل تصويت لا يخصّه، ولا يُسرِّب بيانات أعضاء آخرين لعضو مستهدَف (Regression)", async () => {
    const targeted = await createTestMember();
    const outsider = await createTestMember();
    const voting = await createTestVoting([targeted], {}); // outsider غير مُدرَج في الأهلية

    const outsiderAuth = await loginAsMember(app, outsider.nationalId);
    const forbidden = await request(app).get(`/api/v1/votings/${voting.id}`).set("Cookie", outsiderAuth.cookieHeader);
    expect(forbidden.status).toBe(403);

    const targetedAuth = await loginAsMember(app, targeted.nationalId);
    const allowed = await request(app).get(`/api/v1/votings/${voting.id}`).set("Cookie", targetedAuth.cookieHeader);
    expect(allowed.status).toBe(200);
    // لا يجب أن يحتوي الرد على قوائم أعضاء آخرين (كانت تُسرَّب بيانات مثل رقم الهوية/الجوال/ملاحظات إدارية)
    expect(allowed.body.targetMembers).toBeUndefined();
    expect(allowed.body.targetGroup).toBeUndefined();
  });

  it("يمنع عضوًا من استبدال صورة عضو آخر (IDOR)", async () => {
    const attacker = await createTestMember();
    const victim = await createTestMember();
    const attackerAuth = await loginAsMember(app, attacker.nationalId);

    const res = await request(app)
      .post(`/api/v1/members/${victim.id}/avatar`)
      .set("Cookie", attackerAuth.cookieHeader)
      .set("x-csrf-token", attackerAuth.csrfToken)
      .attach("avatar", Buffer.from("not-a-real-image"), "avatar.jpg");

    expect(res.status).toBe(403);
  });
});
