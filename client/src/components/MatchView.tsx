import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Shield,
  AlertTriangle,
  Send,
  Sparkles,
  RotateCcw,
  Trophy,
} from 'lucide-react';
import { useGameStore } from '../stores/gameStore';
import { socketService } from '../services/socket.service';
import { sound } from '../services/sound.service';
import { MatchPhase, MemberRole } from 'speed-buzzer-shared';

interface MatchViewProps {
  onOpenDispute: () => void;
  onOpenHostControls: () => void;
}

export const MatchView: React.FC<MatchViewProps> = ({ onOpenDispute, onOpenHostControls }) => {
  const {
    room,
    match,
    question,
    questionReveal,
    buzzer,
    myMemberId,
    displayName,
    setMyMemberId,
    activeTimer,
    showNotification,
  } = useGameStore();

  const [answerInput, setAnswerInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingNext, setLoadingNext] = useState(false);
  const [isBuzzerPressedVisual, setIsBuzzerPressedVisual] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [timerPercent, setTimerPercent] = useState<number>(100);
  const answerInputRef = useRef<HTMLInputElement>(null);

  // Clear answer input and submission state when question changes
  useEffect(() => {
    setAnswerInput('');
    setSubmitting(false);
  }, [question?.id]);

  // Resilient member resolution (handles reloads/reconnects seamlessly)
  const currentMember =
    room?.members.find((m) => m.id === myMemberId) ||
    room?.members.find((m) => m.displayName === displayName) ||
    (room?.hostId ? room.members.find((m) => m.id === room.hostId) : undefined);

  const effectiveMemberId = currentMember?.id || myMemberId;

  // Sync back to store if resolved member ID differed
  useEffect(() => {
    if (effectiveMemberId && effectiveMemberId !== myMemberId) {
      setMyMemberId(effectiveMemberId);
    }
  }, [effectiveMemberId, myMemberId, setMyMemberId]);

  const isHost = room?.hostId === effectiveMemberId || currentMember?.role === MemberRole.HOST;
  const isSpectator = currentMember?.role === MemberRole.SPECTATOR;

  // Realtime Countdown Timer calculation & smooth progress bar
  useEffect(() => {
    if (!activeTimer) {
      setRemainingSeconds(0);
      setTimerPercent(0);
      return;
    }

    const totalMs = activeTimer.totalDuration || (activeTimer.type === 'buzz' ? (room?.settings?.buzzTimerSeconds || 10) * 1000 : 5000);

    const updateTimer = () => {
      const now = Date.now();
      const msLeft = Math.max(0, activeTimer.deadline - now);
      const secs = Math.max(0, Math.ceil(msLeft / 1000));
      const pct = Math.min(100, Math.max(0, (msLeft / totalMs) * 100));

      setRemainingSeconds(secs);
      setTimerPercent(pct);

      if (secs > 0 && secs <= 3 && msLeft % 1000 < 120) {
        sound.playTick();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);
    return () => clearInterval(interval);
  }, [activeTimer, room?.settings?.buzzTimerSeconds]);

  // Determine current turn state
  const isBuzzPhase = match?.phase === MatchPhase.BUZZ_OPEN;
  const isAnswerTurn = match?.phase === MatchPhase.ANSWER_TURN;
  const isJudging = match?.phase === MatchPhase.JUDGING;
  const isReveal = match?.phase === MatchPhase.ANSWER_REVEAL || match?.phase === MatchPhase.QUESTION_COMPLETE;

  const currentTurnPlayerId = buzzer?.currentTurnPlayerId;
  const isMyTurn = !!effectiveMemberId && currentTurnPlayerId === effectiveMemberId;
  const isEliminated = !!currentMember && !!buzzer?.eliminatedPlayerIds?.includes(currentMember.id);

  // Focus input automatically when it's player's turn to answer
  useEffect(() => {
    if (isMyTurn && isAnswerTurn) {
      sound.playLockIn();
      setAnswerInput('');
      setTimeout(() => answerInputRef.current?.focus(), 50);
    }
  }, [isMyTurn, isAnswerTurn]);

  // Handle Spacebar Buzzer Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.code === 'Space' && isBuzzPhase && !isEliminated && !isSpectator) {
        e.preventDefault();
        handleBuzz();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBuzzPhase, isEliminated, isSpectator, match, question]);

  const handleBuzz = async () => {
    if (!match || !question || !isBuzzPhase || isEliminated || isSpectator) return;

    sound.playBuzzPress();
    setIsBuzzerPressedVisual(true);
    setTimeout(() => setIsBuzzerPressedVisual(false), 200);

    const res = await socketService.buzz(match.id, question.id, match.stateVersion);
    if (!res.success) {
      showNotification(res.error || 'Buzz rejected', 'warning');
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!match || !question || !isMyTurn || !answerInput.trim() || submitting) return;

    setSubmitting(true);
    sound.playBuzzPress();
    const res = await socketService.submitAnswer(
      match.id,
      question.id,
      answerInput.trim(),
      match.stateVersion
    );
    setSubmitting(false);

    if (!res.success) {
      showNotification(res.error || 'Failed to submit answer', 'error');
    }
  };

  const handleSelectOption = async (optionText: string) => {
    if (!match || !question || !isAnswerTurn || !isMyTurn || submitting || isRoundEnded || isEliminated || isSpectator) return;

    setAnswerInput(optionText);
    setSubmitting(true);
    sound.playBuzzPress();

    const res = await socketService.submitAnswer(
      match.id,
      question.id,
      optionText,
      match.stateVersion
    );
    setSubmitting(false);

    if (!res.success) {
      showNotification(res.error || 'Failed to submit answer', 'error');
    }
  };

  const handleHostJudge = async (result: 'correct' | 'incorrect', targetPlayerId?: string) => {
    const pid = targetPlayerId || currentTurnPlayerId || buzzer?.buzzOrder?.[0]?.playerId;
    if (!match || !question || !pid) return;

    if (result === 'correct') {
      sound.playCorrect();
    } else {
      sound.playWrong();
    }

    const res = await socketService.judgeAnswer(
      match.id,
      question.id,
      pid,
      result
    );
    if (!res.success) {
      showNotification(res.error || 'Judging error', 'error');
    }
  };

  const handleHostSelectPlayer = async (playerId: string) => {
    if (!match || !playerId) return;
    sound.playLockIn();
    const res = await socketService.selectPlayerTurn(match.id, playerId);
    if (!res.success) {
      showNotification(res.error || 'Failed to select player turn', 'error');
    }
  };

  const handleHostNextQuestion = async () => {
    if (loadingNext) return;
    setLoadingNext(true);
    sound.playLockIn();
    const res = await socketService.nextQuestion(match?.id);
    setLoadingNext(false);
    if (!res.success) {
      showNotification(res.error || 'Unable to load next question', 'error');
    }
  };

  const handleRestartQuestion = async () => {
    sound.playLockIn();
    const res = await socketService.restartQuestion(match?.id);
    if (!res.success) {
      showNotification(res.error || 'Unable to restart question', 'error');
    }
  };

  const currentTurnMember = room?.members.find((m) => m.id === currentTurnPlayerId);

  const totalQuestions = match?.totalQuestions || room?.settings?.questionCount || 10;
  const currentQNum = question?.questionNumber || (match ? match.currentQuestionIndex + 1 : 1);
  const isLastQuestion = currentQNum >= totalQuestions;
  const isRoundEnded = isReveal || (activeTimer !== null && remainingSeconds === 0);

  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);

  // 3-second auto-advance visual countdown when question round ends
  useEffect(() => {
    if (!isRoundEnded) {
      setAutoNextCountdown(null);
      return;
    }

    setAutoNextCountdown(3);
    const interval = setInterval(() => {
      setAutoNextCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRoundEnded, question?.id]);

  // Dynamic timer colors
  const timerColor =
    remainingSeconds <= 3 || timerPercent <= 25
      ? 'linear-gradient(90deg, #f43f5e 0%, #fb7185 100%)'
      : timerPercent <= 50
      ? 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)'
      : 'linear-gradient(90deg, #00f2fe 0%, #4facfe 100%)';

  const timerGlowColor =
    remainingSeconds <= 3 || timerPercent <= 25
      ? 'rgba(244, 63, 94, 0.8)'
      : timerPercent <= 50
      ? 'rgba(245, 158, 11, 0.7)'
      : 'rgba(0, 242, 254, 0.7)';

  // Determine Buzzer Visual Status
  let buzzerStateClass = 'state-locked';
  let buzzerStatusText = 'WAITING FOR QUESTION';

  if (isBuzzPhase && (!activeTimer || remainingSeconds > 0)) {
    if (isEliminated) {
      buzzerStateClass = 'state-locked';
      buzzerStatusText = 'ELIMINATED FOR ROUND';
    } else if (isSpectator) {
      buzzerStateClass = 'state-locked';
      buzzerStatusText = 'SPECTATING';
    } else {
      buzzerStateClass = 'state-ready';
      buzzerStatusText = 'TAP TO BUZZ!';
    }
  } else if (isAnswerTurn || isJudging) {
    if (isMyTurn) {
      buzzerStateClass = 'state-winner';
      buzzerStatusText = 'YOUR TURN TO ANSWER!';
    } else {
      buzzerStateClass = 'state-locked';
      buzzerStatusText = `${currentTurnMember?.displayName || 'PLAYER'} IS ANSWERING`;
    }
  } else if (isRoundEnded) {
    buzzerStateClass = 'state-locked';
    buzzerStatusText = remainingSeconds === 0 && !questionReveal ? 'TIME EXPIRED' : 'ROUND COMPLETE';
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: 'clamp(10px, 2.5vw, 20px) 0 40px' }}>
      {/* Top Match Bar */}
      <div className="glass-panel" style={{
        padding: '12px 16px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
      }}>
        {/* Question Counter & Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span className="badge badge-cyan" style={{ fontSize: '11px', padding: '4px 10px' }}>
            Q {question?.questionNumber || (match ? match.currentQuestionIndex + 1 : 1)} / {match?.totalQuestions || 10}
          </span>
          <span className="badge badge-amber">{question?.category.replace('_', ' ') || 'General'}</span>
          <span className="badge badge-emerald hide-on-mobile">{question?.difficulty || 'Medium'}</span>
        </div>

        {/* Live Countdown Timer Badge */}
        {activeTimer && remainingSeconds > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 14px',
            borderRadius: 'var(--radius-full)',
            background: remainingSeconds <= 3 ? 'rgba(244, 63, 94, 0.25)' : 'rgba(0, 242, 254, 0.15)',
            border: remainingSeconds <= 3 ? '1px solid var(--accent-crimson)' : '1px solid rgba(0, 242, 254, 0.4)',
            boxShadow: remainingSeconds <= 3 ? '0 0 16px rgba(244, 63, 94, 0.5)' : '0 0 12px rgba(0, 242, 254, 0.25)',
            animation: remainingSeconds <= 3 ? 'buzzer-pulse 0.7s infinite' : 'none',
          }}>
            <Clock size={15} color={remainingSeconds <= 3 ? 'var(--accent-crimson)' : 'var(--accent-cyan)'} />
            <span className="font-mono" style={{
              fontSize: '15px',
              fontWeight: 800,
              color: remainingSeconds <= 3 ? 'var(--accent-crimson)' : 'var(--accent-cyan)',
              letterSpacing: '0.04em',
            }}>
              {remainingSeconds}s
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onOpenDispute}
            className="btn btn-secondary"
            style={{ padding: '6px 10px', fontSize: '12px', minHeight: '36px' }}
            title="Contest an answer or buzzer order"
          >
            <AlertTriangle size={13} color="var(--accent-amber)" /> Dispute
          </button>

          {isHost && (
            <button
              onClick={onOpenHostControls}
              className="btn btn-secondary"
              style={{ padding: '6px 10px', fontSize: '12px', minHeight: '36px', border: '1px solid var(--accent-amber)' }}
            >
              <Shield size={13} color="var(--accent-amber)" /> Host
            </button>
          )}
        </div>
      </div>

      {/* Main Question Display Card */}
      <div className="glass-panel" style={{
        padding: 'clamp(20px, 4vw, 36px) clamp(14px, 3vw, 28px)',
        marginBottom: '16px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        border: isMyTurn ? '2px solid var(--accent-emerald)' : '1px solid var(--surface-border)',
        boxShadow: isMyTurn ? '0 0 35px rgba(16, 185, 129, 0.3)' : 'none',
      }}>
        {/* Animated Visual Countdown Timer Bar */}
        {activeTimer && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: 'rgba(255, 255, 255, 0.08)',
            overflow: 'hidden',
            zIndex: 10,
          }}>
            <div style={{
              height: '100%',
              width: `${timerPercent}%`,
              background: timerColor,
              boxShadow: `0 0 14px ${timerGlowColor}`,
              transition: 'width 0.12s linear, background 0.3s ease',
            }} />
          </div>
        )}

        <div style={{
          fontSize: '11px',
          fontWeight: 700,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '10px',
        }}>
          {isReveal ? 'Question Answered' : 'Listen / Read Carefully'}
        </div>

        <h2 style={{
          fontSize: 'clamp(17px, 4.5vw, 28px)',
          fontWeight: 700,
          lineHeight: 1.35,
          color: '#ffffff',
          marginBottom: '14px',
        }}>
          {question?.text || 'Waiting for the next question to begin...'}
        </h2>

        {/* Status prompt above options */}
        {isBuzzPhase && !isRoundEnded && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: 700,
            color: 'var(--accent-amber)',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            padding: '6px 16px',
            borderRadius: '20px',
            margin: '4px auto 12px',
          }}>
            <Zap size={14} color="var(--accent-amber)" /> Click BUZZ below first to answer!
          </div>
        )}

        {isAnswerTurn && isMyTurn && !isRoundEnded && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: 800,
            color: 'var(--accent-cyan)',
            background: 'rgba(0, 242, 254, 0.16)',
            border: '1.5px solid var(--accent-cyan)',
            padding: '8px 20px',
            borderRadius: '20px',
            margin: '4px auto 12px',
            boxShadow: '0 0 20px rgba(0, 242, 254, 0.25)',
          }}>
            <Sparkles size={16} color="var(--accent-cyan)" /> YOUR TURN! Choose an option or type below:
          </div>
        )}

        {isAnswerTurn && !isMyTurn && !isRoundEnded && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            padding: '6px 16px',
            borderRadius: '20px',
            margin: '4px auto 12px',
          }}>
            ⏳ {currentTurnMember?.displayName || 'Another player'} buzzed! Waiting for their answer...
          </div>
        )}

        {/* Multiple Choice Options (A, B, C, D) Grid */}
        {question?.options && question.options.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
            gap: '10px',
            margin: '12px auto 14px',
            maxWidth: '750px',
            textAlign: 'left',
          }}>
            {question.options.map((opt, idx) => {
              const letter = ['A', 'B', 'C', 'D'][idx] || `${idx + 1}`;
              const isSelected = answerInput.toLowerCase().trim() === opt.toLowerCase().trim();
              const isCorrectAnswer = isReveal && questionReveal && (
                questionReveal.correctAnswer?.toLowerCase().trim() === opt.toLowerCase().trim() ||
                questionReveal.aliases?.some(a => a.toLowerCase().trim() === opt.toLowerCase().trim())
              );
              const isIncorrectSelected = isReveal && isSelected && !isCorrectAnswer;

              let optionBg = 'rgba(255, 255, 255, 0.04)';
              let optionBorder = '1px solid rgba(255, 255, 255, 0.1)';
              let badgeBg = 'rgba(255, 255, 255, 0.08)';
              let badgeColor = 'var(--text-secondary)';

              const canClick =
                !submitting &&
                !isRoundEnded &&
                !isEliminated &&
                !isSpectator &&
                isAnswerTurn &&
                isMyTurn;

              if (isCorrectAnswer) {
                optionBg = 'rgba(16, 185, 129, 0.25)';
                optionBorder = '2px solid var(--accent-emerald)';
                badgeBg = 'var(--accent-emerald)';
                badgeColor = '#000';
              } else if (isIncorrectSelected) {
                optionBg = 'rgba(244, 63, 94, 0.25)';
                optionBorder = '2px solid var(--accent-crimson)';
                badgeBg = 'var(--accent-crimson)';
                badgeColor = '#fff';
              } else if (isMyTurn && isAnswerTurn) {
                optionBg = isSelected ? 'rgba(0, 242, 254, 0.3)' : 'rgba(0, 242, 254, 0.14)';
                optionBorder = isSelected ? '2px solid var(--accent-cyan)' : '1.5px solid rgba(0, 242, 254, 0.55)';
                badgeBg = isSelected ? 'var(--accent-cyan)' : 'rgba(0, 242, 254, 0.25)';
                badgeColor = isSelected ? '#000' : 'var(--accent-cyan)';
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => canClick && handleSelectOption(opt)}
                  disabled={!canClick}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: optionBg,
                    border: optionBorder,
                    color: '#ffffff',
                    cursor: canClick ? 'pointer' : 'default',
                    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: (isMyTurn && isAnswerTurn) ? '0 0 15px rgba(0, 242, 254, 0.2)' : canClick ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                    transform: (canClick && isSelected) ? 'scale(1.02)' : 'none',
                    position: 'relative',
                    userSelect: 'none',
                  }}
                >
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '30px',
                    height: '30px',
                    borderRadius: 'var(--radius-sm)',
                    background: badgeBg,
                    color: badgeColor,
                    fontWeight: 900,
                    fontSize: '13px',
                    flexShrink: 0,
                  }}>
                    {isCorrectAnswer ? '✓' : isIncorrectSelected ? '✗' : letter}
                  </span>
                  <span style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    flex: 1,
                    lineHeight: 1.3,
                  }}>
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Answer Reveal Banner if revealed */}
        {isReveal && questionReveal && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            marginTop: '14px',
            display: 'inline-block',
            maxWidth: '100%',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-emerald)', textTransform: 'uppercase', marginBottom: '2px' }}>
              ✓ Correct Answer
            </div>
            <div style={{ fontSize: 'clamp(16px, 4vw, 20px)', fontWeight: 800, color: '#fff' }}>
              {questionReveal.correctAnswer}
            </div>
            {questionReveal.explanation && (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {questionReveal.explanation}
              </div>
            )}
          </div>
        )}

        {/* Next Question & Restart Question Actions (Displayed when question ends/times out/is answered) */}
        {isRoundEnded && (
          <div style={{
            marginTop: '22px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
            {/* Auto-advance Countdown Banner */}
            <div style={{
              padding: '10px 22px',
              borderRadius: 'var(--radius-full)',
              background: isLastQuestion ? 'rgba(245, 158, 11, 0.14)' : 'rgba(0, 242, 254, 0.12)',
              border: isLastQuestion ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(0, 242, 254, 0.35)',
              color: isLastQuestion ? 'var(--accent-amber)' : 'var(--neon-cyan)',
              fontSize: '13px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: isLastQuestion
                ? '0 0 20px rgba(245, 158, 11, 0.2)'
                : '0 0 20px rgba(0, 242, 254, 0.2)',
              letterSpacing: '0.02em',
            }}>
              {isLastQuestion ? (
                <>
                  <Sparkles size={16} />
                  <span>
                    Final question completed! Loading scoreboard in{' '}
                    <strong style={{ fontSize: '15px', color: '#fff' }}>{autoNextCountdown ?? 3}s</strong>...
                  </span>
                </>
              ) : (
                <>
                  <Clock size={16} />
                  <span>
                    Auto-advancing to question {Math.min(currentQNum + 1, totalQuestions)} in{' '}
                    <strong style={{ fontSize: '15px', color: '#fff' }}>{autoNextCountdown ?? 3}s</strong>...
                  </span>
                </>
              )}
            </div>

            {/* Host action controls */}
            {isHost && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                flexWrap: 'wrap',
              }}>
                <button
                  onClick={handleRestartQuestion}
                  disabled={loadingNext}
                  className="btn btn-secondary"
                  style={{
                    padding: '9px 18px',
                    fontSize: '13px',
                    fontWeight: 700,
                    border: '1px solid rgba(245, 158, 11, 0.5)',
                    color: 'var(--accent-amber)',
                    background: 'rgba(245, 158, 11, 0.12)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: loadingNext ? 'not-allowed' : 'pointer',
                  }}
                  title="Cancel auto-advance and restart buzz for this question"
                >
                  <RotateCcw size={15} /> Restart Question
                </button>

                <button
                  onClick={handleHostNextQuestion}
                  disabled={loadingNext}
                  className="btn btn-primary"
                  style={{
                    padding: '10px 22px',
                    fontSize: '14px',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: isLastQuestion
                      ? '0 0 25px rgba(245, 158, 11, 0.5)'
                      : '0 0 20px rgba(0, 242, 254, 0.4)',
                    background: isLastQuestion
                      ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                      : undefined,
                    cursor: loadingNext ? 'not-allowed' : 'pointer',
                  }}
                  title={isLastQuestion ? "View scoreboard immediately" : "Skip timer and advance immediately"}
                >
                  {loadingNext ? (
                    'Loading...'
                  ) : isLastQuestion ? (
                    <>
                      <Trophy size={16} /> View Scoreboard Now
                    </>
                  ) : (
                    <>
                      Next Question Now ({Math.min(currentQNum + 1, totalQuestions)}/{totalQuestions}) <ChevronRight size={16} />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Centerpiece: THE 3D BUZZER BUTTON (RESPONSIVE FLUID SIZE) */}
      <div className="buzzer-container">
        <div className="buzzer-base">
          <button
            type="button"
            className={`buzzer-button ${buzzerStateClass} ${isBuzzerPressedVisual ? 'is-pressed' : ''}`}
            onClick={handleBuzz}
            disabled={!isBuzzPhase || isEliminated || isSpectator || isRoundEnded}
          >
            <Zap size={36} color="#ffffff" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }} />
            <span style={{
              fontSize: 'clamp(15px, 4vw, 18px)',
              fontWeight: 900,
              letterSpacing: '0.08em',
              marginTop: '4px',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            }}>
              BUZZ
            </span>
          </button>
        </div>

        {/* Sub-label under buzzer */}
        <div style={{ marginTop: '14px', textAlign: 'center' }}>
          <div style={{
            fontSize: 'clamp(13px, 3.5vw, 15px)',
            fontWeight: 800,
            letterSpacing: '0.05em',
            color: isMyTurn ? 'var(--accent-emerald)' : isBuzzPhase ? 'var(--accent-cyan)' : 'var(--text-muted)',
          }}>
            {buzzerStatusText}
          </div>
        </div>
      </div>

      {/* Answer Turn Panel */}
      {isAnswerTurn && isMyTurn && (
        <div className="glass-panel" style={{
          padding: '18px',
          maxWidth: '650px',
          margin: '0 auto 20px',
          border: '2px solid var(--accent-emerald)',
          boxShadow: '0 0 30px rgba(16, 185, 129, 0.3)',
          animation: 'modalSlideUp 0.25s ease-out',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <Sparkles size={16} color="var(--accent-emerald)" />
            <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: '#fff' }}>
              Your Turn! Enter answer:
            </h3>
          </div>

          <form onSubmit={handleSubmitAnswer} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              ref={answerInputRef}
              type="text"
              placeholder="Type answer..."
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              disabled={submitting}
              style={{
                flex: '1 1 180px',
                padding: '12px 14px',
                fontSize: '15px',
                fontWeight: 600,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.5)',
                borderRadius: 'var(--radius-md)',
                color: '#fff',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={submitting || !answerInput.trim()}
              className="btn btn-success"
              style={{ padding: '12px 20px', flex: '0 0 auto' }}
            >
              <Send size={16} /> Submit
            </button>
          </form>
        </div>
      )}

      {/* Host Adjudication Card */}
      {isHost && buzzer?.buzzOrder && buzzer.buzzOrder.length > 0 && (
        <div className="glass-panel" style={{
          padding: '16px 20px',
          maxWidth: '650px',
          margin: '0 auto 20px',
          border: '1px solid var(--accent-amber)',
          background: 'rgba(245, 158, 11, 0.05)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            marginBottom: '12px',
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={16} color="var(--accent-amber)" />
              <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: 'var(--accent-amber)' }}>
                Host Adjudication
              </h3>
            </div>

            {/* Select active answering player dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
                Select Player:
              </span>
              <select
                value={currentTurnPlayerId || buzzer.buzzOrder[0]?.playerId}
                onChange={(e) => handleHostSelectPlayer(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid var(--accent-amber)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#ffffff',
                  padding: '4px 8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  outline: 'none',
                }}
              >
                {buzzer.buzzOrder.map((b) => (
                  <option key={b.playerId} value={b.playerId} style={{ background: '#111827', color: '#fff' }}>
                    {b.displayName} (#{b.sequence})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleHostJudge('correct')}
              className="btn btn-success"
              style={{ flex: '1 1 140px', padding: '10px' }}
            >
              <CheckCircle2 size={16} /> Correct (+{room?.settings.correctPoints})
            </button>
            <button
              onClick={() => handleHostJudge('incorrect')}
              className="btn btn-danger"
              style={{ flex: '1 1 140px', padding: '10px' }}
            >
              <XCircle size={16} /> Incorrect (-{room?.settings.incorrectPenalty})
            </button>
          </div>
        </div>
      )}

      {/* Sub-Millisecond Buzzer Podium Queue with Host Controls */}
      {buzzer?.buzzOrder && buzzer.buzzOrder.length > 0 && (
        <div className="glass-panel" style={{ padding: '16px', marginTop: '16px' }}>
          <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
            Buzzer Order ({room?.settings.tieWindowMs}ms Tie Window)
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {buzzer.buzzOrder.map((entry, index) => {
              const firstTime = buzzer.buzzOrder[0].serverTimestamp;
              const deltaMs = entry.serverTimestamp - firstTime;
              const isFirst = index === 0;
              const isThisPlayerTurn = entry.playerId === currentTurnPlayerId;

              return (
                <div
                  key={entry.playerId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: isThisPlayerTurn ? 'rgba(16, 185, 129, 0.14)' : 'rgba(255, 255, 255, 0.03)',
                    border: isThisPlayerTurn ? '1.5px solid rgba(16, 185, 129, 0.5)' : '1px solid var(--surface-border)',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="font-mono" style={{
                      fontWeight: 800,
                      fontSize: '12px',
                      color: isFirst ? 'var(--accent-emerald)' : 'var(--text-muted)',
                    }}>
                      #{index + 1}
                    </span>
                    <span style={{ fontWeight: 700, color: '#fff', fontSize: '13px' }}>
                      {entry.displayName}
                    </span>
                    {isThisPlayerTurn && (
                      <span className="badge badge-emerald" style={{ fontSize: '9px', padding: '2px 6px' }}>
                        Active Turn
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="font-mono" style={{ fontSize: '11px', color: isFirst ? 'var(--accent-emerald)' : 'var(--text-secondary)' }}>
                      {isFirst ? '0.000s' : `+${deltaMs}ms`}
                    </div>

                    {/* Host action buttons to select or judge this person */}
                    {isHost && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {!isThisPlayerTurn && (
                          <button
                            type="button"
                            onClick={() => handleHostSelectPlayer(entry.playerId)}
                            className="btn btn-secondary"
                            style={{
                              padding: '4px 8px',
                              fontSize: '11px',
                              fontWeight: 700,
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid rgba(0, 242, 254, 0.4)',
                              color: 'var(--accent-cyan)',
                              background: 'rgba(0, 242, 254, 0.1)',
                              cursor: 'pointer',
                            }}
                            title="Give answer turn to this player"
                          >
                            Select
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleHostJudge('correct', entry.playerId)}
                          className="btn btn-success"
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                          }}
                          title="Award points as correct"
                        >
                          ✓
                        </button>

                        <button
                          type="button"
                          onClick={() => handleHostJudge('incorrect', entry.playerId)}
                          className="btn btn-danger"
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                          }}
                          title="Deduct penalty as incorrect"
                        >
                          ✗
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
