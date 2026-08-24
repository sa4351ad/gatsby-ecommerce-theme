import type { Request, Response } from "express";
import { createMeetingSchema, createMeetingObjectSchema } from "@ga/shared";
import * as service from "./meetings.service";
import { asyncHandler } from "../../utils/asyncHandler";

export const list = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await service.listMeetings());
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getMeeting(req.params.id));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const input = createMeetingSchema.parse(req.body);
  res.status(201).json(await service.createMeeting(input, req.auth?.userId));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const input = createMeetingObjectSchema.partial().parse(req.body);
  res.json(await service.updateMeeting(req.params.id, input, req.auth?.userId));
});
