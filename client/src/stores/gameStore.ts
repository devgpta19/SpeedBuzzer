import { create } from 'zustand';
import {
  RoomState,
  RoomMember,
  MatchState,
  QuestionDisplay,
  QuestionReveal,
  BuzzerState,
  ScoreUpdate,
  MatchResult,
  DisputeData,
  S2C_ChatMessage,
} from 'speed-buzzer-shared';

export interface GameStoreState {
  // Session
  guestToken: string | null;
  myMemberId: string | null;
  displayName: string;
  avatar: string;
  
  // Connection & Latency
  isConnected: boolean;
  pingMs: number;

  // Room
  room: RoomState | null;
  
  // Match
  match: MatchState | null;
  question: QuestionDisplay | null;
  questionReveal: QuestionReveal | null;
  buzzer: BuzzerState | null;
  matchResult: MatchResult | null;
  
  // Realtime Active Timer
  activeTimer: {
    type: 'buzz' | 'answer' | 'match';
    deadline: number;
    remaining: number;
    totalDuration?: number;
  } | null;

  // Chat
  chatMessages: S2C_ChatMessage[];

  // Disputes
  disputes: DisputeData[];

  // Notifications
  notification: {
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    id: number;
  } | null;

  // Actions
  setSession: (token: string, memberId: string, displayName: string, avatar: string) => void;
  setConnected: (connected: boolean) => void;
  setPing: (ms: number) => void;
  setRoom: (room: RoomState | null) => void;
  setMyMemberId: (id: string) => void;
  updateRoomMember: (memberId: string, updates: Partial<RoomMember>) => void;
  addRoomMember: (member: RoomMember) => void;
  removeRoomMember: (memberId: string) => void;
  setMatch: (match: MatchState | null) => void;
  setQuestion: (question: QuestionDisplay | null) => void;
  setQuestionReveal: (reveal: QuestionReveal | null) => void;
  setBuzzer: (buzzer: BuzzerState | null) => void;
  setActiveTimer: (timer: { type: 'buzz' | 'answer' | 'match'; deadline: number; remaining: number; totalDuration?: number } | null) => void;
  setMatchResult: (result: MatchResult | null) => void;
  addChatMessage: (msg: S2C_ChatMessage) => void;
  addDispute: (dispute: DisputeData) => void;
  updateDispute: (dispute: DisputeData) => void;
  applyScoreUpdate: (update: ScoreUpdate) => void;
  showNotification: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStoreState>((set) => ({
  guestToken: localStorage.getItem('sb_token'),
  myMemberId: localStorage.getItem('sb_member_id'),
  displayName: localStorage.getItem('sb_name') || '',
  avatar: localStorage.getItem('sb_avatar') || '⚡',

  isConnected: false,
  pingMs: 0,

  room: null,
  match: null,
  question: null,
  questionReveal: null,
  buzzer: null,
  matchResult: null,
  activeTimer: null,
  chatMessages: [],
  disputes: [],
  notification: null,

  setSession: (token, memberId, displayName, avatar) => {
    localStorage.setItem('sb_token', token);
    localStorage.setItem('sb_member_id', memberId);
    localStorage.setItem('sb_name', displayName);
    localStorage.setItem('sb_avatar', avatar);
    set({ guestToken: token, myMemberId: memberId, displayName, avatar });
  },

  setConnected: (isConnected) => set({ isConnected }),
  setPing: (pingMs) => set({ pingMs }),
  setRoom: (room) => {
    if (room?.joinCode) {
      localStorage.setItem('sb_active_room', room.joinCode);
      const targetPath = `/room/${room.joinCode}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState({}, '', targetPath);
      }
    } else {
      localStorage.removeItem('sb_active_room');
      if (window.location.pathname.startsWith('/room/')) {
        window.history.pushState({}, '', '/');
      }
    }
    set({ room });
  },
  setMyMemberId: (myMemberId) => {
    if (myMemberId) {
      localStorage.setItem('sb_member_id', myMemberId);
    } else {
      localStorage.removeItem('sb_member_id');
    }
    set({ myMemberId });
  },

  updateRoomMember: (memberId, updates) =>
    set((state) => {
      if (!state.room) return state;
      const members = state.room.members.map((m) =>
        m.id === memberId ? { ...m, ...updates } : m
      );
      return { room: { ...state.room, members } };
    }),

  addRoomMember: (member) =>
    set((state) => {
      if (!state.room) return state;
      const exists = state.room.members.some((m) => m.id === member.id);
      const members = exists
        ? state.room.members.map((m) => (m.id === member.id ? member : m))
        : [...state.room.members, member];
      return { room: { ...state.room, members } };
    }),

  removeRoomMember: (memberId) =>
    set((state) => {
      if (!state.room) return state;
      const members = state.room.members.filter((m) => m.id !== memberId);
      return { room: { ...state.room, members } };
    }),

  setMatch: (match) => set({ match }),
  setQuestion: (question) => set({ question, questionReveal: null }),
  setQuestionReveal: (questionReveal) => set({ questionReveal }),
  setBuzzer: (buzzer) => set({ buzzer }),
  setActiveTimer: (activeTimer) => set({ activeTimer }),
  setMatchResult: (matchResult) => set({ matchResult }),

  addChatMessage: (msg) =>
    set((state) => ({ chatMessages: [...state.chatMessages.slice(-50), msg] })),

  addDispute: (dispute) =>
    set((state) => ({ disputes: [...state.disputes, dispute] })),

  updateDispute: (updated) =>
    set((state) => ({
      disputes: state.disputes.map((d) => (d.id === updated.id ? updated : d)),
    })),

  applyScoreUpdate: (update) =>
    set((state) => {
      let room = state.room;
      if (room) {
        const members = room.members.map((m) =>
          m.id === update.playerId ? { ...m, score: update.newScore } : m
        );
        room = { ...room, members };
      }
      if (!state.match) return { room };
      const scores = { ...state.match.scores, [update.playerId]: update.newScore };
      let teamScores = state.match.teamScores;
      if (update.teamId && update.newTeamScore !== null) {
        teamScores = { ...teamScores, [update.teamId]: update.newTeamScore };
      }
      return {
        room,
        match: {
          ...state.match,
          scores,
          teamScores,
        },
      };
    }),

  showNotification: (message, type = 'info') => {
    const id = Date.now();
    set({ notification: { message, type, id } });
    setTimeout(() => {
      set((state) => (state.notification?.id === id ? { notification: null } : state));
    }, 4000);
  },

  resetGame: () => {
    localStorage.removeItem('sb_active_room');
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
    set({
      room: null,
      match: null,
      question: null,
      questionReveal: null,
      buzzer: null,
      matchResult: null,
      activeTimer: null,
      chatMessages: [],
      disputes: [],
    });
  },
}));
