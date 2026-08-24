import type { Request, Response } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { createMemberSchema, updateMemberSchema } from "@ga/shared";
import * as service from "./members.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { assertRealFileType, optimizeAvatarImage } from "../../lib/upload";
import { FILE_UPLOAD_LIMITS } from "@ga/shared";
import { ApiError } from "../../utils/apiError";
import { env } from "../../env";
import { prisma } from "@ga/db";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { search, status, groupId, isVotingEligible, createdFrom, createdTo, page, pageSize } = req.query;
  const result = await service.listMembers({
    search: search as string,
    status: status as string,
    groupId: groupId as string,
    isVotingEligible: isVotingEligible === undefined ? undefined : isVotingEligible === "true",
    createdFrom: createdFrom as string,
    createdTo: createdTo as string,
    page: page ? Number(page) : undefined,
    pageSize: pageSize ? Number(pageSize) : undefined,
  });
  res.json(result);
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const member = await service.getMember(req.params.id);
  res.json(member);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const input = createMemberSchema.parse(req.body);
  const member = await service.createMember(input, req.auth?.userId);
  res.status(201).json(member);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const input = updateMemberSchema.parse(req.body);
  const member = await service.updateMember(req.params.id, input, req.auth?.userId);
  res.json(member);
});

export const disable = asyncHandler(async (req: Request, res: Response) => {
  await service.disableMember(req.params.id, req.auth?.userId);
  res.json({ message: "تم تعطيل عضوية العضو" });
});

export const uploadAvatar = asyncHandler(async (req: Request, res: Response) => {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) throw new ApiError(400, "لم يتم إرفاق أي صورة");
  await assertRealFileType(file.buffer, FILE_UPLOAD_LIMITS.ALLOWED_IMAGE_MIME);
  const optimized = await optimizeAvatarImage(file.buffer);

  const dir = path.resolve(env.UPLOAD_DIR, "avatars");
  await fs.mkdir(dir, { recursive: true });
  const fileName = `${req.params.id}-${Date.now()}.jpg`;
  await fs.writeFile(path.join(dir, fileName), optimized);

  const avatarUrl = `/uploads/avatars/${fileName}`;
  await prisma.member.update({ where: { id: req.params.id }, data: { avatarUrl } });
  res.json({ avatarUrl });
});

export const previewImport = asyncHandler(async (req: Request, res: Response) => {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) throw new ApiError(400, "لم يتم إرفاق ملف Excel");
  await assertRealFileType(file.buffer, FILE_UPLOAD_LIMITS.ALLOWED_EXCEL_MIME);
  const result = await service.previewImport(file.buffer, file.originalname, req.auth?.userId);
  res.json(result);
});

export const commitImport = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.commitImport(req.body.jobId, req.auth?.userId);
  res.json(result);
});

export const importErrorsReport = asyncHandler(async (req: Request, res: Response) => {
  const errors = await service.getImportErrorsReport(req.params.jobId);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="import-errors-${req.params.jobId}.csv"`);
  const header = "رقم الصف,الخطأ,البيانات\n";
  const rows = errors
    .map((e) => `${e.rowNumber},"${e.errorMessage.replace(/"/g, '""')}","${JSON.stringify(e.rawDataJson).replace(/"/g, '""')}"`)
    .join("\n");
  res.send(`﻿${header}${rows}`);
});
