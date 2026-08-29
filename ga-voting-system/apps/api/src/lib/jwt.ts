import jwt from "jsonwebtoken";
import { env } from "../env";
import { SESSION_DEFAULTS } from "@ga/shared";

export interface AccessTokenPayload {
  sub: string; // userId
  roleKey: string;
  memberId?: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: `${SESSION_DEFAULTS.ACCESS_TOKEN_TTL_MINUTES}m`,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: `${SESSION_DEFAULTS.REFRESH_TOKEN_TTL_DAYS}d`,
  });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}
