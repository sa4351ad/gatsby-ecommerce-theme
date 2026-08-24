import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { createTestMember, createTestVoting } from "./helpers/fixtures";
import { loginAsMember } from "./helpers/testAuth";
import { computeResults } from "../src/modules/votings/results.service";

const app = createApp();

describe("النصاب (Quorum) — Section 17", () => {
  it("لا يتحقق النصاب عندما نسبة المشاركة أقل من المطلوب", async () => {
    const members = await Promise.all(Array.from({ length: 4 }, () => createTestMember()));
    const voting = await createTestVoting(members, { quorumType: "PERCENTAGE_OF_MEMBERS", quorumValue: 75 });
    const q = voting.questions[0];
    const opt = q.options[0];

    // عضو واحد فقط من أصل 4 يصوّت (25%) — أقل من 75% المطلوبة
    const auth = await loginAsMember(app, members[0].nationalId);
    await request(app)
      .post(`/api/v1/votings/${voting.id}/confirm`)
      .set("Cookie", auth.cookieHeader)
      .set("x-csrf-token", auth.csrfToken)
      .send({ answers: [{ questionId: q.id, selectedOptionIds: [opt.id] }] });

    const results = await computeResults(voting.id);
    expect(results.quorum.isMet).toBe(false);
    expect(results.quorum.achievedPercentageOfMembers).toBeCloseTo(25, 5);
  });

  it("يتحقق النصاب عند بلوغ النسبة المطلوبة، ويُحسب من الأعضاء المؤهلين لهذا التصويت فقط", async () => {
    const eligible = await Promise.all(Array.from({ length: 2 }, () => createTestMember()));
    const outsider = await createTestMember(); // موجود في النظام لكنه غير مؤهل لهذا التصويت تحديدًا
    void outsider;
    const voting = await createTestVoting(eligible, { quorumType: "PERCENTAGE_OF_MEMBERS", quorumValue: 50 });
    const q = voting.questions[0];
    const opt = q.options[0];

    const auth = await loginAsMember(app, eligible[0].nationalId);
    await request(app)
      .post(`/api/v1/votings/${voting.id}/confirm`)
      .set("Cookie", auth.cookieHeader)
      .set("x-csrf-token", auth.csrfToken)
      .send({ answers: [{ questionId: q.id, selectedOptionIds: [opt.id] }] });

    const results = await computeResults(voting.id);
    expect(results.eligibleCount).toBe(2); // ليس عدد كل المستخدمين في النظام
    expect(results.quorum.isMet).toBe(true); // 1 من 2 = 50%
  });

  it("يحسب النصاب بناءً على نسبة الأوزان عند اختيار PERCENTAGE_OF_WEIGHT", async () => {
    const heavy = await createTestMember({ weight: 9 });
    const light = await createTestMember({ weight: 1 });
    const voting = await createTestVoting([heavy, light], { quorumType: "PERCENTAGE_OF_WEIGHT", quorumValue: 50, isWeighted: true });
    const q = voting.questions[0];
    const opt = q.options[0];

    const auth = await loginAsMember(app, heavy.nationalId);
    await request(app)
      .post(`/api/v1/votings/${voting.id}/confirm`)
      .set("Cookie", auth.cookieHeader)
      .set("x-csrf-token", auth.csrfToken)
      .send({ answers: [{ questionId: q.id, selectedOptionIds: [opt.id] }] });

    const results = await computeResults(voting.id);
    // العضو الثقيل صوّت فقط (9 من أصل 10 = 90%) — يتحقق النصاب رغم أن 1 فقط من أصل 2 صوّتوا
    expect(results.quorum.isMet).toBe(true);
    expect(results.quorum.achievedPercentageOfWeight).toBeCloseTo(90, 5);
  });
});
