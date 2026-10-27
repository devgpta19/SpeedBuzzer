import React, { useState } from 'react';
import { Volume2, VolumeX, Copy, Check, Wifi, WifiOff, LogOut, Shield } from 'lucide-react';
import { useGameStore } from '../stores/gameStore';
import { sound } from '../services/sound.service';
import { socketService } from '../services/socket.service';

export const Header: React.FC = () => {
  const { room, myMemberId, displayName, avatar, isConnected, pingMs, resetGame, showNotification } = useGameStore();
  const [muted, setMuted] = useState(sound.isMuted());
  const [copied, setCopied] = useState(false);

  const handleToggleSound = () => {
    const isNowMuted = sound.toggleMute();
    setMuted(isNowMuted);
    if (!isNowMuted) {
      sound.playLockIn();
    }
  };

  const handleCopyCode = async () => {
    if (!room?.joinCode) return;
    try {
      await navigator.clipboard.writeText(room.joinCode);
      setCopied(true);
      showNotification(`Room code ${room.joinCode} copied!`, 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showNotification('Failed to copy room code', 'error');
    }
  };

  const handleLeaveRoom = async () => {
    if (confirm('Leave this room?')) {
      await socketService.leaveRoom();
      resetGame();
    }
  };

  const currentMember = room?.members.find((m) => m.id === myMemberId || m.displayName === displayName);
  const isHost = currentMember?.role === 'host' || room?.hostId === myMemberId || room?.hostId === currentMember?.id;

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 14px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      background: 'rgba(10, 14, 23, 0.92)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      gap: '8px',
      flexWrap: 'nowrap',
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', userSelect: 'none', flexShrink: 0 }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 12px rgba(0, 242, 254, 0.35)',
          fontSize: '17px',
        }}>
          ⚡
        </div>
        <div>
          <h1 style={{
            fontSize: '15px',
            fontWeight: 800,
            letterSpacing: '0.03em',
            margin: 0,
            lineHeight: 1.1,
            whiteSpace: 'nowrap',
          }}>
            <span className="gradient-text">SPEED</span> <span style={{ color: '#fff' }}>BUZZER</span>
          </h1>
          <span className="hide-on-mobile" style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Multiplayer Quiz Arena
          </span>
        </div>
      </div>

      {/* Middle: Room Code Badge if in room */}
      {room && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <div
            onClick={handleCopyCode}
            title="Click to copy join code"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              background: 'rgba(0, 242, 254, 0.08)',
              border: '1px solid rgba(0, 242, 254, 0.3)',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <span className="font-mono" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '0.08em' }}>
              {room.joinCode}
            </span>
            {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} color="var(--accent-cyan)" />}
          </div>

          {isHost && (
            <span className="badge badge-amber" style={{ padding: '3px 7px', fontSize: '10px' }}>
              <Shield size={10} /> <span className="hide-on-mobile">HOST</span>
            </span>
          )}
        </div>
      )}

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        {/* Latency / Connection */}
        <div
          title={isConnected ? `Connected • Ping: ${pingMs}ms` : 'Disconnected'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            color: isConnected ? 'var(--accent-emerald)' : 'var(--accent-crimson)',
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '4px 8px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--surface-border)',
          }}
        >
          {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span className="font-mono hide-on-mobile" style={{ fontWeight: 600 }}>{pingMs ? `${pingMs}ms` : 'ONLINE'}</span>
        </div>

        {/* Audio Mute Button */}
        <button
          onClick={handleToggleSound}
          title={muted ? 'Unmute sounds' : 'Mute sounds'}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px',
            cursor: 'pointer',
            color: muted ? 'var(--text-muted)' : 'var(--accent-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>

        {/* Player Profile */}
        {displayName && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 8px 3px 6px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-full)',
            maxWidth: '120px',
          }}>
            <span style={{ fontSize: '15px' }}>{avatar || '⚡'}</span>
            <span className="hide-on-mobile" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </span>
          </div>
        )}

        {/* Leave Room Button */}
        {room && (
          <button
            onClick={handleLeaveRoom}
            title="Leave room"
            style={{
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: 'var(--accent-crimson)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LogOut size={14} />
          </button>
        )}
      </div>
    </header>
  );
};
