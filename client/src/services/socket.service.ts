import { io, Socket } from 'socket.io-client';
import { getOrCreateDeviceId } from '../utils/device';
import { BACKEND_URL } from '../config';
import {
  ClientEvents,
  ServerEvents,
  RoomState,
  MatchState,
  QuestionDisplay,
  QuestionReveal,
  BuzzerState,
  ScoreUpdate,
  MatchResult,
  DisputeData,
  S2C_ChatMessage,
} from 'speed-buzzer-shared';

export interface PingData {
  latencyMs: number;
}

class SocketService {
  private socket: Socket | null = null;
  private latency: number = 0;
  private pingInterval: number | null = null;

  public getSocket(): Socket | null {
    return this.socket;
  }

  public getLatency(): number {
    return this.latency;
  }

  public connect(token: string): Promise<Socket> {
    if (this.socket && this.socket.connected) {
      return Promise.resolve(this.socket);
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    return new Promise((resolve, reject) => {
      const deviceId = getOrCreateDeviceId();
      // Connect to specified backend URL or relative origin/proxy
      this.socket = io(BACKEND_URL || undefined, {
        auth: { token, deviceId },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        this.startPingTracker();
        resolve(this.socket!);
      });

      this.socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
        reject(err);
      });

      this.socket.on('disconnect', () => {
        this.stopPingTracker();
      });
    });
  }

  public disconnect(): void {
    this.stopPingTracker();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private startPingTracker(): void {
    this.stopPingTracker();
    this.pingInterval = window.setInterval(() => {
      if (!this.socket || !this.socket.connected) return;
      const start = Date.now();
      this.socket.emit('ping', () => {
        this.latency = Math.max(1, Date.now() - start);
      });
    }, 5000);
  }

  private stopPingTracker(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // ── Emit Methods with Promises ────────────────────────────

  public async createRoom(settings: any): Promise<{ success: boolean; room?: RoomState; yourId?: string; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'NOT_CONNECTED' });
      this.socket.emit(ClientEvents.ROOM_CREATE, { settings }, (res: any) => resolve(res));
    });
  }

  public async joinRoom(joinCode: string, displayName: string, asSpectator = false): Promise<{ success: boolean; room?: RoomState; yourId?: string; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'NOT_CONNECTED' });
      this.socket.emit(ClientEvents.ROOM_JOIN, { joinCode, displayName, asSpectator }, (res: any) => resolve(res));
    });
  }

  public async leaveRoom(): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'NOT_CONNECTED' });
      this.socket.emit(ClientEvents.ROOM_LEAVE, {}, (res: any) => resolve(res));
    });
  }

  public async setReady(ready: boolean): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'NOT_CONNECTED' });
      this.socket.emit(ClientEvents.ROOM_READY, { ready }, (res: any) => resolve(res));
    });
  }

  public async configureSettings(settings: any): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'NOT_CONNECTED' });
      this.socket.emit(ClientEvents.HOST_CONFIGURE, { settings }, (res: any) => resolve(res));
    });
  }

  public async startMatch(): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'NOT_CONNECTED' });
      this.socket.emit(ClientEvents.MATCH_START, {}, (res: any) => resolve(res));
    });
  }

  public async buzz(matchId: string, questionId: string, stateVersion: number): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'NOT_CONNECTED' });
      const idempotencyKey = `${matchId}-${questionId}-${Date.now()}`;
      this.socket.emit(ClientEvents.QUESTION_BUZZ, { matchId, questionId, stateVersion, idempotencyKey }, (res: any) => resolve(res));
    });
  }

  public async submitAnswer(matchId: string, questionId: string, answer: string, stateVersion: number): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'NOT_CONNECTED' });
      const idempotencyKey = `${matchId}-${questionId}-${Date.now()}`;
      this.socket.emit(ClientEvents.ANSWER_SUBMIT, { matchId, questionId, answer, stateVersion, idempotencyKey }, (res: any) => resolve(res));
    });
  }

  public async judgeAnswer(matchId: string, questionId: string, playerId: string, result: 'correct' | 'incorrect', reason?: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'NOT_CONNECTED' });
      this.socket.emit(ClientEvents.HOST_JUDGE, { matchId, questionId, playerId, result, reason }, (res: any) => resolve(res));
    });
  }

  public async nextQuestion(matchId?: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'NOT_CONNECTED' });
      this.socket.emit(ClientEvents.HOST_NEXT, { matchId }, (res: any) => resolve(res));
    });
  }

  public async restartQuestion(matchId?: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'NOT_CONNECTED' });
      this.socket.emit(ClientEvents.HOST_RESTART, { matchId }, (res: any) => resolve(res));
    });
  }

  public async selectPlayerTurn(matchId: string, playerId: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'NOT_CONNECTED' });
      this.socket.emit(ClientEvents.HOST_SELECT_TURN, { matchId, playerId }, (res: any) => resolve(res));
    });
  }

  public async skipQuestion(): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'NOT_CONNECTED' });
      this.socket.emit(ClientEvents.HOST_SKIP, {}, (res: any) => resolve(res));
    });
  }

  public async revealAnswer(): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'NOT_CONNECTED' });
      this.socket.emit(ClientEvents.HOST_REVEAL, {}, (res: any) => resolve(res));
    });
  }

  public async pauseMatch(): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'NOT_CONNECTED' });
      this.socket.emit(ClientEvents.MATCH_PAUSE, {}, (res: any) => resolve(res));
    });
  }

  public async resumeMatch(): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'NOT_CONNECTED' });
      this.socket.emit(ClientEvents.MATCH_RESUME, {}, (res: any) => resolve(res));
    });
  }

  public async joinTeam(teamId: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'NOT_CONNECTED' });
      this.socket.emit(ClientEvents.TEAM_JOIN, { teamId }, (res: any) => resolve(res));
    });
  }

  public async sendChat(text: string): Promise<void> {
    if (!this.socket) return;
    this.socket.emit(ClientEvents.CHAT_SEND, { text });
  }

  public async createDispute(matchId: string, questionId: string, type: any, description: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'NOT_CONNECTED' });
      this.socket.emit(ClientEvents.DISPUTE_CREATE, { matchId, questionId, type, description }, (res: any) => resolve(res));
    });
  }

  public async notifyPlayersReady(): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'NOT_CONNECTED' });
      this.socket.emit(ClientEvents.HOST_NOTIFY_READY, {}, (res: any) => resolve(res));
    });
  }

  public async resolveDispute(disputeId: string, resolution: any, reason: string, scoreAdjustments?: any): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'NOT_CONNECTED' });
      this.socket.emit(ClientEvents.HOST_RESOLVE_DISPUTE, { disputeId, resolution, reason, scoreAdjustments }, (res: any) => resolve(res));
    });
  }
}

export const socketService = new SocketService();
