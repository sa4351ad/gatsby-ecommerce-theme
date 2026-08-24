import { prisma } from "@ga/db";
import { encryptSecret, decryptSecret } from "./crypto";

/**
 * طبقة وصول موحّدة لـ system_settings. القيم الحسّاسة (isSecret) تُشفَّر قبل
 * التخزين ولا تُفكّ إلا داخل الخادم عند الاستخدام الفعلي (إرسال SMS/Email)،
 * ولا تُعاد أبدًا كاملة في أي استجابة API — راجع settings.controller.ts.
 */
export async function getSettingsCategory<T = Record<string, unknown>>(
  category: string,
): Promise<T> {
  const rows = await prisma.systemSetting.findMany({ where: { category } });
  const result: Record<string, unknown> = {};
  for (const row of rows) {
    result[row.key] = row.isSecret ? decryptSecret(row.value as string) : row.value;
  }
  return result as T;
}

export async function setSettingsCategory(
  category: string,
  values: Record<string, unknown>,
  secretKeys: string[],
  updatedById?: string,
): Promise<void> {
  await prisma.$transaction(
    Object.entries(values)
      .filter(([, v]) => v !== undefined)
      .map(([key, value]) => {
        const isSecret = secretKeys.includes(key);
        const storedValue = isSecret ? encryptSecret(String(value)) : (value as any);
        return prisma.systemSetting.upsert({
          where: { category_key: { category, key } },
          create: { category, key, value: storedValue, isSecret, updatedById },
          update: { value: storedValue, isSecret, updatedById },
        });
      }),
  );
}
