import { prisma } from "@ga/db";
import type { CastVoteInput } from "@ga/shared";
import { ApiError } from "../../utils/apiError";
import { recordAudit, AUDIT_ACTIONS } from "../../lib/audit";
import { getQuestionStrategy } from "./question-types";
import { computeVoteHash, computeVoterToken, generateVoteReferenceNumber } from "../../lib/voteIntegrity";
import { ensureLifecycleFresh } from "./lifecycle.service";
import { issueOtp, verifyOtp } from "../../lib/otp";
import { sendSms } from "../../lib/sms/sms.service";
import { getSettingsCategory } from "../../lib/settingsStore";

interface SecuritySettings {
  requireOtpOnVoteConfirmation?: boolean;
}

interface CastContext {
  votingId: string;
  memberId: string;
  answers: CastVoteInput["answers"];
  otpCode?: string;
  ip?: string;
  userAgent?: string;
}

/** تحقق بنيوي فوري من الإجابات (بدون كتابة أي شيء) — لعرض أخطاء فورية في واجهة المراجعة */
export async function validateAnswersOnly(votingId: string, answers: CastVoteInput["answers"]) {
  const voting = await prisma.voting.findUnique({
    where: { id: votingId },
    include: { questions: { include: { options: true } } },
  });
  if (!voting) throw new ApiError(404, "التصويت غير موجود");

  for (const question of voting.questions) {
    const answer = answers.find((a) => a.questionId === question.id);
    if (!answer) throw new ApiError(422, `الإجابة على السؤال "${question.text}" مطلوبة`);
    getQuestionStrategy(question.type).validateAnswer(question, answer);
  }
  return { valid: true };
}

/** إن كان النظام يشترط OTP إضافي عند الاعتماد (Section 20/48) */
export async function requestConfirmOtp(memberId: string, ip?: string) {
  const security = await getSettingsCategory<SecuritySettings>("security");
  if (!security.requireOtpOnVoteConfirmation) {
    return { required: false };
  }
  const member = await prisma.member.findUniqueOrThrow({ where: { id: memberId } });
  const { code } = await issueOtp({ purpose: "VOTE_CONFIRMATION", channel: "SMS", identifier: member.phone, userId: member.userId, requestIp: ip });
  await sendSms({ to: member.phone, message: `رمز اعتماد التصويت: ${code}`, relatedMemberId: memberId });
  return { required: true, message: "تم إرسال رمز تحقق لاعتماد التصويت" };
}

/**
 * القلب الأمني للنظام: خط أنابيب إلزامي بالترتيب (Section 47/50):
 * Authentication (قبل هذا الاستدعاء) → Authorization (Middleware) → Eligibility →
 * Voting Status → Time Validation → Duplicate Check → Question Rules →
 * Vote Creation → Confirmation → Integrity Hash → Audit Log.
 * كل شيء داخل معاملة قاعدة بيانات واحدة (Atomicity).
 */
export async function confirmAndCastVote(ctx: CastContext) {
  // تحديث دفاعي لحالة التصويت أولًا (في حال لم يمرّ الـ Cron بعد على لحظة الفتح/الإغلاق بالضبط)
  await ensureLifecycleFresh(ctx.votingId);

  const security = await getSettingsCategory<SecuritySettings>("security");
  if (security.requireOtpOnVoteConfirmation) {
    if (!ctx.otpCode) throw new ApiError(400, "رمز التحقق مطلوب لاعتماد التصويت");
    const member = await prisma.member.findUniqueOrThrow({ where: { id: ctx.memberId } });
    await verifyOtp({ purpose: "VOTE_CONFIRMATION", identifier: member.phone, code: ctx.otpCode });
  }

  const result = await prisma.$transaction(async (tx) => {
    const voting = await tx.voting.findUnique({
      where: { id: ctx.votingId },
      include: { questions: { include: { options: true } } },
    });
    if (!voting) throw new ApiError(404, "التصويت غير موجود");

    // العضو — حالة حيّة محدَّثة داخل المعاملة نفسها
    const member = await tx.member.findUnique({ where: { id: ctx.memberId } });
    if (!member || member.deletedAt || member.status !== "ACTIVE") {
      throw new ApiError(403, "لا يمكنك التصويت — حالة عضويتك غير نشطة حاليًا");
    }

    // الأهلية (Snapshot لحظة الفتح فقط — Section 37)
    const eligibility = await tx.votingEligibility.findUnique({
      where: { votingId_memberId: { votingId: ctx.votingId, memberId: ctx.memberId } },
    });
    if (!eligibility || !eligibility.isEligible) {
      await recordAudit({ userId: member.userId, action: AUDIT_ACTIONS.VOTE_REJECTED_NOT_ELIGIBLE, entity: "Voting", entityId: ctx.votingId, req: undefined });
      throw new ApiError(403, "أنت غير مؤهل للتصويت في هذا التصويت");
    }

    // حالة التصويت + النافذة الزمنية — الخادم هو المصدر الوحيد للحقيقة (Section 19/47)، بتوقيت Asia/Riyadh افتراضيًا
    const now = new Date();
    if (voting.status !== "OPEN") {
      throw new ApiError(403, "هذا التصويت غير مفتوح حاليًا");
    }
    if (now < voting.startAt || now > voting.endAt) {
      await recordAudit({ userId: member.userId, action: AUDIT_ACTIONS.VOTE_REJECTED_TIME, entity: "Voting", entityId: ctx.votingId });
      throw new ApiError(403, "خارج الفترة الزمنية المسموح بها للتصويت");
    }

    // منع التصويت المكرر — على مستوى قاعدة البيانات (Unique Constraint)، وليس فقط منطق التطبيق (Section 18)
    const existingParticipation = await tx.voteParticipation.findUnique({
      where: { votingId_memberId: { votingId: ctx.votingId, memberId: ctx.memberId } },
    });

    if (existingParticipation && !voting.allowVoteChange) {
      await recordAudit({ userId: member.userId, action: AUDIT_ACTIONS.VOTE_REJECTED_DUPLICATE, entity: "Voting", entityId: ctx.votingId });
      throw new ApiError(409, "لقد قمت بالتصويت واعتماده مسبقًا في هذا التصويت");
    }
    if (existingParticipation && voting.allowVoteChange) {
      const activeConfirmation = await tx.voteConfirmation.findFirst({
        where: { votingId: ctx.votingId, memberId: ctx.memberId, supersededAt: null },
      });
      if (!activeConfirmation) {
        // حالة غير متوقعة (مشاركة بلا اعتماد نشط) — نمنع لأسباب أمنية بدل الافتراض
        throw new ApiError(409, "تعذّر تحديد حالة تصويتك السابقة، الرجاء التواصل مع إدارة الجمعية");
      }
    }
    if (!existingParticipation) {
      // إما إنشاء جديد ينجح ذرّيًا، أو يفشل بتعارض DB إن حدث تسابق طلبات (Race Condition) من نفس العضو
      try {
        await tx.voteParticipation.create({ data: { votingId: ctx.votingId, memberId: ctx.memberId } });
      } catch {
        throw new ApiError(409, "لقد قمت بالتصويت مسبقًا في هذا التصويت");
      }
    }

    // قواعد كل سؤال (Strategy Pattern قابل للتوسع)
    for (const question of voting.questions) {
      const answer = ctx.answers.find((a) => a.questionId === question.id);
      if (!answer) throw new ApiError(422, `الإجابة على السؤال "${question.text}" مطلوبة`);
      getQuestionStrategy(question.type).validateAnswer(question, answer);
    }

    // إن كانت هذه جولة تغيير لصوت سابق: استبعاد الجولة السابقة من الاحتساب دون حذفها (Append-only, Section 38)
    if (existingParticipation && voting.allowVoteChange) {
      const voterToken = computeVoterToken(ctx.votingId, ctx.memberId);
      await tx.vote.updateMany({
        where: { votingId: ctx.votingId, voterToken, supersededAt: null },
        data: { supersededAt: now },
      });
      await tx.voteConfirmation.updateMany({
        where: { votingId: ctx.votingId, memberId: ctx.memberId, supersededAt: null },
        data: { supersededAt: now },
      });
    }

    const voterToken = computeVoterToken(ctx.votingId, ctx.memberId);
    for (const question of voting.questions) {
      const answer = ctx.answers.find((a) => a.questionId === question.id)!;
      await tx.vote.create({
        data: {
          votingId: ctx.votingId,
          questionId: question.id,
          memberId: voting.isSecret ? null : ctx.memberId,
          voterToken,
          selectedOptionIds: answer.selectedOptionIds ?? [],
          rankingJson: answer.rankingOptionIds ?? undefined,
          ratingValue: answer.ratingValue,
          percentageValue: answer.percentageValue,
          textValue: answer.textValue,
          weightAtVote: eligibility.snapshotWeight,
        },
      });
    }

    const referenceNumber = await generateVoteReferenceNumber(tx);
    const confirmedAt = new Date();
    const hash = computeVoteHash({
      memberId: ctx.memberId,
      votingId: ctx.votingId,
      answers: ctx.answers.map((a) => ({
        questionId: a.questionId,
        selectedOptionIds: a.selectedOptionIds ?? [],
        rankingOptionIds: a.rankingOptionIds,
        ratingValue: a.ratingValue,
        percentageValue: a.percentageValue,
        textValue: a.textValue,
      })),
      confirmedAt,
    });

    const confirmation = await tx.voteConfirmation.create({
      data: {
        votingId: ctx.votingId,
        memberId: ctx.memberId,
        referenceNumber,
        confirmedAt,
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
        otpVerified: Boolean(security.requireOtpOnVoteConfirmation),
        signature: {
          create: {
            hash,
            payloadSummaryJson: { votingId: ctx.votingId, questionsCount: voting.questions.length, confirmedAt: confirmedAt.toISOString() },
          },
        },
      },
    });

    return { referenceNumber, confirmedAt, votingTitle: voting.title, memberUserId: member.userId };
  });

  await recordAudit({ userId: result.memberUserId, action: AUDIT_ACTIONS.VOTE_CAST, entity: "Voting", entityId: ctx.votingId, req: undefined });
  await recordAudit({
    userId: result.memberUserId,
    action: AUDIT_ACTIONS.VOTE_CONFIRMED,
    entity: "VoteConfirmation",
    entityId: result.referenceNumber,
    newValue: { votingId: ctx.votingId, referenceNumber: result.referenceNumber },
  });

  await prisma.notification.create({
    data: {
      userId: result.memberUserId,
      type: "VOTE_CONFIRMED",
      title: "تم اعتماد تصويتك",
      body: `تم اعتماد تصويتك في "${result.votingTitle}" بنجاح. الرقم المرجعي: ${result.referenceNumber}`,
      relatedVotingId: ctx.votingId,
    },
  });

  return result;
}

export async function getMyVotingStatus(votingId: string, memberId: string) {
  const [eligibility, confirmation] = await Promise.all([
    prisma.votingEligibility.findUnique({ where: { votingId_memberId: { votingId, memberId } } }),
    prisma.voteConfirmation.findFirst({ where: { votingId, memberId, supersededAt: null } }),
  ]);
  return {
    isEligible: Boolean(eligibility?.isEligible),
    hasVoted: Boolean(confirmation),
    referenceNumber: confirmation?.referenceNumber,
    confirmedAt: confirmation?.confirmedAt,
  };
}
