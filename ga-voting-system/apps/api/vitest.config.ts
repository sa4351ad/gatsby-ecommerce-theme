import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 20000,
    hookTimeout: 20000,
    fileParallelism: false, // الاختبارات تتشارك قاعدة بيانات واحدة — تشغيل تسلسلي لتفادي التعارض
  },
});
