/**
 * واجهة مزود الرسائل القصيرة — تسمح بإضافة مزودين جدد دون تعديل باقي النظام
 * (Section 7): فقط أضف ملفًا جديدًا ينفّذ هذه الواجهة وسجّله في `sms.service.ts`.
 */
export interface SmsSendResult {
  success: boolean;
  providerResponse?: unknown;
  errorMessage?: string;
}

export interface SmsProviderConfig {
  apiUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  senderName?: string;
  username?: string;
  password?: string;
  extra?: Record<string, string>;
}

export interface SmsProvider {
  key: string;
  send(to: string, message: string, config: SmsProviderConfig): Promise<SmsSendResult>;
}
