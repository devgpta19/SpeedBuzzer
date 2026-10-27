import { QuestionRecord } from '../services/question.service.js';
import { MatchPhase, MatchState, BuzzerState, BuzzerEntry, BuzzerAcceptance, AnswerResult, RoomSettings, QuestionDisplay, QuestionReveal, ScoreUpdate, RoomMember, MatchResult } from 'speed-buzzer-shared';
interface LiveMatch {
    id: string;
    roomId: string;
    phase: MatchPhase;
    settings: RoomSettings;
    stateVersion: number;
    questions: QuestionRecord[];
    currentQuestionIndex: number;
    currentMatchQuestionId: string | null;
    scores: Map<string, number>;
    teamScores: Map<string, number>;
    buzzOrder: BuzzerEntry[];
    buzzSequence: number;
    buzzDeadline: number | null;
    answerDeadline: number | null;
    currentTurnPlayerId: string | null;
    eliminatedForQuestion: Set<string>;
    answeredForQuestion: Set<string>;
    matchDeadline: number | null;
    startedAt: number;
    members: Map<string, RoomMember>;
    buzzTimers: Map<string, NodeJS.Timeout>;
    answerTimers: Map<string, NodeJS.Timeout>;
    matchTimer: NodeJS.Timeout | null;
    autoNextTimer: NodeJS.Timeout | null;
    pausedAt: number | null;
    pausedRemaining: {
        buzz: number | null;
        answer: number | null;
        match: number | null;
    };
    processedIdempotencyKeys: Set<string>;
}
type MatchEventCallback = (roomId: string, event: string, data: any) => void;
export declare class GameEngine {
    private matches;
    private matchResults;
    private emitCallback;
    setEmitCallback(callback: MatchEventCallback): void;
    getMatchResult(matchId: string): MatchResult | undefined;
    private emit;
    startMatch(roomId: string, settings: RoomSettings, members: RoomMember[]): Promise<MatchState>;
    nextQuestion(matchId: string): Promise<{
        question: QuestionDisplay;
        buzzerState: BuzzerState;
    } | null>;
    scheduleAutoNext(matchId: string, delayMs?: number): void;
    advanceNextOrComplete(matchId: string): Promise<void>;
    restartQuestion(matchId: string): Promise<{
        question: QuestionDisplay;
        buzzerState: BuzzerState;
    } | null>;
    processBuzz(matchId: string, playerId: string, questionId: string, stateVersion: number, idempotencyKey: string): Promise<{
        acceptance: BuzzerAcceptance;
        buzzerState: BuzzerState;
    }>;
    private startAnswerTurn;
    selectAnswerTurn(matchId: string, playerId: string): Promise<void>;
    submitAnswer(matchId: string, playerId: string, answer: string, idempotencyKey: string): Promise<{
        result: AnswerResult;
        scoreUpdate: ScoreUpdate | null;
        reveal: QuestionReveal | null;
    }>;
    judgeAnswer(matchId: string, playerId: string, result: AnswerResult.CORRECT | AnswerResult.INCORRECT, reason?: string): Promise<{
        scoreUpdate: ScoreUpdate | null;
        reveal: QuestionReveal | null;
    }>;
    private processAnswerResult;
    private applyScore;
    private applyWrongAnswerPolicy;
    private moveToNextEligible;
    private allPlayersEliminatedOrAnswered;
    private onBuzzTimeout;
    private onAnswerTimeout;
    completeQuestion(matchId: string): Promise<void>;
    skipQuestion(matchId: string): Promise<void>;
    cancelQuestion(matchId: string, reason: string, actorId: string): Promise<void>;
    pauseMatch(matchId: string): Promise<void>;
    resumeMatch(matchId: string): Promise<MatchPhase>;
    endMatch(matchId: string, reason: string): Promise<MatchResult | null>;
    private checkMatchEnd;
    getMatchState(matchId: string): MatchState | null;
    getBuzzerState(match: LiveMatch): BuzzerState;
    getMatch(matchId: string): LiveMatch | undefined;
    getMatchByRoomId(roomId: string): LiveMatch | undefined;
    private clearTimers;
    private clearAnswerTimer;
    private recordBuzzerEvent;
    private recordAnswerSubmission;
    private logMatchEvent;
}
export declare const gameEngine: GameEngine;
export {};
