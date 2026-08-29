import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError } from "../utils/apiError";
import { isProd } from "../env";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ message: "المسار غير موجود" });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(422).json({
      message: "بيانات غير صحيحة",
      errors: err.flatten().fieldErrors,
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ message: err.message, details: err.details });
  }

  // eslint-disable-next-line no-console
  console.error(err);
  return res.status(500).json({
    message: "حدث خطأ غير متوقع في الخادم",
    ...(isProd ? {} : { stack: (err as Error)?.stack }),
  });
}
