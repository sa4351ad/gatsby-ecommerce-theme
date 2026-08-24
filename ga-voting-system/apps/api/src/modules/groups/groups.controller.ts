import type { Request, Response } from "express";
import { createGroupSchema, addGroupMembersSchema } from "@ga/shared";
import * as service from "./groups.service";
import { asyncHandler } from "../../utils/asyncHandler";

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.listGroups(req.query.search as string));
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getGroup(req.params.id));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const input = createGroupSchema.parse(req.body);
  res.status(201).json(await service.createGroup(input, req.auth?.userId));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const input = createGroupSchema.partial().parse(req.body);
  res.json(await service.updateGroup(req.params.id, input, req.auth?.userId));
});

export const addMembers = asyncHandler(async (req: Request, res: Response) => {
  const input = addGroupMembersSchema.parse(req.body);
  res.json(await service.addMembers(req.params.id, input.memberIds, req.auth?.userId));
});

export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  await service.removeMember(req.params.id, req.params.memberId);
  res.json({ message: "تمت الإزالة" });
});
