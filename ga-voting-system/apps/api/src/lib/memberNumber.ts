import { prisma } from "@ga/db";
import { MEMBERSHIP_NUMBER_PREFIX } from "@ga/shared";

/** توليد رقم عضوية نظام فريد تلقائيًا: M-000001، M-000002 ... */
export async function generateSystemMembershipNumber(): Promise<string> {
  const total = await prisma.member.count();
  let seq = total + 1;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `${MEMBERSHIP_NUMBER_PREFIX}-${seq.toString().padStart(6, "0")}`;
    const exists = await prisma.member.findUnique({ where: { membershipNumberSystem: candidate } });
    if (!exists) return candidate;
    seq += 1;
  }
  throw new Error("تعذّر توليد رقم عضوية فريد، الرجاء المحاولة مرة أخرى");
}
