import React, { useState } from 'react';
import {
  Users,
  Zap,
  Play,
  Layers,
  Globe2,
  Clock,
  Award,
  Sparkles,
  Swords,
  Eye,
  Settings,
} from 'lucide-react';
import { useGameStore } from '../stores/gameStore';
import { socketService } from '../services/socket.service';
import { sound } from '../services/sound.service';
import {
  QuestionCategory,
  QuestionDifficulty,
  SupportedLanguage,
  MatchFormat,
  DEFAULT_ROOM_SETTINGS,
} from 'speed-buzzer-shared';
import { getOrCreateDeviceId } from '../utils/device';

const AVATARS = ['⚡', '🚀', '🧠', '🎯', '🐯', '🦅', '💎', '👑', '🔥', '🏆', '👾', '🌟'];

const CATEGORIES = [
  { id: QuestionCategory.GENERAL_KNOWLEDGE, name: 'General', icon: '🌍' },
  { id: QuestionCategory.SCIENCE, name: 'Science', icon: '🔬' },
  { id: QuestionCategory.HISTORY, name: 'History', icon: '🏛️' },
  { id: QuestionCategory.GEOGRAPHY, name: 'Geography', icon: '🗺️' },
  { id: QuestionCategory.TECHNOLOGY, name: 'Tech & AI', icon: '💻' },
  { id: QuestionCategory.SPORTS, name: 'Sports', icon: '⚽' },
  { id: QuestionCategory.ENTERTAINMENT, name: 'Pop Culture', icon: '🎬' },
  { id: QuestionCategory.MIXED, name: 'All Mixed', icon: '🎲' },
];

export const LandingPage: React.FC = () => {
  const { guestToken, displayName, avatar, setSession, setRoom, setMyMemberId, showNotification } = useGameStore();

  const initialCode = (() => {
    const pathMatch = window.location.pathname.match(/\/room\/([a-zA-Z0-9]+)/);
    if (pathMatch && pathMatch[1]) return pathMatch[1].toUpperCase();
    const searchParams = new URLSearchParams(window.location.search);
    return (searchParams.get('code') || searchParams.get('room') || '').toUpperCase();
  })();

  const [activeTab, setActiveTab] = useState<'create' | 'join'>(initialCode ? 'join' : 'create');
  const [name, setName] = useState(displayName || '');
  const [selectedAvatar, setSelectedAvatar] = useState(avatar || '⚡');
  const [joinCode, setJoinCode] = useState(initialCode);
  const [asSpectator, setAsSpectator] = useState(false);
  const [loading, setLoading] = useState(false);

  // Room Creation Settings
  const [category, setCategory] = useState<QuestionCategory>(QuestionCategory.GENERAL_KNOWLEDGE);
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>(QuestionDifficulty.MEDIUM);
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [language, setLanguage] = useState<SupportedLanguage>(SupportedLanguage.ENGLISH);
  const [teamMode, setTeamMode] = useState(false);
  const [tieWindowMs, setTieWindowMs] = useState(50);
  const [buzzTimerSeconds, setBuzzTimerSeconds] = useState(10);
  const [answerTimerSeconds, setAnswerTimerSeconds] = useState(15);

  const ensureGuestAuth = async (): Promise<string> => {
    const trimmedName = (name.trim() || 'Player').slice(0, 32);
    const deviceId = getOrCreateDeviceId();
    
    // Call REST API to get or refresh guest token
    const res = await fetch('/api/auth/guest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': deviceId,
      },
      body: JSON.stringify({ displayName: trimmedName, deviceId }),
    });

    if (!res.ok) {
      throw new Error('Authentication failed');
    }

    const data = await res.json();
    setSession(data.token, data.session.memberId, trimmedName, selectedAvatar);
    await socketService.connect(data.token);
    return data.token;
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showNotification('Please enter a display name', 'warning');
      return;
    }

    setLoading(true);
    try {
      sound.playBuzzPress();
      await ensureGuestAuth();

      const settings = {
        ...DEFAULT_ROOM_SETTINGS,
        questionCategory: category,
        questionDifficulty: difficulty,
        questionCount,
        questionLanguage: language,
        teamMode,
        tieWindowMs,
        buzzTimerSeconds,
        answerTimerSeconds,
      };

      const result = await socketService.createRoom(settings);
      if (result.success && result.room) {
        sound.playLockIn();
        if (result.yourId) {
          setMyMemberId(result.yourId);
        }
        setRoom(result.room);
        showNotification(`Room ${result.room.joinCode} created!`, 'success');
      } else {
        showNotification(result.error || 'Failed to create room', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showNotification(err.message || 'Error creating room', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showNotification('Please enter a display name', 'warning');
      return;
    }
    if (!joinCode.trim()) {
      showNotification('Please enter a room code', 'warning');
      return;
    }

    setLoading(true);
    try {
      sound.playBuzzPress();
      await ensureGuestAuth();

      const result = await socketService.joinRoom(
        joinCode.trim().toUpperCase(),
        name.trim(),
        asSpectator
      );

      if (result.success && result.room) {
        sound.playLockIn();
        if (result.yourId) {
          setMyMemberId(result.yourId);
        }
        setRoom(result.room);
        showNotification(`Joined room ${result.room.joinCode}!`, 'success');
      } else {
        showNotification(result.error || 'Room not found or unable to join', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showNotification(err.message || 'Error joining room', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: 'clamp(16px, 3vw, 36px) clamp(10px, 3vw, 20px) 60px' }}>
      {/* Hero Header */}
      <div style={{ textAlign: 'center', marginBottom: 'clamp(20px, 4vw, 36px)' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(0, 242, 254, 0.08)',
          border: '1px solid rgba(0, 242, 254, 0.3)',
          borderRadius: 'var(--radius-full)',
          padding: '5px 12px',
          fontSize: '11px',
          color: 'var(--accent-cyan)',
          fontWeight: 600,
          marginBottom: '12px',
        }}>
          <Sparkles size={13} /> Sub-Millisecond Competitive Quiz Buzzer
        </div>

        <h1 style={{
          fontSize: 'clamp(26px, 6vw, 48px)',
          fontWeight: 900,
          letterSpacing: '-0.02em',
          lineHeight: 1.15,
          marginBottom: '10px',
        }}>
          Outsmart. Outbuzz. <span className="gradient-text">Win.</span>
        </h1>
        <p style={{
          fontSize: 'clamp(13px, 3.5vw, 16px)',
          color: 'var(--text-secondary)',
          maxWidth: '520px',
          margin: '0 auto',
          lineHeight: 1.45,
          padding: '0 8px',
        }}>
          Real-time multiplayer buzzer arena with tie-resolution windows, bilingual Hindi & English question bank, and comprehensive host arbitration.
        </p>
      </div>

      {/* Main Configuration Card */}
      <div className="glass-panel" style={{ padding: 'clamp(16px, 4vw, 32px)', marginBottom: '32px' }}>
        {/* Profile Setup: Name & Avatar */}
        <div style={{
          paddingBottom: '20px',
          borderBottom: '1px solid var(--surface-border)',
          marginBottom: '20px',
        }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Choose Your Player Identity
          </label>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Avatar Selector */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '4px 0', WebkitOverflowScrolling: 'touch', maxWidth: '100%' }}>
              {AVATARS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setSelectedAvatar(em)}
                  style={{
                    width: '38px',
                    height: '38px',
                    flexShrink: 0,
                    borderRadius: 'var(--radius-sm)',
                    border: selectedAvatar === em ? '2px solid var(--accent-cyan)' : '1px solid var(--surface-border)',
                    background: selectedAvatar === em ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    fontSize: '18px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: selectedAvatar === em ? 'scale(1.08)' : 'scale(1)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {em}
                </button>
              ))}
            </div>

            {/* Name Input */}
            <input
              type="text"
              placeholder="Enter your game name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              style={{
                flex: '1 1 200px',
                padding: '10px 14px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-md)',
                color: '#fff',
                fontSize: '15px',
                fontWeight: 600,
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Tab Switcher: Create Room vs Join Room */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          background: 'rgba(0, 0, 0, 0.25)',
          padding: '4px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '22px',
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 8px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: activeTab === 'create' ? 'var(--surface-card-hover)' : 'transparent',
              color: activeTab === 'create' ? 'var(--accent-cyan)' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Settings size={15} /> Host Match
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('join')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 8px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: activeTab === 'join' ? 'var(--surface-card-hover)' : 'transparent',
              color: activeTab === 'join' ? 'var(--accent-cyan)' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Users size={15} /> Join Room
          </button>
        </div>

        {/* TAB 1: CREATE ROOM FORM */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Category Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Trivia Category
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '8px',
              }}>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: category === cat.id ? 'rgba(0, 242, 254, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                      border: category === cat.id ? '1px solid var(--accent-cyan)' : '1px solid var(--surface-border)',
                      color: category === cat.id ? '#fff' : 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span>{cat.icon}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Match Format & Rules Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px',
            }}>
              {/* Difficulty */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Difficulty
                </label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[QuestionDifficulty.EASY, QuestionDifficulty.MEDIUM, QuestionDifficulty.HARD].map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setDifficulty(diff)}
                      style={{
                        flex: 1,
                        padding: '7px 2px',
                        borderRadius: 'var(--radius-sm)',
                        border: difficulty === diff ? '1px solid var(--accent-cyan)' : '1px solid var(--surface-border)',
                        background: difficulty === diff ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        color: difficulty === diff ? 'var(--accent-cyan)' : 'var(--text-muted)',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'capitalize',
                        cursor: 'pointer',
                      }}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of Questions */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Questions
                </label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[5, 10, 15, 20].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setQuestionCount(num)}
                      style={{
                        flex: 1,
                        padding: '7px 2px',
                        borderRadius: 'var(--radius-sm)',
                        border: questionCount === num ? '1px solid var(--accent-cyan)' : '1px solid var(--surface-border)',
                        background: questionCount === num ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        color: questionCount === num ? 'var(--accent-cyan)' : 'var(--text-muted)',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Language / भाषा
                </label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setLanguage(SupportedLanguage.ENGLISH)}
                    style={{
                      flex: 1,
                      padding: '7px 2px',
                      borderRadius: 'var(--radius-sm)',
                      border: language === SupportedLanguage.ENGLISH ? '1px solid var(--accent-cyan)' : '1px solid var(--surface-border)',
                      background: language === SupportedLanguage.ENGLISH ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      color: language === SupportedLanguage.ENGLISH ? 'var(--accent-cyan)' : 'var(--text-muted)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage(SupportedLanguage.HINDI)}
                    style={{
                      flex: 1,
                      padding: '7px 2px',
                      borderRadius: 'var(--radius-sm)',
                      border: language === SupportedLanguage.HINDI ? '1px solid var(--accent-cyan)' : '1px solid var(--surface-border)',
                      background: language === SupportedLanguage.HINDI ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      color: language === SupportedLanguage.HINDI ? 'var(--accent-cyan)' : 'var(--text-muted)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    हिंदी
                  </button>
                </div>
              </div>

              {/* Mode */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Match Mode
                </label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setTeamMode(false)}
                    style={{
                      flex: 1,
                      padding: '7px 2px',
                      borderRadius: 'var(--radius-sm)',
                      border: !teamMode ? '1px solid var(--accent-cyan)' : '1px solid var(--surface-border)',
                      background: !teamMode ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      color: !teamMode ? 'var(--accent-cyan)' : 'var(--text-muted)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Solo
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeamMode(true)}
                    style={{
                      flex: 1,
                      padding: '7px 2px',
                      borderRadius: 'var(--radius-sm)',
                      border: teamMode ? '1px solid var(--accent-purple)' : '1px solid var(--surface-border)',
                      background: teamMode ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      color: teamMode ? 'var(--accent-purple)' : 'var(--text-muted)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Team
                  </button>
                </div>
              </div>
            </div>

            {/* Tie Window & Timing Sliders */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '14px',
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Tie-Resolution Window:</span>
                  <span className="font-mono" style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                    {tieWindowMs}ms
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={10}
                  value={tieWindowMs}
                  onChange={(e) => setTieWindowMs(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Answer Time Limit:</span>
                  <span className="font-mono" style={{ fontSize: '12px', color: 'var(--accent-amber)', fontWeight: 700 }}>
                    {answerTimerSeconds}s
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={30}
                  step={5}
                  value={answerTimerSeconds}
                  onChange={(e) => setAnswerTimerSeconds(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-amber)' }}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '15px',
              }}
            >
              <Zap size={18} /> {loading ? 'Launching Arena...' : 'Create & Enter Game Room'}
            </button>
          </form>
        )}

        {/* TAB 2: JOIN ROOM FORM */}
        {activeTab === 'join' && (
          <form onSubmit={handleJoinRoom} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Room Code (6 characters)
              </label>
              <input
                type="text"
                placeholder="e.g. A9B2X7"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={8}
                className="font-mono"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '2px solid rgba(0, 242, 254, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--accent-cyan)',
                  fontSize: 'clamp(20px, 6vw, 26px)',
                  fontWeight: 800,
                  letterSpacing: '0.15em',
                  textAlign: 'center',
                  outline: 'none',
                }}
              />
            </div>

            {/* Spectator Option */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--surface-border)',
              cursor: 'pointer',
            }}
            onClick={() => setAsSpectator(!asSpectator)}
            >
              <input
                type="checkbox"
                checked={asSpectator}
                onChange={(e) => setAsSpectator(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Eye size={14} color="var(--accent-cyan)" /> Join as Spectator
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Watch without buzzing or scoring
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '15px',
              }}
            >
              <Play size={18} /> {loading ? 'Connecting...' : 'Join Game Now'}
            </button>
          </form>
        )}
      </div>

      {/* Highlights / Features Banner */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px',
      }}>
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ color: 'var(--accent-cyan)', fontSize: '20px', marginBottom: '6px' }}>⏱️</div>
          <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>0-100ms Tie Window</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Equal-time network tie-resolution ensures fair ordering even with latency variance across Wi-Fi or mobile networks.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ color: 'var(--accent-amber)', fontSize: '20px', marginBottom: '6px' }}>🇮🇳</div>
          <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>Bilingual Curated Trivia</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Full support for English and Hindi questions with normalized Unicode, alias recognition, and fuzzy matching.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ color: 'var(--accent-purple)', fontSize: '20px', marginBottom: '6px' }}>🛡️</div>
          <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>Host Control & Disputes</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Live manual answer adjudication, immediate score adjustments with rollback, and an in-game dispute resolution workflow.
          </p>
        </div>
      </div>
    </div>
  );
};
