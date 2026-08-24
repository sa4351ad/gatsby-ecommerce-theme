import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { createTestMember, createTestVoting } from "./helpers/fixtures";
import { loginAsMember } from "./helpers/testAuth";
import { computeResults } from "../src/modules/votings/results.service";

const app = createApp();

async function cast(app_: ReturnType<typeof createApp>, identifier: string, votingId: string, questionId: string, optionId: string) {
  const auth = await loginAsMember(app_, identifier);
  return request(app_)
    .post(`/api/v1/votings/${votingId}/confirm`)
    .set("Cookie", auth.cookieHeader)
    .set("x-csrf-token", auth.csrfToken)
    .send({ answers: [{ questionId, selectedOptionIds: [optionId] }] });
}

describe("احتساب النتائج الموزون (Section 16)", () => {
  it("يحسب النتيجة بناءً على مجموع الأوزان وليس عدد الأعضاء فقط", async () => {
    // عضو وزن 10 = موافق | عضو وزن 5 = غير موافق | عضو وزن 1 = موافق (مطابق لمثال Section 16)
    const memberA = await createTestMember({ weight: 10 });
    const memberB = await createTestMember({ weight: 5 });
    const memberC = await createTestMember({ weight: 1 });
    const voting = await createTestVoting([memberA, memberB, memberC], { isWeighted: true });
    const q = voting.questions[0];
    const approve = q.options[0]; // موافق
    const reject = q.options[1]; // غير موافق

    await cast(app, memberA.nationalId, voting.id, q.id, approve.id);
    await cast(app, memberB.nationalId, voting.id, q.id, reject.id);
    await cast(app, memberC.nationalId, voting.id, q.id, approve.id);

    const results = await computeResults(voting.id);
    const approveTally = results.questionResults[0].tally.options.find((o) => o.optionId === approve.id)!;
    const rejectTally = results.questionResults[0].tally.options.find((o) => o.optionId === reject.id)!;

    expect(approveTally.voteCount).toBe(2);
    expect(approveTally.weightSum).toBe(11); // 10 + 1
    expect(rejectTally.voteCount).toBe(1);
    expect(rejectTally.weightSum).toBe(5);
    expect(results.confirmedWeight).toBe(16);
  });

  it("لا يتأثر احتساب النتيجة بتغيير وزن العضو بعد فتح التصويت (Snapshot ثابت — Section 37)", async () => {
    const member = await createTestMember({ weight: 2 });
    const voting = await createTestVoting([member], { isWeighted: true });
    const q = voting.questions[0];
    const opt = q.options[0];

    await cast(app, member.nationalId, voting.id, q.id, opt.id);

    const { prisma } = await import("@ga/db");
    await prisma.member.update({ where: { id: member.id }, data: { votingWeight: 99 } });

    const results = await computeResults(voting.id);
    const tally = results.questionResults[0].tally.options.find((o) => o.optionId === opt.id)!;
    expect(tally.weightSum).toBe(2); // ما زال الوزن الأصلي وقت فتح التصويت، وليس 99
  });
});
