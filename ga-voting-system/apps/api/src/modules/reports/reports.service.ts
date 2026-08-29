import { prisma } from "@ga/db";
import { computeResults } from "../votings/results.service";
import type { ReportColumn } from "./exporters";

export const MEMBERS_COLUMNS: ReportColumn[] = [
  { key: "membershipNumberSystem", header: "رقم العضوية (النظام)" },
  { key: "membershipNumberReal", header: "رقم العضوية الفعلي" },
  { key: "fullName", header: "الاسم" },
  { key: "nationalId", header: "رقم الهوية" },
  { key: "phone", header: "الجوال" },
  { key: "email", header: "البريد الإلكتروني" },
  { key: "votingWeight", header: "وزن التصويت" },
  { key: "status", header: "الحالة" },
  { key: "isVotingEligible", header: "مؤهل للتصويت" },
  { key: "createdAt", header: "تاريخ التسجيل" },
];

export async function getMembersReport() {
  const members = await prisma.member.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" } });
  return members.map((m) => ({ ...m, createdAt: m.createdAt.toISOString().slice(0, 10) }));
}

export const VOTING_PARTICIPATION_COLUMNS: ReportColumn[] = [
  { key: "label", header: "البند" },
  { key: "value", header: "القيمة" },
];

export async function getVotingParticipationReport(votingId: string) {
  const results = await computeResults(votingId);
  return [
    { label: "عدد المؤهلين", value: results.eligibleCount },
    { label: "مجموع الأوزان المؤهلة", value: results.eligibleWeight },
    { label: "عدد من صوّتوا", value: results.confirmedCount },
    { label: "مجموع أوزان من صوّتوا", value: results.confirmedWeight },
    { label: "عدد من لم يصوّتوا", value: results.nonVotersCount },
    { label: "نسبة المشاركة (%)", value: results.participationRate.toFixed(2) },
    { label: "تحقق النصاب", value: results.quorum.isMet ? "نعم" : "لا" },
  ];
}

export const NON_VOTERS_COLUMNS: ReportColumn[] = [
  { key: "membershipNumberSystem", header: "رقم العضوية" },
  { key: "fullName", header: "الاسم" },
  { key: "phone", header: "الجوال" },
];

export async function getNonVotersReport(votingId: string) {
  const eligibilities = await prisma.votingEligibility.findMany({ where: { votingId, isEligible: true }, include: { member: true } });
  const confirmed = await prisma.voteConfirmation.findMany({ where: { votingId, supersededAt: null }, select: { memberId: true } });
  const confirmedIds = new Set(confirmed.map((c) => c.memberId));
  return eligibilities.filter((e) => !confirmedIds.has(e.memberId)).map((e) => e.member);
}

export const ATTENDANCE_COLUMNS: ReportColumn[] = [
  { key: "fullName", header: "الاسم" },
  { key: "membershipNumberSystem", header: "رقم العضوية" },
  { key: "invitedAt", header: "تاريخ الدعوة" },
];

export async function getAttendanceReport(meetingId: string) {
  const invitees = await prisma.meetingInvitee.findMany({ where: { meetingId }, include: { member: true } });
  return invitees.map((i) => ({
    fullName: i.member.fullName,
    membershipNumberSystem: i.member.membershipNumberSystem,
    invitedAt: i.invitedAt.toISOString().slice(0, 10),
  }));
}

export const ELECTIONS_COLUMNS: ReportColumn[] = [
  { key: "rank", header: "الترتيب" },
  { key: "label", header: "المرشح" },
  { key: "voteCount", header: "عدد الأصوات" },
  { key: "weightSum", header: "مجموع الأوزان" },
  { key: "percentageOfWeight", header: "النسبة %" },
  { key: "isWinner", header: "فائز" },
];

export async function getElectionResultsReport(votingId: string, questionId: string) {
  const results = await computeResults(votingId);
  const q = results.questionResults.find((r) => r.question.id === questionId);
  if (!q) return [];
  return q.tally.options.map((o) => ({
    rank: o.rank,
    label: o.label,
    voteCount: o.voteCount,
    weightSum: o.weightSum.toFixed(2),
    percentageOfWeight: o.percentageOfWeight.toFixed(2),
    isWinner: o.isWinner ? "نعم" : "لا",
  }));
}

export const AUDIT_COLUMNS: ReportColumn[] = [
  { key: "createdAt", header: "التاريخ" },
  { key: "action", header: "العملية" },
  { key: "entity", header: "الكيان" },
  { key: "entityId", header: "معرّف الكيان" },
  { key: "ipAddress", header: "IP" },
];

export async function getAuditReport(from?: string, to?: string) {
  const rows = await prisma.auditLog.findMany({
    where: { createdAt: { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

export const MESSAGE_LOG_COLUMNS: ReportColumn[] = [
  { key: "createdAt", header: "التاريخ" },
  { key: "to", header: "المستلم" },
  { key: "status", header: "الحالة" },
];

export async function getSmsReport() {
  const rows = await prisma.smsLog.findMany({ orderBy: { createdAt: "desc" }, take: 5000 });
  return rows.map((r) => ({ createdAt: r.createdAt.toISOString(), to: r.toPhone, status: r.status }));
}

export async function getEmailReport() {
  const rows = await prisma.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 5000 });
  return rows.map((r) => ({ createdAt: r.createdAt.toISOString(), to: r.toEmail, status: r.status }));
}
