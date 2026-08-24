import type { QuestionType } from "@ga/db";
import type { QuestionTypeStrategy } from "./types";
import {
  decisionApprovalStrategy,
  yesNoStrategy,
  singleChoiceStrategy,
  multipleChoiceStrategy,
  electionStrategy,
} from "./choiceTypes";
import { rankingStrategy, rating5Strategy, rating10Strategy, percentageValueStrategy } from "./rankingRating";

/**
 * سجل أنواع الأسئلة (Strategy Pattern) — Section 15/39/46: إضافة نوع تصويت
 * جديد = إضافة استراتيجية جديدة هنا فقط، دون تعديل بقية منطق النظام.
 */
const REGISTRY: Record<QuestionType, QuestionTypeStrategy> = {
  DECISION_APPROVAL: decisionApprovalStrategy,
  YES_NO: yesNoStrategy,
  SINGLE_CHOICE: singleChoiceStrategy,
  MULTIPLE_CHOICE: multipleChoiceStrategy,
  ELECTION: electionStrategy,
  RANKING: rankingStrategy,
  RATING_5: rating5Strategy,
  RATING_10: rating10Strategy,
  PERCENTAGE_VALUE: percentageValueStrategy,
};

export function getQuestionStrategy(type: QuestionType): QuestionTypeStrategy {
  const strategy = REGISTRY[type];
  if (!strategy) throw new Error(`لا توجد استراتيجية احتساب لنوع السؤال: ${type}`);
  return strategy;
}

export * from "./types";
