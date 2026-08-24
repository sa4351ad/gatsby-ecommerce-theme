/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, ROLE_KEYS } from "@ga/shared";

const prisma = new PrismaClient();

async function seedRolesAndPermissions() {
  console.log("→ إنشاء الصلاحيات والأدوار...");
  for (const key of Object.values(PERMISSIONS)) {
    await prisma.permission.upsert({
      where: { key },
      create: { key, group: key.split(".")[0] },
      update: {},
    });
  }

  const roleIds: Record<string, string> = {};
  for (const roleKey of Object.values(ROLE_KEYS)) {
    const role = await prisma.role.upsert({
      where: { key: roleKey },
      create: { key: roleKey, name: roleKey, isSystem: true },
      update: {},
    });
    roleIds[roleKey] = role.id;

    const perms = DEFAULT_ROLE_PERMISSIONS[roleKey];
    for (const permKey of perms) {
      const perm = await prisma.permission.findUniqueOrThrow({ where: { key: permKey } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        create: { roleId: role.id, permissionId: perm.id },
        update: {},
      });
    }
  }
  return roleIds;
}

async function seedSettings() {
  console.log("→ إعدادات النظام الافتراضية...");
  const settings: Array<{ category: string; key: string; value: any }> = [
    { category: "general", key: "systemName", value: "نظام الجمعية العمومية" },
    { category: "general", key: "timezone", value: "Asia/Riyadh" },
    { category: "general", key: "defaultLanguage", value: "ar" },
    { category: "security", key: "sessionTimeoutMinutes", value: 60 },
    { category: "security", key: "otpTtlSeconds", value: 300 },
    { category: "security", key: "otpMaxAttempts", value: 5 },
    { category: "security", key: "otpResendCooldownSeconds", value: 60 },
    { category: "security", key: "loginMaxAttempts", value: 8 },
    { category: "security", key: "requireOtpOnVoteConfirmation", value: false },
    { category: "voting", key: "allowVoteChangeDefault", value: false },
    { category: "voting", key: "weightedVotingEnabled", value: true },
    { category: "voting", key: "secretVotingEnabled", value: true },
    // مزود CONSOLE يطبع رمز OTP في سجلات الخادم — مناسب للتجربة المحلية بدون بوابة SMS حقيقية
    { category: "sms", key: "providerName", value: "CONSOLE" },
  ];
  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { category_key: { category: s.category, key: s.key } },
      create: s,
      update: { value: s.value },
    });
  }
}

async function createAdminUser(email: string, password: string, roleId: string) {
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.upsert({
    where: { email },
    create: { email, passwordHash, roleId, isActive: true },
    update: { passwordHash, roleId },
  });
}

let memberSeq = 1;
async function createMember(roleId: string, opts: { fullName: string; phone: string; nationalId: string; weight: number; email?: string }) {
  const membershipNumberSystem = `M-${String(memberSeq).padStart(6, "0")}`;
  memberSeq += 1;
  const user = await prisma.user.upsert({
    where: { email: opts.email ?? `${opts.phone}@placeholder.local` },
    create: { email: opts.email ?? `${opts.phone}@placeholder.local`, roleId, isActive: true },
    update: { roleId },
  });
  return prisma.member.upsert({
    where: { nationalId: opts.nationalId },
    create: {
      userId: user.id,
      fullName: opts.fullName,
      nationalId: opts.nationalId,
      phone: opts.phone,
      email: opts.email,
      membershipNumberReal: `REAL-${memberSeq}`,
      membershipNumberSystem,
      votingWeight: opts.weight,
      status: "ACTIVE",
      isVotingEligible: true,
    },
    update: { votingWeight: opts.weight },
  });
}

async function main() {
  const roleIds = await seedRolesAndPermissions();
  await seedSettings();

  console.log("→ حسابات المدراء...");
  await createAdminUser("superadmin@example.com", "SuperAdmin@123", roleIds[ROLE_KEYS.SUPER_ADMIN]);
  await createAdminUser("sysadmin@example.com", "SysAdmin@123", roleIds[ROLE_KEYS.SYSTEM_ADMIN]);
  await createAdminUser("votingmanager@example.com", "VotingMgr@123", roleIds[ROLE_KEYS.VOTING_MANAGER]);

  console.log("→ الأعضاء التجريبيون...");
  const memberRoleId = roleIds[ROLE_KEYS.MEMBER];
  const members = await Promise.all([
    createMember(memberRoleId, { fullName: "أحمد سالم القحطاني", phone: "0501111111", nationalId: "1000000001", weight: 1, email: "member1@example.com" }),
    createMember(memberRoleId, { fullName: "منى عبدالله الحربي", phone: "0501111112", nationalId: "1000000002", weight: 1, email: "member2@example.com" }),
    createMember(memberRoleId, { fullName: "خالد إبراهيم العتيبي", phone: "0501111113", nationalId: "1000000003", weight: 5, email: "member3@example.com" }),
    createMember(memberRoleId, { fullName: "سارة محمد الدوسري", phone: "0501111114", nationalId: "1000000004", weight: 5, email: "member4@example.com" }),
    createMember(memberRoleId, { fullName: "فيصل ناصر المطيري", phone: "0501111115", nationalId: "1000000005", weight: 10, email: "member5@example.com" }),
    createMember(memberRoleId, { fullName: "نورة سعد الشمري", phone: "0501111116", nationalId: "1000000006", weight: 1, email: "member6@example.com" }),
    createMember(memberRoleId, { fullName: "عبدالعزيز فهد الغامدي", phone: "0501111117", nationalId: "1000000007", weight: 1, email: "member7@example.com" }),
    createMember(memberRoleId, { fullName: "ريم علي الزهراني", phone: "0501111118", nationalId: "1000000008", weight: 1, email: "member8@example.com" }),
  ]);

  console.log("→ مجموعة مجلس الإدارة...");
  const board = await prisma.group.upsert({
    where: { id: "seed-board-group" },
    create: { id: "seed-board-group", name: "مجلس الإدارة", type: "BOARD", description: "أعضاء مجلس إدارة الجمعية" },
    update: {},
  });
  await prisma.groupMember.createMany({
    data: members.slice(0, 4).map((m) => ({ groupId: board.id, memberId: m.id })),
    skipDuplicates: true,
  });

  console.log("→ اجتماع الجمعية العمومية...");
  const meeting = await prisma.meeting.upsert({
    where: { id: "seed-meeting-1" },
    create: {
      id: "seed-meeting-1",
      title: "اجتماع الجمعية العمومية العادي 2026",
      description: "الاجتماع السنوي لمناقشة تقرير مجلس الإدارة والميزانية",
      date: new Date(),
      startTime: new Date(),
      endTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
      mode: "HYBRID",
      status: "ONGOING",
      invitees: { create: members.map((m) => ({ memberId: m.id })) },
    },
    update: {},
  });

  const now = new Date();
  const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // ---------------------------------------------------------------------
  // تصويت 1: قرار موزون (Weighted Decision) — مفتوح الآن
  // ---------------------------------------------------------------------
  console.log("→ تصويت القرار (موزون)...");
  const decisionVoting = await prisma.voting.upsert({
    where: { id: "seed-voting-decision" },
    create: {
      id: "seed-voting-decision",
      meetingId: meeting.id,
      title: "قرار اعتماد الميزانية السنوية 2026",
      description: "التصويت على اعتماد الميزانية السنوية المقترحة من مجلس الإدارة",
      legalText: "وفقًا للنظام الأساسي للجمعية، يتطلب اعتماد الميزانية موافقة أغلبية الأعضاء المشاركين.",
      kind: "STANDARD",
      status: "OPEN",
      startAt: oneHourAgo,
      endAt: inTwoDays,
      openedAt: now,
      isSecret: false,
      isWeighted: true,
      allowVoteChange: true,
      quorumType: "PERCENTAGE_OF_MEMBERS",
      quorumValue: 50,
      targetType: "ALL",
      questions: {
        create: [
          {
            order: 0,
            type: "DECISION_APPROVAL",
            text: "هل توافق على اعتماد الميزانية السنوية 2026؟",
            options: { create: [{ order: 0, label: "موافق" }, { order: 1, label: "غير موافق" }, { order: 2, label: "ممتنع" }] },
          },
        ],
      },
    },
    update: {},
    include: { questions: true },
  });

  for (const m of members) {
    await prisma.votingEligibility.upsert({
      where: { votingId_memberId: { votingId: decisionVoting.id, memberId: m.id } },
      create: { votingId: decisionVoting.id, memberId: m.id, snapshotWeight: m.votingWeight, snapshotStatus: "ACTIVE", isEligible: true },
      update: {},
    });
  }

  // ---------------------------------------------------------------------
  // تصويت 2: انتخابات (3 مقاعد من 5 مرشحين) — مفتوح الآن
  // ---------------------------------------------------------------------
  console.log("→ تصويت الانتخابات...");
  const electionVoting = await prisma.voting.upsert({
    where: { id: "seed-voting-election" },
    create: {
      id: "seed-voting-election",
      meetingId: meeting.id,
      title: "انتخاب أعضاء مجلس الإدارة الجديد",
      description: "انتخاب 3 أعضاء لعضوية مجلس الإدارة من بين 5 مرشحين",
      kind: "ELECTION",
      status: "OPEN",
      startAt: oneHourAgo,
      endAt: inTwoDays,
      openedAt: now,
      isSecret: false,
      isWeighted: true,
      allowVoteChange: false,
      quorumType: "NONE",
      targetType: "ALL",
      questions: {
        create: [
          {
            order: 0,
            type: "ELECTION",
            text: "اختر 3 مرشحين لعضوية مجلس الإدارة",
            seatsCount: 3,
            minSelections: 1,
            maxSelections: 3,
            options: {
              create: [
                { order: 0, label: "عبدالرحمن الشهري", candidate: { create: { bio: "خبرة 10 سنوات في الإدارة المالية" } } },
                { order: 1, label: "هند القرني", candidate: { create: { bio: "عضو مجلس إدارة سابق" } } },
                { order: 2, label: "تركي العنزي", candidate: { create: { bio: "مستشار قانوني" } } },
                { order: 3, label: "لمياء العسيري", candidate: { create: { bio: "خبيرة في التسويق" } } },
                { order: 4, label: "بندر الرشيدي", candidate: { create: { bio: "رائد أعمال" } } },
              ],
            },
          },
        ],
      },
    },
    update: {},
  });

  for (const m of members) {
    await prisma.votingEligibility.upsert({
      where: { votingId_memberId: { votingId: electionVoting.id, memberId: m.id } },
      create: { votingId: electionVoting.id, memberId: m.id, snapshotWeight: m.votingWeight, snapshotStatus: "ACTIVE", isEligible: true },
      update: {},
    });
  }

  // ---------------------------------------------------------------------
  // تصويت 3: سري (نعم/لا) — مفتوح الآن
  // ---------------------------------------------------------------------
  console.log("→ تصويت سري...");
  const secretVoting = await prisma.voting.upsert({
    where: { id: "seed-voting-secret" },
    create: {
      id: "seed-voting-secret",
      title: "استطلاع سري: هل توافق على تعديل النظام الأساسي؟",
      description: "تصويت سري تجريبي لا يُكشف فيه اختيار العضو لأي طرف إداري",
      kind: "STANDARD",
      status: "OPEN",
      startAt: oneHourAgo,
      endAt: inTwoDays,
      openedAt: now,
      isSecret: true,
      isWeighted: false,
      allowVoteChange: false,
      quorumType: "NONE",
      targetType: "ALL",
      questions: {
        create: [{ order: 0, type: "YES_NO", text: "هل توافق على تعديل النظام الأساسي؟", options: { create: [{ order: 0, label: "نعم" }, { order: 1, label: "لا" }] } }],
      },
    },
    update: {},
  });

  for (const m of members) {
    await prisma.votingEligibility.upsert({
      where: { votingId_memberId: { votingId: secretVoting.id, memberId: m.id } },
      create: { votingId: secretVoting.id, memberId: m.id, snapshotWeight: m.votingWeight, snapshotStatus: "ACTIVE", isEligible: true },
      update: {},
    });
  }

  console.log("✅ اكتمل تعبئة البيانات التجريبية بنجاح");
  console.log("");
  console.log("بيانات الدخول التجريبية:");
  console.log("  Super Admin:     superadmin@example.com / SuperAdmin@123");
  console.log("  System Admin:    sysadmin@example.com / SysAdmin@123");
  console.log("  Voting Manager:  votingmanager@example.com / VotingMgr@123");
  console.log("  عضو (OTP):       رقم الهوية 1000000001 أو رقم العضوية M-000001 (يُطبع رمز OTP في سجلات الخادم)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
