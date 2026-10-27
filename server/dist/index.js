import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { testConnection } from './db/connection.js';
import { setupSocketHandlers } from './socket/handlers.js';
import { sessionService } from './services/session.service.js';
const app = express();
const httpServer = createServer(app);
// ── Middleware ──────────────────────────────────────────────
const corsOrigin = config.isDev ? true : config.cors.clientUrl;
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
    origin: corsOrigin,
    credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
// ── Socket.IO ──────────────────────────────────────────────
const io = new Server(httpServer, {
    cors: {
        origin: corsOrigin,
        methods: ['GET', 'POST'],
        credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
    maxHttpBufferSize: 1e6,
});
setupSocketHandlers(io);
// ── REST Routes ────────────────────────────────────────────
// Health check
app.get('/api/health', (_, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: Date.now(),
    });
});
// Create guest session
app.post('/api/auth/guest', async (req, res) => {
    try {
        const { displayName, deviceId: bodyDeviceId } = req.body;
        const headerDeviceId = req.headers['x-device-id'];
        const deviceId = bodyDeviceId || headerDeviceId || null;
        if (!displayName || typeof displayName !== 'string' || displayName.trim().length < 1) {
            return res.status(400).json({ error: 'Display name is required' });
        }
        if (displayName.trim().length > 48) {
            return res.status(400).json({ error: 'Display name too long (max 48 chars)' });
        }
        const rawIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
        const userAgent = req.headers['user-agent'] || null;
        const result = await sessionService.createGuestSession(displayName.trim(), rawIp, userAgent, deviceId);
        res.json({
            token: result.token,
            session: result.session,
        });
    }
    catch (error) {
        console.error('Guest session error:', error);
        res.status(500).json({ error: 'Failed to create session' });
    }
});
// Validate session
app.get('/api/auth/validate', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const session = await sessionService.validateToken(token);
        if (!session) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        res.json({ session });
    }
    catch (error) {
        console.error('Validate error:', error);
        res.status(500).json({ error: 'Validation failed' });
    }
});
// Room info (public, no auth needed)
app.get('/api/rooms/:joinCode', async (req, res) => {
    try {
        const { roomService: rs } = await import('./services/room.service.js');
        const room = await rs.getRoomByJoinCode(req.params.joinCode);
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }
        const state = await rs.getRoomState(room.id);
        if (!state) {
            return res.status(404).json({ error: 'Room not found' });
        }
        // Return safe public info
        res.json({
            joinCode: state.joinCode,
            status: state.status,
            playerCount: state.members.filter(m => m.role !== 'spectator').length,
            maxPlayers: state.settings.maxPlayers,
            format: state.settings.matchFormat,
            category: state.settings.questionCategory,
            difficulty: state.settings.questionDifficulty,
            spectatorAllowed: state.settings.spectatorAllowed,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch room info' });
    }
});
// ── Server Start ───────────────────────────────────────────
async function start() {
    console.log('');
    console.log('  ⚡ Speed Buzzer Server');
    console.log('  ─────────────────────────');
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
        console.error('  ❌ Cannot start without database connection');
        console.error('  💡 Run: npm run migrate');
        process.exit(1);
    }
    httpServer.listen(config.port, () => {
        console.log(`  🌐 HTTP: http://localhost:${config.port}`);
        console.log(`  🔌 WS:   ws://localhost:${config.port}`);
        console.log(`  📡 CORS: ${config.cors.clientUrl}`);
        console.log(`  🎯 Env:  ${config.nodeEnv}`);
        console.log('');
    });
}
start().catch(console.error);
//# sourceMappingURL=index.js.map