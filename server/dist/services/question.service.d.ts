import { QuestionCategory, QuestionDifficulty, QuestionSource, SupportedLanguage, QuestionDisplay, QuestionReveal } from 'speed-buzzer-shared';
export interface QuestionRecord {
    id: string;
    text: string;
    canonicalAnswer: string;
    aliases: string[];
    explanation: string | null;
    category: string;
    difficulty: string;
    language: string;
    source: string;
    options?: string[];
}
export declare class QuestionService {
    /**
     * Fetch a set of questions for a match
     */
    getQuestionsForMatch(count: number, category: QuestionCategory, difficulty: QuestionDifficulty, language: SupportedLanguage, source?: QuestionSource): Promise<QuestionRecord[]>;
    /**
     * Create a display-safe version (no answer)
     */
    toDisplay(question: QuestionRecord, questionNumber: number, totalQuestions: number): QuestionDisplay;
    /**
     * Create a reveal payload (with answer)
     */
    toReveal(question: QuestionRecord): QuestionReveal;
    /**
     * Check if an answer is correct
     */
    checkAnswer(submittedAnswer: string, canonicalAnswer: string, aliases: string[]): boolean;
}
export declare const questionService: QuestionService;
