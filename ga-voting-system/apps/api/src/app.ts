import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import { env } from "./env";
import { generalApiLimiter } from "./middleware/rateLimit.middleware";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";

import authRoutes from "./modules/auth/auth.routes";
import memberRoutes from "./modules/members/members.routes";
import groupRoutes from "./modules/groups/groups.routes";
import meetingRoutes from "./modules/meetings/meetings.routes";
import votingRoutes from "./modules/votings/votings.routes";
import notificationRoutes from "./modules/notifications/notifications.routes";
import settingsRoutes from "./modules/settings/settings.routes";
import reportRoutes from "./modules/reports/reports.routes";
import auditRoutes from "./modules/audit/audit.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";

export function createApp() {
  const app = express();

  // خلف بروكسي عكسي (Nginx/Load Balancer) عادة عند النشر — لقراءة IP الحقيقي بدقة
  app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: false, // تُدار من جهة apps/web لأنها هي من تخدم الصفحات
      crossOriginResourcePolicy: { policy: "same-site" },
    }),
  );
  app.use(
    cors({
      origin: env.WEB_APP_URL,
      credentials: true,
      exposedHeaders: ["x-request-id"],
    }),
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(generalApiLimiter);

  app.get("/health", (_req, res) => res.json({ status: "ok", time: new Date().toISOString() }));
  // ملفات مرفوعة (صور الأعضاء/المرشحين، مرفقات) — بدون تنفيذ (Express static لا ينفّذ الملفات)
  app.use("/uploads", express.static(path.resolve(env.UPLOAD_DIR)));

  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/members", memberRoutes);
  app.use("/api/v1/groups", groupRoutes);
  app.use("/api/v1/meetings", meetingRoutes);
  app.use("/api/v1/votings", votingRoutes);
  app.use("/api/v1/notifications", notificationRoutes);
  app.use("/api/v1/settings", settingsRoutes);
  app.use("/api/v1/reports", reportRoutes);
  app.use("/api/v1/audit-log", auditRoutes);
  app.use("/api/v1/dashboard", dashboardRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
