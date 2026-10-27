import crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db/connection.js';
import { questionService, QuestionRecord } from '../services/question.service.js';
import {
  MatchPhase, MatchState, MatchFormat, BuzzerState, BuzzerEntry,
  BuzzerAcceptance, AnswerResult, WrongAnswerPolicy, AnswerJudgingMode,
  RoomSettings, QuestionDisplay, QuestionReveal, ScoreUpdate,
  MemberRole, RoomMember, MatchResult, PlayerResult, TeamResult, ServerEvents,
} from 'speed-buzzer-shared';

// ── In-Memory Match State ──────────────────────────────────
// Kept in memory for low-latency buzzer handling; persisted at transitions
interface LiveMatch {
  id: string;
  roomId: string;
  phase: MatchPhase;
  settings: RoomSettings;
  stateVersion: number;
  questions: QuestionRecord[];
  currentQuestionIndex: number;
  currentMatchQuestionId: string | null;
  scores: Map<string, number>;       // memberId -> score
  teamScores: Map<string, number>;   // teamId -> score
  buzzOrder: BuzzerEntry[];
  buzzSequence: number;
  buzzDeadline: number | null;
  answerDeadline: number | null;
  currentTurnPlayerId: string | null;
  eliminatedForQuestion: Set<string>; // player IDs eliminated for current question
  answeredForQuestion: Set<string>;   // player IDs who answered (for re-buzz tracking)
  matchDeadline: number | null;
  startedAt: number;
  members: Map<string, RoomMember>;
  buzzTimers: Map<string, NodeJS.Timeout>;
  answerTimers: Map<string, NodeJS.Timeout>;
  matchTimer: NodeJS.Timeout | null;
  autoNextTimer: NodeJS.Timeout | null;
  pausedAt: number | null;
  pausedRemaining: { buzz: number | null; answer: number | null; match: number | null };
  processedIdempotencyKeys: Set<string>;
}

type MatchEventCallback = (roomId: string, event: string, data: any) => void;

export class GameEngine {
  private matches: Map<string, LiveMatch> = new Map();
  private matchResults: Map<string, MatchResult> = new Map();
  private emitCallback: MatchEventCallback | null = null;

  setEmitCallback(callback: MatchEventCallback): void {
    this.emitCallback = callback;
  }

  getMatchResult(matchId: string): MatchResult | undefined {
    return this.matchResults.get(matchId);
  }

  private emit(roomId: string, event: string, data: any): void {
    this.emitCallback?.(roomId, event, data);
  }

  // ── Match Lifecycle ───────────────────────────────────────

  async startMatch(roomId: string, settings: RoomSettings, members: RoomMember[]): Promise<MatchState> {
    const db = getDb();

    // Fetch questions
    const questions = await questionService.getQuestionsForMatch(
      settings.matchFormat === MatchFormat.FIXED_QUESTIONS ? settings.questionCount : 50,
      settings.questionCategory,
      settings.questionDifficulty,
      settings.questionLanguage,
      settings.questionSource
    );

    if (questions.length === 0) {
      throw new Error('NO_QUESTIONS_AVAILABLE');
    }

    const matchId = uuid();
    const now = Date.now();

    // Persist match record
    await db('matches').insert({
      id: matchId,
      room_id: roomId,
      format: settings.matchFormat,
      status: 'active',
      rules_snapshot: JSON.stringify(settings),
      question_count: questions.length,
      language: settings.questionLanguage,
      state_version: 0,
      started_at: new Date(),
    });

    // Persist participants
    const players = members.filter(m => m.role !== MemberRole.SPECTATOR);
    for (const player of players) {
      await db('match_participants').insert({
        id: uuid(),
        match_id: matchId,
        member_id: player.id,
        session_id: player.sessionId,
        display_name: player.displayName,
        team_id: player.teamId,
      });
    }

    // Persist match questions
    for (let i = 0; i < questions.length; i++) {
      await db('match_questions').insert({
        id: uuid(),
        match_id: matchId,
        question_id: questions[i].id,
        question_version: 1,
        order_index: i,
        state: 'pending',
      });
    }

    // Build in-memory state
    const scores = new Map<string, number>();
    const teamScores = new Map<string, number>();
    const memberMap = new Map<string, RoomMember>();

    for (const p of players) {
      scores.set(p.id, 0);
      memberMap.set(p.id, p);
    }

    const live: LiveMatch = {
      id: matchId,
      roomId,
      phase: MatchPhase.MATCH_READY,
      settings,
      stateVersion: 0,
      questions,
      currentQuestionIndex: -1,
      currentMatchQuestionId: null,
      scores,
      teamScores,
      buzzOrder: [],
      buzzSequence: 0,
      buzzDeadline: null,
      answerDeadline: null,
      currentTurnPlayerId: null,
      eliminatedForQuestion: new Set(),
      answeredForQuestion: new Set(),
      matchDeadline: settings.matchFormat === MatchFormat.TIMED
        ? now + settings.matchDuration * 1000
        : null,
      startedAt: now,
      members: memberMap,
      buzzTimers: new Map(),
      answerTimers: new Map(),
      matchTimer: null,
      autoNextTimer: null,
      pausedAt: null,
      pausedRemaining: { buzz: null, answer: null, match: null },
      processedIdempotencyKeys: new Set(),
    };

    this.matches.set(matchId, live);

    // Set timed match timer
    if (settings.matchFormat === MatchFormat.TIMED) {
      live.matchTimer = setTimeout(() => {
        this.endMatch(matchId, 'time_expired');
      }, settings.matchDuration * 1000);
    }

    // Update room status
    await db('rooms').where('id', roomId).update({ status: 'in_game' });

    return this.getMatchState(matchId)!;
  }

  // ── Question Flow ─────────────────────────────────────────

  async nextQuestion(matchId: string): Promise<{ question: QuestionDisplay; buzzerState: BuzzerState } | null> {
    const match = this.matches.get(matchId);
    if (!match) return null;

    if (match.phase === MatchPhase.MATCH_COMPLETE) {
      return null;
    }

    const totalAllowed = match.settings.matchFormat === MatchFormat.FIXED_QUESTIONS
      ? Math.min(match.settings.questionCount || 10, match.questions.length)
      : match.questions.length;

    match.currentQuestionIndex++;

    // Check if match should end
    if (match.currentQuestionIndex >= totalAllowed) {
      await this.endMatch(matchId, 'all_questions_completed');
      return null;
    }

    const q = match.questions[match.currentQuestionIndex];
    if (!q) {
      await this.endMatch(matchId, 'all_questions_completed');
      return null;
    }

    match.stateVersion++;
    match.phase = MatchPhase.BUZZ_OPEN;
    match.buzzOrder = [];
    match.buzzSequence = 0;
    match.currentTurnPlayerId = null;
    match.eliminatedForQuestion = new Set();
    match.answeredForQuestion = new Set();
    match.answerDeadline = null;

    // Get match question ID from DB
    const db = getDb();
    const mqRecord = await db('match_questions')
      .where('match_id', matchId)
      .where('order_index', match.currentQuestionIndex)
      .first();

    if (mqRecord) {
      match.currentMatchQuestionId = mqRecord.id;
      await db('match_questions').where('id', mqRecord.id).update({
        state: 'buzz_open',
        started_at: new Date(),
        buzz_deadline: new Date(Date.now() + match.settings.buzzTimerSeconds * 1000),
      });
    }

    // Set buzz timer
    const now = Date.now();
    match.buzzDeadline = now + match.settings.buzzTimerSeconds * 1000;

    this.clearTimers(match);
    const buzzTimer = setTimeout(() => {
      this.onBuzzTimeout(matchId);
    }, match.settings.buzzTimerSeconds * 1000);
    match.buzzTimers.set('main', buzzTimer);

    const display = questionService.toDisplay(
      q,
      match.currentQuestionIndex + 1,
      match.settings.matchFormat === MatchFormat.FIXED_QUESTIONS
        ? match.settings.questionCount
        : match.questions.length
    );

    const buzzerState = this.getBuzzerState(match);

    // Log match event
    await this.logMatchEvent(matchId, 'question_opened', null, {
      questionIndex: match.currentQuestionIndex,
      questionId: q.id,
    });

    return { question: display, buzzerState };
  }

  scheduleAutoNext(matchId: string, delayMs = 3000): void {
    const match = this.matches.get(matchId);
    if (!match || match.phase === MatchPhase.MATCH_COMPLETE) return;

    if (match.autoNextTimer) {
      clearTimeout(match.autoNextTimer);
      match.autoNextTimer = null;
    }

    const totalAllowed = match.settings.matchFormat === MatchFormat.FIXED_QUESTIONS
      ? Math.min(match.settings.questionCount || 10, match.questions.length)
      : match.questions.length;
    const isLastQuestion = match.currentQuestionIndex + 1 >= totalAllowed;

    this.emit(match.roomId, 'question:auto-next', {
      delayMs,
      deadline: Date.now() + delayMs,
      isLastQuestion,
    });

    match.autoNextTimer = setTimeout(async () => {
      try {
        await this.advanceNextOrComplete(matchId);
      } catch (err) {
        console.error('Error in auto advance:', err);
      }
    }, delayMs);
  }

  async advanceNextOrComplete(matchId: string): Promise<void> {
    const match = this.matches.get(matchId);
    if (!match || match.phase === MatchPhase.MATCH_COMPLETE) return;

    if (match.autoNextTimer) {
      clearTimeout(match.autoNextTimer);
      match.autoNextTimer = null;
    }

    await this.completeQuestion(matchId);

    if ((match.phase as any) === MatchPhase.MATCH_COMPLETE) {
      let result = this.getMatchResult(matchId);
      if (!result) {
        result = (await this.endMatch(matchId, 'all_questions_completed')) || undefined;
      }
      this.emit(match.roomId, ServerEvents.MATCH_COMPLETED, { result });
      this.emit(match.roomId, 'match:completed', { result });
      this.emit(match.roomId, ServerEvents.MATCH_STATE, { match: this.getMatchState(matchId) });
      return;
    }

    const questionData = await this.nextQuestion(matchId);
    if (questionData) {
      const matchState = this.getMatchState(matchId);
      this.emit(match.roomId, ServerEvents.MATCH_STATE, {
        match: matchState,
        question: questionData.question,
        buzzer: questionData.buzzerState,
      });

      this.emit(match.roomId, ServerEvents.QUESTION_OPENED, {
        question: questionData.question,
        buzzer: questionData.buzzerState,
        stateVersion: matchState?.stateVersion,
      });

      const buzzSecs = match.settings.buzzTimerSeconds || 10;
      this.emit(match.roomId, ServerEvents.TIMER_DEADLINE, {
        type: 'buzz',
        deadline: questionData.buzzerState.deadline,
        remaining: buzzSecs * 1000,
        totalDuration: buzzSecs * 1000,
      });
    } else {
      let result = this.getMatchResult(matchId);
      if (!result) {
        result = (await this.endMatch(matchId, 'all_questions_completed')) || undefined;
      }
      this.emit(match.roomId, ServerEvents.MATCH_COMPLETED, { result });
      this.emit(match.roomId, 'match:completed', { result });
      this.emit(match.roomId, ServerEvents.MATCH_STATE, { match: this.getMatchState(matchId) });
    }
  }

  async restartQuestion(matchId: string): Promise<{ question: QuestionDisplay; buzzerState: BuzzerState } | null> {
    const match = this.matches.get(matchId);
    if (!match || match.currentQuestionIndex < 0 || match.currentQuestionIndex >= match.questions.length) {
      return null;
    }

    const q = match.questions[match.currentQuestionIndex];
    match.stateVersion++;
    match.phase = MatchPhase.BUZZ_OPEN;
    match.buzzOrder = [];
    match.buzzSequence = 0;
    match.currentTurnPlayerId = null;
    match.eliminatedForQuestion = new Set();
    match.answeredForQuestion = new Set();
    match.answerDeadline = null;

    const db = getDb();
    if (match.currentMatchQuestionId) {
      await db('match_questions').where('id', match.currentMatchQuestionId).update({
        state: 'buzz_open',
        started_at: new Date(),
        buzz_deadline: new Date(Date.now() + match.settings.buzzTimerSeconds * 1000),
      });
    }

    const now = Date.now();
    match.buzzDeadline = now + match.settings.buzzTimerSeconds * 1000;

    this.clearTimers(match);
    const buzzTimer = setTimeout(() => {
      this.onBuzzTimeout(matchId);
    }, match.settings.buzzTimerSeconds * 1000);
    match.buzzTimers.set('main', buzzTimer);

    const display = questionService.toDisplay(
      q,
      match.currentQuestionIndex + 1,
      match.settings.matchFormat === MatchFormat.FIXED_QUESTIONS
        ? match.settings.questionCount
        : match.questions.length
    );

    const buzzerState = this.getBuzzerState(match);

    await this.logMatchEvent(matchId, 'question_restarted', null, {
      questionIndex: match.currentQuestionIndex,
      questionId: q.id,
    });

    return { question: display, buzzerState };
  }

  // ── Buzzer Handling ───────────────────────────────────────

  async processBuzz(
    matchId: string,
    playerId: string,
    questionId: string,
    stateVersion: number,
    idempotencyKey: string
  ): Promise<{ acceptance: BuzzerAcceptance; buzzerState: BuzzerState }> {
    const match = this.matches.get(matchId);
    if (!match) throw new Error('MATCH_NOT_FOUND');

    const now = Date.now();

    // Idempotency check
    if (match.processedIdempotencyKeys.has(idempotencyKey)) {
      return {
        acceptance: BuzzerAcceptance.REJECTED_DUPLICATE,
        buzzerState: this.getBuzzerState(match),
      };
    }

    // Phase check
    if (match.phase !== MatchPhase.BUZZ_OPEN) {
      await this.recordBuzzerEvent(match, playerId, BuzzerAcceptance.REJECTED_PHASE, 'Not in buzz phase');
      return {
        acceptance: BuzzerAcceptance.REJECTED_PHASE,
        buzzerState: this.getBuzzerState(match),
      };
    }

    // Question match
    const currentQ = match.questions[match.currentQuestionIndex];
    if (currentQ.id !== questionId) {
      await this.recordBuzzerEvent(match, playerId, BuzzerAcceptance.REJECTED_PHASE, 'Wrong question');
      return {
        acceptance: BuzzerAcceptance.REJECTED_PHASE,
        buzzerState: this.getBuzzerState(match),
      };
    }

    // Deadline check (server-authoritative)
    if (match.buzzDeadline && now > match.buzzDeadline) {
      await this.recordBuzzerEvent(match, playerId, BuzzerAcceptance.REJECTED_LATE, 'After deadline');
      return {
        acceptance: BuzzerAcceptance.REJECTED_LATE,
        buzzerState: this.getBuzzerState(match),
      };
    }

    // Eligibility check
    if (match.eliminatedForQuestion.has(playerId)) {
      await this.recordBuzzerEvent(match, playerId, BuzzerAcceptance.REJECTED_INELIGIBLE, 'Eliminated');
      return {
        acceptance: BuzzerAcceptance.REJECTED_INELIGIBLE,
        buzzerState: this.getBuzzerState(match),
      };
    }

    // Duplicate buzz check
    if (match.buzzOrder.some(b => b.playerId === playerId && b.accepted)) {
      await this.recordBuzzerEvent(match, playerId, BuzzerAcceptance.REJECTED_DUPLICATE, 'Already buzzed');
      return {
        acceptance: BuzzerAcceptance.REJECTED_DUPLICATE,
        buzzerState: this.getBuzzerState(match),
      };
    }

    // Team eligibility in team mode
    if (match.settings.teamMode) {
      const member = match.members.get(playerId);
      if (member?.teamId) {
        // Check if team already has an active buzz
        const teamBuzz = match.buzzOrder.find(b => {
          const bMember = match.members.get(b.playerId);
          return bMember?.teamId === member.teamId && b.accepted;
        });
        if (teamBuzz && match.settings.teamBuzzerPolicy !== 'any_member') {
          return {
            acceptance: BuzzerAcceptance.REJECTED_INELIGIBLE,
            buzzerState: this.getBuzzerState(match),
          };
        }
      }
    }

    // Accept the buzz
    match.buzzSequence++;
    match.processedIdempotencyKeys.add(idempotencyKey);

    // Determine tie group
    const tieWindow = match.settings.tieWindowMs;
    let tieGroup = match.buzzSequence;
    if (tieWindow > 0 && match.buzzOrder.length > 0) {
      const lastBuzz = match.buzzOrder[match.buzzOrder.length - 1];
      if (now - lastBuzz.serverTimestamp <= tieWindow) {
        tieGroup = lastBuzz.tieGroup;
      }
    }

    const member = match.members.get(playerId);
    const entry: BuzzerEntry = {
      playerId,
      displayName: member?.displayName || 'Unknown',
      serverTimestamp: now,
      sequence: match.buzzSequence,
      tieGroup,
      accepted: true,
    };

    match.buzzOrder.push(entry);
    await this.recordBuzzerEvent(match, playerId, BuzzerAcceptance.ACCEPTED);

    // If this is the first buzz, transition to answer turn
    if (match.buzzOrder.filter(b => b.accepted).length === 1) {
      await this.startAnswerTurn(matchId, playerId);
    }

    return {
      acceptance: BuzzerAcceptance.ACCEPTED,
      buzzerState: this.getBuzzerState(match),
    };
  }

  // ── Answer Turn ───────────────────────────────────────────

  private async startAnswerTurn(matchId: string, playerId: string): Promise<void> {
    const match = this.matches.get(matchId);
    if (!match) return;

    const now = Date.now();
    match.phase = MatchPhase.ANSWER_TURN;
    match.currentTurnPlayerId = playerId;
    match.stateVersion++;
    match.answerDeadline = now + match.settings.answerTimerSeconds * 1000;

    // Clear buzz timer, set answer timer
    this.clearTimers(match);
    const timer = setTimeout(() => {
      this.onAnswerTimeout(matchId, playerId);
    }, match.settings.answerTimerSeconds * 1000);
    match.answerTimers.set(playerId, timer);

    this.emit(match.roomId, 'answer:turn-started', {
      playerId,
      buzzer: this.getBuzzerState(match),
      deadline: match.answerDeadline,
      remaining: match.settings.answerTimerSeconds * 1000,
      stateVersion: match.stateVersion,
    });
  }

  async selectAnswerTurn(matchId: string, playerId: string): Promise<void> {
    const match = this.matches.get(matchId);
    if (!match) throw new Error('MATCH_NOT_FOUND');
    await this.startAnswerTurn(matchId, playerId);
  }

  async submitAnswer(
    matchId: string,
    playerId: string,
    answer: string,
    idempotencyKey: string
  ): Promise<{ result: AnswerResult; scoreUpdate: ScoreUpdate | null; reveal: QuestionReveal | null }> {
    const match = this.matches.get(matchId);
    if (!match) throw new Error('MATCH_NOT_FOUND');

    if (match.phase !== MatchPhase.ANSWER_TURN) {
      throw new Error('NOT_ANSWER_PHASE');
    }
    if (match.currentTurnPlayerId !== playerId) {
      throw new Error('NOT_YOUR_TURN');
    }
    if (match.processedIdempotencyKeys.has(idempotencyKey)) {
      throw new Error('DUPLICATE_SUBMISSION');
    }

    match.processedIdempotencyKeys.add(idempotencyKey);

    const currentQ = match.questions[match.currentQuestionIndex];
    const answerMode = match.settings.answerMode;

    let result: AnswerResult;

    if (answerMode === AnswerJudgingMode.MANUAL) {
      // Manual judging — wait for host
      result = AnswerResult.PENDING;
      match.phase = MatchPhase.JUDGING;
      match.stateVersion++;

      // Clear answer timer
      this.clearAnswerTimer(match, playerId);

      // Record submission
      await this.recordAnswerSubmission(match, playerId, answer, result, 'manual');

      this.emit(match.roomId, 'answer:pending-judgment', {
        playerId,
        answer, // Only sent to host
        stateVersion: match.stateVersion,
      });

      return { result, scoreUpdate: null, reveal: null };
    }

    // Automatic or hybrid checking
    const isCorrect = questionService.checkAnswer(answer, currentQ.canonicalAnswer, currentQ.aliases);
    result = isCorrect ? AnswerResult.CORRECT : AnswerResult.INCORRECT;

    // Clear answer timer
    this.clearAnswerTimer(match, playerId);

    // Record submission
    await this.recordAnswerSubmission(match, playerId, answer, result, 'automatic');

    // Process result
    const scoreUpdate = await this.processAnswerResult(match, playerId, result);

    // Check if we should reveal
    let reveal: QuestionReveal | null = null;
    if (result === AnswerResult.CORRECT) {
      match.phase = MatchPhase.ANSWER_REVEAL;
      match.stateVersion++;
      reveal = questionService.toReveal(currentQ);
      this.scheduleAutoNext(match.id, 3000);
    }

    return { result, scoreUpdate, reveal };
  }

  async judgeAnswer(
    matchId: string,
    playerId: string,
    result: AnswerResult.CORRECT | AnswerResult.INCORRECT,
    reason?: string
  ): Promise<{ scoreUpdate: ScoreUpdate | null; reveal: QuestionReveal | null }> {
    const match = this.matches.get(matchId);
    if (!match) throw new Error('MATCH_NOT_FOUND');

    if (match.phase !== MatchPhase.JUDGING) {
      throw new Error('NOT_JUDGING_PHASE');
    }

    const scoreUpdate = await this.processAnswerResult(match, playerId, result);

    let reveal: QuestionReveal | null = null;
    if (result === AnswerResult.CORRECT) {
      match.phase = MatchPhase.ANSWER_REVEAL;
      match.stateVersion++;
      const currentQ = match.questions[match.currentQuestionIndex];
      reveal = questionService.toReveal(currentQ);
      this.scheduleAutoNext(match.id, 3000);
    }

    return { scoreUpdate, reveal };
  }

  // ── Score Processing ──────────────────────────────────────

  private async processAnswerResult(
    match: LiveMatch,
    playerId: string,
    result: AnswerResult
  ): Promise<ScoreUpdate | null> {
    if (result === AnswerResult.CORRECT) {
      // Calculate points
      let points = match.settings.correctPoints;

      // Speed bonus
      if (match.settings.speedBonus && match.answerDeadline) {
        const timeLeft = Math.max(0, match.answerDeadline - Date.now());
        const ratio = timeLeft / (match.settings.answerTimerSeconds * 1000);
        points += Math.round(match.settings.speedBonusMax * ratio);
      }

      return await this.applyScore(match, playerId, points, 'correct_answer');
    }

    if (result === AnswerResult.INCORRECT) {
      // Apply penalty
      const penalty = match.settings.incorrectPenalty;
      let scoreUpdate: ScoreUpdate | null = null;
      if (penalty > 0) {
        scoreUpdate = await this.applyScore(match, playerId, -penalty, 'incorrect_penalty');
      }

      // Apply wrong-answer policy
      match.answeredForQuestion.add(playerId);
      await this.applyWrongAnswerPolicy(match, playerId);

      return scoreUpdate;
    }

    return null;
  }

  private async applyScore(
    match: LiveMatch,
    playerId: string,
    delta: number,
    reason: string
  ): Promise<ScoreUpdate> {
    const current = match.scores.get(playerId) || 0;
    let newScore = current + delta;

    // Minimum score floor
    if (!match.settings.allowNegativeScore && newScore < match.settings.minimumScore) {
      newScore = match.settings.minimumScore;
    }

    match.scores.set(playerId, newScore);

    // Team score
    const member = match.members.get(playerId);
    let newTeamScore: number | null = null;
    if (member?.teamId) {
      const teamCurrent = match.teamScores.get(member.teamId) || 0;
      newTeamScore = teamCurrent + delta;
      match.teamScores.set(member.teamId, newTeamScore);
    }

    // Persist score event
    const db = getDb();
    const rawKey = `${match.id}-${match.currentQuestionIndex}-${playerId}-${reason}-${Date.now()}`;
    const idempotencyKey = crypto.createHash('sha256').update(rawKey).digest('hex');
    await db('score_events').insert({
      id: uuid(),
      match_id: match.id,
      match_question_id: match.currentMatchQuestionId,
      participant_id: playerId,
      delta,
      reason,
      idempotency_key: idempotencyKey,
    });

    // Update member score in room
    await db('room_members')
      .where('id', playerId)
      .update({ score: newScore });

    // Update match participant
    await db('match_participants')
      .where('match_id', match.id)
      .where('member_id', playerId)
      .update({ final_score: newScore });

    const scoreUpdate: ScoreUpdate = {
      playerId,
      delta,
      reason,
      newScore,
      teamId: member?.teamId || null,
      newTeamScore,
    };

    // Check target score
    if (match.settings.matchFormat === MatchFormat.TARGET_SCORE) {
      if (newScore >= match.settings.targetScore) {
        // Will end after current question completes
        this.emit(match.roomId, 'match:target-reached', {
          playerId,
          score: newScore,
          target: match.settings.targetScore,
        });
      }
    }

    return scoreUpdate;
  }

  private async applyWrongAnswerPolicy(match: LiveMatch, playerId: string): Promise<void> {
    switch (match.settings.wrongAnswerPolicy) {
      case WrongAnswerPolicy.ELIMINATION:
        match.eliminatedForQuestion.add(playerId);
        break;
      case WrongAnswerPolicy.REBUZZ:
        // Allow re-buzz — don't eliminate
        break;
      case WrongAnswerPolicy.PENALTY:
        match.eliminatedForQuestion.add(playerId);
        break;
    }

    // Try next eligible player
    await this.moveToNextEligible(match);
  }

  private async moveToNextEligible(match: LiveMatch): Promise<void> {
    // Find next accepted buzzer who is eligible
    const nextBuzz = match.buzzOrder.find(b =>
      b.accepted &&
      b.playerId !== match.currentTurnPlayerId &&
      !match.eliminatedForQuestion.has(b.playerId) &&
      !match.answeredForQuestion.has(b.playerId)
    );

    if (nextBuzz) {
      await this.startAnswerTurn(match.id, nextBuzz.playerId);
    } else {
      // No more eligible players — check if buzz phase should reopen
      const allEliminated = this.allPlayersEliminatedOrAnswered(match);
      if (allEliminated || match.settings.wrongAnswerPolicy !== WrongAnswerPolicy.REBUZZ) {
        // Reveal answer and complete question
        match.phase = MatchPhase.ANSWER_REVEAL;
        match.stateVersion++;
        const currentQ = match.questions[match.currentQuestionIndex];
        const reveal = questionService.toReveal(currentQ);
        this.emit(match.roomId, 'question:revealed', { reveal, stateVersion: match.stateVersion });
        this.scheduleAutoNext(match.id, 3000);
      } else {
        // Reopen buzz phase for re-buzz
        match.phase = MatchPhase.BUZZ_OPEN;
        match.stateVersion++;
        match.buzzOrder = []; // Reset buzz order for rebuzz
        const now = Date.now();
        match.buzzDeadline = now + match.settings.buzzTimerSeconds * 1000;
        
        const buzzTimer = setTimeout(() => {
          this.onBuzzTimeout(match.id);
        }, match.settings.buzzTimerSeconds * 1000);
        match.buzzTimers.set('main', buzzTimer);

        this.emit(match.roomId, 'buzzer:reopened', {
          deadline: match.buzzDeadline,
          stateVersion: match.stateVersion,
        });
      }
    }
  }

  private allPlayersEliminatedOrAnswered(match: LiveMatch): boolean {
    const players = Array.from(match.members.values()).filter(m => m.role !== MemberRole.SPECTATOR);
    return players.every(p =>
      match.eliminatedForQuestion.has(p.id) || match.answeredForQuestion.has(p.id)
    );
  }

  // ── Timeouts ──────────────────────────────────────────────

  private onBuzzTimeout(matchId: string): void {
    const match = this.matches.get(matchId);
    if (!match || match.phase !== MatchPhase.BUZZ_OPEN) return;

    // No one buzzed — reveal answer
    match.phase = MatchPhase.ANSWER_REVEAL;
    match.stateVersion++;
    const currentQ = match.questions[match.currentQuestionIndex];
    const reveal = questionService.toReveal(currentQ);
    this.emit(match.roomId, 'question:revealed', {
      reveal,
      stateVersion: match.stateVersion,
      reason: 'buzz_timeout',
    });
    this.scheduleAutoNext(match.id, 3000);
  }

  private async onAnswerTimeout(matchId: string, playerId: string): Promise<void> {
    const match = this.matches.get(matchId);
    if (!match || match.currentTurnPlayerId !== playerId) return;

    // Record timeout
    await this.recordAnswerSubmission(match, playerId, '', AnswerResult.TIMEOUT, 'timeout');

    // Update stats
    const db = getDb();
    await db('match_participants')
      .where('match_id', matchId)
      .where('member_id', playerId)
      .increment('timeouts', 1);

    match.answeredForQuestion.add(playerId);
    match.eliminatedForQuestion.add(playerId);

    this.emit(match.roomId, 'answer:judged', {
      playerId,
      result: AnswerResult.TIMEOUT,
      stateVersion: match.stateVersion,
    });

    // Move to next eligible
    await this.moveToNextEligible(match);
  }

  // ── Match Control ─────────────────────────────────────────

  async completeQuestion(matchId: string): Promise<void> {
    const match = this.matches.get(matchId);
    if (!match) return;

    match.phase = MatchPhase.QUESTION_COMPLETE;
    match.stateVersion++;
    this.clearTimers(match);

    // Update DB
    const db = getDb();
    if (match.currentMatchQuestionId) {
      await db('match_questions')
        .where('id', match.currentMatchQuestionId)
        .update({ state: 'completed', ended_at: new Date() });
    }

    // Check if match should end
    const shouldEnd = this.checkMatchEnd(match);
    if (shouldEnd) {
      await this.endMatch(matchId, shouldEnd);
    }
  }

  async skipQuestion(matchId: string): Promise<void> {
    const match = this.matches.get(matchId);
    if (!match) return;

    this.clearTimers(match);

    // Update DB
    const db = getDb();
    if (match.currentMatchQuestionId) {
      await db('match_questions')
        .where('id', match.currentMatchQuestionId)
        .update({ state: 'skipped', ended_at: new Date() });
    }

    await this.logMatchEvent(matchId, 'question_skipped', null, {
      questionIndex: match.currentQuestionIndex,
    });
  }

  async cancelQuestion(matchId: string, reason: string, actorId: string): Promise<void> {
    const match = this.matches.get(matchId);
    if (!match) return;

    this.clearTimers(match);
    const db = getDb();

    // Reverse score events for this question
    if (match.currentMatchQuestionId) {
      const scoreEvents = await db('score_events')
        .where('match_question_id', match.currentMatchQuestionId)
        .where('reversed', false);

      for (const event of scoreEvents) {
        // Create reversal event
        const reversalId = uuid();
        await db('score_events').insert({
          id: reversalId,
          match_id: matchId,
          match_question_id: match.currentMatchQuestionId,
          participant_id: event.participant_id,
          delta: -event.delta,
          reason: `reversal: ${reason}`,
          actor: actorId,
          idempotency_key: `reversal-${event.id}`,
        });

        // Mark original as reversed
        await db('score_events').where('id', event.id).update({
          reversed: true,
          reversed_by_event_id: reversalId,
        });

        // Update in-memory score
        const current = match.scores.get(event.participant_id) || 0;
        match.scores.set(event.participant_id, current - event.delta);
      }

      await db('match_questions')
        .where('id', match.currentMatchQuestionId)
        .update({ state: 'cancelled', ended_at: new Date() });
    }

    // Audit log
    await db('audit_logs').insert({
      id: uuid(),
      action: 'question_cancelled',
      actor_id: actorId,
      actor_name: match.members.get(actorId)?.displayName || 'Host',
      reason,
      match_id: matchId,
      room_id: match.roomId,
    });

    match.phase = MatchPhase.QUESTION_COMPLETE;
    match.stateVersion++;
  }

  async pauseMatch(matchId: string): Promise<void> {
    const match = this.matches.get(matchId);
    if (!match || match.pausedAt) return;

    const now = Date.now();
    match.pausedAt = now;
    match.pausedRemaining = {
      buzz: match.buzzDeadline ? match.buzzDeadline - now : null,
      answer: match.answerDeadline ? match.answerDeadline - now : null,
      match: match.matchDeadline ? match.matchDeadline - now : null,
    };

    this.clearTimers(match);
    match.phase = MatchPhase.MATCH_PAUSED;
    match.stateVersion++;

    await this.logMatchEvent(matchId, 'match_paused', null);
  }

  async resumeMatch(matchId: string): Promise<MatchPhase> {
    const match = this.matches.get(matchId);
    if (!match || !match.pausedAt) return match?.phase || MatchPhase.ROOM_CLOSED;

    const now = Date.now();

    // Restore timers
    if (match.pausedRemaining.buzz && match.pausedRemaining.buzz > 0) {
      match.buzzDeadline = now + match.pausedRemaining.buzz;
      match.phase = MatchPhase.BUZZ_OPEN;
      const timer = setTimeout(() => this.onBuzzTimeout(matchId), match.pausedRemaining.buzz);
      match.buzzTimers.set('main', timer);
    } else if (match.pausedRemaining.answer && match.pausedRemaining.answer > 0 && match.currentTurnPlayerId) {
      match.answerDeadline = now + match.pausedRemaining.answer;
      match.phase = MatchPhase.ANSWER_TURN;
      const timer = setTimeout(() => {
        this.onAnswerTimeout(matchId, match.currentTurnPlayerId!);
      }, match.pausedRemaining.answer);
      match.answerTimers.set(match.currentTurnPlayerId, timer);
    } else {
      match.phase = MatchPhase.QUESTION_COMPLETE;
    }

    if (match.pausedRemaining.match && match.matchDeadline) {
      match.matchDeadline = now + match.pausedRemaining.match;
      match.matchTimer = setTimeout(() => {
        this.endMatch(matchId, 'time_expired');
      }, match.pausedRemaining.match);
    }

    match.pausedAt = null;
    match.stateVersion++;

    await this.logMatchEvent(matchId, 'match_resumed', null);
    return match.phase;
  }

  async endMatch(matchId: string, reason: string): Promise<MatchResult | null> {
    const match = this.matches.get(matchId);
    if (!match) return null;

    match.phase = MatchPhase.MATCH_COMPLETE;
    match.stateVersion++;
    this.clearTimers(match);

    const db = getDb();

    // Calculate rankings
    const rankings: PlayerResult[] = [];
    for (const [memberId, member] of match.members) {
      if (member.role === MemberRole.SPECTATOR) continue;

      const participant = await db('match_participants')
        .where('match_id', matchId)
        .where('member_id', memberId)
        .first();

      const score = match.scores.get(memberId) || 0;

      rankings.push({
        playerId: memberId,
        displayName: member.displayName,
        avatar: member.avatar,
        rank: 0,
        score,
        correctAnswers: participant?.correct_answers || 0,
        incorrectAnswers: participant?.incorrect_answers || 0,
        timeouts: participant?.timeouts || 0,
        avgBuzzTime: participant?.avg_buzz_time || null,
        fastestBuzz: participant?.fastest_buzz || null,
        accuracy: 0,
        teamId: member.teamId,
      });
    }

    // Sort by score descending
    rankings.sort((a, b) => b.score - a.score);
    rankings.forEach((r, i) => {
      r.rank = i + 1;
      const total = r.correctAnswers + r.incorrectAnswers;
      r.accuracy = total > 0 ? Math.round((r.correctAnswers / total) * 100) : 0;
    });

    // Update match participants with final stats
    for (const r of rankings) {
      await db('match_participants')
        .where('match_id', matchId)
        .where('member_id', r.playerId)
        .update({
          final_score: r.score,
          rank: r.rank,
        });
    }

    // Team rankings
    const teamRankings: TeamResult[] = [];
    if (match.settings.teamMode) {
      const teamMap = new Map<string, { score: number; members: PlayerResult[] }>();
      for (const r of rankings) {
        if (r.teamId) {
          if (!teamMap.has(r.teamId)) {
            teamMap.set(r.teamId, { score: match.teamScores.get(r.teamId) || 0, members: [] });
          }
          teamMap.get(r.teamId)!.members.push(r);
        }
      }
      // Build team results
      let rank = 1;
      const sorted = Array.from(teamMap.entries()).sort((a, b) => b[1].score - a[1].score);
      for (const [teamId, data] of sorted) {
        teamRankings.push({
          teamId,
          teamName: teamId, // Will be resolved from teams table
          rank: rank++,
          score: data.score,
          members: data.members,
        });
      }
    }

    // Update match record
    await db('matches').where('id', matchId).update({
      status: 'completed',
      ended_at: new Date(),
    });

    await db('rooms').where('id', match.roomId).update({ status: 'open' });

    await this.logMatchEvent(matchId, 'match_completed', null, { reason });

    const result: MatchResult = {
      matchId,
      rankings,
      teamRankings,
      duration: Date.now() - match.startedAt,
      totalQuestions: match.currentQuestionIndex + 1,
      format: match.settings.matchFormat,
    };

    this.matchResults.set(matchId, result);

    this.emit(match.roomId, 'match:completed', result);
    this.emit(match.roomId, 'match:completed', { result });
    this.emit(match.roomId, ServerEvents.MATCH_COMPLETED, { result });

    // Clean up in-memory state (keep for a while for disputes)
    setTimeout(() => this.matches.delete(matchId), 5 * 60 * 1000);

    return result;
  }

  // ── Helper Methods ────────────────────────────────────────

  private checkMatchEnd(match: LiveMatch): string | null {
    if (match.settings.matchFormat === MatchFormat.FIXED_QUESTIONS) {
      const maxQuestions = Math.min(match.settings.questionCount || 10, match.questions.length);
      if (match.currentQuestionIndex >= maxQuestions - 1) {
        return 'all_questions_completed';
      }
    }

    if (match.settings.matchFormat === MatchFormat.TARGET_SCORE) {
      for (const [, score] of match.scores) {
        if (score >= match.settings.targetScore) {
          if (match.settings.targetScoreEndBehavior === 'immediate') {
            return 'target_score_reached';
          }
          // finish_question: will be checked after question completes
          return 'target_score_reached';
        }
      }
    }

    return null;
  }

  getMatchState(matchId: string): MatchState | null {
    const match = this.matches.get(matchId);
    if (!match) return null;

    return {
      id: match.id,
      roomId: match.roomId,
      phase: match.phase,
      currentQuestionIndex: match.currentQuestionIndex,
      totalQuestions: match.questions.length,
      scores: Object.fromEntries(match.scores),
      teamScores: Object.fromEntries(match.teamScores),
      startedAt: match.startedAt,
      matchDeadline: match.matchDeadline,
      stateVersion: match.stateVersion,
    };
  }

  getBuzzerState(match: LiveMatch): BuzzerState {
    return {
      isOpen: match.phase === MatchPhase.BUZZ_OPEN,
      deadline: match.buzzDeadline,
      buzzOrder: match.buzzOrder.filter(b => b.accepted),
      currentTurnPlayerId: match.currentTurnPlayerId,
      answerDeadline: match.answerDeadline,
      eliminatedPlayerIds: Array.from(match.eliminatedForQuestion),
    };
  }

  getMatch(matchId: string): LiveMatch | undefined {
    return this.matches.get(matchId);
  }

  getMatchByRoomId(roomId: string): LiveMatch | undefined {
    for (const match of this.matches.values()) {
      if (match.roomId === roomId) return match;
    }
    return undefined;
  }

  // ── Timer Management ──────────────────────────────────────

  private clearTimers(match: LiveMatch): void {
    for (const timer of match.buzzTimers.values()) clearTimeout(timer);
    for (const timer of match.answerTimers.values()) clearTimeout(timer);
    if (match.matchTimer) clearTimeout(match.matchTimer);
    if (match.autoNextTimer) {
      clearTimeout(match.autoNextTimer);
      match.autoNextTimer = null;
    }
    match.buzzTimers.clear();
    match.answerTimers.clear();
  }

  private clearAnswerTimer(match: LiveMatch, playerId: string): void {
    const timer = match.answerTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      match.answerTimers.delete(playerId);
    }
  }

  // ── Persistence Helpers ───────────────────────────────────

  private async recordBuzzerEvent(
    match: LiveMatch,
    playerId: string,
    acceptance: BuzzerAcceptance,
    reason?: string
  ): Promise<void> {
    const db = getDb();
    if (!match.currentMatchQuestionId) return;

    const member = match.members.get(playerId);
    await db('buzzer_events').insert({
      id: uuid(),
      match_question_id: match.currentMatchQuestionId,
      player_id: playerId,
      session_id: member?.sessionId || '',
      server_sequence: match.buzzSequence,
      server_received_at: Date.now(),
      acceptance,
      rejection_reason: reason || null,
    });
  }

  private async recordAnswerSubmission(
    match: LiveMatch,
    playerId: string,
    answer: string,
    result: AnswerResult,
    mode: string
  ): Promise<void> {
    const db = getDb();
    if (!match.currentMatchQuestionId) return;

    const member = match.members.get(playerId);
    await db('answer_submissions').insert({
      id: uuid(),
      match_question_id: match.currentMatchQuestionId,
      player_id: playerId,
      session_id: member?.sessionId || '',
      answer_text: answer,
      normalized_answer: answer.toLowerCase().trim(),
      received_at: Date.now(),
      result,
      judging_mode: mode,
    });

    // Update participant stats
    if (result === AnswerResult.CORRECT) {
      await db('match_participants')
        .where('match_id', match.id)
        .where('member_id', playerId)
        .increment('correct_answers', 1);
    } else if (result === AnswerResult.INCORRECT) {
      await db('match_participants')
        .where('match_id', match.id)
        .where('member_id', playerId)
        .increment('incorrect_answers', 1);
    }
  }

  private async logMatchEvent(
    matchId: string,
    eventType: string,
    actorId: string | null,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const match = this.matches.get(matchId);
    if (!match) return;

    const db = getDb();
    await db('match_events').insert({
      id: uuid(),
      match_id: matchId,
      event_type: eventType,
      actor_id: actorId,
      server_timestamp: Date.now(),
      state_version: match.stateVersion,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });
  }
}

export const gameEngine = new GameEngine();
