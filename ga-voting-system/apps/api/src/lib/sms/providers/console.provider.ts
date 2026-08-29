import type { SmsProvider } from "../provider.interface";

/** مزود افتراضي للتطوير/الاختبار — يطبع الرسالة في السجلات بدل إرسالها فعليًا */
export const consoleProvider: SmsProvider = {
  key: "CONSOLE",
  async send(to, message) {
    // eslint-disable-next-line no-console
    console.log(`[SMS:CONSOLE] → ${to}: ${message}`);
    return { success: true, providerResponse: { simulated: true } };
  },
};
