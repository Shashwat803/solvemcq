import type { Question } from '../models/Question';
import type { Answer } from '../models/Answer';

export type ValidationResult = {
  validated: boolean;
  notes: string;
};

export function validateAnswerAgainstQuestion(
  question: Question,
  answer: Pick<Answer, 'selectedOption'>,
): ValidationResult {
  if (question.correctAnswer) {
    const match = question.correctAnswer === answer.selectedOption;
    return {
      validated: true,
      notes: match
        ? 'Selected option matches documented correct answer.'
        : 'Selected option does not match documented correct answer.',
    };
  }
  return {
    validated: false,
    notes: 'No authoritative correct answer on file; validation skipped.',
  };
}
