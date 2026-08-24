import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { createTestMember, createTestVoting } from "./helpers/fixtures";
import { loginAsMember } from "./helpers/testAuth";

const app = createApp();

async function castOnce(cookieHeader: string, csrf: string, votingId: string, questionId: string, optionId: string) {
  return request(app)
    .post(`/api/v1/votings/${votingId}/confirm`)
    .set("Cookie", cookieHeader)
    .set("x-csrf-token", csrf)
    .send({ answers: [{ questionId, selectedOptionIds: [optionId] }] });
}

describe("منع التصويت المكرر (Section 18)", () => {
  it("يرفض المحاولة الثانية للتصويت عندما allowVoteChange = false", async () => {
    const member = await createTestMember();
    const voting = await createTestVoting([member], { allowVoteChange: false });
    const q = voting.questions[0];
    const opt = q.options[0];
    const auth = await loginAsMember(app, member.nationalId);

    const first = await castOnce(auth.cookieHeader, auth.csrfToken, voting.id, q.id, opt.id);
    expect(first.status).toBe(200);
    expect(first.body.referenceNumber).toMatch(/^VOTE-\d{4}-\d{6}$/);

    const second = await castOnce(auth.cookieHeader, auth.csrfToken, voting.id, q.id, opt.id);
    expect(second.status).toBe(409);
  });

  it("يمنع التصويت حتى مع محاولة إرسال Request متزامنة (Race Condition) عبر القيد الفريد في قاعدة البيانات", async () => {
    const member = await createTestMember();
    const voting = await createTestVoting([member], { allowVoteChange: false });
    const q = voting.questions[0];
    const opt = q.options[0];
    const auth = await loginAsMember(app, member.nationalId);

    const [r1, r2] = await Promise.all([
      castOnce(auth.cookieHeader, auth.csrfToken, voting.id, q.id, opt.id),
      castOnce(auth.cookieHeader, auth.csrfToken, voting.id, q.id, opt.id),
    ]);
    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([200, 409]); // واحدة فقط تنجح مهما كان التزامن
  });

  it("يسمح باستبدال الصوت (وليس تكراره) عندما allowVoteChange = true، ويحتفظ بالجولة السابقة بدل حذفها", async () => {
    const member = await createTestMember();
    const voting = await createTestVoting([member], { allowVoteChange: true });
    const q = voting.questions[0];
    const [opt1, opt2] = q.options;
    const auth = await loginAsMember(app, member.nationalId);

    const first = await castOnce(auth.cookieHeader, auth.csrfToken, voting.id, q.id, opt1.id);
    expect(first.status).toBe(200);
    const second = await castOnce(auth.cookieHeader, auth.csrfToken, voting.id, q.id, opt2.id);
    expect(second.status).toBe(200);
    expect(second.body.referenceNumber).not.toBe(first.body.referenceNumber);

    const { prisma } = await import("@ga/db");
    const votesForMember = await prisma.vote.findMany({ where: { votingId: voting.id, memberId: member.id } });
    expect(votesForMember.length).toBe(2); // النسخة القديمة محفوظة (Append-only)، مُعلَّمة كمُستبدَلة
    expect(votesForMember.some((v) => v.supersededAt !== null)).toBe(true);
    expect(votesForMember.some((v) => v.supersededAt === null)).toBe(true);
  });

  it("يرفض التصويت لعضو غير مؤهل (لا يملك Snapshot أهلية لهذا التصويت)", async () => {
    const eligibleMember = await createTestMember();
    const outsiderMember = await createTestMember();
    const voting = await createTestVoting([eligibleMember], { allowVoteChange: false }); // outsider غير مُدرج
    const q = voting.questions[0];
    const opt = q.options[0];
    const auth = await loginAsMember(app, outsiderMember.nationalId);

    const res = await castOnce(auth.cookieHeader, auth.csrfToken, voting.id, q.id, opt.id);
    expect(res.status).toBe(403);
  });
});
