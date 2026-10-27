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
export declare class SessionService {
    /**
     * Generate a unique guest ID based on IP address and device ID
     */
    generateGuestId(ip: string, deviceId?: string | null): string;
    generateGuestIdFromIp(ip: string): string;
    /**
     * Create a guest session, save/update guest record by device + IP, and return token + session info
     */
    createGuestSession(displayName: string, ipAddress?: string, userAgent?: string | null, deviceId?: string | null): Promise<{
        token: string;
        session: SessionInfo;
    }>;
    /**
     * Validate a session token and return session info
     */
    validateToken(token: string): Promise<SessionInfo | null>;
    /**
     * Associate a socket ID with a session
     */
    setSocketId(sessionId: string, socketId: string): Promise<void>;
    /**
     * Remove socket ID from session
     */
    clearSocketId(sessionId: string): Promise<void>;
    /**
     * Revoke a session
     */
    revokeSession(sessionId: string): Promise<void>;
}
export declare const sessionService: SessionService;
