import { prisma } from "@ga/db";
import { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, ROLE_KEYS, type RoleKey } from "@ga/shared";
import { randomUUID } from "node:crypto";

let rolesReady: Record<string, string> | null = null;

export async function ensureRolesAndPermissions(): Promise<Record<string, string>> {
  if (rolesReady) return rolesReady;

  for (const key of Object.values(PERMISSIONS)) {
    await prisma.permission.upsert({ where: { key }, create: { key, group: key.split(".")[0] }, update: {} });
  }
  const roleIds: Record<string, string> = {};
  for (const roleKey of Object.values(ROLE_KEYS)) {
    const role = await prisma.role.upsert({
      where: { key: roleKey },
      create: { key: roleKey, name: roleKey, isSystem: true },
      update: {},
    });
    roleIds[roleKey] = role.id;
    for (const permKey of DEFAULT_ROLE_PERMISSIONS[roleKey as RoleKey]) {
      const perm = await prisma.permission.findUniqueOrThrow({ where: { key: permKey } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        create: { roleId: role.id, permissionId: perm.id },
        update: {},
      });
    }
  }
  rolesReady = roleIds;
  return roleIds;
}

interface CreateMemberOpts {
  weight?: number;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "EXPIRED";
  isVotingEligible?: boolean;
}

export async function createTestMember(opts: CreateMemberOpts = {}) {
  const roles = await ensureRolesAndPermissions();
  const suffix = randomUUID().slice(0, 8);
  const user = await prisma.user.create({ data: { roleId: roles[ROLE_KEYS.MEMBER], email: `${suffix}@test.local` } });
  const member = await prisma.member.create({
    data: {
      userId: user.id,
      fullName: `عضو اختبار ${suffix}`,
      nationalId: `T${suffix}`,
      phone: `05${suffix.slice(0, 8)}`,
      membershipNumberSystem: `TM-${suffix}`,
      votingWeight: opts.weight ?? 1,
      status: opts.status ?? "ACTIVE",
      isVotingEligible: opts.isVotingEligible ?? true,
    },
  });
  return member;
}

interface CreateVotingOpts {
  isSecret?: boolean;
  isWeighted?: boolean;
  allowVoteChange?: boolean;
  quorumType?: "NONE" | "PERCENTAGE_OF_MEMBERS" | "FIXED_COUNT" | "PERCENTAGE_OF_WEIGHT";
  quorumValue?: number;
  startsInFuture?: boolean;
  alreadyEnded?: boolean;
  questionType?: "DECISION_APPROVAL" | "YES_NO" | "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "ELECTION";
  optionLabels?: string[];
  seatsCount?: number;
  minSelections?: number;
  maxSelections?: number;
}

/** ينشئ تصويتًا مفتوحًا (أو مجدوَلًا/منتهيًا حسب الخيارات) مع Snapshot أهلية لكل عضو مُمرَّر */
export async function createTestVoting(members: { id: string; votingWeight: unknown }[], opts: CreateVotingOpts = {}) {
  const now = new Date();
  const startAt = opts.startsInFuture ? new Date(now.getTime() + 60 * 60 * 1000) : new Date(now.getTime() - 60 * 60 * 1000);
  const endAt = opts.alreadyEnded ? new Date(now.getTime() - 30 * 60 * 1000) : new Date(now.getTime() + 60 * 60 * 1000);
  const status = opts.startsInFuture ? "SCHEDULED" : opts.alreadyEnded ? "CLOSED" : "OPEN";

  const type = opts.questionType ?? "DECISION_APPROVAL";
  const options =
    opts.optionLabels ?? (type === "DECISION_APPROVAL" ? ["موافق", "غير موافق", "ممتنع"] : type === "YES_NO" ? ["نعم", "لا"] : ["خيار 1", "خيار 2", "خيار 3"]);

  const voting = await prisma.voting.create({
    data: {
      title: `تصويت اختبار ${randomUUID().slice(0, 6)}`,
      status,
      startAt,
      endAt,
      openedAt: status !== "SCHEDULED" ? now : undefined,
      closedAt: status === "CLOSED" ? endAt : undefined,
      isSecret: opts.isSecret ?? false,
      isWeighted: opts.isWeighted ?? true,
      allowVoteChange: opts.allowVoteChange ?? false,
      quorumType: opts.quorumType ?? "NONE",
      quorumValue: opts.quorumValue,
      targetType: "ALL",
      questions: {
        create: [
          {
            order: 0,
            type,
            text: "سؤال اختبار",
            seatsCount: opts.seatsCount,
            minSelections: opts.minSelections,
            maxSelections: opts.maxSelections,
            options: { create: options.map((label, idx) => ({ order: idx, label })) },
          },
        ],
      },
    },
    include: { questions: { include: { options: true } } },
  });

  if (status !== "SCHEDULED") {
    for (const m of members) {
      await prisma.votingEligibility.create({
        data: { votingId: voting.id, memberId: m.id, snapshotWeight: m.votingWeight as any, snapshotStatus: "ACTIVE", isEligible: true },
      });
    }
  }

  return voting;
}
