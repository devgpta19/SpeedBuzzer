import { sessionService } from '../services/session.service.js';
import { roomService } from '../services/room.service.js';
import { gameEngine } from '../engine/game.engine.js';
import { ClientEvents, ServerEvents, MemberRole, MatchPhase, ConnectionStatus } from 'speed-buzzer-shared';
export function setupSocketHandlers(io) {
    // Middleware: authenticate every connection
    io.use(async (socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) {
            return next(new Error('AUTH_TOKEN_REQUIRED'));
        }
        const session = await sessionService.validateToken(token);
        if (!session) {
            return next(new Error('INVALID_TOKEN'));
        }
        const rawIp = socket.handshake.headers['x-forwarded-for']?.split(',')[0]?.trim()
            || socket.handshake.address
            || socket.conn.remoteAddress
            || '127.0.0.1';
        session.ipAddress = rawIp.replace(/^::ffff:/, '').trim() || '127.0.0.1';
        const deviceId = socket.handshake.auth?.deviceId
            || socket.handshake.headers['x-device-id']
            || null;
        if (deviceId) {
            session.deviceId = deviceId;
        }
        socket.session = session;
        await sessionService.setSocketId(session.sessionId, socket.id);
        next();
    });
    // Wire up the game engine's emit callback
    gameEngine.setEmitCallback((roomId, event, data) => {
        io.to(`room:${roomId}`).emit(event, data);
    });
    io.on('connection', (rawSocket) => {
        const socket = rawSocket;
        const session = socket.session;
        console.log(`⚡ Connected: ${session.displayName} (${socket.id})`);
        // ── Room: Create ──────────────────────────────────────
        socket.on(ClientEvents.ROOM_CREATE, async (data, callback) => {
            try {
                const roomState = await roomService.createRoom(session, data?.settings || {});
                socket.join(`room:${roomState.id}`);
                socket.currentRoomId = roomState.id;
                socket.currentMemberId = roomState.hostId;
                callback?.({ success: true, room: roomState, yourId: roomState.hostId });
            }
            catch (error) {
                callback?.({ success: false, error: error.message });
            }
        });
        // ── Room: Join ────────────────────────────────────────
        socket.on(ClientEvents.ROOM_JOIN, async (data, callback) => {
            try {
                const { room, memberId } = await roomService.joinRoom(data.joinCode, session, data.asSpectator || false);
                socket.join(`room:${room.id}`);
                socket.currentRoomId = room.id;
                socket.currentMemberId = memberId;
                // Notify others
                const newMember = room.members.find(m => m.id === memberId);
                socket.to(`room:${room.id}`).emit(ServerEvents.ROOM_MEMBER_JOINED, {
                    member: newMember,
                });
                // Broadcast room state to keep all clients perfectly in sync with deduped member list
                io.to(`room:${room.id}`).emit(ServerEvents.ROOM_STATE, { room });
                callback?.({ success: true, room, yourId: memberId });
                // If the room has an active match in progress, sync current match and question state
                const liveMatch = gameEngine.getMatchByRoomId(room.id);
                if (liveMatch) {
                    const matchState = gameEngine.getMatchState(liveMatch.id);
                    const currentQuestion = liveMatch.questions[liveMatch.currentQuestionIndex];
                    const questionDisplay = currentQuestion ? {
                        id: currentQuestion.id,
                        text: currentQuestion.text,
                        category: currentQuestion.category,
                        difficulty: currentQuestion.difficulty,
                        language: currentQuestion.language,
                        questionNumber: liveMatch.currentQuestionIndex + 1,
                        totalQuestions: liveMatch.questions.length,
                    } : undefined;
                    const buzzerState = gameEngine.getBuzzerState(liveMatch);
                    socket.emit(ServerEvents.MATCH_STATE, {
                        match: matchState,
                        question: questionDisplay,
                        buzzer: buzzerState,
                    });
                }
            }
            catch (error) {
                callback?.({ success: false, error: error.message });
            }
        });
        // ── Room: Leave ───────────────────────────────────────
        socket.on(ClientEvents.ROOM_LEAVE, async (_, callback) => {
            if (!socket.currentRoomId)
                return callback?.({ success: false, error: 'NOT_IN_ROOM' });
            try {
                const result = await roomService.leaveRoom(socket.currentRoomId, session.sessionId);
                socket.to(`room:${socket.currentRoomId}`).emit(ServerEvents.ROOM_MEMBER_LEFT, {
                    memberId: socket.currentMemberId,
                    newHostId: result.newHostId,
                });
                socket.leave(`room:${socket.currentRoomId}`);
                socket.currentRoomId = undefined;
                socket.currentMemberId = undefined;
                callback?.({ success: true });
            }
            catch (error) {
                callback?.({ success: false, error: error.message });
            }
        });
        // ── Room: Ready ───────────────────────────────────────
        socket.on(ClientEvents.ROOM_READY, async (data, callback) => {
            if (!socket.currentRoomId)
                return;
            try {
                await roomService.setReady(socket.currentRoomId, session.sessionId, data.ready);
                io.to(`room:${socket.currentRoomId}`).emit(ServerEvents.ROOM_MEMBER_UPDATED, {
                    memberId: socket.currentMemberId,
                    updates: { isReady: data.ready },
                });
                callback?.({ success: true });
            }
            catch (error) {
                callback?.({ success: false, error: error.message });
            }
        });
        // ── Host: Configure ───────────────────────────────────
        socket.on(ClientEvents.HOST_CONFIGURE, async (data, callback) => {
            if (!socket.currentRoomId)
                return;
            try {
                const newSettings = await roomService.updateSettings(socket.currentRoomId, session.sessionId, data.settings);
                io.to(`room:${socket.currentRoomId}`).emit(ServerEvents.ROOM_SETTINGS_UPDATED, {
                    settings: newSettings,
                });
                callback?.({ success: true, settings: newSettings });
            }
            catch (error) {
                callback?.({ success: false, error: error.message });
            }
        });
        // ── Match: Start ──────────────────────────────────────
        socket.on(ClientEvents.MATCH_START, async (_, callback) => {
            if (!socket.currentRoomId)
                return;
            try {
                const room = await roomService.getRoomState(socket.currentRoomId);
                if (!room)
                    return callback?.({ success: false, error: 'ROOM_NOT_FOUND' });
                // Verify host
                const member = room.members.find(m => m.sessionId === session.sessionId);
                if (!member || member.role !== MemberRole.HOST) {
                    return callback?.({ success: false, error: 'NOT_HOST' });
                }
                // Validate that all connected players are ready before match starts
                const players = room.members.filter(m => m.role !== MemberRole.SPECTATOR);
                const unready = players.filter(p => !p.isReady);
                if (unready.length > 0) {
                    return callback?.({
                        success: false,
                        error: `All players must be ready before starting! (${players.length - unready.length}/${players.length} ready)`,
                    });
                }
                // Start match
                const matchState = await gameEngine.startMatch(socket.currentRoomId, room.settings, room.members);
                io.to(`room:${socket.currentRoomId}`).emit(ServerEvents.MATCH_STARTED, {
                    match: matchState,
                });
                // Start first question
                const questionData = await gameEngine.nextQuestion(matchState.id);
                if (questionData) {
                    io.to(`room:${socket.currentRoomId}`).emit(ServerEvents.QUESTION_OPENED, {
                        question: questionData.question,
                        buzzer: questionData.buzzerState,
                        stateVersion: matchState.stateVersion + 1,
                    });
                    io.to(`room:${socket.currentRoomId}`).emit(ServerEvents.TIMER_DEADLINE, {
                        type: 'buzz',
                        deadline: questionData.buzzerState.deadline,
                        remaining: (room.settings.buzzTimerSeconds || 10) * 1000,
                        totalDuration: (room.settings.buzzTimerSeconds || 10) * 1000,
                    });
                }
                callback?.({ success: true, matchId: matchState.id });
            }
            catch (error) {
                callback?.({ success: false, error: error.message });
            }
        });
        // ── Host: Notify Ready ────────────────────────────────
        socket.on(ClientEvents.HOST_NOTIFY_READY, async (_, callback) => {
            if (!socket.currentRoomId)
                return callback?.({ success: false, error: 'NOT_IN_ROOM' });
            try {
                const room = await roomService.getRoomState(socket.currentRoomId);
                if (!room)
                    return callback?.({ success: false, error: 'ROOM_NOT_FOUND' });
                const member = room.members.find(m => m.sessionId === session.sessionId);
                if (!member || member.role !== MemberRole.HOST) {
                    return callback?.({ success: false, error: 'NOT_HOST' });
                }
                io.to(`room:${socket.currentRoomId}`).emit(ServerEvents.LOBBY_READY_ALERT, {
                    hostName: session.displayName,
                    durationSeconds: 3,
                    timestamp: Date.now(),
                });
                callback?.({ success: true });
            }
            catch (error) {
                callback?.({ success: false, error: error.message });
            }
        });
        // ── Match: Pause ──────────────────────────────────────
        socket.on(ClientEvents.MATCH_PAUSE, async (data, callback) => {
            try {
                await gameEngine.pauseMatch(data.matchId);
                io.to(`room:${socket.currentRoomId}`).emit(ServerEvents.MATCH_PAUSED, {
                    stateVersion: gameEngine.getMatchState(data.matchId)?.stateVersion,
                });
                callback?.({ success: true });
            }
            catch (error) {
                callback?.({ success: false, error: error.message });
            }
        });
        // ── Match: Resume ─────────────────────────────────────
        socket.on(ClientEvents.MATCH_RESUME, async (data, callback) => {
            try {
                const resumedPhase = await gameEngine.resumeMatch(data.matchId);
                io.to(`room:${socket.currentRoomId}`).emit(ServerEvents.MATCH_RESUMED, {
                    phase: resumedPhase,
                    match: gameEngine.getMatchState(data.matchId),
                    stateVersion: gameEngine.getMatchState(data.matchId)?.stateVersion,
                });
                callback?.({ success: true });
            }
            catch (error) {
                callback?.({ success: false, error: error.message });
            }
        });
        // ── Question: Buzz ────────────────────────────────────
        socket.on(ClientEvents.QUESTION_BUZZ, async (data, callback) => {
            try {
                if (!socket.currentMemberId && socket.currentRoomId) {
                    const m = await roomService.getMemberBySession(socket.currentRoomId, session.sessionId);
                    if (m)
                        socket.currentMemberId = m.id;
                }
                const matchId = data.matchId || (socket.currentRoomId ? gameEngine.getMatchByRoomId(socket.currentRoomId)?.id : undefined);
                if (!matchId)
                    return callback?.({ success: false, error: 'MATCH_NOT_FOUND' });
                if (!socket.currentMemberId) {
                    const liveMatch = gameEngine.getMatch(matchId);
                    if (liveMatch) {
                        for (const m of liveMatch.members.values()) {
                            if (m.sessionId === session.sessionId) {
                                socket.currentMemberId = m.id;
                                break;
                            }
                        }
                    }
                }
                if (!socket.currentMemberId)
                    return callback?.({ success: false, error: 'NOT_IN_ROOM' });
                const result = await gameEngine.processBuzz(matchId, socket.currentMemberId, data.questionId, data.stateVersion, data.idempotencyKey);
                if (result.acceptance === 'accepted') {
                    io.to(`room:${socket.currentRoomId}`).emit(ServerEvents.BUZZER_ACCEPTED, {
                        playerId: socket.currentMemberId,
                        buzzer: result.buzzerState,
                    });
                    io.to(`room:${socket.currentRoomId}`).emit(ServerEvents.BUZZER_ORDER, {
                        order: result.buzzerState.buzzOrder,
                    });
                    const liveMatch = gameEngine.getMatch(matchId);
                    if (liveMatch && liveMatch.phase === MatchPhase.ANSWER_TURN) {
                        io.to(`room:${socket.currentRoomId}`).emit(ServerEvents.ANSWER_TURN_STARTED, {
                            playerId: liveMatch.currentTurnPlayerId || socket.currentMemberId,
                            buzzer: result.buzzerState,
                            deadline: liveMatch.answerDeadline,
                            remaining: liveMatch.settings.answerTimerSeconds * 1000,
                            stateVersion: liveMatch.stateVersion,
                        });
                    }
                }
                else {
                    socket.emit(ServerEvents.BUZZER_REJECTED, {
                        reason: result.acceptance,
                    });
                }
                callback?.({ success: true, acceptance: result.acceptance });
            }
            catch (error) {
                callback?.({ success: false, error: error.message });
            }
        });
        // ── Answer: Submit ────────────────────────────────────
        socket.on(ClientEvents.ANSWER_SUBMIT, async (data, callback) => {
            try {
                if (!socket.currentMemberId && socket.currentRoomId) {
                    const m = await roomService.getMemberBySession(socket.currentRoomId, session.sessionId);
                    if (m)
                        socket.currentMemberId = m.id;
                }
                const matchId = data?.matchId || (socket.currentRoomId ? gameEngine.getMatchByRoomId(socket.currentRoomId)?.id : undefined);
                if (!matchId)
                    return callback?.({ success: false, error: 'MATCH_NOT_FOUND' });
                if (!socket.currentMemberId) {
                    const liveMatch = gameEngine.getMatch(matchId);
                    if (liveMatch) {
                        for (const m of liveMatch.members.values()) {
                            if (m.sessionId === session.sessionId) {
                                socket.currentMemberId = m.id;
                                break;
                            }
                        }
                    }
                }
                if (!socket.currentMemberId)
                    return callback?.({ success: false, error: 'NOT_IN_ROOM' });
                const liveMatch = gameEngine.getMatch(matchId);
                // If player clicked an option during BUZZ_OPEN, auto-buzz for them first!
                if (liveMatch && liveMatch.phase === MatchPhase.BUZZ_OPEN) {
                    const currentQ = liveMatch.questions[liveMatch.currentQuestionIndex];
                    const buzzRes = await gameEngine.processBuzz(matchId, socket.currentMemberId, data.questionId || currentQ?.id || '', liveMatch.stateVersion, `${matchId}-autobuzz-${socket.currentMemberId}-${Date.now()}`);
                    if (buzzRes.acceptance === 'accepted') {
                        io.to(`room:${socket.currentRoomId}`).emit(ServerEvents.BUZZER_ACCEPTED, {
                            playerId: socket.currentMemberId,
                            buzzer: buzzRes.buzzerState,
                        });
                        io.to(`room:${socket.currentRoomId}`).emit(ServerEvents.BUZZER_ORDER, {
                            order: buzzRes.buzzerState.buzzOrder,
                        });
                    }
                    else {
                        return callback?.({ success: false, error: `Buzz rejected: ${buzzRes.acceptance}` });
                    }
                }
                const result = await gameEngine.submitAnswer(matchId, socket.currentMemberId, data.answer, data.idempotencyKey || `${matchId}-${Date.now()}`);
                const member = liveMatch?.members.get(socket.currentMemberId);
                // Broadcast result
                io.to(`room:${socket.currentRoomId}`).emit(ServerEvents.ANSWER_JUDGED, {
                    playerId: socket.currentMemberId,
                    playerName: member?.displayName || session.displayName,
                    result: result.result,
                    stateVersion: gameEngine.getMatchState(matchId)?.stateVersion,
                });
                if (result.scoreUpdate) {
                    io.to(`room:${socket.currentRoomId}`).emit(ServerEvents.SCORE_UPDATED, result.scoreUpdate);
                }
                if (result.reveal) {
                    io.to(`room:${socket.currentRoomId}`).emit(ServerEvents.QUESTION_REVEALED, {
                        reveal: result.reveal,
                    });
                }
                callback?.({ success: true, result: result.result });
            }
            catch (error) {
                callback?.({ success: false, error: error.message });
            }
        });
        // ── Host: Judge Answer ────────────────────────────────
        socket.on(ClientEvents.HOST_JUDGE, async (data, callback) => {
            try {
                const result = await gameEngine.judgeAnswer(data.matchId, data.playerId, data.result, data.reason);
                io.to(`room:${socket.currentRoomId}`).emit(ServerEvents.ANSWER_JUDGED, {
                    playerId: data.playerId,
                    result: data.result,
                });
                if (result.scoreUpdate) {
                    io.to(`room:${socket.currentRoomId}`).emit(ServerEvents.SCORE_UPDATED, result.scoreUpdate);
                }
                if (result.reveal) {
                    io.to(`room:${socket.currentRoomId}`).emit(ServerEvents.QUESTION_REVEALED, {
                        reveal: result.reveal,
                    });
                }
                callback?.({ success: true });
            }
            catch (error) {
                callback?.({ success: false, error: error.message });
            }
        });
        // ── Host / Player: Next Question ─────────────────────
        socket.on(ClientEvents.HOST_NEXT, async (data, callback) => {
            try {
                const liveMatch = data?.matchId
                    ? gameEngine.getMatch(data.matchId)
                    : (socket.currentRoomId ? gameEngine.getMatchByRoomId(socket.currentRoomId) : undefined);
                const matchId = liveMatch?.id || data?.matchId;
                if (!matchId || !liveMatch)
                    return callback?.({ success: false, error: 'MATCH_NOT_FOUND' });
                const roomId = liveMatch.roomId || socket.currentRoomId;
                if (roomId && !socket.currentRoomId) {
                    socket.currentRoomId = roomId;
                    socket.join(`room:${roomId}`);
                }
                // Cancel pending autoNextTimer and immediately advance
                await gameEngine.advanceNextOrComplete(matchId);
                callback?.({ success: true });
            }
            catch (error) {
                callback?.({ success: false, error: error.message });
            }
        });
        // ── Host / Player: Restart Question ───────────────────
        socket.on(ClientEvents.HOST_RESTART, async (data, callback) => {
            try {
                const matchId = data?.matchId || (socket.currentRoomId ? gameEngine.getMatchByRoomId(socket.currentRoomId)?.id : undefined);
                if (!matchId)
                    return callback?.({ success: false, error: 'MATCH_NOT_FOUND' });
                const questionData = await gameEngine.restartQuestion(matchId);
                if (questionData) {
                    const matchState = gameEngine.getMatchState(matchId);
                    io.to(`room:${socket.currentRoomId}`).emit(ServerEvents.QUESTION_OPENED, {
                        question: questionData.question,
                        buzzer: questionData.buzzerState,
                        stateVersion: matchState?.stateVersion,
                    });
                    const room = socket.currentRoomId ? await roomService.getRoomState(socket.currentRoomId) : null;
                    const buzzSecs = room?.settings?.buzzTimerSeconds || 10;
                    io.to(`room:${socket.currentRoomId}`).emit(ServerEvents.TIMER_DEADLINE, {
                        type: 'buzz',
                        deadline: questionData.buzzerState.deadline,
                        remaining: buzzSecs * 1000,
                        totalDuration: buzzSecs * 1000,
                    });
                }
                callback?.({ success: true });
            }
            catch (error) {
                callback?.({ success: false, error: error.message });
            }
        });
        // ── Host: Select Player Answer Turn ───────────────────
        socket.on(ClientEvents.HOST_SELECT_TURN, async (data, callback) => {
            try {
                const matchId = data?.matchId || (socket.currentRoomId ? gameEngine.getMatchByRoomId(socket.currentRoomId)?.id : undefined);
                if (!matchId || !data.playerId)
                    return callback?.({ success: false, error: 'INVALID_PARAMS' });
                await gameEngine.selectAnswerTurn(matchId, data.playerId);
                callback?.({ success: true });
            }
            catch (error) {
                callback?.({ success: false, error: error.message });
            }
        });
        // ── Host: Skip Question ───────────────────────────────
        socket.on(ClientEvents.HOST_SKIP, async (data, callback) => {
            try {
                const matchId = data?.matchId || (socket.currentRoomId ? gameEngine.getMatchByRoomId(socket.currentRoomId)?.id : undefined);
                if (!matchId)
                    return callback?.({ success: false, error: 'MATCH_NOT_FOUND' });
                await gameEngine.skipQuestion(matchId);
                const questionData = await gameEngine.nextQuestion(matchId);
                if (questionData) {
                    const matchState = gameEngine.getMatchState(matchId);
                    io.to(`room:${socket.currentRoomId}`).emit(ServerEvents.QUESTION_OPENED, {
                        question: questionData.question,
                        buzzer: questionData.buzzerState,
                        stateVersion: matchState?.stateVersion,
                    });
                    const room = socket.currentRoomId ? await roomService.getRoomState(socket.currentRoomId) : null;
                    const buzzSecs = room?.settings?.buzzTimerSeconds || 10;
                    io.to(`room:${socket.currentRoomId}`).emit(ServerEvents.TIMER_DEADLINE, {
                        type: 'buzz',
                        deadline: questionData.buzzerState.deadline,
                        remaining: buzzSecs * 1000,
                        totalDuration: buzzSecs * 1000,
                    });
                }
                callback?.({ success: true });
            }
            catch (error) {
                callback?.({ success: false, error: error.message });
            }
        });
        // ── Host: Cancel Question ─────────────────────────────
        socket.on(ClientEvents.HOST_CANCEL, async (data, callback) => {
            try {
                const matchId = data?.matchId || (socket.currentRoomId ? gameEngine.getMatchByRoomId(socket.currentRoomId)?.id : undefined);
                if (!matchId)
                    return callback?.({ success: false, error: 'MATCH_NOT_FOUND' });
                await gameEngine.cancelQuestion(matchId, data.reason || 'Host cancelled', socket.currentMemberId || '');
                io.to(`room:${socket.currentRoomId}`).emit(ServerEvents.QUESTION_CANCELLED, {
                    reason: data.reason,
                    stateVersion: gameEngine.getMatchState(matchId)?.stateVersion,
                });
                callback?.({ success: true });
            }
            catch (error) {
                callback?.({ success: false, error: error.message });
            }
        });
        // ── Host: Reveal Answer ───────────────────────────────
        socket.on(ClientEvents.HOST_REVEAL, async (data, callback) => {
            try {
                const matchId = data?.matchId || (socket.currentRoomId ? gameEngine.getMatchByRoomId(socket.currentRoomId)?.id : undefined);
                if (!matchId)
                    return callback?.({ success: false, error: 'MATCH_NOT_FOUND' });
                const match = gameEngine.getMatch(matchId);
                if (!match)
                    return callback?.({ success: false, error: 'MATCH_NOT_FOUND' });
                const currentQ = match.questions[match.currentQuestionIndex];
                if (!currentQ)
                    return callback?.({ success: false, error: 'NO_QUESTION' });
                const { questionService: qs } = await import('../services/question.service.js');
                const reveal = qs.toReveal(currentQ);
                io.to(`room:${socket.currentRoomId}`).emit(ServerEvents.QUESTION_REVEALED, { reveal });
                callback?.({ success: true });
            }
            catch (error) {
                callback?.({ success: false, error: error.message });
            }
        });
        // ── Host: Remove Player ───────────────────────────────
        socket.on(ClientEvents.HOST_REMOVE_PLAYER, async (data, callback) => {
            try {
                await roomService.removePlayer(socket.currentRoomId, session.sessionId, data.memberId);
                io.to(`room:${socket.currentRoomId}`).emit(ServerEvents.ROOM_MEMBER_LEFT, {
                    memberId: data.memberId,
                    reason: 'removed_by_host',
                });
                callback?.({ success: true });
            }
            catch (error) {
                callback?.({ success: false, error: error.message });
            }
        });
        // ── Dispute: Create ───────────────────────────────────
        socket.on(ClientEvents.DISPUTE_CREATE, async (data, callback) => {
            try {
                const { v4: uuid } = await import('uuid');
                const { getDb } = await import('../db/connection.js');
                const db = getDb();
                const disputeId = uuid();
                await db('disputes').insert({
                    id: disputeId,
                    match_id: data.matchId,
                    match_question_id: data.questionId || null,
                    requester_id: socket.currentMemberId,
                    requester_name: session.displayName,
                    type: data.type,
                    description: data.description,
                    status: 'open',
                });
                io.to(`room:${socket.currentRoomId}`).emit(ServerEvents.DISPUTE_CREATED, {
                    disputeId,
                    type: data.type,
                    requesterName: session.displayName,
                });
                callback?.({ success: true, disputeId });
            }
            catch (error) {
                callback?.({ success: false, error: error.message });
            }
        });
        // ── Dispute: Resolve ──────────────────────────────────
        socket.on(ClientEvents.HOST_RESOLVE_DISPUTE, async (data, callback) => {
            try {
                const { getDb } = await import('../db/connection.js');
                const db = getDb();
                await db('disputes').where('id', data.disputeId).update({
                    status: data.resolution,
                    resolution: data.reason,
                    resolved_by: socket.currentMemberId,
                    resolved_at: new Date(),
                });
                // Apply score adjustments if any
                if (data.scoreAdjustments?.length) {
                    for (const adj of data.scoreAdjustments) {
                        // Score adjustments would be applied through the game engine
                    }
                }
                io.to(`room:${socket.currentRoomId}`).emit(ServerEvents.DISPUTE_UPDATED, {
                    disputeId: data.disputeId,
                    status: data.resolution,
                    reason: data.reason,
                });
                callback?.({ success: true });
            }
            catch (error) {
                callback?.({ success: false, error: error.message });
            }
        });
        // ── Chat: Send ────────────────────────────────────────
        socket.on(ClientEvents.CHAT_SEND, async (data, callback) => {
            if (!socket.currentRoomId)
                return;
            const text = (data.text || '').trim().substring(0, 500);
            if (!text)
                return;
            io.to(`room:${socket.currentRoomId}`).emit(ServerEvents.CHAT_MESSAGE, {
                senderId: socket.currentMemberId,
                senderName: session.displayName,
                text,
                timestamp: Date.now(),
            });
            callback?.({ success: true });
        });
        // ── Disconnection ─────────────────────────────────────
        socket.on('disconnect', async () => {
            console.log(`⚡ Disconnected: ${session.displayName} (${socket.id})`);
            if (socket.currentRoomId) {
                await roomService.setConnectionStatus(socket.currentRoomId, session.sessionId, ConnectionStatus.DISCONNECTED);
                socket.to(`room:${socket.currentRoomId}`).emit(ServerEvents.ROOM_MEMBER_UPDATED, {
                    memberId: socket.currentMemberId,
                    updates: { connectionStatus: ConnectionStatus.DISCONNECTED },
                });
                // Check if this was the host
                const room = await roomService.getRoomState(socket.currentRoomId);
                if (room) {
                    const host = room.members.find(m => m.role === MemberRole.HOST);
                    if (host?.sessionId === session.sessionId) {
                        // Host disconnect - start grace period
                        const gracePeriod = room.settings.hostDisconnectGracePeriod * 1000;
                        setTimeout(async () => {
                            // Check if host reconnected
                            const currentRoom = await roomService.getRoomState(socket.currentRoomId);
                            if (currentRoom) {
                                const currentHost = currentRoom.members.find(m => m.role === MemberRole.HOST);
                                if (currentHost?.connectionStatus === ConnectionStatus.DISCONNECTED) {
                                    // Transfer host
                                    const result = await roomService.leaveRoom(socket.currentRoomId, session.sessionId);
                                    if (result.newHostId) {
                                        io.to(`room:${socket.currentRoomId}`).emit(ServerEvents.ROOM_MEMBER_UPDATED, {
                                            memberId: result.newHostId,
                                            updates: { role: MemberRole.HOST },
                                        });
                                    }
                                }
                            }
                        }, gracePeriod);
                    }
                }
            }
            await sessionService.clearSocketId(session.sessionId);
        });
    });
}
//# sourceMappingURL=handlers.js.map