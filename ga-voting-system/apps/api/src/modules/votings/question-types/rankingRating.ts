import { ApiError } from "../../../utils/apiError";
import type { QuestionTypeStrategy, VoteRowForTally } from "./types";

/** ترتيب المرشحين (Ranking) — احتساب Borda Count موزون */
export const rankingStrategy: QuestionTypeStrategy = {
  validateAnswer(question, answer) {
    const ids = answer.rankingOptionIds ?? [];
    const validIds = new Set(question.options.map((o) => o.id));
    if (ids.length !== question.options.length) {
      throw new ApiError(422, "يجب ترتيب جميع الخيارات");
    }
    const unique = new Set(ids);
    if (unique.size !== ids.length || ids.some((id) => !validIds.has(id))) {
      throw new ApiError(422, "ترتيب غير صحيح للخيارات");
    }
  },
  tally(question, votes, _isWeighted) {
    const n = question.options.length;
    const totalWeight = votes.reduce((s, v) => s + v.weightAtVote, 0);
    const points = new Map<string, number>();
    const voteCounts = new Map<string, number>();
    question.options.forEach((o) => {
      points.set(o.id, 0);
      voteCounts.set(o.id, 0);
    });

    for (const v of votes) {
      const ranking = (v.rankingJson as string[]) ?? [];
      ranking.forEach((optionId, idx) => {
        const score = n - idx; // المركز الأول يحصل على أعلى نقاط
        points.set(optionId, (points.get(optionId) ?? 0) + score * v.weightAtVote);
        voteCounts.set(optionId, (voteCounts.get(optionId) ?? 0) + 1);
      });
    }

    const totalPoints = Array.from(points.values()).reduce((a, b) => a + b, 0);
    const options = question.options
      .map((o) => ({
        optionId: o.id,
        label: o.label,
        voteCount: voteCounts.get(o.id) ?? 0,
        weightSum: points.get(o.id) ?? 0,
        percentageOfVotes: votes.length > 0 ? ((voteCounts.get(o.id) ?? 0) / votes.length) * 100 : 0,
        percentageOfWeight: totalPoints > 0 ? ((points.get(o.id) ?? 0) / totalPoints) * 100 : 0,
        averageRankPoints: votes.length > 0 ? (points.get(o.id) ?? 0) / votes.length : 0,
      }))
      .sort((a, b) => b.weightSum - a.weightSum)
      .map((o, idx) => ({ ...o, rank: idx + 1 }));

    return { questionId: question.id, totalBallots: votes.length, totalWeight, options };
  },
};

function ratingStrategy(maxValue: number): QuestionTypeStrategy {
  return {
    validateAnswer(_question, answer) {
      if (answer.ratingValue == null || !Number.isInteger(answer.ratingValue)) {
        throw new ApiError(422, "يجب اختيار تقييم رقمي صحيح");
      }
      if (answer.ratingValue < 1 || answer.ratingValue > maxValue) {
        throw new ApiError(422, `التقييم يجب أن يكون بين 1 و ${maxValue}`);
      }
    },
    tally(question, votes) {
      const totalWeight = votes.reduce((s, v) => s + v.weightAtVote, 0);
      const totalBallots = votes.length;
      let weightedSum = 0;
      let plainSum = 0;
      const distribution = new Map<number, VoteRowForTally[]>();

      for (const v of votes) {
        const val = v.ratingValue ?? 0;
        weightedSum += val * v.weightAtVote;
        plainSum += val;
        distribution.set(val, [...(distribution.get(val) ?? []), v]);
      }

      const options = Array.from({ length: maxValue }, (_, i) => i + 1).map((val) => {
        const rows = distribution.get(val) ?? [];
        const weightSum = rows.reduce((s, r) => s + r.weightAtVote, 0);
        return {
          optionId: String(val),
          label: String(val),
          voteCount: rows.length,
          weightSum,
          percentageOfVotes: totalBallots > 0 ? (rows.length / totalBallots) * 100 : 0,
          percentageOfWeight: totalWeight > 0 ? (weightSum / totalWeight) * 100 : 0,
        };
      });

      return {
        questionId: question.id,
        totalBallots,
        totalWeight,
        options,
        averageRating: totalBallots > 0 ? plainSum / totalBallots : 0,
        weightedAverageRating: totalWeight > 0 ? weightedSum / totalWeight : 0,
      };
    },
  };
}

export const rating5Strategy = ratingStrategy(5);
export const rating10Strategy = ratingStrategy(10);

export const percentageValueStrategy: QuestionTypeStrategy = {
  validateAnswer(_question, answer) {
    if (answer.percentageValue == null || answer.percentageValue < 0 || answer.percentageValue > 100) {
      throw new ApiError(422, "القيمة يجب أن تكون نسبة مئوية بين 0 و 100");
    }
  },
  tally(question, votes) {
    const totalWeight = votes.reduce((s, v) => s + v.weightAtVote, 0);
    const totalBallots = votes.length;
    let weightedSum = 0;
    let plainSum = 0;
    for (const v of votes) {
      const val = v.percentageValue ?? 0;
      weightedSum += val * v.weightAtVote;
      plainSum += val;
    }
    return {
      questionId: question.id,
      totalBallots,
      totalWeight,
      options: [],
      averagePercentage: totalBallots > 0 ? plainSum / totalBallots : 0,
      weightedAverageRating: totalWeight > 0 ? weightedSum / totalWeight : undefined,
    };
  },
};
