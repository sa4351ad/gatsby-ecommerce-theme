import { prisma } from "@ga/db";
import { getSettingsCategory } from "../settingsStore";
import { consoleProvider } from "./providers/console.provider";
import { genericHttpProvider } from "./providers/genericHttp.provider";
import type { SmsProvider, SmsProviderConfig } from "./provider.interface";
import { recordAudit, AUDIT_ACTIONS } from "../audit";

const PROVIDERS: Record<string, SmsProvider> = {
  CONSOLE: consoleProvider,
  GENERIC_HTTP: genericHttpProvider,
};

interface SmsSettings extends SmsProviderConfig {
  providerName?: string;
}

async function getActiveProvider(): Promise<{ provider: SmsProvider; config: SmsProviderConfig }> {
  const settings = await getSettingsCategory<SmsSettings>("sms");
  const key = settings.providerName || "CONSOLE";
  const provider = PROVIDERS[key] ?? consoleProvider;
  return { provider, config: settings };
}

interface SendSmsParams {
  to: string;
  message: string;
  relatedMemberId?: string;
  relatedVotingId?: string;
  sentById?: string;
}

export async function sendSms(params: SendSmsParams) {
  const { provider, config } = await getActiveProvider();
  const result = await provider.send(params.to, params.message, config);

  const log = await prisma.smsLog.create({
    data: {
      toPhone: params.to,
      message: params.message,
      provider: provider.key,
      status: result.success ? "SENT" : "FAILED",
      providerResponse: result.providerResponse as any,
      errorMessage: result.errorMessage,
      relatedMemberId: params.relatedMemberId,
      relatedVotingId: params.relatedVotingId,
      sentById: params.sentById,
    },
  });

  await recordAudit({
    userId: params.sentById,
    action: AUDIT_ACTIONS.SMS_SENT,
    entity: "SmsLog",
    entityId: log.id,
    newValue: { to: params.to, status: log.status },
  });

  return { success: result.success, logId: log.id };
}

export async function testSmsSettings(to: string, sentById?: string) {
  return sendSms({
    to,
    message: "هذه رسالة اختبار من نظام إدارة الجمعية العمومية.",
    sentById,
  });
}
