import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { createTestMember, createTestVoting } from "./helpers/fixtures";
import { loginAsMember } from "./helpers/testAuth";
import { prisma } from "@ga/db";

const app = createApp();

describe("التحكم الزمني للتصويت (Section 19) — الخادم هو المصدر الوحيد للحقيقة", () => {
  it("يرفض التصويت قبل وقت البداية (تصويت مجدوَل لم يُفتح بعد)", async () => {
    const member = await createTestMember();
    const voting = await createTestVoting([member], { startsInFuture: true });
    // الأهلية لا تُنشأ إلا عند الفتح — نضيفها يدويًا هنا لعزل اختبار الوقت عن اختبار الأهلية
    await prisma.votingEligibility.create({
      data: { votingId: voting.id, memberId: member.id, snapshotWeight: member.votingWeight as any, snapshotStatus: "ACTIVE", isEligible: true },
    });
    const q = voting.questions[0];
    const opt = q.options[0];
    const auth = await loginAsMember(app, member.nationalId);

    const res = await request(app)
      .post(`/api/v1/votings/${voting.id}/confirm`)
      .set("Cookie", auth.cookieHeader)
      .set("x-csrf-token", auth.csrfToken)
      .send({ answers: [{ questionId: q.id, selectedOptionIds: [opt.id] }] });

    expect(res.status).toBe(403);
  });

  it("يرفض التصويت بعد انتهاء الوقت حتى لو كانت الحالة المخزَّنة لا تزال OPEN", async () => {
    const member = await createTestMember();
    const voting = await createTestVoting([member], {});
    // نزوّر انتهاء الوقت يدويًا مع إبقاء الحالة المخزَّنة OPEN لمحاكاة تأخر الـ Cron
    await prisma.voting.update({ where: { id: voting.id }, data: { endAt: new Date(Date.now() - 1000), status: "OPEN" } });

    const q = voting.questions[0];
    const opt = q.options[0];
    const auth = await loginAsMember(app, member.nationalId);

    const res = await request(app)
      .post(`/api/v1/votings/${voting.id}/confirm`)
      .set("Cookie", auth.cookieHeader)
      .set("x-csrf-token", auth.csrfToken)
      .send({ answers: [{ questionId: q.id, selectedOptionIds: [opt.id] }] });

    expect(res.status).toBe(403);

    const closedVoting = await prisma.voting.findUniqueOrThrow({ where: { id: voting.id } });
    expect(closedVoting.status).toBe("CLOSED"); // أُغلق تلقائيًا دفاعيًا عند محاولة الوصول إليه
  });

  it("يرفض التصويت على تصويت ملغى (CANCELLED)", async () => {
    const member = await createTestMember();
    const voting = await createTestVoting([member], {});
    await prisma.voting.update({ where: { id: voting.id }, data: { status: "CANCELLED" } });
    const q = voting.questions[0];
    const opt = q.options[0];
    const auth = await loginAsMember(app, member.nationalId);

    const res = await request(app)
      .post(`/api/v1/votings/${voting.id}/confirm`)
      .set("Cookie", auth.cookieHeader)
      .set("x-csrf-token", auth.csrfToken)
      .send({ answers: [{ questionId: q.id, selectedOptionIds: [opt.id] }] });

    expect(res.status).toBe(403);
  });
});
