import { z } from "zod";

export const createGroupSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  type: z.string().default("CUSTOM"),
});

export const addGroupMembersSchema = z.object({
  memberIds: z.array(z.string()).min(1),
});

export const createMeetingObjectSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  date: z.string().datetime(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  location: z.string().optional(),
  mode: z.enum(["IN_PERSON", "ONLINE", "HYBRID"]).default("IN_PERSON"),
  inviteeMemberIds: z.array(z.string()).optional(),
  inviteAllMembers: z.boolean().default(false),
});

export const createMeetingSchema = createMeetingObjectSchema.superRefine((m, ctx) => {
    if (new Date(m.endTime) <= new Date(m.startTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "وقت نهاية الاجتماع يجب أن يكون بعد وقت البداية",
        path: ["endTime"],
      });
    }
  });

export const smsSettingsSchema = z.object({
  providerName: z.string().min(1),
  apiUrl: z.string().url().optional().or(z.literal("")),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  senderName: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  extra: z.record(z.string()).optional(),
});

export const emailSettingsSchema = z.object({
  smtpHost: z.string().min(1),
  smtpPort: z.number().int().min(1).max(65535),
  username: z.string().optional(),
  password: z.string().optional(),
  encryption: z.enum(["NONE", "SSL", "TLS"]).default("TLS"),
  fromName: z.string().min(1),
  fromEmail: z.string().email(),
});

export const generalSettingsSchema = z.object({
  systemName: z.string().min(1),
  logoUrl: z.string().optional(),
  timezone: z.string().default("Asia/Riyadh"),
  defaultLanguage: z.enum(["ar", "en"]).default("ar"),
});

export const securitySettingsSchema = z.object({
  sessionTimeoutMinutes: z.number().int().min(5).max(1440),
  otpTtlSeconds: z.number().int().min(60).max(1800),
  otpMaxAttempts: z.number().int().min(3).max(10),
  otpResendCooldownSeconds: z.number().int().min(30).max(600),
  loginMaxAttempts: z.number().int().min(3).max(20),
  requireOtpOnVoteConfirmation: z.boolean().default(false),
});

export const votingSettingsSchema = z.object({
  allowVoteChangeDefault: z.boolean().default(false),
  defaultQuorumType: z
    .enum(["NONE", "PERCENTAGE_OF_MEMBERS", "FIXED_COUNT", "PERCENTAGE_OF_WEIGHT"])
    .default("NONE"),
  defaultQuorumValue: z.number().optional(),
  weightedVotingEnabled: z.boolean().default(true),
  secretVotingEnabled: z.boolean().default(true),
});
