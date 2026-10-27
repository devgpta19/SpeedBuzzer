import React, { useState } from 'react';
import {
  Shield,
  X,
  Pause,
  Play,
  SkipForward,
  Eye,
  UserX,
  AlertOctagon,
  CheckCircle,
} from 'lucide-react';
import { useGameStore } from '../stores/gameStore';
import { socketService } from '../services/socket.service';
import { MatchPhase } from 'speed-buzzer-shared';

interface HostControlsModalProps {
  onClose: () => void;
}

export const HostControlsModal: React.FC<HostControlsModalProps> = ({ onClose }) => {
  const { room, match, showNotification } = useGameStore();
  const [loading, setLoading] = useState(false);

  if (!room) return null;

  const isPaused = match?.phase === MatchPhase.MATCH_PAUSED;

  const handlePauseResume = async () => {
    setLoading(true);
    if (isPaused) {
      await socketService.resumeMatch();
      showNotification('Match resumed', 'info');
    } else {
      await socketService.pauseMatch();
      showNotification('Match paused', 'warning');
    }
    setLoading(false);
  };

  const handleSkipQuestion = async () => {
    if (confirm('Skip the current question and forfeit points?')) {
      setLoading(true);
      await socketService.skipQuestion();
      showNotification('Question skipped', 'info');
      setLoading(false);
      onClose();
    }
  };

  const handleRevealAnswer = async () => {
    setLoading(true);
    await socketService.revealAnswer();
    showNotification('Answer revealed', 'info');
    setLoading(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={20} color="var(--accent-amber)" />
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Host Control Panel</h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Pause / Resume */}
          <button
            onClick={handlePauseResume}
            disabled={loading}
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'flex-start', padding: '14px' }}
          >
            {isPaused ? <Play size={18} color="var(--accent-emerald)" /> : <Pause size={18} color="var(--accent-amber)" />}
            <span>{isPaused ? 'Resume Match' : 'Pause Match'}</span>
          </button>

          {/* Skip Question */}
          <button
            onClick={handleSkipQuestion}
            disabled={loading}
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'flex-start', padding: '14px' }}
          >
            <SkipForward size={18} color="var(--accent-cyan)" />
            <span>Skip Current Question</span>
          </button>

          {/* Reveal Answer */}
          <button
            onClick={handleRevealAnswer}
            disabled={loading}
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'flex-start', padding: '14px' }}
          >
            <Eye size={18} color="var(--accent-emerald)" />
            <span>Force Reveal Correct Answer</span>
          </button>
        </div>
      </div>
    </div>
  );
};
