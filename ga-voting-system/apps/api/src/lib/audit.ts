import type { Request } from "express";
import { prisma } from "@ga/db";

export const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILED: "LOGIN_FAILED",
  LOGOUT: "LOGOUT",
  OTP_REQUESTED: "OTP_REQUESTED",
  OTP_VERIFIED: "OTP_VERIFIED",
  OTP_FAILED: "OTP_FAILED",
  PHONE_CHANGED: "PHONE_CHANGED",
  MEMBER_CREATED: "MEMBER_CREATED",
  MEMBER_UPDATED: "MEMBER_UPDATED",
  MEMBER_DISABLED: "MEMBER_DISABLED",
  MEMBER_DELETED: "MEMBER_DELETED",
  MEMBERS_IMPORTED: "MEMBERS_IMPORTED",
  GROUP_CREATED: "GROUP_CREATED",
  GROUP_MEMBERS_ADDED: "GROUP_MEMBERS_ADDED",
  MEETING_CREATED: "MEETING_CREATED",
  MEETING_UPDATED: "MEETING_UPDATED",
  VOTING_CREATED: "VOTING_CREATED",
  VOTING_UPDATED: "VOTING_UPDATED",
  VOTING_PUBLISHED: "VOTING_PUBLISHED",
  VOTING_OPENED: "VOTING_OPENED",
  VOTING_CLOSED: "VOTING_CLOSED",
  VOTING_CANCELLED: "VOTING_CANCELLED",
  VOTE_CAST: "VOTE_CAST",
  VOTE_CONFIRMED: "VOTE_CONFIRMED",
  VOTE_REJECTED_DUPLICATE: "VOTE_REJECTED_DUPLICATE",
  VOTE_REJECTED_TIME: "VOTE_REJECTED_TIME",
  VOTE_REJECTED_NOT_ELIGIBLE: "VOTE_REJECTED_NOT_ELIGIBLE",
  SETTINGS_UPDATED: "SETTINGS_UPDATED",
  ROLE_PERMISSIONS_UPDATED: "ROLE_PERMISSIONS_UPDATED",
  SMS_SENT: "SMS_SENT",
  EMAIL_SENT: "EMAIL_SENT",
  SECRET_IDENTITY_ACCESSED: "SECRET_IDENTITY_ACCESSED",
} as const;

interface RecordAuditParams {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  req?: Request;
}

/**
 * تسجيل حدث تدقيق. هذا هو المسار الوحيد المسموح للكتابة في audit_logs.
 * لا يوجد أي مسار API لحذف أو تعديل سجل تدقيق (Append-only).
 */
export async function recordAudit(params: RecordAuditParams) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId ?? null,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId ?? null,
      oldValue: params.oldValue as any,
      newValue: params.newValue as any,
      ipAddress: params.req?.ip,
      userAgent: params.req?.headers["user-agent"],
      requestId: (params.req?.headers["x-request-id"] as string) ?? undefined,
    },
  });
}
