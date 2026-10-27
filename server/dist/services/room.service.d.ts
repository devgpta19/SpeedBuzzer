import { RoomSettings, RoomState, RoomMember, RoomStatus, ConnectionStatus } from 'speed-buzzer-shared';
import { SessionInfo } from './session.service.js';
export declare class RoomService {
    createRoom(session: SessionInfo, settingsOverrides: Partial<RoomSettings>): Promise<RoomState>;
    joinRoom(joinCode: string, session: SessionInfo, asSpectator?: boolean): Promise<{
        room: RoomState;
        memberId: string;
    }>;
    leaveRoom(roomId: string, sessionId: string): Promise<{
        wasHost: boolean;
        newHostId: string | null;
    }>;
    setReady(roomId: string, sessionId: string, ready: boolean): Promise<void>;
    updateSettings(roomId: string, sessionId: string, updates: Partial<RoomSettings>): Promise<RoomSettings>;
    setConnectionStatus(roomId: string, sessionId: string, status: ConnectionStatus): Promise<void>;
    checkAndSoftDeleteEmptyRoom(roomId: string): Promise<void>;
    getRoomState(roomId: string): Promise<RoomState | null>;
    getRoomByJoinCode(joinCode: string): Promise<{
        id: string;
    } | null>;
    getMemberBySession(roomId: string, sessionId: string): Promise<RoomMember | null>;
    setRoomStatus(roomId: string, status: RoomStatus): Promise<void>;
    removePlayer(roomId: string, hostSessionId: string, targetMemberId: string): Promise<void>;
}
export declare const roomService: RoomService;
