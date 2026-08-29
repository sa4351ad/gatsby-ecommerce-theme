import { z } from "zod";

const saudiPhoneRegex = /^(?:\+?966|0)?5\d{8}$/;

export const createMemberSchema = z.object({
  fullName: z.string().min(3, "الاسم الكامل مطلوب"),
  nationalId: z.string().min(5, "رقم الهوية غير صحيح"),
  phone: z.string().regex(saudiPhoneRegex, "رقم جوال غير صحيح"),
  email: z.string().email().optional().or(z.literal("")).optional(),
  votingWeight: z.number().positive().default(1),
  membershipNumberReal: z.string().optional(),
  membershipStartDate: z.string().datetime().optional(),
  membershipEndDate: z.string().datetime().optional().nullable(),
  isVotingEligible: z.boolean().default(true),
  adminNotes: z.string().optional(),
});

export const updateMemberSchema = createMemberSchema.partial().extend({
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "EXPIRED"]).optional(),
});

export const memberSelfUpdateSchema = z.object({
  email: z.string().email().optional(),
  avatarUrl: z.string().optional(),
});

export const importCommitSchema = z.object({
  jobId: z.string(),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
