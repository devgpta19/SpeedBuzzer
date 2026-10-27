// ═══════════════════════════════════════════════════════════════
// Speed Buzzer — Shared Type Definitions
// ═══════════════════════════════════════════════════════════════

// ── Match State Machine ──────────────────────────────────────
export enum MatchPhase {
  ROOM_OPEN = 'ROOM_OPEN',
  LOBBY = 'LOBBY',
  MATCH_READY = 'MATCH_READY',
  QUESTION_PREPARING = 'QUESTION_PREPARING',
  BUZZ_OPEN = 'BUZZ_OPEN',
  ANSWER_TURN = 'ANSWER_TURN',
  JUDGING = 'JUDGING',
  ANSWER_REVEAL = 'ANSWER_REVEAL',
  QUESTION_COMPLETE = 'QUESTION_COMPLETE',
  MATCH_PAUSED = 'MATCH_PAUSED',
  MATCH_COMPLETE = 'MATCH_COMPLETE',
  ROOM_CLOSED = 'ROOM_CLOSED',
}

// ── Enums ────────────────────────────────────────────────────
export enum RoomVisibility {
  PRIVATE = 'private',
  PUBLIC = 'public',
}

export enum RoomStatus {
  OPEN = 'open',
  IN_GAME = 'in_game',
  CLOSED = 'closed',
}

export enum MemberRole {
  HOST = 'host',
  PLAYER = 'player',
  SPECTATOR = 'spectator',
}

export enum ConnectionStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
}

export enum GuestPolicy {
  ALLOWED = 'allowed',
  ACCOUNT_REQUIRED = 'account_required',
}

export enum JoinPolicy {
  OPEN = 'open',
  LOCKED = 'locked',
  SPECTATOR_ONLY = 'spectator_only',
}

export enum MatchFormat {
  FIXED_QUESTIONS = 'fixed_questions',
  TIMED = 'timed',
  TARGET_SCORE = 'target_score',
}

export enum WrongAnswerPolicy {
  ELIMINATION = 'elimination',
  REBUZZ = 'rebuzz',
  PENALTY = 'penalty',
}

export enum TargetScoreEndBehavior {
  FINISH_QUESTION = 'finish_question',
  IMMEDIATE = 'immediate',
}

export enum QuestionDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export enum QuestionSource {
  BUILTIN = 'builtin',
  AI_GENERATED = 'ai_generated',
  HOST_CUSTOM = 'host_custom',
  MIXED = 'mixed',
}

export enum QuestionStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  RETIRED = 'retired',
  EMERGENCY_DISABLED = 'emergency_disabled',
}

export enum AnswerJudgingMode {
  AUTOMATIC = 'automatic',
  MANUAL = 'manual',
  HYBRID = 'hybrid',
}

export enum AnswerResult {
  CORRECT = 'correct',
  INCORRECT = 'incorrect',
  TIMEOUT = 'timeout',
  PENDING = 'pending',
}

export enum BuzzerAcceptance {
  ACCEPTED = 'accepted',
  REJECTED_INELIGIBLE = 'rejected_ineligible',
  REJECTED_LATE = 'rejected_late',
  REJECTED_DUPLICATE = 'rejected_duplicate',
  REJECTED_PHASE = 'rejected_phase',
  REJECTED_RATE_LIMIT = 'rejected_rate_limit',
}

export enum DisputeStatus {
  OPEN = 'open',
  UNDER_REVIEW = 'under_review',
  UPHELD = 'upheld',
  OVERRIDDEN = 'overridden',
  DISMISSED = 'dismissed',
}

export enum TeamBuzzerPolicy {
  ANY_MEMBER = 'any_member',
  CAPTAIN_ONLY = 'captain_only',
}

export enum TeamAnswerPolicy {
  ANY_MEMBER = 'any_member',
  CAPTAIN_ONLY = 'captain_only',
}

export enum QuestionCategory {
  GENERAL_KNOWLEDGE = 'general_knowledge',
  SCIENCE = 'science',
  HISTORY = 'history',
  GEOGRAPHY = 'geography',
  SPORTS = 'sports',
  ENTERTAINMENT = 'entertainment',
  LITERATURE = 'literature',
  TECHNOLOGY = 'technology',
  MATHEMATICS = 'mathematics',
  CURRENT_AFFAIRS = 'current_affairs',
  ART_CULTURE = 'art_culture',
  FOOD_DRINK = 'food_drink',
  NATURE = 'nature',
  MUSIC = 'music',
  MOVIES_TV = 'movies_tv',
  MYTHOLOGY = 'mythology',
  POLITICS = 'politics',
  ECONOMICS = 'economics',
  MIXED = 'mixed',
}

export enum SupportedLanguage {
  ENGLISH = 'en',
  HINDI = 'hi',
}

// ── Core Interfaces ──────────────────────────────────────────

export interface RoomSettings {
  visibility: RoomVisibility;
  maxPlayers: number;
  spectatorAllowed: boolean;
  guestPolicy: GuestPolicy;
  joinPolicy: JoinPolicy;
  matchFormat: MatchFormat;
  questionCount: number;           // for fixed_questions format
  matchDuration: number;           // seconds, for timed format
  targetScore: number;             // for target_score format
  targetScoreEndBehavior: TargetScoreEndBehavior;
  suddenDeath: boolean;
  questionSource: QuestionSource;
  questionCategory: QuestionCategory;
  questionDifficulty: QuestionDifficulty;
  questionLanguage: SupportedLanguage;
  answerMode: AnswerJudgingMode;
  wrongAnswerPolicy: WrongAnswerPolicy;
  correctPoints: number;
  incorrectPenalty: number;
  speedBonus: boolean;
  speedBonusMax: number;
  allowNegativeScore: boolean;
  minimumScore: number;
  buzzTimerSeconds: number;
  answerTimerSeconds: number;
  tieWindowMs: number;             // 0-100ms
  hostDisconnectGracePeriod: number; // seconds
  teamMode: boolean;
  teamSize: number;
  teamBuzzerPolicy: TeamBuzzerPolicy;
  teamAnswerPolicy: TeamAnswerPolicy;
  interfaceLanguage: SupportedLanguage;
}

export interface RoomMember {
  id: string;
  sessionId: string;
  displayName: string;
  avatar: string;
  color: string;
  role: MemberRole;
  connectionStatus: ConnectionStatus;
  isReady: boolean;
  teamId: string | null;
  score: number;
  joinedAt: number;
}

export interface RoomState {
  id: string;
  joinCode: string;
  hostId: string;
  settings: RoomSettings;
  status: RoomStatus;
  members: RoomMember[];
  teams: TeamInfo[];
  createdAt: number;
}

export interface TeamInfo {
  id: string;
  name: string;
  color: string;
  captainId: string | null;
  memberIds: string[];
  score: number;
}

export interface MatchState {
  id: string;
  roomId: string;
  phase: MatchPhase;
  currentQuestionIndex: number;
  totalQuestions: number;
  scores: Record<string, number>;       // memberId -> score
  teamScores: Record<string, number>;   // teamId -> score
  startedAt: number;
  matchDeadline: number | null;         // for timed format
  stateVersion: number;
}

export interface QuestionDisplay {
  id: string;
  text: string;
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  language: SupportedLanguage;
  questionNumber: number;
  totalQuestions: number;
  options?: string[];
}

export interface QuestionReveal {
  questionId: string;
  correctAnswer: string;
  explanation: string | null;
  aliases: string[];
  source: QuestionSource;
}

export interface BuzzerState {
  isOpen: boolean;
  deadline: number | null;            // server timestamp
  buzzOrder: BuzzerEntry[];
  currentTurnPlayerId: string | null;
  answerDeadline: number | null;
  eliminatedPlayerIds: string[];
}

export interface BuzzerEntry {
  playerId: string;
  displayName: string;
  serverTimestamp: number;
  sequence: number;
  tieGroup: number;
  accepted: boolean;
}

export interface ScoreUpdate {
  playerId: string;
  delta: number;
  reason: string;
  newScore: number;
  teamId: string | null;
  newTeamScore: number | null;
}

export interface MatchResult {
  matchId: string;
  rankings: PlayerResult[];
  teamRankings: TeamResult[];
  duration: number;
  totalQuestions: number;
  format: MatchFormat;
}

export interface PlayerResult {
  playerId: string;
  displayName: string;
  avatar: string;
  rank: number;
  score: number;
  correctAnswers: number;
  incorrectAnswers: number;
  timeouts: number;
  avgBuzzTime: number | null;
  fastestBuzz: number | null;
  accuracy: number;
  teamId: string | null;
}

export interface TeamResult {
  teamId: string;
  teamName: string;
  rank: number;
  score: number;
  members: PlayerResult[];
}

export interface DisputeData {
  id: string;
  matchId: string;
  questionId: string;
  requesterId: string;
  requesterName: string;
  type: 'buzzer_order' | 'answer_judgment' | 'question_content' | 'score_error';
  description: string;
  status: DisputeStatus;
  evidence: Record<string, unknown>;
  resolution: string | null;
  resolvedBy: string | null;
  createdAt: number;
  resolvedAt: number | null;
}

// ── Socket Event Payloads ────────────────────────────────────

// Client → Server
export interface C2S_CreateRoom {
  settings: Partial<RoomSettings>;
}

export interface C2S_JoinRoom {
  joinCode: string;
  displayName: string;
  asSpectator?: boolean;
}

export interface C2S_Ready {
  ready: boolean;
}

export interface C2S_Configure {
  settings: Partial<RoomSettings>;
}

export interface C2S_Buzz {
  matchId: string;
  questionId: string;
  stateVersion: number;
  idempotencyKey: string;
}

export interface C2S_SubmitAnswer {
  matchId: string;
  questionId: string;
  answer: string;
  stateVersion: number;
  idempotencyKey: string;
}

export interface C2S_JudgeAnswer {
  matchId: string;
  questionId: string;
  playerId: string;
  result: AnswerResult.CORRECT | AnswerResult.INCORRECT;
  reason?: string;
}

export interface C2S_CreateDispute {
  matchId: string;
  questionId: string;
  type: DisputeData['type'];
  description: string;
}

export interface C2S_ResolveDispute {
  disputeId: string;
  resolution: 'upheld' | 'overridden' | 'dismissed';
  reason: string;
  scoreAdjustments?: Array<{ playerId: string; delta: number }>;
}

export interface C2S_TeamJoin {
  teamId: string;
}

export interface C2S_ChatMessage {
  text: string;
}

// Server → Client
export interface S2C_RoomState {
  room: RoomState;
  yourId: string;
}

export interface S2C_MatchState {
  match: MatchState;
  question?: QuestionDisplay;
  buzzer?: BuzzerState;
}

export interface S2C_Error {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface S2C_TimerDeadline {
  type: 'buzz' | 'answer' | 'match';
  deadline: number;
  remaining: number;
  totalDuration?: number;
}

export interface S2C_ChatMessage {
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

// ── Socket Event Names ───────────────────────────────────────

export const ClientEvents = {
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_READY: 'room:ready',
  HOST_CONFIGURE: 'host:configure',
  MATCH_START: 'match:start',
  MATCH_PAUSE: 'match:pause',
  MATCH_RESUME: 'match:resume',
  QUESTION_BUZZ: 'question:request-buzz',
  ANSWER_SUBMIT: 'answer:submit',
  HOST_JUDGE: 'host:judge-answer',
  HOST_REVEAL: 'host:reveal',
  HOST_SKIP: 'host:skip-question',
  HOST_CANCEL: 'host:cancel-question',
  HOST_NEXT: 'host:next-question',
  HOST_RESTART: 'host:restart-question',
  HOST_SELECT_TURN: 'host:select-turn',
  HOST_REMOVE_PLAYER: 'host:remove-player',
  HOST_TRANSFER: 'host:transfer',
  HOST_CORRECT_SCORE: 'host:correct-score',
  DISPUTE_CREATE: 'dispute:create',
  HOST_RESOLVE_DISPUTE: 'host:resolve-dispute',
  TEAM_JOIN: 'team:join',
  CHAT_SEND: 'chat:send',
  HOST_NOTIFY_READY: 'host:notify-ready',
} as const;

export const ServerEvents = {
  ROOM_STATE: 'room:state',
  ROOM_MEMBER_JOINED: 'room:member-joined',
  ROOM_MEMBER_LEFT: 'room:member-left',
  ROOM_MEMBER_UPDATED: 'room:member-updated',
  ROOM_SETTINGS_UPDATED: 'room:settings-updated',
  ROOM_LOCKED: 'room:locked',
  LOBBY_READY_ALERT: 'lobby:ready-alert',
  MATCH_STATE: 'match:state',
  MATCH_STARTED: 'match:started',
  MATCH_PAUSED: 'match:paused',
  MATCH_RESUMED: 'match:resumed',
  MATCH_COMPLETED: 'match:completed',
  QUESTION_OPENED: 'question:opened',
  QUESTION_REVEALED: 'question:revealed',
  QUESTION_CANCELLED: 'question:cancelled',
  BUZZER_ACCEPTED: 'buzzer:accepted',
  BUZZER_REJECTED: 'buzzer:rejected',
  BUZZER_ORDER: 'buzzer:order',
  ANSWER_TURN_STARTED: 'answer:turn-started',
  ANSWER_JUDGED: 'answer:judged',
  SCORE_UPDATED: 'score:updated',
  TIMER_DEADLINE: 'timer:deadline',
  DISPUTE_CREATED: 'dispute:created',
  DISPUTE_UPDATED: 'dispute:updated',
  CONNECTION_RECOVERED: 'connection:recovered',
  CHAT_MESSAGE: 'chat:message',
  ERROR: 'error',
} as const;

// ── Default Settings ─────────────────────────────────────────

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  visibility: RoomVisibility.PRIVATE,
  maxPlayers: 8,
  spectatorAllowed: true,
  guestPolicy: GuestPolicy.ALLOWED,
  joinPolicy: JoinPolicy.OPEN,
  matchFormat: MatchFormat.FIXED_QUESTIONS,
  questionCount: 10,
  matchDuration: 300,
  targetScore: 100,
  targetScoreEndBehavior: TargetScoreEndBehavior.FINISH_QUESTION,
  suddenDeath: false,
  questionSource: QuestionSource.BUILTIN,
  questionCategory: QuestionCategory.GENERAL_KNOWLEDGE,
  questionDifficulty: QuestionDifficulty.MEDIUM,
  questionLanguage: SupportedLanguage.ENGLISH,
  answerMode: AnswerJudgingMode.AUTOMATIC,
  wrongAnswerPolicy: WrongAnswerPolicy.ELIMINATION,
  correctPoints: 10,
  incorrectPenalty: 0,
  speedBonus: false,
  speedBonusMax: 5,
  allowNegativeScore: false,
  minimumScore: 0,
  buzzTimerSeconds: 10,
  answerTimerSeconds: 15,
  tieWindowMs: 50,
  hostDisconnectGracePeriod: 30,
  teamMode: false,
  teamSize: 2,
  teamBuzzerPolicy: TeamBuzzerPolicy.ANY_MEMBER,
  teamAnswerPolicy: TeamAnswerPolicy.ANY_MEMBER,
  interfaceLanguage: SupportedLanguage.ENGLISH,
};

// ── Utility Types ────────────────────────────────────────────

export type AuditAction =
  | 'score_correction'
  | 'question_cancelled'
  | 'buzzer_override'
  | 'answer_override'
  | 'player_removed'
  | 'host_transferred'
  | 'dispute_resolved'
  | 'question_skipped'
  | 'match_paused'
  | 'match_resumed'
  | 'settings_changed';

export interface AuditEntry {
  id: string;
  action: AuditAction;
  actorId: string;
  actorName: string;
  targetId: string | null;
  reason: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  matchId: string | null;
  roomId: string;
  timestamp: number;
}
