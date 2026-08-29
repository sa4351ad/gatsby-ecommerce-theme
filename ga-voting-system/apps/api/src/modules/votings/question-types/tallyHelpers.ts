import type { QuestionWithOptions, VoteRowForTally, TallyResult, OptionTally } from "./types";

/** احتساب مشترك لأي سؤال يعتمد على اختيار خيار/خيارات من قائمة (Section 16: الأوزان والنسب) */
export function tallyOptionBased(
  question: QuestionWithOptions,
  votes: VoteRowForTally[],
  _isWeighted: boolean,
): TallyResult {
  const totalWeight = votes.reduce((sum, v) => sum + v.weightAtVote, 0);
  const totalBallots = votes.length;

  const options: OptionTally[] = question.options.map((opt) => {
    let voteCount = 0;
    let weightSum = 0;
    for (const v of votes) {
      if (v.selectedOptionIds.includes(opt.id)) {
        voteCount += 1;
        weightSum += v.weightAtVote;
      }
    }
    return {
      optionId: opt.id,
      label: opt.label,
      voteCount,
      weightSum,
      percentageOfVotes: totalBallots > 0 ? (voteCount / totalBallots) * 100 : 0,
      percentageOfWeight: totalWeight > 0 ? (weightSum / totalWeight) * 100 : 0,
    };
  });

  return { questionId: question.id, totalBallots, totalWeight, options };
}

/** يرتّب الخيارات تنازليًا حسب الوزن (أو عدد الأصوات كبديل) ويحدد الفائزين ضمن عدد المقاعد */
export function rankAndMarkWinners(result: TallyResult, seats: number, isWeighted: boolean): TallyResult {
  const sorted = [...result.options].sort((a, b) =>
    isWeighted ? b.weightSum - a.weightSum : b.voteCount - a.voteCount,
  );
  sorted.forEach((opt, idx) => {
    opt.rank = idx + 1;
    opt.isWinner = idx < seats;
  });
  return { ...result, options: sorted };
}
