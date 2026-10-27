import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getDb } from '../db/connection.js';

export interface SessionInfo {
  sessionId: string;
  memberId: string;
  displayName: string;
  avatar: string;
  color: string;
  isGuest: boolean;
  userId: string | null;
  guestSessionId: string | null;
  ipAddress?: string;
  deviceId?: string | null;
}

// Generate a random color for guest avatars
const AVATAR_COLORS = [
  '#00ff88', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4',
  '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd', '#01a3a4',
  '#f368e0', '#ff6348', '#7bed9f', '#70a1ff', '#ffa502',
  '#2ed573', '#1e90ff', '#ff4757', '#eccc68', '#a29bfe',
];

const AVATAR_EMOJIS = [
  '⚡', '🔥', '🎯', '🚀', '💎', '🌟', '🎮', '🏆',
  '🦊', '🐺', '🦁', '🐉', '🦅', '🐬', '🦋', '🌈',
  '👾', '🤖', '🎪', '⭐', '💫', '🌊', '🎸', '🎲',
];

function randomColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

function randomAvatar(): string {
  return AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];
}

function generateToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class SessionService {
  /**
   * Generate a unique guest ID based on IP address and device ID
   */
  generateGuestId(ip: string, deviceId?: string | null): string {
    const normalizedIp = (ip || '127.0.0.1').trim().toLowerCase();
    const cleanDevice = (deviceId || '').trim();
    const raw = cleanDevice ? `${normalizedIp}:${cleanDevice}` : normalizedIp;
    const hash = crypto.createHash('sha256').update(raw).digest('hex').substring(0, 12).toUpperCase();
    return `GST-${hash}`;
  }

  generateGuestIdFromIp(ip: string): string {
    return this.generateGuestId(ip, null);
  }

  /**
   * Create a guest session, save/update guest record by device + IP, and return token + session info
   */
  async createGuestSession(
    displayName: string,
    ipAddress = '127.0.0.1',
    userAgent: string | null = null,
    deviceId: string | null = null
  ): Promise<{ token: string; session: SessionInfo }> {
    const db = getDb();
    const cleanIp = ipAddress.replace(/^::ffff:/, '').trim() || '127.0.0.1';
    const cleanDevice = deviceId?.trim() || null;
    const guestUniqueId = this.generateGuestId(cleanIp, cleanDevice);
    const guestSessionId = uuid();
    const sessionId = uuid();
    const memberId = uuid();
    const token = generateToken();
    const tokenHash = hashToken(token);
    const color = randomColor();
    const avatar = randomAvatar();

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.transaction(async (trx) => {
      // Check if this specific device exists, or search by IP + displayName
      let existingGuest = null;
      if (cleanDevice) {
        existingGuest = await trx('guests').where('device_id', cleanDevice).first();
      }
      if (!existingGuest) {
        existingGuest = await trx('guests')
          .where('ip_address', cleanIp)
          .where('display_name', displayName.trim())
          .first();
      }

      if (existingGuest) {
        await trx('guests').where('id', existingGuest.id).update({
          display_name: displayName.trim().substring(0, 48),
          avatar: existingGuest.avatar || avatar,
          color: existingGuest.color || color,
          visit_count: (existingGuest.visit_count || 1) + 1,
          user_agent: userAgent || existingGuest.user_agent,
          ip_address: cleanIp,
          device_id: cleanDevice || existingGuest.device_id,
          last_seen_at: new Date(),
        });
      } else {
        await trx('guests').insert({
          id: guestUniqueId,
          ip_address: cleanIp,
          device_id: cleanDevice,
          display_name: displayName.trim().substring(0, 48),
          avatar,
          color,
          visit_count: 1,
          user_agent: userAgent || null,
          last_seen_at: new Date(),
          created_at: new Date(),
        });
      }

      // 2. Insert into guest_sessions
      await trx('guest_sessions').insert({
        id: guestSessionId,
        guest_id: existingGuest ? existingGuest.id : guestUniqueId,
        token_hash: hashToken(crypto.randomBytes(32).toString('hex')),
        display_name: displayName.trim().substring(0, 48),
        avatar,
        color,
        expires_at: expiresAt,
      });

      // 3. Insert into sessions
      await trx('sessions').insert({
        id: sessionId,
        guest_session_id: guestSessionId,
        token_hash: tokenHash,
        expires_at: expiresAt,
      });
    });

    return {
      token,
      session: {
        sessionId,
        memberId,
        displayName: displayName.trim().substring(0, 48),
        avatar,
        color,
        isGuest: true,
        userId: null,
        guestSessionId: guestSessionId,
        ipAddress: cleanIp,
        deviceId: cleanDevice,
      },
    };
  }

  /**
   * Validate a session token and return session info
   */
  async validateToken(token: string): Promise<SessionInfo | null> {
    const db = getDb();
    const tokenHash = hashToken(token);

    const session = await db('sessions')
      .where('token_hash', tokenHash)
      .whereNull('revoked_at')
      .where('expires_at', '>', new Date())
      .first();

    if (!session) return null;

    if (session.user_id) {
      const user = await db('users').where('id', session.user_id).first();
      const profile = await db('profiles').where('user_id', session.user_id).first();
      if (!user) return null;

      return {
        sessionId: session.id,
        memberId: session.user_id,
        displayName: user.display_name,
        avatar: profile?.avatar || randomAvatar(),
        color: profile?.profile_color || randomColor(),
        isGuest: false,
        userId: user.id,
        guestSessionId: null,
      };
    }

    if (session.guest_session_id) {
      const guest = await db('guest_sessions')
        .where('id', session.guest_session_id)
        .where('expires_at', '>', new Date())
        .first();

      let guestIp = '127.0.0.1';
      let guestDeviceId: string | null = null;
      if (guest.guest_id) {
        const guestRecord = await db('guests').where('id', guest.guest_id).first();
        if (guestRecord?.ip_address) guestIp = guestRecord.ip_address;
        if (guestRecord?.device_id) guestDeviceId = guestRecord.device_id;
      }

      return {
        sessionId: session.id,
        memberId: session.guest_session_id,
        displayName: guest.display_name,
        avatar: guest.avatar || randomAvatar(),
        color: guest.color || randomColor(),
        isGuest: true,
        userId: null,
        guestSessionId: guest.id,
        ipAddress: guestIp,
        deviceId: guestDeviceId,
      };
    }

    return null;
  }

  /**
   * Associate a socket ID with a session
   */
  async setSocketId(sessionId: string, socketId: string): Promise<void> {
    const db = getDb();
    await db('sessions').where('id', sessionId).update({ socket_id: socketId });
  }

  /**
   * Remove socket ID from session
   */
  async clearSocketId(sessionId: string): Promise<void> {
    const db = getDb();
    await db('sessions').where('id', sessionId).update({ socket_id: null });
  }

  /**
   * Revoke a session
   */
  async revokeSession(sessionId: string): Promise<void> {
    const db = getDb();
    await db('sessions').where('id', sessionId).update({ revoked_at: new Date() });
  }
}

export const sessionService = new SessionService();
