import { prisma } from "@ga/db";
import { ApiError } from "../../utils/apiError";
import { recordAudit, AUDIT_ACTIONS } from "../../lib/audit";

interface CreateMeetingInput {
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  mode: "IN_PERSON" | "ONLINE" | "HYBRID";
  inviteeMemberIds?: string[];
  inviteAllMembers?: boolean;
}

export async function listMeetings() {
  return prisma.meeting.findMany({
    where: { deletedAt: null },
    include: { _count: { select: { invitees: true, votings: true } } },
    orderBy: { date: "desc" },
  });
}

export async function getMeeting(id: string) {
  const meeting = await prisma.meeting.findFirst({
    where: { id, deletedAt: null },
    include: { invitees: { include: { member: true } }, votings: true },
  });
  if (!meeting) throw new ApiError(404, "الاجتماع غير موجود");
  return meeting;
}

export async function createMeeting(input: CreateMeetingInput, userId?: string) {
  let inviteeIds = input.inviteeMemberIds ?? [];
  if (input.inviteAllMembers) {
    const all = await prisma.member.findMany({ where: { deletedAt: null, status: "ACTIVE" }, select: { id: true } });
    inviteeIds = all.map((m) => m.id);
  }

  const meeting = await prisma.meeting.create({
    data: {
      title: input.title,
      description: input.description,
      date: new Date(input.date),
      startTime: new Date(input.startTime),
      endTime: new Date(input.endTime),
      location: input.location,
      mode: input.mode,
      createdById: userId,
      invitees: { create: inviteeIds.map((memberId) => ({ memberId })) },
    },
  });

  await recordAudit({ userId, action: AUDIT_ACTIONS.MEETING_CREATED, entity: "Meeting", entityId: meeting.id, newValue: meeting });
  return meeting;
}

export async function updateMeeting(id: string, input: Partial<CreateMeetingInput>, userId?: string) {
  const existing = await getMeeting(id);
  const updated = await prisma.meeting.update({
    where: { id },
    data: {
      title: input.title,
      description: input.description,
      date: input.date ? new Date(input.date) : undefined,
      startTime: input.startTime ? new Date(input.startTime) : undefined,
      endTime: input.endTime ? new Date(input.endTime) : undefined,
      location: input.location,
      mode: input.mode,
    },
  });
  await recordAudit({ userId, action: AUDIT_ACTIONS.MEETING_UPDATED, entity: "Meeting", entityId: id, oldValue: existing, newValue: updated });
  return updated;
}
