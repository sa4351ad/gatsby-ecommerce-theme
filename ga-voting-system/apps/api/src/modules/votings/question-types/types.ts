import type { VotingOption, VotingQuestion } from "@ga/db";
import type { CastVoteInput } from "@ga/shared";

export type QuestionWithOptions = VotingQuestion & { options: VotingOption[] };
export type AnswerInput = CastVoteInput["answers"][number];

export interface VoteRowForTally {
  selectedOptionIds: string[];
  rankingJson: unknown;
  ratingValue: number | null;
  percentageValue: number | null;
  weightAtVote: number;
}

export interface OptionTally {
  optionId: string;
  label: string;
  voteCount: number;
  weightSum: number;
  percentageOfVotes: number;
  percentageOfWeight: number;
  rank?: number;
  isWinner?: boolean;
  averageRankPoints?: number;
}

export interface TallyResult {
  questionId: string;
  totalBallots: number;
  totalWeight: number;
  options: OptionTally[];
  averageRating?: number;
  weightedAverageRating?: number;
  averagePercentage?: number;
}

export interface QuestionTypeStrategy {
  /** يتحقق من صحة الإجابة وفق قواعد نوع السؤال — يرمي ApiError عند المخالفة */
  validateAnswer(question: QuestionWithOptions, answer: AnswerInput): void;
  /** يحسب النتائج التجميعية لهذا السؤال بناءً على كل الأصوات المُدلى بها */
  tally(question: QuestionWithOptions, votes: VoteRowForTally[], isWeighted: boolean): TallyResult;
}
