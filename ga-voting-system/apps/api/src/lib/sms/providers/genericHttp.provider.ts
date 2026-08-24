import type { SmsProvider } from "../provider.interface";

/**
 * مزود HTTP عام قابل للإعداد لأي بوابة SMS تقبل POST JSON.
 * يغطي غالبية المزودين المحليين بضبط `apiUrl` وحقول الاعتماد من لوحة التحكم.
 * لإضافة مزود بصيغة مختلفة تمامًا: أنشئ ملفًا جديدًا ينفّذ SmsProvider.
 */
export const genericHttpProvider: SmsProvider = {
  key: "GENERIC_HTTP",
  async send(to, message, config) {
    if (!config.apiUrl) {
      return { success: false, errorMessage: "لم يتم ضبط رابط API لمزود الرسائل" };
    }
    try {
      const res = await fetch(config.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          to,
          message,
          sender: config.senderName,
          username: config.username,
          password: config.password,
          apiSecret: config.apiSecret,
          ...(config.extra ?? {}),
        }),
      });
      const body = await res.text();
      if (!res.ok) {
        return { success: false, errorMessage: `فشل الإرسال (${res.status})`, providerResponse: body };
      }
      return { success: true, providerResponse: body };
    } catch (err) {
      return { success: false, errorMessage: (err as Error).message };
    }
  },
};
