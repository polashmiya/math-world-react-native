import type { Language } from '../constants/levels';
import type { Question, QuestionAttempt, SolutionStep } from '../../domain/models';
import type { MathTutor } from '../../domain/repositories';
import { expectedDisplay, validateAnswer } from './answerValidator';

/** A solution rendered for one language, ready for the UI. */
export interface RenderedSolution {
  steps: { order: number; title?: string; detail: string; expression?: string }[];
  explanation?: string;
  answer: string;
}

export function renderSolution(question: Question, language: Language): RenderedSolution {
  const steps = question.solutionSteps.map((s) => ({
    order: s.order,
    title: language === 'bn' ? s.titleBn ?? s.title : s.title,
    detail: language === 'bn' ? s.detailBn ?? s.detail : s.detail,
    expression: s.expression,
  }));
  return {
    steps,
    explanation: language === 'bn' ? question.explanationBn ?? question.explanation : question.explanation,
    answer: expectedDisplay(question),
  };
}

export function questionPrompt(question: Question, language: Language): string {
  return language === 'bn' ? question.promptBn ?? question.prompt : question.prompt;
}

export function optionText(
  option: { text: string; textBn?: string },
  language: Language,
): string {
  return language === 'bn' ? option.textBn ?? option.text : option.text;
}

export function hintsFor(question: Question, language: Language): string[] {
  const list = language === 'bn' ? question.hintsBn ?? question.hints : question.hints;
  return list ?? [];
}

/**
 * Version 1 tutor (spec §55). Every explanation is assembled from content the
 * Math Engine already produced — the tutor never computes anything itself.
 */
export class RuleBasedMathTutor implements MathTutor {
  constructor(private readonly language: Language = 'bn') {}

  async explain(question: Question): Promise<string> {
    const rendered = renderSolution(question, this.language);
    const lines = rendered.steps.map((s) => s.order + '. ' + s.detail);
    if (rendered.explanation) lines.push('', rendered.explanation);
    lines.push('', (this.language === 'bn' ? 'উত্তর: ' : 'Answer: ') + rendered.answer);
    return lines.join('\n');
  }

  async giveHint(question: Question, level: number): Promise<string> {
    const hints = hintsFor(question, this.language);
    if (hints.length > 0) {
      return hints[Math.min(hints.length - 1, Math.max(0, level - 1))];
    }
    // Fall back to progressively revealing solution steps.
    const rendered = renderSolution(question, this.language);
    if (rendered.steps.length === 0) {
      return this.language === 'bn'
        ? 'প্রশ্নটি ছোট ছোট ধাপে ভাগ করে দেখুন।'
        : 'Try breaking the problem into smaller steps.';
    }
    const index = Math.min(rendered.steps.length - 1, Math.max(0, level - 1));
    return rendered.steps[index].detail;
  }

  async explainMistake(attempt: QuestionAttempt, question: Question): Promise<string> {
    const result = validateAnswer(question, attempt.givenAnswer);
    const bn = this.language === 'bn';
    const parts: string[] = [];

    if (result.nearMiss) {
      parts.push(
        bn
          ? 'আপনি খুব কাছাকাছি ছিলেন — সম্ভবত নিকটবর্তীকরণ বা একটি ধাপে ছোট ভুল হয়েছে।'
          : 'You were very close — most likely a rounding slip or one small step.',
      );
    } else if (attempt.hintsUsed === 0 && attempt.timeSpentMs < 8000) {
      parts.push(
        bn
          ? 'উত্তরটি খুব দ্রুত দেওয়া হয়েছে। প্রশ্নটি আরেকবার পড়ে কী চাওয়া হয়েছে দেখুন।'
          : 'That answer came very fast. Re-read the question and check what it actually asks for.',
      );
    } else {
      parts.push(
        bn ? 'চলুন ধাপে ধাপে দেখি কোথায় ভুল হয়েছে।' : 'Let us walk through where it went wrong.',
      );
    }

    parts.push(
      (bn ? 'আপনার উত্তর: ' : 'Your answer: ') + attempt.givenAnswer,
      (bn ? 'সঠিক উত্তর: ' : 'Correct answer: ') + expectedDisplay(question),
      '',
      await this.explain(question),
    );
    return parts.join('\n');
  }
}

/** Groups solution steps for the collapsible UI. */
export function summariseSteps(steps: readonly SolutionStep[], maxLength = 3): SolutionStep[] {
  if (steps.length <= maxLength) return steps.slice();
  return [steps[0], steps[Math.floor(steps.length / 2)], steps[steps.length - 1]];
}
