import React, { useState, useEffect } from 'react';
import {
  Users,
  Copy,
  Check,
  Play,
  Eye,
  MessageSquare,
  Send,
  UserCheck,
  Sparkles,
  Bell,
  AlertCircle,
} from 'lucide-react';
import { useGameStore } from '../stores/gameStore';
import { socketService } from '../services/socket.service';
import { sound } from '../services/sound.service';
import { MemberRole, ServerEvents } from 'speed-buzzer-shared';

const TEAMS = [
  { id: 'team-red', name: 'Team Red', color: '#ef4444' },
  { id: 'team-blue', name: 'Team Blue', color: '#3b82f6' },
  { id: 'team-green', name: 'Team Green', color: '#10b981' },
  { id: 'team-yellow', name: 'Team Yellow', color: '#f59e0b' },
];

export const LobbyView: React.FC = () => {
  const { room, myMemberId, displayName, chatMessages, updateRoomMember, setMyMemberId, showNotification } = useGameStore();
  const [copied, setCopied] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [starting, setStarting] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [notifyCooldown, setNotifyCooldown] = useState(0);

  // 3-second alert banner state
  const [showReadyAlert, setShowReadyAlert] = useState(false);
  const [alertSecondsLeft, setAlertSecondsLeft] = useState(3);
  const [alertHostName, setAlertHostName] = useState('Host');

  // Socket listener for 3-second ready notification
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const onReadyAlert = (data: { hostName: string; durationSeconds: number }) => {
      sound.playAttention();
      setAlertHostName(data.hostName || 'Host');
      setAlertSecondsLeft(data.durationSeconds || 3);
      setShowReadyAlert(true);
    };

    socket.on(ServerEvents.LOBBY_READY_ALERT, onReadyAlert);
    return () => {
      socket.off(ServerEvents.LOBBY_READY_ALERT, onReadyAlert);
    };
  }, []);

  // 3-second countdown ticker for the alert
  useEffect(() => {
    if (!showReadyAlert) return;
    if (alertSecondsLeft <= 0) {
      setShowReadyAlert(false);
      return;
    }

    const timer = setInterval(() => {
      setAlertSecondsLeft((prev) => {
        if (prev <= 1) {
          setShowReadyAlert(false);
          return 0;
        }
        sound.playTick();
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showReadyAlert, alertSecondsLeft]);

  // Notify cooldown ticker (prevents button spam)
  useEffect(() => {
    if (notifyCooldown <= 0) return;
    const timer = setInterval(() => {
      setNotifyCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [notifyCooldown]);

  if (!room) return null;

  const currentMember = room.members.find((m) => m.id === myMemberId || m.displayName === displayName) || room.members[0];
  const isHost = currentMember?.role === MemberRole.HOST || room.hostId === myMemberId || room.hostId === currentMember?.id;
  const isSpectator = currentMember?.role === MemberRole.SPECTATOR;
  const players = room.members.filter((m) => m.role !== MemberRole.SPECTATOR);
  const spectators = room.members.filter((m) => m.role === MemberRole.SPECTATOR);

  const readyPlayers = players.filter((p) => p.isReady);
  const allReady = players.length > 0 && readyPlayers.length === players.length;

  const handleCopyInvite = async () => {
    try {
      const inviteUrl = `${window.location.origin}?code=${room.joinCode}`;
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      showNotification('Invite link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showNotification('Failed to copy link', 'error');
    }
  };

  const handleToggleReady = async () => {
    if (!currentMember) return;
    const nextState = !currentMember.isReady;
    sound.playLockIn();
    updateRoomMember(currentMember.id, { isReady: nextState });
    const res = await socketService.setReady(nextState);
    if (!res.success) {
      updateRoomMember(currentMember.id, { isReady: !nextState });
      showNotification(res.error || 'Failed to update ready status', 'error');
    }
  };

  const handleNotifyAll = async () => {
    if (!isHost || notifying || notifyCooldown > 0) return;
    setNotifying(true);
    sound.playAttention();
    const res = await socketService.notifyPlayersReady();
    setNotifying(false);
    if (res.success) {
      showNotification('Ready alert sent to all players! (3 seconds)', 'info');
      setNotifyCooldown(3);
    } else {
      showNotification(res.error || 'Failed to send alert', 'error');
    }
  };

  const handleStartMatch = async () => {
    if (!isHost) return;
    if (!allReady) {
      sound.playBuzzPress();
      showNotification(`Waiting for all players to be ready (${readyPlayers.length}/${players.length})`, 'warning');
      return;
    }
    setStarting(true);
    sound.playBuzzPress();
    const res = await socketService.startMatch();
    if (!res.success) {
      showNotification(res.error || 'Failed to start match', 'error');
      setStarting(false);
    }
  };

  const handleSwitchTeam = async (teamId: string) => {
    sound.playLockIn();
    const res = await socketService.joinTeam(teamId);
    if (!res.success) {
      showNotification(res.error || 'Failed to switch team', 'error');
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socketService.sendChat(chatInput.trim());
    setChatInput('');
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: 'clamp(12px, 3vw, 24px) clamp(10px, 3vw, 20px) 60px', position: 'relative' }}>
      {/* 3-Second Ready Alert Toast/Banner */}
      {showReadyAlert && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            width: 'min(92vw, 480px)',
            background: 'linear-gradient(135deg, rgba(20, 25, 45, 0.98), rgba(30, 20, 50, 0.98))',
            backdropFilter: 'blur(16px)',
            border: '2px solid #f59e0b',
            boxShadow: '0 0 30px rgba(245, 158, 11, 0.45), 0 10px 40px rgba(0, 0, 0, 0.8)',
            borderRadius: '16px',
            padding: '16px 20px',
            animation: 'pulse 1.5s infinite alternate',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'rgba(245, 158, 11, 0.25)',
                  border: '2px solid #f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f59e0b',
                  fontSize: '22px',
                  fontWeight: 900,
                  fontFamily: 'monospace',
                  flexShrink: 0,
                  boxShadow: '0 0 12px rgba(245, 158, 11, 0.5)',
                }}
              >
                {alertSecondsLeft}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Bell size={16} color="#f59e0b" />
                  <span>{alertHostName} wants to START!</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {currentMember?.isReady ? 'You are ready! Starting shortly...' : 'Please mark yourself ready now!'}
                </div>
              </div>
            </div>

            {!currentMember?.isReady && !isSpectator && (
              <button
                onClick={handleToggleReady}
                className="btn btn-primary"
                style={{
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  borderColor: '#10b981',
                  boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)',
                  whiteSpace: 'nowrap',
                }}
              >
                <Check size={14} /> I'm Ready!
              </button>
            )}
          </div>

          {/* Animated 3-second progress line */}
          <div
            style={{
              marginTop: '12px',
              height: '4px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
                width: `${(alertSecondsLeft / 3) * 100}%`,
                transition: 'width 1s linear',
              }}
            />
          </div>
        </div>
      )}

      {/* Top Banner: Join Code & Room Headline */}
      <div className="glass-panel" style={{
        padding: 'clamp(16px, 3vw, 24px) clamp(14px, 3vw, 28px)',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        border: '1px solid rgba(0, 242, 254, 0.25)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              LOBBY
            </span>
            <span className="badge badge-cyan">{room.settings.questionCategory.replace('_', ' ')}</span>
            <span className="badge badge-amber">{room.settings.questionDifficulty}</span>
            <span className="badge badge-emerald">{room.settings.questionCount} Qs</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Room:</span>
            <span
              className="font-mono gradient-text"
              style={{ fontSize: 'clamp(22px, 5vw, 30px)', fontWeight: 900, letterSpacing: '0.1em' }}
            >
              {room.joinCode}
            </span>
            <button
              onClick={handleCopyInvite}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Start Game Button (Host) or Ready Indicator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '340px' }}>
          {!isSpectator && !isHost && (
            <button
              onClick={handleToggleReady}
              className={`btn ${currentMember?.isReady ? 'btn-secondary' : 'btn-primary'}`}
              style={{ width: '100%', padding: '10px 16px' }}
            >
              {currentMember?.isReady ? (
                <>
                  <Check size={16} color="#10b981" /> Ready!
                </>
              ) : (
                <>
                  <UserCheck size={16} /> Mark as Ready
                </>
              )}
            </button>
          )}

          {isHost && (
            <>
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <button
                  onClick={handleNotifyAll}
                  disabled={notifying || notifyCooldown > 0}
                  className="btn btn-secondary"
                  style={{
                    flex: '0 0 auto',
                    padding: '10px 14px',
                    fontSize: '13px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderColor: notifyCooldown > 0 ? 'rgba(255,255,255,0.1)' : 'rgba(245, 158, 11, 0.4)',
                    color: notifyCooldown > 0 ? 'var(--text-muted)' : '#f59e0b',
                    background: notifyCooldown > 0 ? 'rgba(255,255,255,0.02)' : 'rgba(245, 158, 11, 0.1)',
                  }}
                  title="Notify all players to ready themselves (3-second alert)"
                >
                  <Bell size={16} />
                  {notifyCooldown > 0 ? `${notifyCooldown}s` : 'Notify All'}
                </button>

                <button
                  onClick={handleStartMatch}
                  disabled={starting || !allReady}
                  className="btn btn-primary"
                  style={{
                    flex: 1,
                    padding: '12px 18px',
                    fontSize: '14px',
                    fontWeight: 800,
                    boxShadow: allReady ? '0 0 20px rgba(0, 242, 254, 0.4)' : 'none',
                    opacity: allReady ? 1 : 0.5,
                    cursor: allReady ? 'pointer' : 'not-allowed',
                  }}
                >
                  <Play size={18} /> {starting ? 'Launching...' : 'Start Match'}
                </button>
              </div>

              {!allReady && (
                <div style={{
                  fontSize: '11px',
                  color: 'var(--accent-amber)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontWeight: 600,
                  justifyContent: 'center',
                }}>
                  <AlertCircle size={13} />
                  Waiting for all players to be ready ({readyPlayers.length}/{players.length})
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Grid: Roster & Chat (Collapses to 1-col on mobile/tablet) */}
      <div className="lobby-layout-grid">
        {/* Left Column: Player Roster & Team Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Team Switcher if Team Mode enabled */}
          {room.settings.teamMode && (
            <div className="glass-panel" style={{ padding: '16px' }}>
              <h2 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={15} color="var(--accent-cyan)" /> Select Team
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                {TEAMS.map((t) => {
                  const isMyTeam = currentMember?.teamId === t.id;
                  const count = room.members.filter((m) => m.teamId === t.id).length;
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleSwitchTeam(t.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: isMyTeam ? `2px solid ${t.color}` : '1px solid var(--surface-border)',
                        background: isMyTeam ? `${t.color}22` : 'rgba(255, 255, 255, 0.03)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: t.color }} />
                        <span>{t.name}</span>
                      </div>
                      <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Players Roster */}
          <div className="glass-panel" style={{ padding: '18px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={16} color="var(--accent-cyan)" />
                <h2 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>
                  Players ({players.length}/{room.settings.maxPlayers})
                </h2>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {players.filter((p) => p.isReady).length} Ready
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
              {players.map((p) => {
                const isMe = p.id === myMemberId;
                const isPlayerHost = p.id === room.hostId;
                const playerTeam = TEAMS.find((t) => t.id === p.teamId);

                return (
                  <div
                    key={p.id}
                    style={{
                      padding: '10px 12px',
                      background: isMe ? 'rgba(0, 242, 254, 0.07)' : 'rgba(255, 255, 255, 0.03)',
                      border: isMe ? '1px solid rgba(0, 242, 254, 0.3)' : '1px solid var(--surface-border)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                      <span style={{ fontSize: '20px', flexShrink: 0 }}>{p.avatar || '⚡'}</span>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: isMe ? 'var(--accent-cyan)' : '#fff',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {p.displayName} {isMe && '(You)'}
                        </div>
                        <div style={{ display: 'flex', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
                          {isPlayerHost && (
                            <span style={{ fontSize: '9px', color: 'var(--accent-amber)', fontWeight: 700 }}>
                              👑 Host
                            </span>
                          )}
                          {playerTeam && (
                            <span style={{ fontSize: '9px', color: playerTeam.color, fontWeight: 700 }}>
                              ● {playerTeam.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      {p.isReady ? (
                        <div
                          title="Ready"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#10b981',
                          }}
                        >
                          <Check size={11} color="#10b981" /> Ready
                        </div>
                      ) : (
                        <div
                          title="Not Ready"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: 'rgba(245, 158, 11, 0.1)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#f59e0b',
                          }}
                        >
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} /> Waiting
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Spectators */}
            {spectators.length > 0 && (
              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--surface-border)' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Eye size={12} /> Spectators ({spectators.length})
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {spectators.map((s) => (
                    <span
                      key={s.id}
                      style={{
                        padding: '3px 8px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {s.avatar} {s.displayName}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Chat & Parameters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Rules Overview */}
          <div className="glass-panel" style={{ padding: '16px' }}>
            <h2 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Match Parameters
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', fontSize: '12px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Tie: </span>
                <span className="font-mono" style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>
                  {room.settings.tieWindowMs}ms
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Buzz: </span>
                <span className="font-mono" style={{ fontWeight: 600 }}>{room.settings.buzzTimerSeconds}s</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Answer: </span>
                <span className="font-mono" style={{ fontWeight: 600 }}>{room.settings.answerTimerSeconds}s</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Correct: </span>
                <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>+{room.settings.correctPoints}</span>
              </div>
            </div>
          </div>

          {/* Lobby Chat */}
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', borderBottom: '1px solid var(--surface-border)', paddingBottom: '8px' }}>
              <MessageSquare size={14} color="var(--accent-cyan)" />
              <h2 style={{ fontSize: '13px', fontWeight: 700, margin: 0 }}>Room Chat</h2>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
              {chatMessages.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  Say hello or cheer your teammates! 👋
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} style={{ fontSize: '12px', lineHeight: 1.35 }}>
                    <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                      {msg.senderName}:{' '}
                    </span>
                    <span style={{ color: '#fff' }}>{msg.text}</span>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendChat} style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              <input
                type="text"
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                maxLength={120}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#fff',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                className="btn btn-secondary"
                style={{ padding: '8px 12px' }}
              >
                <Send size={13} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
