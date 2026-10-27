import React, { useState } from 'react';
import { AlertTriangle, X, Check, XCircle, Send, Shield } from 'lucide-react';
import { useGameStore } from '../stores/gameStore';
import { socketService } from '../services/socket.service';

interface DisputeModalProps {
  onClose: () => void;
}

export const DisputeModal: React.FC<DisputeModalProps> = ({ onClose }) => {
  const { room, match, question, myMemberId, disputes, showNotification } = useGameStore();

  const [type, setType] = useState<'answer_judgment' | 'buzzer_order' | 'question_content' | 'score_error'>('answer_judgment');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isHost = room?.hostId === myMemberId;

  const handleRaiseDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!match || !question || !description.trim()) return;

    setSubmitting(true);
    const res = await socketService.createDispute(
      match.id,
      question.id,
      type,
      description.trim()
    );
    setSubmitting(false);

    if (res.success) {
      showNotification('Dispute submitted for host review', 'info');
      setDescription('');
      onClose();
    } else {
      showNotification(res.error || 'Failed to submit dispute', 'error');
    }
  };

  const handleResolveDispute = async (disputeId: string, resolution: 'upheld' | 'overridden' | 'dismissed') => {
    const res = await socketService.resolveDispute(
      disputeId,
      resolution,
      `Resolved by host as ${resolution}`
    );
    if (res.success) {
      showNotification(`Dispute ${resolution}`, 'success');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={20} color="var(--accent-amber)" />
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Dispute Management</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Host Dispute Review List */}
        {isHost && disputes.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-amber)', marginBottom: '10px' }}>
              Pending Player Disputes ({disputes.filter((d) => d.status === 'open').length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {disputes.map((d) => (
                <div key={d.id} style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--surface-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#fff' }}>{d.requesterName}</span>
                    <span className="badge badge-amber" style={{ fontSize: '10px' }}>{d.type.replace('_', ' ')}</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>{d.description}</p>
                  {d.status === 'open' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleResolveDispute(d.id, 'upheld')} className="btn btn-success" style={{ padding: '6px 12px', fontSize: '12px' }}>
                        <Check size={14} /> Upheld (Grant Points)
                      </button>
                      <button onClick={() => handleResolveDispute(d.id, 'dismissed')} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                        <XCircle size={14} /> Dismiss
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Raise New Dispute Form */}
        <form onSubmit={handleRaiseDispute} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Dispute Category
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-sm)',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
              }}
            >
              <option value="answer_judgment" style={{ background: '#0f172a' }}>Answer Adjudication (My answer was valid)</option>
              <option value="buzzer_order" style={{ background: '#0f172a' }}>Buzzer Order Timing Contested</option>
              <option value="question_content" style={{ background: '#0f172a' }}>Question Error or Ambiguity</option>
              <option value="score_error" style={{ background: '#0f172a' }}>Score Tally Error</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Describe the issue
            </label>
            <textarea
              rows={3}
              placeholder="Explain why this call was incorrect..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={250}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-sm)',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                resize: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !description.trim()}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px' }}
          >
            <Send size={16} /> Submit Dispute
          </button>
        </form>
      </div>
    </div>
  );
};
