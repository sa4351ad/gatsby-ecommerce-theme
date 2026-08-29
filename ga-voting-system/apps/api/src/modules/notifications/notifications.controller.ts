import type { Request, Response } from "express";
import { z } from "zod";
import * as service from "./notifications.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/apiError";

const broadcastSchema = z.object({
  votingId: z.string(),
  channels: z.array(z.enum(["SMS", "EMAIL", "INTERNAL"])).min(1),
  message: z.string().optional(),
});

export const mine = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "الرجاء تسجيل الدخول");
  const [items, unread] = await Promise.all([service.listMine(req.auth.userId), service.unreadCount(req.auth.userId)]);
  res.json({ items, unread });
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "الرجاء تسجيل الدخول");
  res.json(await service.markRead(req.params.id, req.auth.userId));
});

export const broadcast = asyncHandler(async (req: Request, res: Response) => {
  const input = broadcastSchema.parse(req.body);
  res.json(await service.broadcastVotingNotification({ ...input, sentById: req.auth?.userId }));
});
