import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import { getDb } from '../db/connection.js';
import { RoomStatus, MemberRole, ConnectionStatus, JoinPolicy, DEFAULT_ROOM_SETTINGS, } from 'speed-buzzer-shared';
function generateJoinCode() {
    return crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars
}
const TEAM_COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd', '#2ed573'];
const TEAM_NAMES = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel'];
function parseSettings(settings) {
    if (typeof settings === 'string') {
        try {
            return JSON.parse(settings);
        }
        catch {
            return { ...DEFAULT_ROOM_SETTINGS };
        }
    }
    return settings || { ...DEFAULT_ROOM_SETTINGS };
}
export class RoomService {
    async createRoom(session, settingsOverrides) {
        const db = getDb();
        const roomId = uuid();
        const memberId = uuid();
        const joinCode = generateJoinCode();
        const settings = { ...DEFAULT_ROOM_SETTINGS, ...settingsOverrides };
        // Create room
        await db('rooms').insert({
            id: roomId,
            join_code: joinCode,
            host_session_id: session.sessionId,
            visibility: settings.visibility,
            status: 'open',
            settings: JSON.stringify(settings),
            expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hour expiry
        });
        const cleanIp = session.ipAddress ? session.ipAddress.replace(/^::ffff:/, '').trim() : '127.0.0.1';
        const cleanDevice = session.deviceId || null;
        // Add host as member
        await db('room_members').insert({
            id: memberId,
            room_id: roomId,
            session_id: session.sessionId,
            ip_address: cleanIp,
            device_id: cleanDevice,
            display_name: session.displayName,
            avatar: session.avatar,
            color: session.color,
            role: 'host',
            connection_status: 'connected',
            is_ready: true,
            is_active: 'Y',
            inactive: 'Y',
        });
        // Create default teams if team mode is enabled
        const teams = [];
        if (settings.teamMode) {
            for (let i = 0; i < Math.max(2, Math.ceil(settings.maxPlayers / settings.teamSize)); i++) {
                const teamId = uuid();
                await db('teams').insert({
                    id: teamId,
                    room_id: roomId,
                    name: TEAM_NAMES[i] || `Team ${i + 1}`,
                    color: TEAM_COLORS[i] || '#888888',
                });
                teams.push({
                    id: teamId,
                    name: TEAM_NAMES[i] || `Team ${i + 1}`,
                    color: TEAM_COLORS[i] || '#888888',
                    captainId: null,
                    memberIds: [],
                    score: 0,
                });
            }
        }
        return {
            id: roomId,
            joinCode,
            hostId: memberId,
            settings,
            status: RoomStatus.OPEN,
            members: [{
                    id: memberId,
                    sessionId: session.sessionId,
                    displayName: session.displayName,
                    avatar: session.avatar,
                    color: session.color,
                    role: MemberRole.HOST,
                    connectionStatus: ConnectionStatus.CONNECTED,
                    isReady: true,
                    teamId: null,
                    score: 0,
                    joinedAt: Date.now(),
                }],
            teams,
            createdAt: Date.now(),
        };
    }
    async joinRoom(joinCode, session, asSpectator = false) {
        const db = getDb();
        // Find the room
        const room = await db('rooms')
            .where('join_code', joinCode.toUpperCase())
            .whereIn('status', ['open', 'in_game'])
            .first();
        if (!room) {
            throw new Error('ROOM_NOT_FOUND');
        }
        const settings = parseSettings(room.settings);
        // Check join policy
        if (settings.joinPolicy === JoinPolicy.LOCKED) {
            throw new Error('ROOM_LOCKED');
        }
        const cleanIp = session.ipAddress ? session.ipAddress.replace(/^::ffff:/, '').trim() : '127.0.0.1';
        const cleanDevice = session.deviceId || null;
        // Check if this specific user/device is already an existing active member in this room:
        // 1. By session_id (exact active socket/HTTP session)
        // 2. OR by device_id (exact device/browser returning to the room)
        // 3. OR by display_name IF that existing member's connection_status is disconnected (reconnecting under same name)
        // Note: NEVER match solely by IP address because multiple different devices on the same WiFi share the exact same IP!
        let existingMember = await db('room_members')
            .where('room_id', room.id)
            .where('is_active', '!=', 'N')
            .where(function () {
            this.where('session_id', session.sessionId);
            if (cleanDevice) {
                this.orWhere('device_id', cleanDevice);
            }
            this.orWhere(function () {
                this.where('display_name', session.displayName)
                    .andWhere('connection_status', '!=', 'connected');
            });
        })
            .orderBy('joined_at', 'asc')
            .first();
        if (existingMember) {
            // Reconnect as the SAME member!
            // If they were the host (or room host_session_id matched their old session or role is host), keep them as host!
            const isHost = existingMember.role === 'host' || room.host_session_id === existingMember.session_id;
            await db('room_members')
                .where('id', existingMember.id)
                .update({
                session_id: session.sessionId,
                ip_address: cleanIp,
                device_id: cleanDevice || existingMember.device_id,
                connection_status: 'connected',
                is_active: 'Y',
                inactive: 'Y',
                left_at: null,
                role: isHost ? 'host' : existingMember.role,
            });
            if (isHost) {
                await db('rooms')
                    .where('id', room.id)
                    .update({ host_session_id: session.sessionId });
            }
            // If there were any duplicate rows for this exact device in this room, soft-delete them
            if (cleanDevice) {
                await db('room_members')
                    .where('room_id', room.id)
                    .where('id', '!=', existingMember.id)
                    .where('device_id', cleanDevice)
                    .update({
                    is_active: 'N',
                    inactive: 'N',
                    left_at: new Date(),
                    connection_status: 'disconnected',
                });
            }
            const roomState = await this.getRoomState(room.id);
            return { room: roomState, memberId: existingMember.id };
        }
        // Check player count
        const memberCount = await db('room_members')
            .where('room_id', room.id)
            .where('role', '!=', 'spectator')
            .where('is_active', '!=', 'N')
            .whereNull('left_at')
            .count('* as count')
            .first();
        const currentPlayers = Number(memberCount?.count || 0);
        let role = asSpectator ? MemberRole.SPECTATOR : MemberRole.PLAYER;
        if (!asSpectator && currentPlayers >= settings.maxPlayers) {
            if (settings.spectatorAllowed) {
                role = MemberRole.SPECTATOR; // Auto-spectator when full
            }
            else {
                throw new Error('ROOM_FULL');
            }
        }
        if (asSpectator && !settings.spectatorAllowed) {
            throw new Error('SPECTATORS_NOT_ALLOWED');
        }
        // In-game join policy
        if (room.status === 'in_game') {
            if (settings.joinPolicy === JoinPolicy.SPECTATOR_ONLY) {
                role = MemberRole.SPECTATOR;
            }
        }
        const memberId = uuid();
        await db('room_members').insert({
            id: memberId,
            room_id: room.id,
            session_id: session.sessionId,
            ip_address: cleanIp,
            device_id: cleanDevice,
            display_name: session.displayName,
            avatar: session.avatar,
            color: session.color,
            role,
            connection_status: 'connected',
            is_ready: false,
            is_active: 'Y',
            inactive: 'Y',
        });
        const roomState = await this.getRoomState(room.id);
        return { room: roomState, memberId };
    }
    async leaveRoom(roomId, sessionId) {
        const db = getDb();
        const member = await db('room_members')
            .where('room_id', roomId)
            .where('session_id', sessionId)
            .whereNull('left_at')
            .first();
        if (!member)
            return { wasHost: false, newHostId: null };
        await db('room_members')
            .where('id', member.id)
            .update({ left_at: new Date(), connection_status: 'disconnected' });
        const wasHost = member.role === 'host';
        let newHostId = null;
        if (wasHost) {
            // Transfer host to next eligible player
            const nextHost = await db('room_members')
                .where('room_id', roomId)
                .where('role', 'player')
                .where('connection_status', 'connected')
                .whereNull('left_at')
                .orderBy('joined_at', 'asc')
                .first();
            if (nextHost) {
                await db('room_members')
                    .where('id', nextHost.id)
                    .update({ role: 'host' });
                await db('rooms')
                    .where('id', roomId)
                    .update({ host_session_id: nextHost.session_id });
                newHostId = nextHost.id;
            }
            else {
                // No eligible players, close room
                await db('rooms').where('id', roomId).update({ status: 'closed' });
            }
        }
        return { wasHost, newHostId };
    }
    async setReady(roomId, sessionId, ready) {
        const db = getDb();
        await db('room_members')
            .where('room_id', roomId)
            .where('session_id', sessionId)
            .whereNull('left_at')
            .update({ is_ready: ready });
    }
    async updateSettings(roomId, sessionId, updates) {
        const db = getDb();
        // Verify host
        const room = await db('rooms').where('id', roomId).first();
        if (!room || room.host_session_id !== sessionId) {
            throw new Error('NOT_HOST');
        }
        const currentSettings = parseSettings(room.settings);
        const newSettings = { ...currentSettings, ...updates };
        await db('rooms').where('id', roomId).update({
            settings: JSON.stringify(newSettings),
            settings_version: room.settings_version + 1,
            updated_at: new Date(),
        });
        return newSettings;
    }
    async setConnectionStatus(roomId, sessionId, status) {
        const db = getDb();
        await db('room_members')
            .where('room_id', roomId)
            .where('session_id', sessionId)
            .where('is_active', '!=', 'N')
            .update({ connection_status: status });
        if (status === ConnectionStatus.DISCONNECTED) {
            await this.checkAndSoftDeleteEmptyRoom(roomId);
        }
    }
    async checkAndSoftDeleteEmptyRoom(roomId) {
        const db = getDb();
        const activeConnected = await db('room_members')
            .where('room_id', roomId)
            .where('is_active', '!=', 'N')
            .where('connection_status', 'connected')
            .whereNull('left_at')
            .count('* as count')
            .first();
        const count = Number(activeConnected?.count || 0);
        if (count === 0) {
            // No one is in the room: mark inactive = 'N' (soft delete)
            await db('room_members')
                .where('room_id', roomId)
                .update({
                is_active: 'N',
                inactive: 'N',
                connection_status: 'disconnected',
                left_at: new Date(),
            });
            await db('rooms').where('id', roomId).update({ status: 'closed' });
        }
    }
    async getRoomState(roomId) {
        const db = getDb();
        const room = await db('rooms').where('id', roomId).first();
        if (!room)
            return null;
        const members = await db('room_members')
            .where('room_id', roomId)
            .where('is_active', '!=', 'N')
            .whereNull('left_at')
            .orderBy('joined_at', 'asc');
        const teams = await db('teams')
            .where('room_id', roomId)
            .orderBy('created_at', 'asc');
        const settings = parseSettings(room.settings);
        const hostMember = members.find(m => m.role === 'host');
        return {
            id: room.id,
            joinCode: room.join_code,
            hostId: hostMember?.id || '',
            settings,
            status: room.status,
            members: members.map(m => ({
                id: m.id,
                sessionId: m.session_id,
                displayName: m.display_name,
                avatar: m.avatar || '⚡',
                color: m.color || '#00ff88',
                role: m.role,
                connectionStatus: m.connection_status,
                isReady: Boolean(m.is_ready),
                teamId: m.team_id,
                score: m.score || 0,
                joinedAt: new Date(m.joined_at).getTime(),
            })),
            teams: teams.map(t => ({
                id: t.id,
                name: t.name,
                color: t.color,
                captainId: t.captain_id,
                memberIds: members.filter(m => m.team_id === t.id).map(m => m.id),
                score: t.score || 0,
            })),
            createdAt: new Date(room.created_at).getTime(),
        };
    }
    async getRoomByJoinCode(joinCode) {
        const db = getDb();
        return db('rooms').where('join_code', joinCode.toUpperCase()).first();
    }
    async getMemberBySession(roomId, sessionId) {
        const db = getDb();
        const m = await db('room_members')
            .where('room_id', roomId)
            .where('session_id', sessionId)
            .whereNull('left_at')
            .first();
        if (!m)
            return null;
        return {
            id: m.id,
            sessionId: m.session_id,
            displayName: m.display_name,
            avatar: m.avatar || '⚡',
            color: m.color || '#00ff88',
            role: m.role,
            connectionStatus: m.connection_status,
            isReady: Boolean(m.is_ready),
            teamId: m.team_id,
            score: m.score || 0,
            joinedAt: new Date(m.joined_at).getTime(),
        };
    }
    async setRoomStatus(roomId, status) {
        const db = getDb();
        await db('rooms').where('id', roomId).update({ status, updated_at: new Date() });
    }
    async removePlayer(roomId, hostSessionId, targetMemberId) {
        const db = getDb();
        const room = await db('rooms').where('id', roomId).first();
        if (!room || room.host_session_id !== hostSessionId) {
            throw new Error('NOT_HOST');
        }
        await db('room_members')
            .where('id', targetMemberId)
            .where('room_id', roomId)
            .update({ left_at: new Date(), connection_status: 'disconnected' });
    }
}
export const roomService = new RoomService();
//# sourceMappingURL=room.service.js.map