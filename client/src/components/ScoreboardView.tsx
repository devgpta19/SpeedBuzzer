import React from 'react';
import { Trophy, Award, Flame, Users } from 'lucide-react';
import { useGameStore } from '../stores/gameStore';

export const ScoreboardView: React.FC = () => {
  const { room, match, myMemberId } = useGameStore();

  if (!room) return null;

  const players = room.members.filter((m) => m.role !== 'spectator');

  // Sort players by score in match or room
  const rankedPlayers = [...players].sort((a, b) => {
    const scoreA = match?.scores[a.id] ?? a.score ?? 0;
    const scoreB = match?.scores[b.id] ?? b.score ?? 0;
    return scoreB - scoreA;
  });

  return (
    <div className="glass-panel" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Trophy size={18} color="var(--accent-amber)" />
        <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>Live Leaderboard</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {rankedPlayers.map((player, index) => {
          const isMe = player.id === myMemberId;
          const score = match?.scores[player.id] ?? player.score ?? 0;
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;

          return (
            <div
              key={player.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: isMe ? 'rgba(0, 242, 254, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                border: isMe ? '1px solid rgba(0, 242, 254, 0.3)' : '1px solid var(--surface-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '16px', minWidth: '24px', textAlign: 'center' }}>
                  {medal}
                </span>
                <span style={{ fontSize: '18px' }}>{player.avatar || '⚡'}</span>
                <div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: isMe ? 'var(--accent-cyan)' : '#fff',
                  }}>
                    {player.displayName} {isMe && '(You)'}
                  </div>
                </div>
              </div>

              <div className="font-mono" style={{
                fontSize: '16px',
                fontWeight: 800,
                color: score > 0 ? 'var(--accent-emerald)' : score < 0 ? 'var(--accent-crimson)' : 'var(--text-secondary)',
              }}>
                {score} pts
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
