export declare enum MatchPhase {
    ROOM_OPEN = "ROOM_OPEN",
    LOBBY = "LOBBY",
    MATCH_READY = "MATCH_READY",
    QUESTION_PREPARING = "QUESTION_PREPARING",
    BUZZ_OPEN = "BUZZ_OPEN",
    ANSWER_TURN = "ANSWER_TURN",
    JUDGING = "JUDGING",
    ANSWER_REVEAL = "ANSWER_REVEAL",
    QUESTION_COMPLETE = "QUESTION_COMPLETE",
    MATCH_PAUSED = "MATCH_PAUSED",
    MATCH_COMPLETE = "MATCH_COMPLETE",
    ROOM_CLOSED = "ROOM_CLOSED"
}
export declare enum RoomVisibility {
    PRIVATE = "private",
    PUBLIC = "public"
}
export declare enum RoomStatus {
    OPEN = "open",
    IN_GAME = "in_game",
    CLOSED = "closed"
}
export declare enum MemberRole {
    HOST = "host",
    PLAYER = "player",
    SPECTATOR = "spectator"
}
export declare enum ConnectionStatus {
    CONNECTED = "connected",
    DISCONNECTED = "disconnected",
    RECONNECTING = "reconnecting"
}
export declare enum GuestPolicy {
    ALLOWED = "allowed",
    ACCOUNT_REQUIRED = "account_required"
}
export declare enum JoinPolicy {
    OPEN = "open",
    LOCKED = "locked",
    SPECTATOR_ONLY = "spectator_only"
}
export declare enum MatchFormat {
    FIXED_QUESTIONS = "fixed_questions",
    TIMED = "timed",
    TARGET_SCORE = "target_score"
}
export declare enum WrongAnswerPolicy {
    ELIMINATION = "elimination",
    REBUZZ = "rebuzz",
    PENALTY = "penalty"
}
export declare enum TargetScoreEndBehavior {
    FINISH_QUESTION = "finish_question",
    IMMEDIATE = "immediate"
}
export declare enum QuestionDifficulty {
    EASY = "easy",
    MEDIUM = "medium",
    HARD = "hard"
}
export declare enum QuestionSource {
    BUILTIN = "builtin",
    AI_GENERATED = "ai_generated",
    HOST_CUSTOM = "host_custom",
    MIXED = "mixed"
}
export declare enum QuestionStatus {
    DRAFT = "draft",
    PENDING_REVIEW = "pending_review",
    APPROVED = "approved",
    REJECTED = "rejected",
    RETIRED = "retired",
    EMERGENCY_DISABLED = "emergency_disabled"
}
export declare enum AnswerJudgingMode {
    AUTOMATIC = "automatic",
    MANUAL = "manual",
    HYBRID = "hybrid"
}
export declare enum AnswerResult {
    CORRECT = "correct",
    INCORRECT = "incorrect",
    TIMEOUT = "timeout",
    PENDING = "pending"
}
export declare enum BuzzerAcceptance {
    ACCEPTED = "accepted",
    REJECTED_INELIGIBLE = "rejected_ineligible",
    REJECTED_LATE = "rejected_late",
    REJECTED_DUPLICATE = "rejected_duplicate",
    REJECTED_PHASE = "rejected_phase",
    REJECTED_RATE_LIMIT = "rejected_rate_limit"
}
export declare enum DisputeStatus {
    OPEN = "open",
    UNDER_REVIEW = "under_review",
    UPHELD = "upheld",
    OVERRIDDEN = "overridden",
    DISMISSED = "dismissed"
}
export declare enum TeamBuzzerPolicy {
    ANY_MEMBER = "any_member",
    CAPTAIN_ONLY = "captain_only"
}
export declare enum TeamAnswerPolicy {
    ANY_MEMBER = "any_member",
    CAPTAIN_ONLY = "captain_only"
}
export declare enum QuestionCategory {
    GENERAL_KNOWLEDGE = "general_knowledge",
    SCIENCE = "science",
    HISTORY = "history",
    GEOGRAPHY = "geography",
    SPORTS = "sports",
    ENTERTAINMENT = "entertainment",
    LITERATURE = "literature",
    TECHNOLOGY = "technology",
    MATHEMATICS = "mathematics",
    CURRENT_AFFAIRS = "current_affairs",
    ART_CULTURE = "art_culture",
    FOOD_DRINK = "food_drink",
    NATURE = "nature",
    MUSIC = "music",
    MOVIES_TV = "movies_tv",
    MYTHOLOGY = "mythology",
    POLITICS = "politics",
    ECONOMICS = "economics",
    MIXED = "mixed"
}
export declare enum SupportedLanguage {
    ENGLISH = "en",
    HINDI = "hi"
}
export interface RoomSettings {
    visibility: RoomVisibility;
    maxPlayers: number;
    spectatorAllowed: boolean;
    guestPolicy: GuestPolicy;
    joinPolicy: JoinPolicy;
    matchFormat: MatchFormat;
    questionCount: number;
    matchDuration: number;
    targetScore: number;
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
    tieWindowMs: number;
    hostDisconnectGracePeriod: number;
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
    scores: Record<string, number>;
    teamScores: Record<string, number>;
    startedAt: number;
    matchDeadline: number | null;
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
    deadline: number | null;
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
    scoreAdjustments?: Array<{
        playerId: string;
        delta: number;
    }>;
}
export interface C2S_TeamJoin {
    teamId: string;
}
export interface C2S_ChatMessage {
    text: string;
}
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
export declare const ClientEvents: {
    readonly ROOM_CREATE: "room:create";
    readonly ROOM_JOIN: "room:join";
    readonly ROOM_LEAVE: "room:leave";
    readonly ROOM_READY: "room:ready";
    readonly HOST_CONFIGURE: "host:configure";
    readonly MATCH_START: "match:start";
    readonly MATCH_PAUSE: "match:pause";
    readonly MATCH_RESUME: "match:resume";
    readonly QUESTION_BUZZ: "question:request-buzz";
    readonly ANSWER_SUBMIT: "answer:submit";
    readonly HOST_JUDGE: "host:judge-answer";
    readonly HOST_REVEAL: "host:reveal";
    readonly HOST_SKIP: "host:skip-question";
    readonly HOST_CANCEL: "host:cancel-question";
    readonly HOST_NEXT: "host:next-question";
    readonly HOST_RESTART: "host:restart-question";
    readonly HOST_SELECT_TURN: "host:select-turn";
    readonly HOST_REMOVE_PLAYER: "host:remove-player";
    readonly HOST_TRANSFER: "host:transfer";
    readonly HOST_CORRECT_SCORE: "host:correct-score";
    readonly DISPUTE_CREATE: "dispute:create";
    readonly HOST_RESOLVE_DISPUTE: "host:resolve-dispute";
    readonly TEAM_JOIN: "team:join";
    readonly CHAT_SEND: "chat:send";
    readonly HOST_NOTIFY_READY: "host:notify-ready";
};
export declare const ServerEvents: {
    readonly ROOM_STATE: "room:state";
    readonly ROOM_MEMBER_JOINED: "room:member-joined";
    readonly ROOM_MEMBER_LEFT: "room:member-left";
    readonly ROOM_MEMBER_UPDATED: "room:member-updated";
    readonly ROOM_SETTINGS_UPDATED: "room:settings-updated";
    readonly ROOM_LOCKED: "room:locked";
    readonly LOBBY_READY_ALERT: "lobby:ready-alert";
    readonly MATCH_STATE: "match:state";
    readonly MATCH_STARTED: "match:started";
    readonly MATCH_PAUSED: "match:paused";
    readonly MATCH_RESUMED: "match:resumed";
    readonly MATCH_COMPLETED: "match:completed";
    readonly QUESTION_OPENED: "question:opened";
    readonly QUESTION_REVEALED: "question:revealed";
    readonly QUESTION_CANCELLED: "question:cancelled";
    readonly BUZZER_ACCEPTED: "buzzer:accepted";
    readonly BUZZER_REJECTED: "buzzer:rejected";
    readonly BUZZER_ORDER: "buzzer:order";
    readonly ANSWER_TURN_STARTED: "answer:turn-started";
    readonly ANSWER_JUDGED: "answer:judged";
    readonly SCORE_UPDATED: "score:updated";
    readonly TIMER_DEADLINE: "timer:deadline";
    readonly DISPUTE_CREATED: "dispute:created";
    readonly DISPUTE_UPDATED: "dispute:updated";
    readonly CONNECTION_RECOVERED: "connection:recovered";
    readonly CHAT_MESSAGE: "chat:message";
    readonly ERROR: "error";
};
export declare const DEFAULT_ROOM_SETTINGS: RoomSettings;
export type AuditAction = 'score_correction' | 'question_cancelled' | 'buzzer_override' | 'answer_override' | 'player_removed' | 'host_transferred' | 'dispute_resolved' | 'question_skipped' | 'match_paused' | 'match_resumed' | 'settings_changed';
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
//# sourceMappingURL=index.d.ts.map