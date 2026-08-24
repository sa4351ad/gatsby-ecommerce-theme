import { z } from "zod";

export const questionTypeEnum = z.enum([
  "DECISION_APPROVAL",
  "YES_NO",
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "ELECTION",
  "RANKING",
  "RATING_5",
  "RATING_10",
  "PERCENTAGE_VALUE",
]);

export const votingOptionSchema = z.object({
  label: z.string().min(1),
  description: z.string().optional(),
  candidateBio: z.string().optional(),
  candidatePhotoUrl: z.string().optional(),
});

export const votingQuestionSchema = z
  .object({
    type: questionTypeEnum,
    text: z.string().min(3, "نص السؤال مطلوب"),
    description: z.string().optional(),
    minSelections: z.number().int().min(0).optional(),
    maxSelections: z.number().int().min(1).optional(),
    seatsCount: z.number().int().min(1).optional(),
    requireExactCount: z.boolean().default(false),
    options: z.array(votingOptionSchema).default([]),
  })
  .superRefine((q, ctx) => {
    const needsOptions = [
      "SINGLE_CHOICE",
      "MULTIPLE_CHOICE",
      "ELECTION",
      "RANKING",
    ];
    if (needsOptions.includes(q.type) && q.options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "يجب إضافة خيارين على الأقل لهذا النوع من الأسئلة",
        path: ["options"],
      });
    }
    if (q.type === "ELECTION" && !q.seatsCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "يجب تحديد عدد المقاعد للانتخابات",
        path: ["seatsCount"],
      });
    }
    if (
      q.type === "MULTIPLE_CHOICE" &&
      q.minSelections != null &&
      q.maxSelections != null &&
      q.minSelections > q.maxSelections
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "الحد الأدنى للاختيارات لا يمكن أن يكون أكبر من الحد الأقصى",
        path: ["minSelections"],
      });
    }
  });

export const createVotingSchema = z
  .object({
    title: z.string().min(3, "عنوان التصويت مطلوب"),
    description: z.string().optional(),
    legalText: z.string().optional(),
    meetingId: z.string().optional().nullable(),
    kind: z.enum(["STANDARD", "ELECTION"]).default("STANDARD"),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    timezone: z.string().default("Asia/Riyadh"),
    isSecret: z.boolean().default(false),
    allowVoteChange: z.boolean().default(false),
    requiresFinalApproval: z.boolean().default(false),
    isWeighted: z.boolean().default(true),
    resultsVisibleToMembers: z.boolean().default(true),
    quorumType: z
      .enum(["NONE", "PERCENTAGE_OF_MEMBERS", "FIXED_COUNT", "PERCENTAGE_OF_WEIGHT"])
      .default("NONE"),
    quorumValue: z.number().nonnegative().optional(),
    targetType: z.enum(["ALL", "GROUP", "SELECTED", "CONDITIONAL"]).default("ALL"),
    targetGroupId: z.string().optional().nullable(),
    targetMemberIds: z.array(z.string()).optional(),
    questions: z.array(votingQuestionSchema).min(1, "يجب إضافة سؤال واحد على الأقل"),
  })
  .superRefine((v, ctx) => {
    if (new Date(v.endAt) <= new Date(v.startAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "وقت النهاية يجب أن يكون بعد وقت البداية",
        path: ["endAt"],
      });
    }
    if (v.targetType === "GROUP" && !v.targetGroupId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "يجب اختيار المجموعة المستهدفة",
        path: ["targetGroupId"],
      });
    }
    if (
      v.targetType === "SELECTED" &&
      (!v.targetMemberIds || v.targetMemberIds.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "يجب اختيار عضو واحد على الأقل",
        path: ["targetMemberIds"],
      });
    }
  });

export const castVoteAnswerSchema = z.object({
  questionId: z.string(),
  selectedOptionIds: z.array(z.string()).default([]),
  rankingOptionIds: z.array(z.string()).optional(),
  ratingValue: z.number().int().min(1).max(10).optional(),
  percentageValue: z.number().min(0).max(100).optional(),
  textValue: z.string().optional(),
});

export const castVoteSchema = z.object({
  answers: z.array(castVoteAnswerSchema).min(1),
});

export const confirmVoteSchema = z.object({
  otpCode: z.string().length(6).optional(),
});

export type CreateVotingInput = z.infer<typeof createVotingSchema>;
export type VotingQuestionInput = z.infer<typeof votingQuestionSchema>;
export type CastVoteInput = z.infer<typeof castVoteSchema>;
