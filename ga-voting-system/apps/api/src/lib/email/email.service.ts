import nodemailer from "nodemailer";
import { prisma } from "@ga/db";
import { getSettingsCategory } from "../settingsStore";
import { recordAudit, AUDIT_ACTIONS } from "../audit";

interface EmailSettings {
  smtpHost?: string;
  smtpPort?: number;
  username?: string;
  password?: string;
  encryption?: "NONE" | "SSL" | "TLS";
  fromName?: string;
  fromEmail?: string;
}

async function getTransporter() {
  const settings = await getSettingsCategory<EmailSettings>("email");
  if (!settings.smtpHost) {
    throw new Error("لم يتم إعداد خادم البريد الإلكتروني (SMTP) بعد");
  }
  const transporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort ?? 587,
    secure: settings.encryption === "SSL",
    auth: settings.username ? { user: settings.username, pass: settings.password } : undefined,
  });
  return { transporter, settings };
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  relatedMemberId?: string;
  relatedVotingId?: string;
  sentById?: string;
}

export async function sendEmail(params: SendEmailParams) {
  let status: "SENT" | "FAILED" = "SENT";
  let errorMessage: string | undefined;
  let providerResponse: unknown;

  try {
    const { transporter, settings } = await getTransporter();
    const info = await transporter.sendMail({
      from: `${settings.fromName ?? "General Assembly"} <${settings.fromEmail}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    providerResponse = info;
  } catch (err) {
    status = "FAILED";
    errorMessage = (err as Error).message;
  }

  const log = await prisma.emailLog.create({
    data: {
      toEmail: params.to,
      subject: params.subject,
      body: params.html,
      status,
      providerResponse: providerResponse as any,
      errorMessage,
      relatedMemberId: params.relatedMemberId,
      relatedVotingId: params.relatedVotingId,
      sentById: params.sentById,
    },
  });

  await recordAudit({
    userId: params.sentById,
    action: AUDIT_ACTIONS.EMAIL_SENT,
    entity: "EmailLog",
    entityId: log.id,
    newValue: { to: params.to, status },
  });

  return { success: status === "SENT", logId: log.id, errorMessage };
}

export async function testEmailSettings(to: string, sentById?: string) {
  return sendEmail({
    to,
    subject: "رسالة اختبار",
    html: "<p>هذه رسالة اختبار من نظام إدارة الجمعية العمومية.</p>",
    sentById,
  });
}
