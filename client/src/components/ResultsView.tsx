import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Award, Zap, Target, RotateCcw, Home } from 'lucide-react';
import { useGameStore } from '../stores/gameStore';
import { sound } from '../services/sound.service';
import { socketService } from '../services/socket.service';

export const ResultsView: React.FC = () => {
  const { matchResult, room, match, myMemberId, resetGame } = useGameStore();

  useEffect(() => {
    sound.playFanfare();

    // Trigger double confetti blast
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
      setTimeout(() => {
        confetti({
          particleCount: 80,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 80,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        });
      }, 350);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const rankings = matchResult?.rankings || [];
  const winner = rankings[0];

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', padding: '36px 20px 80px', textAlign: 'center' }}>
      {/* Trophy & Winner Headline */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '90px',
        height: '90px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, #f59e0b 0%, #b45309 100%)',
        boxShadow: '0 0 45px rgba(245, 158, 11, 0.5)',
        marginBottom: '20px',
      }}>
        <Trophy size={48} color="#fff" />
      </div>

      <h1 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, marginBottom: '8px' }}>
        Match Concluded!
      </h1>
      <p style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '32px' }}>
        {winner ? (
          <>
            Champion:{' '}
            <span style={{ color: 'var(--accent-amber)', fontWeight: 800 }}>
              {winner.displayName}
            </span>{' '}
            with {winner.score} points! 🏆
          </>
        ) : (
          'Great game everyone!'
        )}
      </p>

      {/* Podium Cards (Top 3) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '36px',
      }}>
        {rankings.slice(0, 3).map((player, index) => {
          const medal = index === 0 ? '🥇 1st Place' : index === 1 ? '🥈 2nd Place' : '🥉 3rd Place';
          const isMe = player.playerId === myMemberId;

          return (
            <div
              key={player.playerId}
              className="glass-panel"
              style={{
                padding: '24px 20px',
                border: index === 0 ? '2px solid var(--accent-amber)' : '1px solid var(--surface-border)',
                boxShadow: index === 0 ? '0 0 30px rgba(245, 158, 11, 0.25)' : 'none',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 800, color: index === 0 ? 'var(--accent-amber)' : 'var(--text-muted)', marginBottom: '10px' }}>
                {medal}
              </div>
              <div style={{ fontSize: '44px', marginBottom: '8px' }}>{player.avatar || '⚡'}</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: isMe ? 'var(--accent-cyan)' : '#fff', marginBottom: '4px' }}>
                {player.displayName} {isMe && '(You)'}
              </div>
              <div className="font-mono" style={{ fontSize: '24px', fontWeight: 900, color: 'var(--accent-emerald)', marginBottom: '12px' }}>
                {player.score} pts
              </div>

              {/* Badges / Stats */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'left', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Accuracy:</span>
                  <span className="font-mono" style={{ fontWeight: 700, color: '#fff' }}>
                    {Math.round(player.accuracy * 100)}%
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Fastest Buzz:</span>
                  <span className="font-mono" style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {player.fastestBuzz ? `${player.fastestBuzz}ms` : '—'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Return Actions */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
        <button
          onClick={resetGame}
          className="btn btn-primary"
          style={{ padding: '14px 32px', fontSize: '16px' }}
        >
          <Home size={18} /> Return to Main Menu
        </button>
      </div>
    </div>
  );
};
