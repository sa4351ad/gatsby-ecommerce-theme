import { prisma } from "@ga/db";
import { sendSms } from "../../lib/sms/sms.service";
import { sendEmail } from "../../lib/email/email.service";
import { resolveTargetMembers } from "../votings/lifecycle.service";
import { ApiError } from "../../utils/apiError";

export async function listMine(userId: string) {
  return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 });
}

export async function markRead(id: string, userId: string) {
  const notif = await prisma.notification.findFirst({ where: { id, userId } });
  if (!notif) throw new ApiError(404, "الإشعار غير موجود");
  return prisma.notification.update({ where: { id }, data: { isRead: true } });
}

export async function unreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

interface BroadcastParams {
  votingId: string;
  channels: Array<"SMS" | "EMAIL" | "INTERNAL">;
  message?: string;
  sentById?: string;
}

const DEFAULT_MESSAGE =
  "لديك تصويت جديد مطلوب منك. يرجى تسجيل الدخول إلى النظام واعتماد تصويتك قبل انتهاء الموعد.";

/** إرسال إشعار للأعضاء المستهدفين بتصويت عبر القنوات المختارة — Section 22 (المحتوى قابل للتعديل) */
export async function broadcastVotingNotification(params: BroadcastParams) {
  const voting = await prisma.voting.findUnique({ where: { id: params.votingId } });
  if (!voting) throw new ApiError(404, "التصويت غير موجود");

  const message = params.message || DEFAULT_MESSAGE;
  const targets =
    voting.status === "OPEN" || voting.status === "CLOSED"
      ? (await prisma.votingEligibility.findMany({ where: { votingId: voting.id, isEligible: true }, include: { member: true } })).map((e) => e.member)
      : await resolveMembersFull(params.votingId);

  let sentCount = 0;
  for (const member of targets) {
    if (params.channels.includes("INTERNAL")) {
      await prisma.notification.create({
        data: {
          userId: member.userId,
          memberId: member.id,
          type: "NEW_VOTING",
          title: voting.title,
          body: message,
          relatedVotingId: voting.id,
        },
      });
    }
    if (params.channels.includes("SMS")) {
      await sendSms({ to: member.phone, message: `${voting.title}: ${message}`, relatedMemberId: member.id, relatedVotingId: voting.id, sentById: params.sentById });
    }
    if (params.channels.includes("EMAIL") && member.email) {
      await sendEmail({
        to: member.email,
        subject: `تصويت جديد: ${voting.title}`,
        html: `<p>${message}</p>`,
        relatedMemberId: member.id,
        relatedVotingId: voting.id,
        sentById: params.sentById,
      });
    }
    sentCount += 1;
  }

  return { sentCount };
}

async function resolveMembersFull(votingId: string) {
  const targets = await resolveTargetMembers(votingId);
  return prisma.member.findMany({ where: { id: { in: targets.map((t) => t.id) } } });
}
