import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { createTestMember, createTestVoting } from "./helpers/fixtures";
import { loginAsMember } from "./helpers/testAuth";
import { prisma } from "@ga/db";
import { computeResults } from "../src/modules/votings/results.service";

const app = createApp();

describe("التصويت السري (Section 28)", () => {
  it("لا يخزّن memberId على سجل الصوت، لكنه يحتفظ بإثبات مشاركة مرتبط بالعضو ويحسب الوزن بدقة", async () => {
    const member = await createTestMember({ weight: 7 });
    const voting = await createTestVoting([member], { isSecret: true, questionType: "YES_NO", optionLabels: ["نعم", "لا"], isWeighted: true });
    const q = voting.questions[0];
    const yes = q.options[0];
    const auth = await loginAsMember(app, member.nationalId);

    const res = await request(app)
      .post(`/api/v1/votings/${voting.id}/confirm`)
      .set("Cookie", auth.cookieHeader)
      .set("x-csrf-token", auth.csrfToken)
      .send({ answers: [{ questionId: q.id, selectedOptionIds: [yes.id] }] });
    expect(res.status).toBe(200);

    const voteRow = await prisma.vote.findFirst({ where: { votingId: voting.id, questionId: q.id } });
    expect(voteRow).not.toBeNull();
    expect(voteRow!.memberId).toBeNull(); // لا يوجد ربط مباشر بالعضو
    expect(Number(voteRow!.weightAtVote)).toBe(7); // لكن الوزن محفوظ لضمان دقة الاحتساب

    // إثبات المشاركة يبقى مرتبطًا بالعضو (لإثبات أنه صوّت دون كشف اختياره)
    const participation = await prisma.voteParticipation.findUnique({ where: { votingId_memberId: { votingId: voting.id, memberId: member.id } } });
    expect(participation).not.toBeNull();

    const results = await computeResults(voting.id);
    const yesTally = results.questionResults[0].tally.options.find((o) => o.optionId === yes.id)!;
    expect(yesTally.weightSum).toBe(7);
  });

  it("يمنع التصويت المكرر في التصويت السري رغم عدم وجود ربط مباشر بالهوية على سجل الصوت", async () => {
    const member = await createTestMember();
    const voting = await createTestVoting([member], { isSecret: true, allowVoteChange: false, questionType: "YES_NO", optionLabels: ["نعم", "لا"] });
    const q = voting.questions[0];
    const auth = await loginAsMember(app, member.nationalId);

    const first = await request(app)
      .post(`/api/v1/votings/${voting.id}/confirm`)
      .set("Cookie", auth.cookieHeader)
      .set("x-csrf-token", auth.csrfToken)
      .send({ answers: [{ questionId: q.id, selectedOptionIds: [q.options[0].id] }] });
    expect(first.status).toBe(200);

    const second = await request(app)
      .post(`/api/v1/votings/${voting.id}/confirm`)
      .set("Cookie", auth.cookieHeader)
      .set("x-csrf-token", auth.csrfToken)
      .send({ answers: [{ questionId: q.id, selectedOptionIds: [q.options[1].id] }] });
    expect(second.status).toBe(409);
  });
});
