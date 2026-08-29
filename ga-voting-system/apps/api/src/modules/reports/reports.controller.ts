import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/apiError";
import { toCsv, toXlsx, toPdfBuffer, type ReportColumn } from "./exporters";
import * as service from "./reports.service";

type Format = "csv" | "xlsx" | "pdf";

async function respondWithReport(
  res: Response,
  fileBaseName: string,
  title: string,
  format: Format,
  rows: Record<string, unknown>[],
  columns: ReportColumn[],
) {
  if (format === "xlsx") {
    const buffer = await toXlsx(rows, columns, title);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fileBaseName}.xlsx"`);
    return res.send(buffer);
  }
  if (format === "pdf") {
    const buffer = await toPdfBuffer(title, rows, columns);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileBaseName}.pdf"`);
    return res.send(buffer);
  }
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${fileBaseName}.csv"`);
  return res.send(toCsv(rows, columns));
}

function getFormat(req: Request): Format {
  const f = (req.query.format as string) ?? "csv";
  if (f !== "csv" && f !== "xlsx" && f !== "pdf") throw new ApiError(400, "صيغة غير مدعومة");
  return f;
}

export const members = asyncHandler(async (req: Request, res: Response) => {
  const rows = await service.getMembersReport();
  await respondWithReport(res, "members-report", "تقرير الأعضاء", getFormat(req), rows, service.MEMBERS_COLUMNS);
});

export const votingParticipation = asyncHandler(async (req: Request, res: Response) => {
  const rows = await service.getVotingParticipationReport(req.params.votingId);
  await respondWithReport(res, "voting-participation", "تقرير المشاركة في التصويت", getFormat(req), rows, service.VOTING_PARTICIPATION_COLUMNS);
});

export const nonVoters = asyncHandler(async (req: Request, res: Response) => {
  const rows = await service.getNonVotersReport(req.params.votingId);
  await respondWithReport(res, "non-voters", "تقرير الأعضاء الذين لم يصوّتوا", getFormat(req), rows, service.NON_VOTERS_COLUMNS);
});

export const attendance = asyncHandler(async (req: Request, res: Response) => {
  const rows = await service.getAttendanceReport(req.params.meetingId);
  await respondWithReport(res, "attendance", "تقرير الحضور", getFormat(req), rows, service.ATTENDANCE_COLUMNS);
});

export const electionResults = asyncHandler(async (req: Request, res: Response) => {
  const rows = await service.getElectionResultsReport(req.params.votingId, req.params.questionId);
  await respondWithReport(res, "election-results", "تقرير نتائج الانتخابات", getFormat(req), rows, service.ELECTIONS_COLUMNS);
});

export const audit = asyncHandler(async (req: Request, res: Response) => {
  const rows = await service.getAuditReport(req.query.from as string, req.query.to as string);
  await respondWithReport(res, "audit-log", "تقرير سجل التدقيق", getFormat(req), rows, service.AUDIT_COLUMNS);
});

export const sms = asyncHandler(async (req: Request, res: Response) => {
  const rows = await service.getSmsReport();
  await respondWithReport(res, "sms-log", "تقرير الرسائل القصيرة", getFormat(req), rows, service.MESSAGE_LOG_COLUMNS);
});

export const email = asyncHandler(async (req: Request, res: Response) => {
  const rows = await service.getEmailReport();
  await respondWithReport(res, "email-log", "تقرير البريد الإلكتروني", getFormat(req), rows, service.MESSAGE_LOG_COLUMNS);
});
