import type { Request, Response } from "express";
import { requestOtpSchema, verifyOtpSchema, adminLoginSchema } from "@ga/shared";
import * as authService from "./auth.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "@ga/db";
import { ApiError } from "../../utils/apiError";

export const requestOtp = asyncHandler(async (req: Request, res: Response) => {
  const input = requestOtpSchema.parse(req.body);
  const result = await authService.requestMemberOtp(input.identifier, req.ip, req.headers["user-agent"] as string);
  res.json(result);
});

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const input = verifyOtpSchema.parse(req.body);
  const result = await authService.verifyMemberOtp(
    input.identifier,
    input.code,
    res,
    req.ip,
    req.headers["user-agent"] as string,
  );
  res.json(result);
});

export const adminLogin = asyncHandler(async (req: Request, res: Response) => {
  const input = adminLoginSchema.parse(req.body);
  const result = await authService.adminLogin(input.email, input.password, res, req.ip, req.headers["user-agent"] as string);
  res.json(result);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.ga_refresh;
  if (!token) throw new ApiError(401, "الرجاء تسجيل الدخول");
  await authService.refreshSession(token, res, req.ip, req.headers["user-agent"] as string);
  res.json({ message: "تم تجديد الجلسة" });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  await authService.logout(req.auth?.userId, req.cookies?.ga_refresh, res);
  res.json({ message: "تم تسجيل الخروج" });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "الرجاء تسجيل الدخول");
  const user = await prisma.user.findUnique({
    where: { id: req.auth.userId },
    include: { role: true, member: true },
  });
  if (!user) throw new ApiError(401, "الرجاء تسجيل الدخول");
  res.json({
    id: user.id,
    email: user.email,
    role: user.role.key,
    permissions: Array.from(req.auth.permissions),
    member: user.member,
  });
});
