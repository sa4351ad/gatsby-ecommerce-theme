import cron from "node-cron";
import { prisma } from "@ga/db";
import { autoTransition } from "../modules/votings/lifecycle.service";

/**
 * يعمل كل دقيقة: يفتح التصويتات المجدوَلة التي حان وقتها، ويغلق التصويتات
 * المفتوحة التي انتهى وقتها — بدون انتظار زيارة أي مستخدم للصفحة (Section 19).
 */
export function registerVotingLifecycleJob() {
  cron.schedule("* * * * *", async () => {
    try {
      const candidates = await prisma.voting.findMany({
        where: { status: { in: ["SCHEDULED", "OPEN"] } },
      });
      for (const voting of candidates) {
        await autoTransition(voting);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[voting-lifecycle-job] فشل:", err);
    }
  });
}
