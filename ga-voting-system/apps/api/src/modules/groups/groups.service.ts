import { prisma } from "@ga/db";
import { ApiError } from "../../utils/apiError";
import { recordAudit, AUDIT_ACTIONS } from "../../lib/audit";

export async function listGroups(search?: string) {
  return prisma.group.findMany({
    where: {
      deletedAt: null,
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getGroup(id: string) {
  const group = await prisma.group.findFirst({
    where: { id, deletedAt: null },
    include: { members: { include: { member: true } } },
  });
  if (!group) throw new ApiError(404, "المجموعة غير موجودة");
  return group;
}

export async function createGroup(input: { name: string; description?: string; type?: string }, userId?: string) {
  const group = await prisma.group.create({ data: input });
  await recordAudit({ userId, action: AUDIT_ACTIONS.GROUP_CREATED, entity: "Group", entityId: group.id, newValue: group });
  return group;
}

export async function updateGroup(id: string, input: { name?: string; description?: string; type?: string }, userId?: string) {
  await getGroup(id);
  return prisma.group.update({ where: { id }, data: input });
}

export async function addMembers(groupId: string, memberIds: string[], userId?: string) {
  await getGroup(groupId);
  await prisma.groupMember.createMany({
    data: memberIds.map((memberId) => ({ groupId, memberId })),
    skipDuplicates: true,
  });
  await recordAudit({
    userId,
    action: AUDIT_ACTIONS.GROUP_MEMBERS_ADDED,
    entity: "Group",
    entityId: groupId,
    newValue: { memberIds },
  });
  return getGroup(groupId);
}

export async function removeMember(groupId: string, memberId: string) {
  await prisma.groupMember.deleteMany({ where: { groupId, memberId } });
}
