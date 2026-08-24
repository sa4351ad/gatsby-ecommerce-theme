import { prisma } from "@ga/db";
import type { CreateMemberInput, UpdateMemberInput } from "@ga/shared";
import { ApiError } from "../../utils/apiError";
import { generateSystemMembershipNumber } from "../../lib/memberNumber";
import { recordAudit, AUDIT_ACTIONS } from "../../lib/audit";
import { parseMembersExcel } from "./members.import";

interface ListMembersParams {
  search?: string;
  status?: string;
  groupId?: string;
  isVotingEligible?: boolean;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  pageSize?: number;
}

export async function listMembers(params: ListMembersParams) {
  const page = params.page ?? 1;
  const pageSize = Math.min(params.pageSize ?? 20, 100);

  const where: any = { deletedAt: null };
  if (params.status) where.status = params.status;
  if (params.isVotingEligible !== undefined) where.isVotingEligible = params.isVotingEligible;
  if (params.groupId) where.groupMemberships = { some: { groupId: params.groupId } };
  if (params.createdFrom || params.createdTo) {
    where.createdAt = {
      ...(params.createdFrom ? { gte: new Date(params.createdFrom) } : {}),
      ...(params.createdTo ? { lte: new Date(params.createdTo) } : {}),
    };
  }
  if (params.search) {
    where.OR = [
      { fullName: { contains: params.search, mode: "insensitive" } },
      { nationalId: { contains: params.search } },
      { phone: { contains: params.search } },
      { membershipNumberSystem: { contains: params.search, mode: "insensitive" } },
      { membershipNumberReal: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.member.count({ where }),
    prisma.member.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getMember(id: string) {
  const member = await prisma.member.findFirst({
    where: { id, deletedAt: null },
    include: { groupMemberships: { include: { group: true } } },
  });
  if (!member) throw new ApiError(404, "العضو غير موجود");
  return member;
}

async function assertUnique(input: { nationalId?: string; phone?: string; membershipNumberReal?: string }, excludeId?: string) {
  const or: any[] = [];
  if (input.nationalId) or.push({ nationalId: input.nationalId });
  if (input.phone) or.push({ phone: input.phone });
  if (input.membershipNumberReal) or.push({ membershipNumberReal: input.membershipNumberReal });
  if (or.length === 0) return;

  const conflict = await prisma.member.findFirst({
    where: { deletedAt: null, OR: or, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
  });
  if (conflict) {
    if (conflict.nationalId === input.nationalId) throw new ApiError(409, "رقم الهوية مستخدم مسبقًا");
    if (conflict.phone === input.phone) throw new ApiError(409, "رقم الجوال مستخدم مسبقًا");
    throw new ApiError(409, "رقم العضوية الفعلي مستخدم مسبقًا");
  }
}

export async function createMember(input: CreateMemberInput, actingUserId?: string) {
  await assertUnique({ nationalId: input.nationalId, phone: input.phone, membershipNumberReal: input.membershipNumberReal });

  const membershipNumberSystem = await generateSystemMembershipNumber();

  const memberRoleId = await getMemberRoleId();

  const member = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { roleId: memberRoleId } });
    return tx.member.create({
      data: {
        userId: user.id,
        fullName: input.fullName,
        nationalId: input.nationalId,
        phone: input.phone,
        email: input.email || undefined,
        membershipNumberReal: input.membershipNumberReal || undefined,
        membershipNumberSystem,
        votingWeight: input.votingWeight ?? 1,
        membershipStartDate: input.membershipStartDate ? new Date(input.membershipStartDate) : undefined,
        membershipEndDate: input.membershipEndDate ? new Date(input.membershipEndDate) : undefined,
        isVotingEligible: input.isVotingEligible ?? true,
        adminNotes: input.adminNotes,
      },
    });
  });

  await recordAudit({
    userId: actingUserId,
    action: AUDIT_ACTIONS.MEMBER_CREATED,
    entity: "Member",
    entityId: member.id,
    newValue: member,
  });

  return member;
}

let cachedMemberRoleId: string | null = null;
async function getMemberRoleId(): Promise<string> {
  if (cachedMemberRoleId) return cachedMemberRoleId;
  const role = await prisma.role.findUnique({ where: { key: "MEMBER" } });
  if (!role) throw new ApiError(500, "دور العضو غير موجود في النظام، الرجاء تشغيل Seed أولًا");
  cachedMemberRoleId = role.id;
  return role.id;
}

export async function updateMember(id: string, input: UpdateMemberInput, actingUserId?: string) {
  const existing = await getMember(id);
  await assertUnique(
    { nationalId: input.nationalId, phone: input.phone, membershipNumberReal: input.membershipNumberReal },
    id,
  );

  const updated = await prisma.member.update({
    where: { id },
    data: {
      fullName: input.fullName,
      nationalId: input.nationalId,
      phone: input.phone,
      email: input.email,
      membershipNumberReal: input.membershipNumberReal,
      votingWeight: input.votingWeight,
      status: input.status as any,
      membershipStartDate: input.membershipStartDate ? new Date(input.membershipStartDate) : undefined,
      membershipEndDate: input.membershipEndDate ? new Date(input.membershipEndDate) : undefined,
      isVotingEligible: input.isVotingEligible,
      adminNotes: input.adminNotes,
    },
  });

  await recordAudit({
    userId: actingUserId,
    action: AUDIT_ACTIONS.MEMBER_UPDATED,
    entity: "Member",
    entityId: id,
    oldValue: existing,
    newValue: updated,
  });

  return updated;
}

/** حذف ناعم فقط — لا حذف فعلي أبدًا لضمان سلامة السجلات المرتبطة بالتصويتات السابقة (Section 21/38) */
export async function disableMember(id: string, actingUserId?: string) {
  const existing = await getMember(id);
  const updated = await prisma.$transaction(async (tx) => {
    const m = await tx.member.update({ where: { id }, data: { deletedAt: new Date(), status: "INACTIVE" } });
    await tx.user.update({ where: { id: existing.userId }, data: { isActive: false } });
    return m;
  });

  await recordAudit({
    userId: actingUserId,
    action: AUDIT_ACTIONS.MEMBER_DISABLED,
    entity: "Member",
    entityId: id,
    oldValue: existing,
  });

  return updated;
}

// ---------------------------------------------------------------------------
// استيراد Excel
// ---------------------------------------------------------------------------

export async function previewImport(fileBuffer: Buffer, fileName: string, uploadedById?: string) {
  const { validRows, errors, totalRows } = await parseMembersExcel(fileBuffer);

  const job = await prisma.memberImportJob.create({
    data: {
      fileName,
      uploadedById,
      status: errors.length > 0 ? "COMPLETED_WITH_ERRORS" : "COMPLETED",
      totalRows,
      validRows: validRows.length,
      invalidRows: errors.length,
      finishedAt: new Date(),
      validRowsJson: validRows as any,
      errors: { create: errors.map((e) => ({ rowNumber: e.rowNumber, rawDataJson: e.rawDataJson as any, errorMessage: e.errorMessage })) },
    },
    include: { errors: true },
  });

  return {
    jobId: job.id,
    totalRows,
    validCount: validRows.length,
    invalidCount: errors.length,
    validRowsPreview: validRows.slice(0, 50),
    errors: job.errors,
  };
}

export async function commitImport(jobId: string, actingUserId?: string) {
  const job = await prisma.memberImportJob.findUnique({ where: { id: jobId } });
  if (!job) throw new ApiError(404, "لم يتم العثور على عملية الاستيراد");
  if (job.committedAt) throw new ApiError(409, "تم اعتماد هذه العملية مسبقًا");

  const rows = (job.validRowsJson as any[]) ?? [];
  const memberRoleId = await getMemberRoleId();
  let imported = 0;

  for (const row of rows) {
    try {
      await assertUnique({ nationalId: row.nationalId, phone: row.phone, membershipNumberReal: row.membershipNumberReal });
      const membershipNumberSystem = await generateSystemMembershipNumber();
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({ data: { roleId: memberRoleId } });
        await tx.member.create({
          data: {
            userId: user.id,
            fullName: row.fullName,
            nationalId: row.nationalId,
            phone: row.phone,
            email: row.email,
            membershipNumberReal: row.membershipNumberReal,
            membershipNumberSystem,
            votingWeight: row.votingWeight ?? 1,
          },
        });
      });
      imported += 1;
    } catch {
      // صف تعارض لاحقًا (نادر) — لا يوقف بقية عملية الاستيراد
    }
  }

  const updatedJob = await prisma.memberImportJob.update({
    where: { id: jobId },
    data: { importedRows: imported, committedAt: new Date() },
  });

  await recordAudit({
    userId: actingUserId,
    action: AUDIT_ACTIONS.MEMBERS_IMPORTED,
    entity: "MemberImportJob",
    entityId: jobId,
    newValue: { imported, total: rows.length },
  });

  return updatedJob;
}

export async function getImportErrorsReport(jobId: string) {
  const job = await prisma.memberImportJob.findUnique({ where: { id: jobId }, include: { errors: true } });
  if (!job) throw new ApiError(404, "لم يتم العثور على عملية الاستيراد");
  return job.errors;
}
