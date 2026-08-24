import { registerVotingLifecycleJob } from "./votingLifecycle.job";

export function registerCronJobs() {
  registerVotingLifecycleJob();
  // eslint-disable-next-line no-console
  console.log("🕐 تم تفعيل مهام الجدولة (إغلاق/فتح التصويتات تلقائيًا)");
}
