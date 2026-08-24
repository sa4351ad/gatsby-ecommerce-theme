import { createApp } from "./app";
import { env } from "./env";
import { registerCronJobs } from "./jobs";

const app = createApp();

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`✅ API listening on port ${env.PORT} [${env.NODE_ENV}]`);
  registerCronJobs();
});
