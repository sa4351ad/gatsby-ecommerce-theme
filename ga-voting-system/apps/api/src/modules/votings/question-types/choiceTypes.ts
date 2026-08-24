import { ApiError } from "../../../utils/apiError";
import { tallyOptionBased, rankAndMarkWinners } from "./tallyHelpers";
import type { QuestionTypeStrategy, QuestionWithOptions, AnswerInput } from "./types";

function validateIdsBelongToQuestion(question: QuestionWithOptions, ids: string[]) {
  const validIds = new Set(question.options.map((o) => o.id));
  for (const id of ids) {
    if (!validIds.has(id)) throw new ApiError(422, "أحد الخيارات المختارة غير موجود ضمن هذا السؤال");
  }
}

/** قرار: موافق / غير موافق / ممتنع — اختيار واحد إلزامي */
export const decisionApprovalStrategy: QuestionTypeStrategy = {
  validateAnswer(question, answer) {
    if (answer.selectedOptionIds.length !== 1) {
      throw new ApiError(422, "يجب اختيار إجابة واحدة فقط (موافق / غير موافق / ممتنع)");
    }
    validateIdsBelongToQuestion(question, answer.selectedOptionIds);
  },
  tally: (q, votes, w) => tallyOptionBased(q, votes, w),
};

/** نعم / لا */
export const yesNoStrategy: QuestionTypeStrategy = {
  validateAnswer(question, answer) {
    if (answer.selectedOptionIds.length !== 1) {
      throw new ApiError(422, "يجب اختيار إجابة واحدة (نعم أو لا)");
    }
    validateIdsBelongToQuestion(question, answer.selectedOptionIds);
  },
  tally: (q, votes, w) => tallyOptionBased(q, votes, w),
};

/** اختيار واحد فقط من قائمة */
export const singleChoiceStrategy: QuestionTypeStrategy = {
  validateAnswer(question, answer) {
    if (answer.selectedOptionIds.length !== 1) {
      throw new ApiError(422, "يجب اختيار خيار واحد فقط");
    }
    validateIdsBelongToQuestion(question, answer.selectedOptionIds);
  },
  tally: (q, votes, w) => tallyOptionBased(q, votes, w),
};

/** اختيار متعدد بحد أدنى/أقصى قابل للتخصيص */
export const multipleChoiceStrategy: QuestionTypeStrategy = {
  validateAnswer(question, answer) {
    const ids = answer.selectedOptionIds;
    const unique = new Set(ids);
    if (unique.size !== ids.length) throw new ApiError(422, "لا يمكن اختيار نفس الخيار أكثر من مرة");
    validateIdsBelongToQuestion(question, ids);

    const min = question.minSelections ?? 1;
    const max = question.maxSelections ?? question.options.length;
    if (ids.length < min || ids.length > max) {
      throw new ApiError(422, `يجب اختيار ما بين ${min} و ${max} من الخيارات`);
    }
  },
  tally: (q, votes, w) => tallyOptionBased(q, votes, w),
};

/** انتخابات الشخصيات: عدد المقاعد يحدد الحد الأقصى (أو الحد الإلزامي إن requireExactCount) */
export const electionStrategy: QuestionTypeStrategy = {
  validateAnswer(question, answer) {
    const ids = answer.selectedOptionIds;
    const unique = new Set(ids);
    if (unique.size !== ids.length) throw new ApiError(422, "لا يمكن اختيار نفس المرشح أكثر من مرة");
    validateIdsBelongToQuestion(question, ids);

    const seats = question.seatsCount ?? 1;
    const min = question.minSelections ?? (question.requireExactCount ? seats : 1);
    const max = question.maxSelections ?? seats;

    if (question.requireExactCount && ids.length !== seats) {
      throw new ApiError(422, `يجب اختيار ${seats} مرشحين بالضبط`);
    }
    if (ids.length < min || ids.length > max) {
      throw new ApiError(422, `يجب اختيار ما بين ${min} و ${max} من المرشحين (عدد المقاعد: ${seats})`);
    }
  },
  tally(question, votes, isWeighted) {
    const base = tallyOptionBased(question, votes, isWeighted);
    return rankAndMarkWinners(base, question.seatsCount ?? 1, isWeighted);
  },
};

export function isAnswerEmpty(answer: AnswerInput) {
  return (
    answer.selectedOptionIds.length === 0 &&
    !answer.rankingOptionIds?.length &&
    answer.ratingValue == null &&
    answer.percentageValue == null &&
    !answer.textValue
  );
}
