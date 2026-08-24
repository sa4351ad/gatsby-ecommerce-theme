import type { Request, Response } from "express";
import { createVotingSchema, createVotingObjectSchema, castVoteSchema, confirmVoteSchema, ROLE_KEYS } from "@ga/shared";
import * as votingsService from "./votings.service";
import * as lifecycle from "./lifecycle.service";
import * as resultsService from "./results.service";
import * as castingService from "./vote-casting.service";
import * as memberView from "./member-view.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/apiError";

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json(await votingsService.listVotings({ status: req.query.status as string, meetingId: req.query.meetingId as string }));
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  await lifecycle.ensureLifecycleFresh(req.params.id);
  res.json(await votingsService.getVoting(req.params.id));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const input = createVotingSchema.parse(req.body);
  res.status(201).json(await votingsService.createVoting(input, req.auth?.userId));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const input = createVotingObjectSchema.partial().parse(req.body);
  res.json(await votingsService.updateVoting(req.params.id, input, req.auth?.userId));
});

export const publish = asyncHandler(async (req: Request, res: Response) => {
  res.json(await lifecycle.publishVoting(req.params.id, req.auth?.userId));
});

export const open = asyncHandler(async (req: Request, res: Response) => {
  res.json(await lifecycle.openVoting(req.params.id, req.auth?.userId));
});

export const close = asyncHandler(async (req: Request, res: Response) => {
  res.json(await lifecycle.closeVoting(req.params.id, req.auth?.userId));
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  res.json(await lifecycle.cancelVoting(req.params.id, req.auth?.userId));
});

export const validateAnswers = asyncHandler(async (req: Request, res: Response) => {
  const input = castVoteSchema.parse(req.body);
  res.json(await castingService.validateAnswersOnly(req.params.id, input.answers));
});

export const requestConfirmOtp = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth?.memberId) throw new ApiError(403, "هذا الإجراء متاح للأعضاء فقط");
  res.json(await castingService.requestConfirmOtp(req.auth.memberId, req.ip));
});

/** الاعتماد النهائي للتصويت — يجمع بين الإدلاء بالصوت واعتماده في عملية ذرّية واحدة (Section 20) */
export const confirm = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth?.memberId) throw new ApiError(403, "هذا الإجراء متاح للأعضاء فقط");
  const castInput = castVoteSchema.parse(req.body);
  const confirmInput = confirmVoteSchema.parse(req.body);
  const result = await castingService.confirmAndCastVote({
    votingId: req.params.id,
    memberId: req.auth.memberId,
    answers: castInput.answers,
    otpCode: confirmInput.otpCode,
    ip: req.ip,
    userAgent: req.headers["user-agent"] as string,
  });
  res.json(result);
});

export const myStatus = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth?.memberId) throw new ApiError(403, "هذا الإجراء متاح للأعضاء فقط");
  res.json(await castingService.getMyVotingStatus(req.params.id, req.auth.memberId));
});

export const mine = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth?.memberId) throw new ApiError(403, "هذا الإجراء متاح للأعضاء فقط");
  res.json(await memberView.listMyVotings(req.auth.memberId));
});

/** النتائج — تجميعية دومًا للتصويت السري، ولا تُعرض الهوية إلا لـ SUPER_ADMIN عبر مسار مخصّص (Section 28) */
export const results = asyncHandler(async (req: Request, res: Response) => {
  const voting = await votingsService.getVoting(req.params.id);
  if (req.auth?.roleKey === ROLE_KEYS.MEMBER && !voting.resultsVisibleToMembers) {
    throw new ApiError(403, "نتائج هذا التصويت غير متاحة للأعضاء حاليًا");
  }
  if (req.auth?.roleKey === ROLE_KEYS.MEMBER && voting.status !== "CLOSED") {
    throw new ApiError(403, "النتائج تُعرض بعد إغلاق التصويت فقط");
  }
  res.json(await resultsService.computeResults(req.params.id));
});

export const nonVoters = asyncHandler(async (req: Request, res: Response) => {
  res.json(await resultsService.getNonVoters(req.params.id));
});
