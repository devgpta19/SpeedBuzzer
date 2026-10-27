// ═══════════════════════════════════════════════════════════════
// Speed Buzzer — Shared Type Definitions
// ═══════════════════════════════════════════════════════════════
// ── Match State Machine ──────────────────────────────────────
export var MatchPhase;
(function (MatchPhase) {
    MatchPhase["ROOM_OPEN"] = "ROOM_OPEN";
    MatchPhase["LOBBY"] = "LOBBY";
    MatchPhase["MATCH_READY"] = "MATCH_READY";
    MatchPhase["QUESTION_PREPARING"] = "QUESTION_PREPARING";
    MatchPhase["BUZZ_OPEN"] = "BUZZ_OPEN";
    MatchPhase["ANSWER_TURN"] = "ANSWER_TURN";
    MatchPhase["JUDGING"] = "JUDGING";
    MatchPhase["ANSWER_REVEAL"] = "ANSWER_REVEAL";
    MatchPhase["QUESTION_COMPLETE"] = "QUESTION_COMPLETE";
    MatchPhase["MATCH_PAUSED"] = "MATCH_PAUSED";
    MatchPhase["MATCH_COMPLETE"] = "MATCH_COMPLETE";
    MatchPhase["ROOM_CLOSED"] = "ROOM_CLOSED";
})(MatchPhase || (MatchPhase = {}));
// ── Enums ────────────────────────────────────────────────────
export var RoomVisibility;
(function (RoomVisibility) {
    RoomVisibility["PRIVATE"] = "private";
    RoomVisibility["PUBLIC"] = "public";
})(RoomVisibility || (RoomVisibility = {}));
export var RoomStatus;
(function (RoomStatus) {
    RoomStatus["OPEN"] = "open";
    RoomStatus["IN_GAME"] = "in_game";
    RoomStatus["CLOSED"] = "closed";
})(RoomStatus || (RoomStatus = {}));
export var MemberRole;
(function (MemberRole) {
    MemberRole["HOST"] = "host";
    MemberRole["PLAYER"] = "player";
    MemberRole["SPECTATOR"] = "spectator";
})(MemberRole || (MemberRole = {}));
export var ConnectionStatus;
(function (ConnectionStatus) {
    ConnectionStatus["CONNECTED"] = "connected";
    ConnectionStatus["DISCONNECTED"] = "disconnected";
    ConnectionStatus["RECONNECTING"] = "reconnecting";
})(ConnectionStatus || (ConnectionStatus = {}));
export var GuestPolicy;
(function (GuestPolicy) {
    GuestPolicy["ALLOWED"] = "allowed";
    GuestPolicy["ACCOUNT_REQUIRED"] = "account_required";
})(GuestPolicy || (GuestPolicy = {}));
export var JoinPolicy;
(function (JoinPolicy) {
    JoinPolicy["OPEN"] = "open";
    JoinPolicy["LOCKED"] = "locked";
    JoinPolicy["SPECTATOR_ONLY"] = "spectator_only";
})(JoinPolicy || (JoinPolicy = {}));
export var MatchFormat;
(function (MatchFormat) {
    MatchFormat["FIXED_QUESTIONS"] = "fixed_questions";
    MatchFormat["TIMED"] = "timed";
    MatchFormat["TARGET_SCORE"] = "target_score";
})(MatchFormat || (MatchFormat = {}));
export var WrongAnswerPolicy;
(function (WrongAnswerPolicy) {
    WrongAnswerPolicy["ELIMINATION"] = "elimination";
    WrongAnswerPolicy["REBUZZ"] = "rebuzz";
    WrongAnswerPolicy["PENALTY"] = "penalty";
})(WrongAnswerPolicy || (WrongAnswerPolicy = {}));
export var TargetScoreEndBehavior;
(function (TargetScoreEndBehavior) {
    TargetScoreEndBehavior["FINISH_QUESTION"] = "finish_question";
    TargetScoreEndBehavior["IMMEDIATE"] = "immediate";
})(TargetScoreEndBehavior || (TargetScoreEndBehavior = {}));
export var QuestionDifficulty;
(function (QuestionDifficulty) {
    QuestionDifficulty["EASY"] = "easy";
    QuestionDifficulty["MEDIUM"] = "medium";
    QuestionDifficulty["HARD"] = "hard";
})(QuestionDifficulty || (QuestionDifficulty = {}));
export var QuestionSource;
(function (QuestionSource) {
    QuestionSource["BUILTIN"] = "builtin";
    QuestionSource["AI_GENERATED"] = "ai_generated";
    QuestionSource["HOST_CUSTOM"] = "host_custom";
    QuestionSource["MIXED"] = "mixed";
})(QuestionSource || (QuestionSource = {}));
export var QuestionStatus;
(function (QuestionStatus) {
    QuestionStatus["DRAFT"] = "draft";
    QuestionStatus["PENDING_REVIEW"] = "pending_review";
    QuestionStatus["APPROVED"] = "approved";
    QuestionStatus["REJECTED"] = "rejected";
    QuestionStatus["RETIRED"] = "retired";
    QuestionStatus["EMERGENCY_DISABLED"] = "emergency_disabled";
})(QuestionStatus || (QuestionStatus = {}));
export var AnswerJudgingMode;
(function (AnswerJudgingMode) {
    AnswerJudgingMode["AUTOMATIC"] = "automatic";
    AnswerJudgingMode["MANUAL"] = "manual";
    AnswerJudgingMode["HYBRID"] = "hybrid";
})(AnswerJudgingMode || (AnswerJudgingMode = {}));
export var AnswerResult;
(function (AnswerResult) {
    AnswerResult["CORRECT"] = "correct";
    AnswerResult["INCORRECT"] = "incorrect";
    AnswerResult["TIMEOUT"] = "timeout";
    AnswerResult["PENDING"] = "pending";
})(AnswerResult || (AnswerResult = {}));
export var BuzzerAcceptance;
(function (BuzzerAcceptance) {
    BuzzerAcceptance["ACCEPTED"] = "accepted";
    BuzzerAcceptance["REJECTED_INELIGIBLE"] = "rejected_ineligible";
    BuzzerAcceptance["REJECTED_LATE"] = "rejected_late";
    BuzzerAcceptance["REJECTED_DUPLICATE"] = "rejected_duplicate";
    BuzzerAcceptance["REJECTED_PHASE"] = "rejected_phase";
    BuzzerAcceptance["REJECTED_RATE_LIMIT"] = "rejected_rate_limit";
})(BuzzerAcceptance || (BuzzerAcceptance = {}));
export var DisputeStatus;
(function (DisputeStatus) {
    DisputeStatus["OPEN"] = "open";
    DisputeStatus["UNDER_REVIEW"] = "under_review";
    DisputeStatus["UPHELD"] = "upheld";
    DisputeStatus["OVERRIDDEN"] = "overridden";
    DisputeStatus["DISMISSED"] = "dismissed";
})(DisputeStatus || (DisputeStatus = {}));
export var TeamBuzzerPolicy;
(function (TeamBuzzerPolicy) {
    TeamBuzzerPolicy["ANY_MEMBER"] = "any_member";
    TeamBuzzerPolicy["CAPTAIN_ONLY"] = "captain_only";
})(TeamBuzzerPolicy || (TeamBuzzerPolicy = {}));
export var TeamAnswerPolicy;
(function (TeamAnswerPolicy) {
    TeamAnswerPolicy["ANY_MEMBER"] = "any_member";
    TeamAnswerPolicy["CAPTAIN_ONLY"] = "captain_only";
})(TeamAnswerPolicy || (TeamAnswerPolicy = {}));
export var QuestionCategory;
(function (QuestionCategory) {
    QuestionCategory["GENERAL_KNOWLEDGE"] = "general_knowledge";
    QuestionCategory["SCIENCE"] = "science";
    QuestionCategory["HISTORY"] = "history";
    QuestionCategory["GEOGRAPHY"] = "geography";
    QuestionCategory["SPORTS"] = "sports";
    QuestionCategory["ENTERTAINMENT"] = "entertainment";
    QuestionCategory["LITERATURE"] = "literature";
    QuestionCategory["TECHNOLOGY"] = "technology";
    QuestionCategory["MATHEMATICS"] = "mathematics";
    QuestionCategory["CURRENT_AFFAIRS"] = "current_affairs";
    QuestionCategory["ART_CULTURE"] = "art_culture";
    QuestionCategory["FOOD_DRINK"] = "food_drink";
    QuestionCategory["NATURE"] = "nature";
    QuestionCategory["MUSIC"] = "music";
    QuestionCategory["MOVIES_TV"] = "movies_tv";
    QuestionCategory["MYTHOLOGY"] = "mythology";
    QuestionCategory["POLITICS"] = "politics";
    QuestionCategory["ECONOMICS"] = "economics";
    QuestionCategory["MIXED"] = "mixed";
})(QuestionCategory || (QuestionCategory = {}));
export var SupportedLanguage;
(function (SupportedLanguage) {
    SupportedLanguage["ENGLISH"] = "en";
    SupportedLanguage["HINDI"] = "hi";
})(SupportedLanguage || (SupportedLanguage = {}));
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
};
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
};
// ── Default Settings ─────────────────────────────────────────
export const DEFAULT_ROOM_SETTINGS = {
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
//# sourceMappingURL=index.js.map