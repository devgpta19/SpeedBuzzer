# Speed Buzzer — End-to-End Product, Engineering, and Deployment Specification

**Document type:** Product Requirements Document (PRD) + Technical Design + Implementation Plan  
**Status:** Requirements baseline confirmed; implementation has not started  
**Version:** 1.0  
**Last updated:** 2026-10-26  
**Primary objective:** Build a fair, responsive, real-time multiplayer general-knowledge buzzer game and publish it through ChatGPT Sites if the account and runtime support the required functionality.

---

## 1. Executive Summary

Speed Buzzer is a real-time multiplayer quiz and buzzer platform. A host creates a room, invites players by room code or link, selects a game format and question settings, and starts a live match. Players join from separate devices and locations. When a question opens, players race to buzz. The authoritative server determines buzzer order, and the first eligible player gets the first chance to answer. If that player answers incorrectly or times out, the next eligible player in the recorded order receives a chance, subject to the room's wrong-answer rules.

The product combines:
- Live multiplayer rooms and server-authoritative buzzer ordering.
- Host-controlled and automatic answer judging.
- A curated question bank plus AI-generated questions with quality controls.
- Individual and team play.
- Timed matches, fixed-question matches, target-score matches, sudden death, and leaderboards.
- Accounts, guest sessions, player profiles, progression, practice, tournaments, social features, spectators, and administration.
- Reconnection, audit logs, disputes, anti-abuse protections, accessibility, and responsive/PWA support.
- A cost-conscious initial deployment strategy, with optional monetization deliberately disabled at launch.

### 1.1 Product principles

1. **Fairness first:** The server—not a player's device—owns match state, timer truth, buzzer ordering, scoring, and eligibility.
2. **Correctness over volume:** Prefer verified built-in questions over questionable generated questions.
3. **Host control with auditability:** Host overrides are possible but logged with a reason.
4. **Secure by default:** Never send correct answers or unrevealed question metadata to player clients before permitted reveal.
5. **Mobile first:** The core experience must work on phones, tablets, and desktops.
6. **Phased delivery:** Ship a robust playable core before enabling every advanced platform feature.
7. **Cost awareness:** Start with free or low-cost services where technically reliable; monitor usage and upgrade when needed.
8. **No pay-to-win:** Future monetization must not grant gameplay advantages.
9. **Deployment honesty:** ChatGPT Sites eligibility and runtime constraints must be checked before claiming an in-ChatGPT deployment is possible.
10. **No silent data leakage:** Private-room content, account data, unpublished questions, and moderation data must be access-controlled.

---

## 2. Goals and Non-Goals

### 2.1 Goals

- Allow multiple people on separate devices and networks to play the same live match.
- Provide a reliable, server-authoritative buzzer system with deterministic handling of near-simultaneous presses.
- Support automatic answer checking and host/manual judging.
- Offer a hybrid curated + AI question pipeline with validation, fallback, and review.
- Support guests initially and optional registered accounts.
- Preserve match state across disconnects and temporary host loss.
- Support individual and team formats.
- Provide practice, stats, tournaments, social features, spectators, and admin operations through planned phases.
- Deliver an installable responsive PWA if the chosen runtime permits it.
- Publish a public URL through ChatGPT Sites if the user's plan, account, region, and Sites runtime support the required application.
- Otherwise provide a transparent, documented external-hosting fallback only if the assignment accepts it.

### 2.2 Non-goals for the initial release

- Native Android or iOS apps. The initial target is a responsive website/PWA; native apps may follow later.
- Paid subscriptions, cosmetic purchases, ads, or payment processing at launch.
- Pay-to-win features.
- Unmoderated public chat or voice.
- A claim that every AI-generated question is factually correct merely because a model supplies a confidence score.
- Assuming a particular framework, database, background worker, or external service is supported by ChatGPT Sites without verifying it.
- Promising perfect network-latency fairness. Physical click time cannot be inferred perfectly across the internet; the system must use a documented server-arrival policy.

---

## 3. Users and Roles

### 3.1 Guest player
- Joins with a display name and secure guest session.
- Receives a temporary avatar/color.
- Can play when the room's guest policy permits.
- Can participate in supported casual games and practice.
- May have limited persistence compared with registered accounts.
- Can later claim eligible guest history through a secure, explicit account-claim process.

### 3.2 Registered player
- Has a unique username and authenticated account.
- Has a profile, avatar/profile image or predefined avatar, display name, colors, stats, history, achievements, XP, levels, and privacy settings.
- Can send and accept friend requests, manage blocks, join parties, receive invites, and enter eligible competitive modes.
- Can access their own historical match/practice information according to privacy and retention policies.

### 3.3 Host
- Creates and configures rooms and matches.
- Controls room visibility, joining, game format, timers, scoring, question source, answer mode, language, wrong-answer rules, and team settings.
- Starts, pauses, resumes, skips, replaces, cancels, or ends questions/matches as permitted.
- Judges manual answers and may override automatic judgments.
- May correct scores, handle disputes, remove/mute players, lock rooms, reassign host, and manage reveal actions.
- Sensitive overrides require a reason and are audit-logged.
- Cannot bypass server authorization or alter hidden state by editing client messages.

### 3.4 Spectator
- Joins in read-only mode when permitted.
- Cannot buzz, answer, score, change match settings, or call host/admin actions.
- Sees only information appropriate to the spectator policy and reveal phase.
- May be subject to delayed viewing in broadcast/tournament contexts.

### 3.5 Administrator/moderator
- Manages global question bank, AI/question validation settings, approvals, user reports, moderation, bans/suspensions, XP/achievement rules, tournaments, and system settings.
- Monitors live rooms, disputes, suspicious activity, AI quotas/costs, system health, database/realtime performance, and errors.
- Can enable maintenance mode and feature flags.
- All privileged actions require role-based access control and audit logs.

### 3.6 Team captain/spokesperson
- Used in team mode where configured.
- May be the only player permitted to submit the team's answer, or may coordinate answers under host-configured rules.
- Team buzzer eligibility is configurable by the host.

---

## 4. Confirmed Product Requirements

### 4.1 Rooms and joining

- Host can create a room.
- Each room has a join code and invitation URL.
- Host can choose private room or public/discoverable room.
- Public room listing is available only when the host explicitly enables public visibility.
- Private rooms must not appear in public listings or search.
- Host can lock/unlock the room and control joining after the match starts.
- Host configures maximum player count.
- Spectators can be allowed even when the player limit is reached, if host permits.
- Guest access or account-required access is configurable.
- Lobby shows connected players and their readiness/connection status.
- Reconnecting players should recover their existing session and match state where possible.
- The system must handle duplicate joins, expired room codes, room closure, and full-room responses cleanly.
- In-progress joining follows a host-configured policy: disallow, spectator-only, or allow as an eligible player at a safe boundary.

### 4.2 Match and question modes

- Fixed question count.
- Timed match.
- Target-score match.
- Sudden-death tiebreaker for ties when enabled.
- Final leaderboard showing scores and relevant performance metrics.
- Target-score end behavior must be explicitly configured: default recommendation is finish the current question before ending, unless the host selects immediate end.
- Match summary includes score, accuracy, answer performance, and buzzer statistics when data is available.
- Practice statistics are separate from official competitive rankings.

### 4.3 Questions and content sources

- Hybrid question source: built-in curated bank plus AI generation.
- If AI is unavailable, over quota, times out, or fails validation, fall back to verified built-in questions.
- Host selects category, difficulty (Easy/Medium/Hard), question count, language, and question source.
- Question source can be built-in, AI-generated, host-custom, or a supported combination.
- Host may create room-specific custom questions.
- Private custom questions remain private unless an administrator/owner explicitly approves them for the global bank.
- Question data can include prompt, correct answer, acceptable aliases, explanation, category, difficulty, language, source metadata, validation state, and timestamps.
- Correct answers and hidden explanations must not be sent to player clients before reveal.
- Question duplicates should be detected, including likely semantic duplicates where practical.
- Questions with uncertain, ambiguous, contradictory, or invalid answers must be rejected or routed to review.
- Administrative review queue supports approval, rejection, editing, version history, and emergency removal.
- If a question is found to be incorrect during a match, the host can cancel it and restore affected scores through an audited workflow.

### 4.4 Answer judgment

- Hybrid manual and automatic checking.
- Automatic checking should normalize capitalization, surrounding/extra whitespace, punctuation where appropriate, and approved answer aliases.
- English and Hindi answer matching must support Unicode text.
- Spelling variants and alternative correct answers may be explicitly accepted.
- Do not rely only on simplistic exact-string equality.
- Host may override automatic result.
- Host manually judges answers when automatic checking is disabled or the question requires interpretation.
- The answer judging policy is visible to the host before the match starts.
- The server validates whether a player is eligible to answer and whether the answer timer is active.
- Accepted answer/reveal flow must not leak the answer before the permitted reveal stage.

### 4.5 Scoring

Host can configure:
- Points for a correct answer.
- Penalty for an incorrect answer, including zero penalty.
- Optional speed bonus.
- Whether scores may go below zero or a minimum score floor applies.
- Wrong-answer policy for each question or match: Elimination, Re-buzz, or Penalty/restriction.
- Whether team score and individual contribution are both tracked.

Scoring rules should be locked for the current question/round. Host may change relevant settings between questions/rounds, not in a way that retroactively changes already completed results unless using an explicit, audited correction.

### 4.6 Timers

- Separate buzzing and answering timers.
- Each timer can be configured independently and can be disabled where the mode allows.
- Host can pause and resume a match.
- Countdown is synchronized from server timestamps.
- The server is authoritative for expiration; clients render the countdown.
- If a selected player answers incorrectly or times out, the next eligible player in the recorded buzz order receives the turn if rules permit.
- The answer timer starts when that player's turn officially begins.
- Reconnection must not grant extra time or invalidate a valid server-recorded buzzer event.
- Host can adjust timer settings at safe boundaries; any mid-question override follows a defined and logged exception flow.

### 4.7 Buzzer fairness

- Server-authoritative buzzer engine.
- Each accepted buzzer request receives server-side receipt time and sequence metadata.
- Host can configure a near-simultaneous tie window from 0 to 100 milliseconds.
- Requests within the tie window are resolved deterministically using documented server-side ordering rules.
- Device clock time is not trusted.
- The UI communicates that network latency prevents perfect knowledge of the exact physical click time.
- The server rejects stale, duplicate, out-of-phase, unauthorized, and ineligible buzzer requests.
- Buzzer order is recorded for later disputes and review.
- Host may exceptionally override the winner, but the action requires a reason and is logged.

### 4.8 Wrong-answer policy

Host can choose:
1. **Elimination (default):** Once a player answers incorrectly, they cannot answer again for that question.
2. **Re-buzz:** The player may buzz again if the current rules allow it.
3. **Penalty/restriction:** Apply configured score penalty and/or a temporary restriction.

The server enforces the chosen policy, including per-question eligibility and team behavior.

### 4.9 UI and accessibility

- Premium, clean visual design with a dark theme and tasteful neon accents.
- Clear typography, strong contrast, and restrained animations.
- Mobile-first responsive layouts for phone, tablet, and desktop.
- Distinct host, player, spectator, lobby, practice, admin, and presentation layouts.
- Large, accessible buzzer control.
- Clear question, countdown, connection state, answer state, turn order, scores, and match status.
- Distinct visual feedback for correct, incorrect, timeout, turn changes, dispute status, and winner.
- Audio cues are optional and independently adjustable.
- Respect reduced-motion settings and provide non-audio visual alternatives.
- Keyboard navigation and accessible labels should be supported.
- Avoid relying on color alone to communicate result/state.

### 4.10 Audio and notifications

- Configurable sounds for buzzer, countdown, correct, incorrect, timeout, turn change, round end, and match win.
- Optional background music.
- Independent volume controls and mute options.
- Host can configure room-level audio behavior.
- Optional vibration/haptics on supported mobile devices.
- Respect browser autoplay restrictions; prompt for user interaction when necessary.
- All important audio cues have visual equivalents.

### 4.11 Host controls

Host has controls, as permitted by match phase, to:
- Start, pause, resume, and end a match.
- Start/reveal/close/skip/replace a question.
- Configure or adjust timers at permitted boundaries.
- Judge manual answers and override automatic judgments.
- Correct scores with a reason and audit event.
- Remove or mute a player.
- Lock/unlock room and change joining policy.
- Reassign host.
- Override buzzer winner in exceptional circumstances.
- Cancel a question and restore affected scores.
- Reopen a question when rules permit.
- Reveal answers/results.
- Configure spectators and broadcast visibility.
- Review dispute events.
- Configure individual/team rules and game format.

All permissions must be enforced by the server, not merely by hiding buttons. Sensitive actions include actor, timestamp, reason, prior value, and resulting value in an append-only or tamper-evident audit trail where practical.

### 4.12 Host disconnection and recovery

- Match state is owned by the server and persisted at meaningful state transitions.
- If host disconnects, apply a configurable grace period.
- Restrict sensitive host actions while the host is absent.
- If original host reconnects within the grace period, restore host control and match state.
- If host remains absent, transfer host to an eligible connected player or close/pause the room according to configured policy.
- Pause the match if state safety requires it.
- Preserve scores, answers, question phase, and valid buzzer order.
- Player disconnections are handled separately from host loss.

### 4.13 Disputes

- A player can challenge a buzzer or question result within a configurable time window.
- Limit repeated challenges per player/event and deduplicate submissions.
- Host review shows relevant server timestamps, buzzer order, answer submissions, disconnects, and prior overrides.
- Host can uphold, override, cancel the question, or restore scores as appropriate.
- Every resolution includes a reason and audit record.
- A dispute does not automatically pause the entire match unless configured.
- Question-content disputes can trigger question review/removal after the match.

### 4.14 Language support

- Initial languages: English and Hindi.
- Interface language is separate from question language.
- Host chooses quiz language.
- Architecture should allow additional languages later.
- Unicode normalization and Hindi text handling must be supported.
- Question validation should be language-aware.
- Accepted answers and aliases can vary by language.

### 4.15 Individual and team play

- Individual and team modes.
- Host configures team size.
- Host assigns teams or permits player choice.
- Captain/spokesperson is supported.
- Host chooses whether any team member can buzz or only the captain.
- Team score and individual contribution statistics are tracked.
- Team and individual modes use the same authoritative buzzer engine.
- Eligibility, answer submission, scoring, and turn order must be consistent with the chosen team rules.

### 4.16 Accounts and profiles

- Guest sessions use secure session tokens and display names.
- Optional registered accounts.
- Unique registered usernames.
- Display names and predefined/custom avatars or profile pictures, subject to moderation and safe file handling.
- Profile colors, XP, levels, achievements, stats, history, personal bests, and privacy settings.
- Temporary guest avatars are supported.
- Guest history can be claimed by a registered account through a deliberate, secure process; avoid allowing users to claim another person's history.
- Passwords must be securely hashed if password authentication is implemented.
- Session tokens must be protected and revocable.
- XP and achievements are server-awarded and cannot be client-forged.
- Cosmetic progression cannot affect gameplay.

### 4.17 Progression and rewards

- Achievements.
- Daily challenges.
- Streaks.
- Weekly objectives.
- Seasonal leaderboards.
- Competitive ranks/tiers.
- Special events.
- Cosmetic rewards such as avatars, frames, and badges.
- Anti-farming rules and abuse detection.
- No pay-to-win mechanics.
- Practice rewards and competitive rewards must follow clear rules; practice stats remain separate from official rankings where appropriate.

### 4.18 Practice system

- Solo practice.
- General-knowledge categories and Easy/Medium/Hard difficulty.
- Immediate feedback and explanations.
- Simulated AI opponents at Easy/Medium/Hard levels, with configurable simulated reaction and answer accuracy.
- Reaction-time training.
- Average and best reaction-time metrics.
- Personal practice progress/history.
- Practice results are not mixed into official competitive rankings.
- Clearly label simulated opponents and simulated reaction timing so users are not misled.

### 4.19 Social features

- Search users by username.
- Send, accept, and decline friend requests.
- Online status according to privacy settings.
- Remove/block users.
- Invite friends to games and tournaments.
- Party lobbies.
- Recent-player list.
- Report/block workflows.
- Optional room/party text chat with moderation, rate limits, and reporting.
- Privacy controls for presence, invitations, profile information, and match history.
- No unrestricted or unmoderated public messaging by default.

### 4.20 Voice chat

- Optional built-in voice chat is planned as a later phase.
- Voice chat is disabled by default and controlled by host/room settings.
- The core game remains fully playable without voice.
- Include mute controls and clear microphone permission status.
- Consider push-to-talk, participant mute, and moderation/report workflows.
- Voice chat depends on runtime and WebRTC/network support; do not promise it in ChatGPT Sites until feasibility is verified.
- Do not store voice recordings by default.
- Document any audio processing and privacy implications before release.

### 4.21 Spectators and broadcast

- Dedicated spectator/presentation URLs where supported.
- Read-only spectator authorization enforced server-side.
- Show questions, buzzer/results, and scoreboard according to reveal policy.
- Presentation mode for large screens/projectors.
- Support public/private broadcasts and tournament pages.
- Live standings.
- Optional delayed spectator viewing to reduce cheating.
- Host controls what spectators can see and whether a room can be broadcast.
- Correct answers and hidden information must not be exposed before reveal.
- Broadcast viewers cannot mutate match state.

### 4.22 Matchmaking

- Private casual rooms first.
- Public casual rooms only when host enables them.
- Ranked matchmaking based on competitive rating, planned after the core is stable.
- Ranked team matches where supported.
- Tournament matchmaking.
- Filters for language, region preference, and match format where practical.
- Casual and ranked results remain distinct.
- Anti-abuse and rating-integrity controls.
- Do not label a match “ranked” until rating, disconnect, dispute, and anti-cheat rules are implemented and tested.

### 4.23 Tournaments and competitive system

- Persistent global leaderboards and player stats.
- Tournament support with rounds, knockout stages, and finals.
- Private/public tournaments.
- Tournament standings, match history, and progression.
- Separate casual and ranked records.
- Clear handling of disconnects, disputes, ties, no-shows, and host cancellation.
- Tournament rules must be visible before players join.
- Competitive rankings must be based on server-validated results.

### 4.24 Administration and operations

- Global question-bank management and approval workflow.
- AI provider settings, quotas, usage and cost monitoring.
- User reports, chat moderation, bans/suspensions.
- Achievement and XP rule configuration.
- Match/tournament statistics.
- Live room monitoring with privacy-aware access.
- Dispute and override event logs.
- Suspicious activity detection.
- System health, errors, database performance, realtime performance, and service availability monitoring.
- Maintenance mode and feature flags.
- Secure administrator authentication, least-privilege role-based permissions, and audit logs.
- Admin tools must not expose user secrets or unnecessary private content.
- Any emergency intervention should be recorded.

### 4.25 Network resilience

- Monitor connection state and disconnections.
- Automatic reconnect with backoff.
- Secure session recovery.
- Server timestamps govern timers and state.
- Deduplicate messages and use idempotency keys where appropriate.
- Reject stale messages and messages for obsolete question/round versions.
- Clear connection status and recovery feedback in UI.
- Record network-related events for debugging/disputes.
- Reconnection does not grant extra time or reverse a valid buzzer result.
- Apply a published interrupted-turn policy consistently.
- Prevent duplicate scoring if clients retry a request.

### 4.26 Monetization

- Launch with monetization disabled.
- Keep the architecture capable of supporting optional cosmetics, premium subscriptions, or other revenue later.
- Do not integrate a payment gateway in the initial release unless separately requested.
- No pay-to-win benefits, paid speed advantages, answer advantages, or paid scoring boosts.
- If monetization is later enabled, review legal, tax, refund, security, privacy, and platform requirements first.
- Track infrastructure and AI costs from the start so future decisions are informed.

---

## 5. Question Quality and AI Safety Pipeline

### 5.1 Required question fields

Each question record should support, as applicable:
- Stable ID and version.
- Question text.
- Canonical correct answer.
- Accepted aliases/variants.
- Explanation.
- Category and subcategory.
- Difficulty.
- Language.
- Source type: curated, AI-generated, host-custom, or imported.
- Source reference/URL where available and legally usable.
- Creation and verification timestamps.
- Validation status and quality/confidence signals.
- Reviewer/admin identity and review notes.
- Duplicate-detection fingerprint.
- Status: draft, pending review, approved, rejected, retired, or emergency-disabled.

### 5.2 Pipeline

1. Generate or ingest a candidate question.
2. Validate schema and required fields.
3. Normalize language and text safely.
4. Check for exact and likely semantic duplicates.
5. Check for ambiguity and multiple plausible answers.
6. Validate answer consistency and explanation consistency.
7. Check category, difficulty, and language fit.
8. Verify against reliable sources where practical; record source references.
9. Calculate quality/confidence signals, without treating model confidence as proof.
10. Automatically approve only when the configured policy allows it; otherwise queue for human review.
11. Store a versioned record.
12. Only serve approved/eligible questions to live matches.
13. Monitor reports and allow emergency disabling.
14. If the pipeline fails, use the verified built-in bank.

### 5.3 Verification caveat

Automated verification may not be possible for every fact, especially without reliable external sources. The system must distinguish “automatically checked,” “source-backed,” and “human reviewed.” Do not claim complete factual verification unless the process actually performed it.

### 5.4 Fairness when a question is invalid

- Host can pause or cancel the question.
- Scores and penalties applied to that question can be reversed through a transaction-like, audited operation.
- The invalid question is flagged for review.
- The system can remove it from future use without deleting its audit history.
- Affected players receive clear UI feedback.

---

## 6. Technical Architecture

### 6.1 Preferred application stack (subject to deployment-runtime verification)

- **Frontend:** React + TypeScript + Vite.
- **Styling:** SCSS; mobile-first responsive design.
- **Realtime transport:** Socket.IO or another supported WebSocket-capable transport.
- **Backend:** Node.js + Express.
- **Database:** MySQL (explicitly selected by the user).
- **Realtime scale-out/presence:** Redis when needed and when the deployment environment supports it.
- **Authentication:** Guest sessions initially; optional registered accounts.
- **AI:** Provider abstraction supporting interchangeable AI providers, with quotas, caching, validation, and fallback.
- **Hosting strategy:** Start with free/low-cost tiers where they satisfy reliability requirements; verify current limits and pricing before selection.

### 6.2 Critical ChatGPT Sites deployment constraint

The user's preferred assignment path is **ChatGPT Sites**. Current official OpenAI documentation states that Sites is available on Plus and Pro, as well as Business and Enterprise workspaces, and is not available on Free or Go. Public publishing and workspace permissions can vary by plan, region, and workspace configuration.

Therefore:
- The current Go account must not be assumed to have Sites access.
- Before implementation, verify Sites is available to the actual account and that public publishing is available.
- Do not upgrade or incur costs solely on an unverified assumption.
- Confirm the current Sites runtime supports the required interactive UI, persistent data, real-time multiplayer connections, secrets, and any required backend connection.
- ChatGPT Sites supports some web experiences but may not support every framework, database, private network, background service, or hosting pattern.
- Do not assume a separate Express process, MySQL server, Redis, or Socket.IO backend can run directly inside Sites.
- If Sites supports only the frontend/runtime portion, an externally hosted backend may be needed, if external service connections are permitted.
- If the Sites runtime cannot support the game's essential real-time behavior, document that limitation and obtain instructor approval for an external deployment or alternate architecture before proceeding.
- Do not claim that an externally hosted website is “deployed inside ChatGPT Sites.”
- Final submission must clearly state the actual deployment path and provide a tested public URL.

### 6.3 Deployment fallback (only if assignment permits)

If ChatGPT Sites is unavailable or cannot support the necessary multiplayer backend, deploy the web frontend and backend separately:
- Frontend on a suitable static/web hosting service.
- Node.js backend on a suitable application hosting service.
- Managed MySQL database.
- Redis only when required by multi-instance realtime coordination.
- HTTPS/WSS, environment secrets, health checks, backups, logs, rate limits, and deployment verification.

Provider choice must be based on current pricing, sleeping/idle behavior, persistent WebSocket support, database connection limits, data region, and free-tier terms. Never promise free permanent hosting.

### 6.4 Architecture overview

Logical components:
1. **Client application:** lobby, host controls, player game UI, spectator display, profile, practice, social UI, admin UI.
2. **Realtime gateway:** authenticated Socket.IO/WebSocket connections, room membership, event validation, rate limiting.
3. **Game engine:** authoritative state machine, question phase, buzzer order, timer deadlines, eligibility, answer turns, score calculation.
4. **Room/match service:** room creation, access rules, host transfer, player/spectator policies.
5. **Question service:** bank retrieval, custom question handling, AI pipeline, validation and fallback.
6. **Identity service:** guest sessions, accounts, profiles, permissions, friends and blocks.
7. **Competitive service:** match results, rankings, tournaments, ratings and leaderboards.
8. **Practice service:** solo sessions, simulated opponents, practice statistics.
9. **Moderation/admin service:** reports, audit trail, question review, bans and feature flags.
10. **Persistence layer:** MySQL as the system of record.
11. **Realtime coordination layer:** Redis when multiple backend instances require shared presence/pub-sub/coordination.
12. **Observability:** structured logs, metrics, error monitoring, usage/cost tracking.

### 6.5 State ownership

- Server owns all authoritative match state.
- Clients submit intents, not trusted outcomes.
- Client-side countdowns are display-only, based on server deadline timestamps.
- Score changes are computed and persisted by server logic.
- Every question/round has a version or identifier to reject stale messages.
- Reconnect restores server-known state rather than trusting client-reported state.
- Sensitive question data is selectively serialized for each role and phase.

### 6.6 Core match state machine

Recommended high-level states:
- `ROOM_OPEN`
- `LOBBY`
- `MATCH_READY`
- `QUESTION_PREPARING`
- `BUZZ_OPEN`
- `ANSWER_TURN`
- `JUDGING`
- `ANSWER_REVEAL`
- `QUESTION_COMPLETE`
- `MATCH_PAUSED`
- `MATCH_COMPLETE`
- `ROOM_CLOSED`

Transitions must be explicit and server-validated. Examples:
- A buzzer is accepted only during `BUZZ_OPEN`.
- An answer is accepted only from the currently eligible player/team during `ANSWER_TURN`.
- Judging transitions to reveal/next eligible player/complete according to the rules.
- Host pause freezes relevant game progression according to the defined timer policy.
- Reconnect does not move state backward.
- Cancelled questions have a dedicated audited transition and score-reversal operation.

---

## 7. Data Model (Logical Baseline)

Use migrations and foreign keys where appropriate. Names are illustrative and may be refined during implementation.

### 7.1 Identity and profiles
- `users`: id, username, normalized_username, display_name, password_hash or external-auth reference, status, created_at, updated_at.
- `guest_sessions`: id, secure_token_hash, display_name, temporary_avatar, created_at, expires_at, claimed_by_user_id nullable.
- `sessions`: id, user_id/guest_session_id, token_hash, created_at, expires_at, revoked_at.
- `profiles`: user_id, avatar reference, profile color, bio if allowed, privacy settings.
- `user_stats`: user_id, aggregate match/practice metrics.
- `friend_requests`: requester_id, recipient_id, status, timestamps.
- `friendships`: user_id, friend_user_id, created_at.
- `user_blocks`: blocker_id, blocked_id, created_at.
- `reports`: reporter_id, reported_user_id/content reference, category, status, reviewer, timestamps.

### 7.2 Rooms and matches
- `rooms`: id, join_code_hash or code, host_id/session reference, visibility, status, max_players, spectator_allowed, guest_policy, join_policy, settings JSON/version, created_at, expires_at.
- `room_members`: room_id, user/session identity, role, connection status, team_id, joined_at, left_at.
- `matches`: id, room_id, format, status, start/end times, rules snapshot, question count, language, result status.
- `match_participants`: match_id, player/team identity, starting status, final score, rank, statistics snapshot.
- `match_questions`: match_id, question_id/version, order, state, selected rules, start/end timestamps.
- `buzzer_events`: match/question/player identity, server sequence, server received timestamp, acceptance/rejection reason, tie group/order.
- `answer_submissions`: match/question/player identity, normalized answer or protected reference, received timestamp, result, judging mode, judged_by, reason.
- `score_events`: match/question/participant, delta, reason, actor, timestamp, idempotency key.
- `match_events`: event type, actor, server timestamp, state version, safe metadata.
- `disputes`: event reference, requester, status, evidence snapshot, resolution, reviewer, reason, timestamps.
- `audit_logs`: actor, action, target, reason, before/after metadata, timestamp, correlation ID.

### 7.3 Questions
- `questions`: stable question ID, current version ID, source type, status, category, difficulty, language, created_at.
- `question_versions`: question text, canonical answer, aliases, explanation, source references, validation metadata, reviewer, version number, timestamps.
- `question_reports`: question/version, reporter, report category, status, resolution.
- `question_generation_jobs`: provider, status, quota/cost metadata, retry count, timestamps, failure reason.
- `question_review_actions`: reviewer, action, reason, version, timestamp.

### 7.4 Teams, tournaments, progression
- `teams`: id, name, owner/creator, metadata.
- `team_members`: team_id, user_id, role, joined_at.
- `tournaments`: id, name, visibility, format, rules, status, owner, start/end.
- `tournament_entries`: tournament_id, player/team, seed, status.
- `tournament_rounds`: tournament_id, round number, state.
- `tournament_matches`: tournament_id, round_id, match_id, bracket metadata.
- `ratings`: user/team, rating system, current rating, uncertainty if applicable, updated_at.
- `achievements`: definition, rules/version, active flag.
- `user_achievements`: user_id, achievement_id, awarded_at, evidence reference.
- `xp_events`: user_id, amount, source, idempotency key, timestamp.
- `challenges`: challenge definition, window, eligibility.
- `challenge_progress`: user_id, challenge_id, progress, status, reward status.

### 7.5 Operational data
- `ai_usage_events`: provider, model, estimated usage/cost, job, status, timestamp.
- `feature_flags`: key, value, rollout rules, updated_by.
- `moderation_actions`: actor, subject, action, reason, duration, timestamp.
- `system_events`: category, severity, correlation ID, safe diagnostic metadata.

### 7.6 Data model rules
- Use transactions for score application and reversal.
- Use unique constraints/idempotency keys to prevent duplicate scoring.
- Avoid storing raw session tokens; store hashes where feasible.
- Minimize personally identifiable information.
- Define retention/deletion policies for guest sessions, chat, reports, and logs.
- Use migrations rather than manually altering production schema.
- Do not expose database IDs or sensitive metadata unnecessarily in public events.

---

## 8. Realtime Protocol and Event Contract

The exact event names may change during implementation, but the contract must follow these principles.

### 8.1 Client-to-server intents
Examples:
- `room:create`
- `room:join`
- `room:leave`
- `room:ready`
- `host:configure`
- `match:start`
- `match:pause`
- `match:resume`
- `question:request-buzz`
- `answer:submit`
- `host:judge-answer`
- `host:reveal`
- `host:skip-question`
- `host:cancel-question`
- `dispute:create`
- `host:resolve-dispute`
- `chat:send`
- `friend:request`
- `invite:send`

Every intent must be authenticated/authorized, schema-validated, rate-limited, and checked against the current server state.

### 8.2 Server-to-client events
Examples:
- `room:state`
- `room:member-joined`
- `room:member-left`
- `room:locked`
- `match:state`
- `question:opened`
- `buzzer:accepted`
- `buzzer:rejected`
- `buzzer:order`
- `answer:turn-started`
- `answer:judged`
- `score:updated`
- `timer:deadline`
- `match:paused`
- `match:resumed`
- `question:revealed`
- `question:cancelled`
- `dispute:updated`
- `connection:recovered`
- `match:completed`

Events must be role-aware. A player event payload must not include correct answer fields or hidden explanation before reveal. Public broadcast events must be a narrower projection than privileged host/admin events.

### 8.3 Event contract requirements
- Include room/match/question IDs and state version where appropriate.
- Include server timestamp/deadline where needed.
- Use idempotency keys for mutation intents that may be retried.
- Return structured errors with safe messages and stable error codes.
- Never trust player-supplied timestamps for ordering or scoring.
- Avoid broadcasting private user data.
- Reject duplicate or stale events.
- Log security-relevant rejections without logging secrets.

---

## 9. Buzzer Algorithm and Timing Policy

### 9.1 Standard flow
1. Server opens buzzer phase and sets authoritative deadline.
2. Client receives state and displays the buzzer.
3. Client sends a buzz intent with current match/question version and idempotency key.
4. Server validates player/team eligibility, phase, deadline, room membership, and rate limit.
5. Server records server receipt time and a monotonic sequence.
6. Server groups requests that fall within the configured 0–100 ms tie window.
7. Server applies a deterministic ordering rule and publishes the accepted order.
8. First eligible player receives the answer turn.
9. Answer timer starts from server-controlled turn start.
10. If wrong/timeout, the next eligible player is selected according to the recorded order and wrong-answer policy.
11. When no eligible players remain, reveal/complete the question according to settings.
12. Persist relevant events and score changes.

### 9.2 Fairness statement
A networked server cannot perfectly reconstruct the physical moment each player pressed a button across different devices and network paths. Speed Buzzer therefore uses server receipt timestamps, a configured tie window, deterministic tie resolution, and transparent rules. This is fairer and more auditable than trusting client clocks, but should not be advertised as perfect latency-independent physical-click measurement.

### 9.3 Timer requirements
- Store absolute server deadlines.
- Client renders remaining time using deadline and periodic synchronization.
- Server validates against authoritative deadline.
- Pause/resume must define whether remaining time is preserved and how the deadline is recalculated.
- Every pause/resume and timer adjustment is logged.
- Timer expiry and answer/buzzer events are resolved in a deterministic server order to avoid race conditions.

---

## 10. Security, Privacy, and Anti-Abuse

### 10.1 Authentication and authorization
- Enforce role permissions server-side on every privileged action.
- Use secure, high-entropy session tokens and protect them from client-side exposure.
- Use secure cookie practices if cookie-based sessions are used.
- Use password hashing designed for passwords if passwords are stored.
- Implement session expiry, revocation, and guest-session expiry.
- Rate-limit login, room creation, join attempts, buzzes, answer submissions, chat, invites, and disputes.
- Avoid revealing whether an account exists through overly specific errors where that could enable enumeration.

### 10.2 Multiplayer integrity
- Server owns scores, timers, state, buzzer order, question eligibility, team membership, and results.
- Reject stale/replayed messages and duplicate scoring attempts.
- Validate room membership and role for every event.
- Protect against event flooding and repeated buzzer spam.
- Keep official rankings separate from practice/simulated games.
- Detect suspicious activity, repeated collusion patterns, farming, and implausible event rates; use review rather than automatic irreversible punishment where possible.
- Use auditable score adjustments.

### 10.3 Data privacy
- Collect only data necessary for gameplay, security, and stated features.
- Provide understandable privacy information before collecting profile, chat, or other personal data.
- Give users privacy controls for profile, presence, invitations, and history.
- Avoid collecting sensitive personal data.
- Do not store voice recordings by default.
- Define deletion/export/retention policies according to applicable law and platform requirements.
- Public Sites must be reviewed for accidentally exposed secrets, personal data, internal logs, unpublished questions, or admin controls.
- Public spectator output must not expose private player data or correct answers prematurely.

### 10.4 Content moderation
- Report and block mechanisms.
- Moderation queue for usernames, avatars/images, text chat, custom questions, and user reports.
- Rate limits and spam controls.
- Clear suspension/ban process with audit records.
- Define how illegal, abusive, or harmful content is handled.
- Restrict uploaded file types and sizes; scan/validate files where supported.

### 10.5 Secrets and configuration
- Never hard-code database passwords, AI keys, signing secrets, or production credentials in frontend code or public repositories.
- Use deployment secrets/environment configuration supported by the actual hosting runtime.
- Rotate compromised keys.
- Keep development and production environments separate.
- Do not assume Sites runtime secrets behave like a traditional Node server; verify official runtime documentation and supported mechanisms.

---

## 11. Reliability, Observability, and Operations

### 11.1 Reliability requirements
- Reconnect with exponential backoff and sensible limits.
- Persist state transitions and completed score events.
- Use database transactions for important mutations.
- Recover active match state after transient backend restart where the deployment architecture permits it.
- Define room expiry and cleanup.
- Handle AI provider failure gracefully.
- Ensure the game remains playable with built-in questions when AI is unavailable.
- Provide friendly error messages and recovery guidance.
- Avoid duplicate match completion, duplicate XP, or duplicate rewards on retries.

### 11.2 Observability
Track:
- Active rooms, players, spectators, and matches.
- Realtime connection counts and disconnect/reconnect rate.
- Event latency and rejected event reasons.
- Buzzer and answer timing distributions.
- Database latency and errors.
- AI job volume, failure rate, quota, latency, and estimated cost.
- Question rejection/dispute rate.
- Moderation reports and action rates.
- Deployment health and error rate.
- Hosting usage and cost where available.

### 11.3 Logs
- Structured logs with correlation IDs.
- Do not log passwords, raw tokens, AI secrets, or unnecessary answer content.
- Access to moderation/audit logs is restricted.
- Keep host overrides, score adjustments, question cancellations, bans, and admin actions auditable.
- Define log retention and access policy.

### 11.4 Backups and recovery
- Back up MySQL if supported by the chosen provider.
- Test restoration, not merely backup creation.
- Define recovery-point and recovery-time targets appropriate to the initial scale.
- Document what happens to active rooms during an outage.
- If the Sites runtime manages persistence differently, document its backup/export and retention capabilities before relying on it.

---

## 12. UX Flows

### 12.1 New player flow
1. Open public site.
2. Choose guest or sign-in/account option.
3. Enter display name if guest.
4. Join via room code/link, public listing (only if enabled), or invitation.
5. Read room rules and connection state.
6. Enter lobby; select team/ready status if enabled.
7. Play match.
8. View result and permitted stats.
9. Optionally register/claim eligible guest history.

### 12.2 Host flow
1. Create room.
2. Configure visibility, capacity, guest policy, spectators, joining policy, language, format, scoring, timers, question source, and answer mode.
3. Share room code/link.
4. Review players and readiness.
5. Start match.
6. Monitor question and buzzer state.
7. Judge/override when permitted.
8. Resolve disputes and invalid questions.
9. Complete match and show leaderboard.
10. Review match history and audit-visible host actions.

### 12.3 Spectator flow
1. Open spectator URL or join a room as spectator.
2. Server validates spectator permission.
3. Receive a read-only view with appropriate question/reveal visibility.
4. Cannot submit gameplay mutations.
5. Follow live scoreboard or delayed broadcast.

### 12.4 Practice flow
1. Choose category, difficulty, language, and practice mode.
2. Choose solo or simulated opponents.
3. Play questions with immediate feedback and explanations.
4. Review reaction-time and answer stats.
5. Save practice progress separately from official ranked results.

### 12.5 Admin question review flow
1. Open pending question queue.
2. Inspect candidate, answer, aliases, source references, language, difficulty, and validation signals.
3. Approve, edit/version, reject, or request additional review.
4. Review reports/disputes.
5. Emergency-disable a question if necessary.
6. Preserve review history and record reasons.

---

## 13. Delivery Phases

All major requirements are retained in the product roadmap. The phased approach reduces launch risk and does not silently remove requested features.

### Phase 0 — Feasibility and deployment validation
- Confirm ChatGPT Sites access for the actual account.
- Confirm public publishing is available in the user's region/workspace.
- Review Sites runtime support for interactive frontend, persistence, realtime connections, secrets, external service calls, and any required backend.
- Confirm assignment's exact definition of “deployed on ChatGPT.”
- If unsupported, obtain instructor approval for external hosting before selecting fallback.
- Prototype a minimal cross-device realtime connection and persistent test record.
- Confirm hosting costs and limitations.

**Exit criteria:** Deployment path proven with a small working prototype; no unverified assumption about Sites remains.

### Phase 1 — Playable core MVP
- Responsive lobby, room codes/links, private rooms, host/player roles.
- Guest sessions.
- Live room state and connection indicators.
- Authoritative buzzer ordering and tie window.
- Question lifecycle and timers.
- Built-in curated question bank.
- Manual and automatic answer checking.
- Scoring, wrong-answer rules, basic match formats, final leaderboard.
- Host start/pause/resume/skip/cancel controls.
- Reconnect and host-disconnect recovery basics.
- Secure server-side authorization and audit events.
- Basic admin question management.
- Production logging, health checks, rate limits, and error handling.

**Exit criteria:** Multi-device end-to-end match passes fairness, reconnection, scoring, and security tests.

### Phase 2 — Question quality and richer match settings
- AI question generation with provider abstraction and quotas.
- Validation pipeline, fallback, duplicate detection, aliases, source metadata.
- Admin review/versioning/emergency removal.
- English/Hindi question support.
- Full host controls, disputes, score correction and question cancellation rollback.
- Team mode.
- Spectator read-only view and presentation mode.
- Match statistics and history for supported identity types.

### Phase 3 — Accounts, profiles, and practice
- Registered accounts and secure sessions.
- Profile/avatar/preferences/privacy.
- Guest history claim flow.
- Solo practice and simulated opponents.
- Reaction-time training and practice metrics.
- XP, levels, achievements, daily/weekly challenges, streaks, cosmetics.
- Keep practice stats separate from official rankings.

### Phase 4 — Social and competitive features
- Friends, blocks, invites, party lobbies, recent players, moderated text chat.
- Global leaderboards and persistent statistics.
- Tournaments, rounds, knockout/finals, public/private options.
- Ranked matchmaking and ratings after integrity rules are tested.
- Region/language/format preferences.
- Anti-farming and competitive abuse review.

### Phase 5 — Voice chat and advanced broadcasts
- Optional host-controlled voice chat, disabled by default.
- Mute controls, permission UX, reporting and moderation.
- Delayed spectator viewing and richer tournament broadcast pages.
- Confirm runtime and infrastructure support before enabling.

### Phase 6 — Public launch and ongoing operations
- Security and privacy review.
- Load and chaos testing appropriate to the launch target.
- Backup/restore test.
- Deployment smoke tests and public URL verification.
- Monitoring, alerts, moderation operations, incident runbook.
- Cost dashboard and usage caps.
- Optional monetization remains disabled unless explicitly approved later.

---

## 14. Testing and Acceptance Criteria

### 14.1 Core functional tests
- Host creates room and players join from different devices.
- Invalid, expired, locked, and full-room joins are rejected correctly.
- Guest/account policy is enforced.
- Host can start and end a match.
- Question source and language settings are applied.
- Correct/incorrect answer scoring is correct for each wrong-answer policy.
- Speed bonus and negative/minimum score settings work.
- Target-score, fixed-count, timed match, and sudden death behave as configured.
- Team mode follows the configured buzz and answer policy.
- Spectators cannot mutate game state.
- Hidden correct answers are not present in client payloads before reveal.
- Host override and score correction are audited.
- Question cancellation reverses only affected score events and does not double-reverse on retry.

### 14.2 Buzzer and timer tests
- Simultaneous buzzer requests are resolved deterministically.
- 0 ms and configured tie-window boundaries are tested.
- Client clock manipulation does not affect result.
- Out-of-phase, stale, duplicate, unauthorized, and late buzzes are rejected.
- Answer timer begins at the correct server-side turn transition.
- Pause/resume preserves intended remaining time.
- Timeout and answer race conditions are deterministic.
- Reconnection does not create extra time or duplicate buzzer events.

### 14.3 Resilience tests
- Player disconnects during lobby, buzzer phase, answer turn, and result reveal.
- Host disconnects and reconnects within grace period.
- Host remains absent past grace period and fallback policy is applied.
- Backend restart/recovery is tested where supported.
- AI provider timeout/quota/error uses fallback questions.
- Database/network transient failures produce safe recovery behavior.
- Duplicate client retries do not duplicate score, XP, or rewards.

### 14.4 Security tests
- Players cannot call host/admin operations.
- Spectators cannot buzz, answer, or change settings.
- User cannot join private rooms without valid authorization.
- Hidden answers and private custom questions are not exposed.
- Session expiry/revocation works.
- Rate limiting handles spam and repeated events.
- Username/profile/chat inputs are validated and rendered safely.
- Uploads, if implemented, are constrained and validated.
- Secrets are absent from browser bundles and public logs.
- Audit log access is restricted.

### 14.5 Question quality tests
- Missing answers and malformed records are rejected.
- Duplicate questions are flagged.
- Ambiguous and unsupported claims are rejected or sent for review.
- Source references and review status are displayed accurately.
- English/Hindi Unicode and answer aliases work.
- Invalid questions can be removed and score effects reversed.
- Fallback bank is used if AI generation or verification fails.

### 14.6 Accessibility and usability
- Phone, tablet, and desktop layouts are tested.
- Main controls work by keyboard where practical.
- Contrast and visible focus states are adequate.
- Reduced-motion preference is respected.
- Sound is optional; important feedback has a visual alternative.
- Loading, empty, error, reconnecting, locked, and full-room states are clear.

### 14.7 Deployment acceptance
- Deployment URL is real, reachable, and tested.
- Public/private access settings match assignment requirements.
- At least two players can play from separate networks/devices.
- Persistent state behaves as documented after refresh/reconnect.
- Production secrets are configured securely.
- Health and error monitoring work.
- A smoke-test checklist and known limitations are delivered.
- If ChatGPT Sites is the deployment target, verify the published URL and actual runtime behavior; do not use an external URL as evidence of an in-Sites deployment.

---

## 15. Performance and Scale Targets

The initial release should define measurable targets before launch rather than promise arbitrary scale. Suggested starting objectives to validate in testing:
- Lobby and ordinary UI actions feel responsive on typical mobile connections.
- Realtime state changes are delivered promptly under the expected test load.
- Buzzer events are processed in a deterministic server order.
- The system supports the agreed maximum players per room without violating timing/scoring rules.
- Database queries for active matches are indexed and bounded.
- AI generation is not on the critical path for buzzer timing; prepare/validate questions before they are needed.
- Large leaderboards and match histories are paginated.
- Realtime event payloads are compact and role-specific.

Before a production-scale promise, load test concurrent rooms, connections, database load, and reconnect bursts. Select actual numeric SLOs after the target player count and hosting constraints are known.

---

## 16. Cost and Hosting Strategy

### 16.1 Confirmed preference
Use a hybrid, budget-conscious approach:
- Start with free or low-cost services where appropriate.
- Use quotas, caching, and fallback questions to control AI cost.
- Keep AI providers interchangeable.
- Upgrade only when real usage, reliability, or feature requirements justify it.
- Track hosting, database, realtime, and AI usage.
- Do not promise free permanent hosting; provider free tiers may change or impose sleeping, connection, storage, bandwidth, and database limits.

### 16.2 Cost controls
- Cache eligible validated question sets.
- Reuse approved questions.
- Limit AI generation by room/user/admin quota.
- Add per-user and per-IP abuse limits where appropriate and privacy-compliant.
- Avoid generating questions for every player individually when one approved set can be reused.
- Track provider/model usage and estimated costs.
- Provide graceful fallback if quota is exhausted.
- Do not let cost limits break the core game; built-in questions remain available.

### 16.3 Monetization status
Monetization is disabled at launch. No payment gateway is required for the initial release.

---

## 17. UI/Route Inventory

Exact routes depend on the chosen runtime, but the information architecture should cover:

### Public
- Home/landing page.
- Join room by code.
- Public rooms listing (only opt-in rooms).
- Public tournament listing/details.
- Public leaderboard.
- Public player profile only according to privacy settings.
- Published presentation/broadcast page.

### Gameplay
- Lobby.
- Host control panel.
- Player match screen.
- Spectator screen.
- Question/answer reveal state.
- Match result and recap.
- Dispute form/status.
- Reconnect/recovery screen.

### Player
- Guest entry.
- Sign in/register (when accounts phase is enabled).
- Profile and privacy settings.
- Match history and stats.
- Friends, invites, party lobby.
- Practice hub, practice session, practice results.
- Achievements, challenges, rewards.
- Tournament history.

### Admin
- Admin dashboard.
- Question bank and question version detail.
- AI settings/usage/quotas.
- Pending review queue.
- Reports/moderation.
- User management and suspensions.
- Live room monitor.
- Dispute/audit viewer.
- Tournament administration.
- System health, feature flags, maintenance mode.

Do not expose admin routes merely because a UI route exists; server-side authorization is mandatory.

---

## 18. Content and Product Policies

- Do not use copyrighted question sets without rights or permission.
- Store source references where available and permitted.
- Make clear when a question is AI-generated, automatically checked, source-backed, or human-reviewed.
- Provide user-facing rules for scoring, ties, disconnects, disputes, and invalid questions.
- Provide terms/privacy information appropriate to the actual data collected.
- Moderate custom questions, usernames, avatars, and chat.
- Make public-site content and permissions explicit.
- Avoid collecting sensitive personal information.
- Follow applicable laws and the hosting platform's terms.
- Voice and chat require clear moderation and privacy practices.

---

## 19. Key Decisions Already Confirmed

| Decision | Confirmed choice |
|---|---|
| Product | Speed Buzzer, real-time multiplayer general-knowledge buzzer game |
| Question source | Hybrid curated bank + AI generation |
| Answer checking | Hybrid automatic checking + host/manual judging and override |
| Room join | Room code + invitation link; public discovery only when host enables it |
| Room privacy | Private rooms stay out of public listings |
| Scoring | Host-configurable correct points, incorrect penalty, speed bonus, negative/minimum score |
| Player limits | Host-configurable capacity; spectator policy separately configurable |
| Question categories | Host-selected category and Easy/Medium/Hard difficulty |
| AI fallback | Verified built-in bank if AI is unavailable or fails checks |
| Timers | Separate buzz and answer timers; server-synchronized; host pause/resume |
| Buzzer fairness | Server-authoritative with configurable 0–100 ms tie window |
| UI | Premium dark theme, tasteful neon accents, mobile-first, accessible feedback |
| Identity | Guest sessions first; optional registered accounts and profiles |
| Host disconnect | Grace-period recovery and controlled host transfer/fallback |
| Wrong-answer rules | Elimination by default; optional re-buzz or penalty/restriction |
| Match formats | Fixed questions, timed match, target score, sudden death, leaderboard |
| Competitive system | Stats, global leaderboards, tournaments, rounds/knockout/finals |
| Question management | Admin global bank/review; host custom room questions |
| Frontend | React + TypeScript + Vite, subject to runtime feasibility |
| Styling | SCSS |
| Backend | Node.js + Express, subject to runtime feasibility |
| Realtime | Socket.IO or supported equivalent |
| Database | MySQL (explicitly chosen over PostgreSQL/MongoDB) |
| Scale coordination | Redis when needed and supported |
| Voice chat | Optional, host-controlled, disabled by default; later phase |
| Audio | Configurable sound effects/music, mute/volume, visual alternatives, optional vibration |
| Disputes | Structured challenges with evidence, host resolution, audit trail |
| Languages | English and Hindi at launch; multilingual architecture |
| Teams | Individual and team modes with configurable team/captain buzzer policy |
| Practice | Solo, simulated opponents, feedback, reaction-time metrics/history |
| Profiles | Usernames, avatars, stats, history, XP, levels, achievements, privacy |
| Social | Friends, blocks, invites, parties, recent players, reports, optional moderated text chat |
| Admin | Advanced dashboard, question review, moderation, monitoring, quotas, feature flags, audit logs |
| Progression | Achievements, challenges, streaks, ranks, seasonal boards, cosmetic rewards; anti-farming |
| Platform | Responsive website/PWA first; native mobile later |
| Matchmaking | Private/public casual first; ranked/tournament matchmaking later |
| Network resilience | Reconnect, secure session recovery, dedupe, stale-message rejection, network logs |
| Spectators | Read-only mode, presentation/broadcast, optional delay |
| Monetization | Flexible architecture; disabled at launch; no pay-to-win |
| AI quality | Complete quality pipeline, sources where available, review queue, emergency removal |
| Budget | Free/low-cost first, provider abstraction, quotas/caching, upgrade based on usage |
| Delivery | Phased development, with feasibility validation and private beta before public launch |
| Intended deployment | ChatGPT Sites if account access, public publishing, and runtime support are verified |

---

## 20. Open Items That Must Be Verified (Not Silent Omissions)

These are deployment/runtime facts or policy details that cannot be safely assumed from product requirements alone:

1. **ChatGPT Sites access:** The current account is ChatGPT Go. OpenAI's current Sites documentation says Sites is not available on Go; Plus/Pro and eligible Business/Enterprise workspaces are listed. Confirm account access before building.
2. **Public publishing:** Verify public publishing availability for the user's account, region, and workspace settings.
3. **Assignment wording:** Confirm whether “deploy on ChatGPT” means a public ChatGPT Site specifically or whether an externally hosted URL is accepted.
4. **Sites runtime capabilities:** Confirm persistence, realtime WebSockets, external API access, secrets, storage, database connectivity, background services, and any supported framework constraints.
5. **Backend location:** Determine whether the game engine can run in the Sites runtime or must be hosted externally. A frontend-only site is not enough for authoritative multiplayer.
6. **Voice chat:** Verify WebRTC/media/network support before implementing or promising voice in the selected deployment environment.
7. **Free-tier availability:** Verify current prices, usage limits, WebSocket behavior, sleeping/idle policies, storage, database limits, and regional availability before selecting external providers.
8. **Expected scale:** Establish initial maximum players per room, concurrent rooms, and expected concurrent users before final performance sizing.
9. **Target-score behavior:** Default recommendation is to finish the current question before ending; make this a configurable rule.
10. **Interrupted-turn policy:** Finalize the exact treatment of a disconnected player during an answer turn (for example, short grace period vs. immediate timeout), while preserving the no-extra-time fairness rule.
11. **Guest history claiming:** Define proof/claim policy to prevent history theft.
12. **Privacy/retention:** Define retention for guest sessions, chat, voice metadata if any, disputes, reports, and audit logs.
13. **Moderation staffing:** Decide who reviews reports/questions during beta and public launch.
14. **Launch acceptance load:** Choose measurable concurrency/latency targets before claiming production scale.
15. **Legal review:** Confirm privacy/terms and any tournament/prize rules before public competitive events.

These are intentionally called out so the implementation team can resolve them explicitly rather than invent answers.

---

## 21. Definition of Done

Speed Buzzer is ready for its initial public release only when:
- The selected deployment path is verified and allowed by the assignment.
- The public URL opens for intended users.
- At least two players on separate devices/networks can finish a full match.
- Server-authoritative buzzer order, tie handling, timers, scoring, and wrong-answer rules pass automated and manual tests.
- Host/player/spectator permissions are enforced on the server.
- Correct answers remain hidden until reveal.
- Disconnect/reconnect and host recovery follow documented rules.
- Built-in question fallback works if AI is unavailable.
- Question quality/review and invalid-question correction paths work at the scope promised for launch.
- Production secrets, rate limits, error handling, logs, and monitoring are configured.
- Backup/restore or platform-equivalent recovery is tested and documented.
- Mobile, desktop, keyboard basics, reduced motion, and visual feedback are tested.
- Privacy, moderation, and room visibility settings are reviewed.
- No payment integration is enabled.
- Known limitations are documented.
- Submission includes the public URL, setup/deployment notes, architecture, test evidence, and any runtime constraints.
- The team does not misrepresent an external deployment as a ChatGPT Sites deployment.

---

## 22. Implementation Instruction for the Development Agent

Use this document as the source of truth. Before coding:
1. Resolve Section 20's deployment feasibility items, especially ChatGPT Sites access and runtime support.
2. Propose the final architecture based on verified capabilities.
3. Preserve the chosen MySQL database preference unless the deployment platform makes it technically impossible; if a change is necessary, explain why and request approval.
4. Build in phases and keep the core match loop stable before advanced features.
5. Do not silently omit confirmed features. If a feature is deferred, record the phase and acceptance criteria.
6. Use SCSS and mobile-first responsive UI.
7. Enforce all gameplay authority and permissions server-side.
8. Create migrations, tests, documented event contracts, and clear environment configuration.
9. Do not expose answers or private data through client payloads.
10. Do not add payments or enable monetization at launch.
11. Use verified, approved question data and fallback behavior.
12. Keep host overrides and administrative actions auditable.
13. Test across multiple devices and simulated network failures.
14. Document any unsupported Sites-runtime capability and obtain approval for the alternative before changing deployment target.
15. Provide a final implementation report with completed/deferred features, test results, deployment URL, and known limitations.

---

## 23. Submission Checklist

- [ ] Requirement document reviewed.
- [ ] Exact assignment deployment wording confirmed.
- [ ] ChatGPT Sites access and public publishing verified.
- [ ] Runtime feasibility prototype completed.
- [ ] Architecture and data model reviewed.
- [ ] Core multiplayer loop implemented.
- [ ] Server-authoritative buzzer and scoring tested.
- [ ] AI question validation and fallback tested.
- [ ] Security and privacy review completed.
- [ ] Multi-device reconnect/dispute tests passed.
- [ ] Responsive/accessibility checks passed.
- [ ] Public URL deployed and verified.
- [ ] Hosting/AI cost limits configured.
- [ ] Monitoring and recovery documented.
- [ ] Known limitations and phased roadmap included.
- [ ] Monetization remains disabled.

**End of specification.**
