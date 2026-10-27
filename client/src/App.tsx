import React, { useState, useEffect } from 'react';
import { useGameStore } from './stores/gameStore';
import { socketService } from './services/socket.service';
import { sound } from './services/sound.service';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { LobbyView } from './components/LobbyView';
import { MatchView } from './components/MatchView';
import { ScoreboardView } from './components/ScoreboardView';
import { ResultsView } from './components/ResultsView';
import { HostControlsModal } from './components/HostControlsModal';
import { DisputeModal } from './components/DisputeModal';
import { ServerEvents, MatchPhase } from 'speed-buzzer-shared';
import { Loader2 } from 'lucide-react';
import { getOrCreateDeviceId } from './utils/device';
import { API_BASE_URL } from './config';

export const App: React.FC = () => {
  const {
    room,
    match,
    matchResult,
    guestToken,
    displayName,
    avatar,
    notification,
    setConnected,
    setSession,
    setRoom,
    setMyMemberId,
    updateRoomMember,
    addRoomMember,
    removeRoomMember,
    setMatch,
    setQuestion,
    setQuestionReveal,
    setBuzzer,
    setActiveTimer,
    setMatchResult,
    applyScoreUpdate,
    addChatMessage,
    addDispute,
    updateDispute,
    showNotification,
    resetGame,
  } = useGameStore();

  const [showHostControls, setShowHostControls] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(false);

  // Extract room code from URL pathname (/room/:code) or query string (?code= or ?room=) or localStorage
  const getUrlRoomCode = (): string | null => {
    const pathMatch = window.location.pathname.match(/\/room\/([a-zA-Z0-9]+)/);
    if (pathMatch && pathMatch[1]) return pathMatch[1].toUpperCase();

    const searchParams = new URLSearchParams(window.location.search);
    const codeParam = searchParams.get('code') || searchParams.get('room');
    if (codeParam) return codeParam.toUpperCase();

    const storedRoom = localStorage.getItem('sb_active_room');
    if (storedRoom) return storedRoom.toUpperCase();

    return null;
  };

  // Reconnection & Session Restoration on Page Load / Refresh
  useEffect(() => {
    const restoreActiveRoom = async () => {
      const targetCode = getUrlRoomCode();
      if (!targetCode || room) return;

      setIsRestoringSession(true);
      try {
        let token = guestToken;
        const savedName = localStorage.getItem('sb_name') || 'Player';
        const savedAvatar = localStorage.getItem('sb_avatar') || '⚡';

        // Ensure we have a valid guest token
        if (!token) {
          const deviceId = getOrCreateDeviceId();
          const authRes = await fetch(`${API_BASE_URL}/auth/guest`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Device-Id': deviceId,
            },
            body: JSON.stringify({ displayName: savedName, deviceId }),
          });

          if (!authRes.ok) throw new Error('Auth refresh failed');
          const authData = await authRes.json();
          token = authData.token;
          setSession(authData.token, authData.session.memberId, savedName, savedAvatar);
        }

        // Connect socket
        await socketService.connect(token!);
        setConnected(true);

        // Rejoin active room
        const joinRes = await socketService.joinRoom(targetCode, savedName, false);
        if (joinRes.success && joinRes.room) {
          setRoom(joinRes.room);
          if (joinRes.yourId) {
            setMyMemberId(joinRes.yourId);
          }
          sound.playLockIn();
        } else {
          // Room closed, expired, or invalid
          localStorage.removeItem('sb_active_room');
          if (window.location.pathname.startsWith('/room/')) {
            window.history.pushState({}, '', '/');
          }
          showNotification(joinRes.error || 'Previous room is no longer active', 'info');
        }
      } catch (err: any) {
        console.error('Session restore error:', err);
        localStorage.removeItem('sb_active_room');
        if (window.location.pathname.startsWith('/room/')) {
          window.history.pushState({}, '', '/');
        }
      } finally {
        setIsRestoringSession(false);
      }
    };

    restoreActiveRoom();
  }, []);

  // Browser Back/Forward navigation listener (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const targetCode = getUrlRoomCode();
      if (!targetCode && room) {
        socketService.leaveRoom();
        resetGame();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [room, resetGame]);

  // Auto-connect socket if token exists but socket disconnected
  useEffect(() => {
    if (guestToken && !socketService.getSocket() && !isRestoringSession) {
      socketService.connect(guestToken)
        .then(() => setConnected(true))
        .catch(() => setConnected(false));
    }
  }, [guestToken, setConnected, isRestoringSession]);

  // Register all Socket.IO real-time event listeners
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    setConnected(socket.connected);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onRoomState = (data: any) => {
      if (data?.room) setRoom(data.room);
    };

    const onRoomMemberJoined = (data: any) => {
      if (data?.member) {
        addRoomMember(data.member);
        showNotification(`${data.member.displayName} joined the room`, 'info');
      }
    };

    const onRoomMemberLeft = (data: any) => {
      if (data?.memberId) {
        removeRoomMember(data.memberId);
      }
      showNotification('A player left the room', 'info');
    };

    const onRoomMemberUpdated = (data: any) => {
      if (data?.memberId && data?.updates) {
        updateRoomMember(data.memberId, data.updates);
      }
    };

    const onMatchState = (data: any) => {
      if (data?.match) setMatch(data.match);
      if (data?.question) setQuestion(data.question);
      if (data?.buzzer) setBuzzer(data.buzzer);
    };

    const onMatchStarted = (data: any) => {
      if (data?.match) setMatch(data.match);
    };

    const onQuestionOpened = (data: any) => {
      sound.playTick();
      if (data?.question) setQuestion(data.question);
      if (data?.buzzer) setBuzzer(data.buzzer);
      setQuestionReveal(null);

      const curMatch = useGameStore.getState().match;
      if (curMatch) {
        setMatch({
          ...curMatch,
          currentQuestionIndex: (data?.question?.questionNumber ? data.question.questionNumber - 1 : curMatch.currentQuestionIndex + 1),
          phase: MatchPhase.BUZZ_OPEN,
          stateVersion: data?.stateVersion ?? (curMatch.stateVersion + 1),
        });
      }

      if (data?.buzzer?.deadline) {
        const remaining = Math.max(0, data.buzzer.deadline - Date.now());
        const totalDuration = (useGameStore.getState().room?.settings?.buzzTimerSeconds || 10) * 1000;
        setActiveTimer({
          type: 'buzz',
          deadline: data.buzzer.deadline,
          remaining,
          totalDuration,
        });
      }
    };

    const onQuestionRevealed = (data: any) => {
      if (data?.reveal) setQuestionReveal(data.reveal);
      const curMatch = useGameStore.getState().match;
      if (curMatch) {
        setMatch({
          ...curMatch,
          phase: MatchPhase.ANSWER_REVEAL,
          stateVersion: data?.stateVersion ?? (curMatch.stateVersion + 1),
        });
      }
      setActiveTimer(null);
    };

    const onBuzzerAccepted = (data: any) => {
      sound.playLockIn();
      if (data?.buzzer) {
        setBuzzer(data.buzzer);
      } else if (data?.playerId) {
        setBuzzer({
          ...(useGameStore.getState().buzzer || {} as any),
          currentTurnPlayerId: data.playerId,
        });
      }
      const curMatch = useGameStore.getState().match;
      if (curMatch) {
        setMatch({
          ...curMatch,
          phase: MatchPhase.ANSWER_TURN,
          stateVersion: data?.buzzer?.stateVersion ?? (curMatch.stateVersion + 1),
        });
      }
      if (data?.buzzer?.answerDeadline) {
        const remaining = Math.max(0, data.buzzer.answerDeadline - Date.now());
        const totalDuration = (useGameStore.getState().room?.settings?.answerTimerSeconds || 15) * 1000;
        setActiveTimer({
          type: 'answer',
          deadline: data.buzzer.answerDeadline,
          remaining,
          totalDuration,
        });
      }
    };

    const onBuzzerRejected = (data: any) => {
      showNotification(`Buzz rejected: ${data?.reason || 'Rate limit/Late'}`, 'warning');
    };

    const onBuzzerOrder = (data: any) => {
      if (data?.order) {
        setBuzzer({
          ...(useGameStore.getState().buzzer || {} as any),
          buzzOrder: data.order,
        });
      }
    };

    const onAnswerTurnStarted = (data: any) => {
      sound.playLockIn();
      if (data?.buzzer) {
        setBuzzer(data.buzzer);
      } else if (data?.playerId) {
        setBuzzer({
          ...(useGameStore.getState().buzzer || {} as any),
          currentTurnPlayerId: data.playerId,
        });
      }
      const curMatch = useGameStore.getState().match;
      if (curMatch) {
        setMatch({
          ...curMatch,
          phase: MatchPhase.ANSWER_TURN,
          stateVersion: data?.stateVersion ?? (curMatch.stateVersion + 1),
        });
      }
      if (data?.deadline) {
        setActiveTimer({
          type: 'answer',
          deadline: data.deadline,
          remaining: data.remaining || 5000,
          totalDuration: (useGameStore.getState().room?.settings?.answerTimerSeconds || 5) * 1000,
        });
      }
    };

    const onAnswerJudged = (data: any) => {
      if (data?.result === 'correct') {
        sound.playCorrect();
        showNotification(`${data.playerName || 'Player'} answered correctly!`, 'success');
      } else {
        sound.playWrong();
        showNotification(`${data.playerName || 'Player'} answered incorrectly.`, 'error');
      }
    };

    const onScoreUpdated = (data: any) => {
      if (data) {
        applyScoreUpdate(data);
      }
    };

    const onTimerDeadline = (data: any) => {
      setActiveTimer(data);
    };

    const onMatchCompleted = (data: any) => {
      const res = data?.result || data;
      if (res && (res.rankings || res.matchId)) {
        setMatchResult(res);
        sound.playFanfare();
        showNotification('Match Completed! Showing Final Scoreboard', 'success');
      }
    };

    const onChatMessage = (data: any) => {
      addChatMessage(data);
    };

    const onDisputeCreated = (data: any) => {
      if (data?.dispute) {
        addDispute(data.dispute);
        showNotification(`New dispute raised by ${data.dispute.requesterName}`, 'warning');
      }
    };

    const onDisputeUpdated = (data: any) => {
      if (data?.dispute) updateDispute(data.dispute);
    };

    const onError = (data: any) => {
      showNotification(data?.message || 'Server error occurred', 'error');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(ServerEvents.ROOM_STATE, onRoomState);
    socket.on(ServerEvents.ROOM_MEMBER_JOINED, onRoomMemberJoined);
    socket.on(ServerEvents.ROOM_MEMBER_LEFT, onRoomMemberLeft);
    socket.on(ServerEvents.ROOM_MEMBER_UPDATED, onRoomMemberUpdated);
    socket.on(ServerEvents.MATCH_STATE, onMatchState);
    socket.on(ServerEvents.MATCH_STARTED, onMatchStarted);
    socket.on(ServerEvents.QUESTION_OPENED, onQuestionOpened);
    socket.on(ServerEvents.QUESTION_REVEALED, onQuestionRevealed);
    socket.on(ServerEvents.BUZZER_ACCEPTED, onBuzzerAccepted);
    socket.on(ServerEvents.BUZZER_REJECTED, onBuzzerRejected);
    socket.on(ServerEvents.BUZZER_ORDER, onBuzzerOrder);
    socket.on(ServerEvents.ANSWER_TURN_STARTED, onAnswerTurnStarted);
    socket.on(ServerEvents.ANSWER_JUDGED, onAnswerJudged);
    socket.on(ServerEvents.SCORE_UPDATED, onScoreUpdated);
    socket.on(ServerEvents.TIMER_DEADLINE, onTimerDeadline);
    socket.on(ServerEvents.MATCH_COMPLETED, onMatchCompleted);
    socket.on(ServerEvents.CHAT_MESSAGE, onChatMessage);
    socket.on(ServerEvents.DISPUTE_CREATED, onDisputeCreated);
    socket.on(ServerEvents.DISPUTE_UPDATED, onDisputeUpdated);
    socket.on(ServerEvents.ERROR, onError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(ServerEvents.ROOM_STATE, onRoomState);
      socket.off(ServerEvents.ROOM_MEMBER_JOINED, onRoomMemberJoined);
      socket.off(ServerEvents.ROOM_MEMBER_LEFT, onRoomMemberLeft);
      socket.off(ServerEvents.ROOM_MEMBER_UPDATED, onRoomMemberUpdated);
      socket.off(ServerEvents.MATCH_STATE, onMatchState);
      socket.off(ServerEvents.MATCH_STARTED, onMatchStarted);
      socket.off(ServerEvents.QUESTION_OPENED, onQuestionOpened);
      socket.off(ServerEvents.QUESTION_REVEALED, onQuestionRevealed);
      socket.off(ServerEvents.BUZZER_ACCEPTED, onBuzzerAccepted);
      socket.off(ServerEvents.BUZZER_REJECTED, onBuzzerRejected);
      socket.off(ServerEvents.BUZZER_ORDER, onBuzzerOrder);
      socket.off(ServerEvents.ANSWER_TURN_STARTED, onAnswerTurnStarted);
      socket.off(ServerEvents.ANSWER_JUDGED, onAnswerJudged);
      socket.off(ServerEvents.SCORE_UPDATED, onScoreUpdated);
      socket.off(ServerEvents.TIMER_DEADLINE, onTimerDeadline);
      socket.off(ServerEvents.MATCH_COMPLETED, onMatchCompleted);
      socket.off(ServerEvents.CHAT_MESSAGE, onChatMessage);
      socket.off(ServerEvents.DISPUTE_CREATED, onDisputeCreated);
      socket.off(ServerEvents.DISPUTE_UPDATED, onDisputeUpdated);
      socket.off(ServerEvents.ERROR, onError);
    };
  }, [
    setConnected,
    setRoom,
    updateRoomMember,
    addRoomMember,
    removeRoomMember,
    setMatch,
    setQuestion,
    setQuestionReveal,
    setBuzzer,
    setActiveTimer,
    setMatchResult,
    applyScoreUpdate,
    addChatMessage,
    addDispute,
    updateDispute,
    showNotification,
  ]);

  // Determine which page/view to render
  const renderCurrentView = () => {
    if (isRestoringSession) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: '16px',
        }}>
          <Loader2 size={36} color="var(--accent-cyan)" className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>
            Reconnecting to Game Room...
          </div>
        </div>
      );
    }

    if (!room) {
      return <LandingPage />;
    }

    if (matchResult || match?.phase === MatchPhase.MATCH_COMPLETE) {
      return <ResultsView />;
    }

    if (!match || match.phase === MatchPhase.ROOM_OPEN || match.phase === MatchPhase.LOBBY) {
      return <LobbyView />;
    }

    return (
      <div className="match-layout-grid">
        <MatchView
          onOpenDispute={() => setShowDisputeModal(true)}
          onOpenHostControls={() => setShowHostControls(true)}
        />
        <div style={{ paddingTop: '10px' }}>
          <ScoreboardView />
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      {/* Floating Notification Toast */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '70px',
          right: '16px',
          zIndex: 9999,
          padding: '10px 18px',
          borderRadius: 'var(--radius-md)',
          background: notification.type === 'success'
            ? 'rgba(16, 185, 129, 0.95)'
            : notification.type === 'error'
            ? 'rgba(244, 63, 94, 0.95)'
            : notification.type === 'warning'
            ? 'rgba(245, 158, 11, 0.95)'
            : 'rgba(15, 23, 42, 0.95)',
          color: '#fff',
          fontWeight: 600,
          fontSize: '13px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(10px)',
          animation: 'fadeIn 0.2s ease-out',
        }}>
          {notification.message}
        </div>
      )}

      {/* Main View Body */}
      <main style={{ flex: 1 }}>
        {renderCurrentView()}
      </main>

      {/* Modals */}
      {showHostControls && <HostControlsModal onClose={() => setShowHostControls(false)} />}
      {showDisputeModal && <DisputeModal onClose={() => setShowDisputeModal(false)} />}
    </div>
  );
};

export default App;
