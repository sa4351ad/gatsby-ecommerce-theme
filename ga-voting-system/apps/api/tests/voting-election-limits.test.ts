import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { createTestMember, createTestVoting } from "./helpers/fixtures";
import { loginAsMember } from "./helpers/testAuth";

const app = createApp();

describe("انتخابات الشخصيات — حد أقصى للاختيارات (Section 14)", () => {
  it("يرفض اختيار عدد مرشحين أكبر من عدد المقاعد", async () => {
    const member = await createTestMember();
    const voting = await createTestVoting([member], {
      questionType: "ELECTION",
      optionLabels: ["مرشح 1", "مرشح 2", "مرشح 3", "مرشح 4", "مرشح 5"],
      seatsCount: 3,
      minSelections: 1,
      maxSelections: 3,
    });
    const q = voting.questions[0];
    const auth = await loginAsMember(app, member.nationalId);

    const res = await request(app)
      .post(`/api/v1/votings/${voting.id}/confirm`)
      .set("Cookie", auth.cookieHeader)
      .set("x-csrf-token", auth.csrfToken)
      .send({ answers: [{ questionId: q.id, selectedOptionIds: q.options.slice(0, 4).map((o) => o.id) }] });

    expect(res.status).toBe(422);
  });

  it("يقبل اختيار عدد ضمن الحد المسموح ويرفض اختيار مرشح مكرر", async () => {
    const member = await createTestMember();
    const voting = await createTestVoting([member], {
      questionType: "ELECTION",
      optionLabels: ["مرشح 1", "مرشح 2", "مرشح 3"],
      seatsCount: 2,
      minSelections: 1,
      maxSelections: 2,
    });
    const q = voting.questions[0];
    const auth = await loginAsMember(app, member.nationalId);

    const duplicateRes = await request(app)
      .post(`/api/v1/votings/${voting.id}/confirm`)
      .set("Cookie", auth.cookieHeader)
      .set("x-csrf-token", auth.csrfToken)
      .send({ answers: [{ questionId: q.id, selectedOptionIds: [q.options[0].id, q.options[0].id] }] });
    expect(duplicateRes.status).toBe(422);

    const validRes = await request(app)
      .post(`/api/v1/votings/${voting.id}/confirm`)
      .set("Cookie", auth.cookieHeader)
      .set("x-csrf-token", auth.csrfToken)
      .send({ answers: [{ questionId: q.id, selectedOptionIds: [q.options[0].id, q.options[1].id] }] });
    expect(validRes.status).toBe(200);
  });
});
