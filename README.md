# ⚡ Speed Buzzer — Real-Time Multiplayer Quiz Arena

Speed Buzzer is a high-performance, real-time multiplayer general-knowledge buzzer game built to deliver ultra-low latency buzz ordering with server-authoritative tie windows, bilingual question banks (English & Hindi), team battles, and comprehensive host adjudication.

---

## 🌟 Key Features

- **⚡ Sub-Millisecond Tie Resolution Window**: Configurable 0–100ms window groups simultaneous buzzes and orders them equitably, mitigating network jitter.
- **🛡️ Server-Authoritative State Machine**: Strict turn enforcement, anti-spam buzzer rate limiting, answer timeouts, and rollback-capable score accounting.
- **🎮 Tactile 3D Buzzer**: Physical spring animations, neon glow, and instant keyboard shortcut (`Spacebar`) for rapid buzzing.
- **🔊 Procedural Sound Synthesizer**: Pure Web Audio API procedural sound engine with realistic buzzer hum, click, lock-in sound, countdown ticks, correct/incorrect chimes, and winner fanfare.
- **🇮🇳 Bilingual Question Bank**: Curated general knowledge, science, tech, history, and geography questions with English and Hindi (`हिंदी`) Unicode normalization.
- **👥 Flexible Game Modes**:
  - **Individual Free-For-All**: Compete for top leaderboard position.
  - **Team Battle**: Form Red, Blue, Green, or Yellow teams with aggregated team scoring.
  - **Spectator Mode**: Watch games live with synchronized state and podium views.
- **⚖️ Host Control Panel & Dispute System**:
  - Pause/resume match, skip questions, manual correctness overrides.
  - In-game dispute workflow with score grant/rollback arbitration.
- **🎉 Celebratory Podium**: Live rank reveals, accuracy stats, fastest buzz time awards, and particle confetti.

---

## 🏗️ Architecture

```
SpeedBuzzer/
├── client/                     # Vite + React 19 + TypeScript Frontend
│   ├── src/
│   │   ├── components/         # Header, LandingPage, LobbyView, MatchView,
│   │   │                       # ScoreboardView, ResultsView, HostControlsModal, DisputeModal
│   │   ├── services/           # Socket.IO client, Web Audio procedural sound engine
│   │   ├── stores/             # Zustand game state store
│   │   ├── index.css           # Custom dark cyber glassmorphic design system
│   │   ├── App.tsx             # Real-time event gateway and view router
│   │   └── main.tsx
│   └── vite.config.ts          # Dev server with proxy to backend REST & WebSockets
│
├── server/                     # Node.js + Express + Socket.IO Backend
│   ├── src/
│   │   ├── config/             # Environment, CORS, and rate-limiting configuration
│   │   ├── db/                 # Knex.js MySQL connection, schema migrations, question seeds
│   │   ├── engine/             # Core game state machine & buzzer queue manager
│   │   ├── services/           # Session service, room service, question bank service
│   │   ├── socket/             # Socket.IO real-time event handlers
│   │   └── index.ts            # REST API endpoints & server entry point
│   └── .env.example
│
└── shared/                     # Shared TypeScript types, enums, and socket protocols
    └── src/
        └── index.ts            # State machine phases, room settings, event names & payloads
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18+ or v20+
- **MySQL**: 8.0+

### 2. Environment Configuration
Create a `.env` file in the `server` directory (or copy from `server/.env.example`):

```bash
PORT=3001
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=speed_buzzer
CLIENT_URL=http://localhost:5173
SESSION_SECRET=speed-buzzer-secret-key-replace-in-prod
```

### 3. Database Migration & Question Seeding
Run the database migrations and seed the curated questions:

```bash
# Run SQL schema migrations
npm run migrate

# Seed curated English and Hindi trivia questions
npm run seed
```

### 4. Running the Development Servers
Start both the backend server and frontend client simultaneously:

```bash
npm run dev
```

- **Frontend Client**: [http://localhost:5173](http://localhost:5173)
- **Backend API & WebSockets**: [http://localhost:3001](http://localhost:3001)

### 5. Building for Production
To build all packages (`shared`, `server`, and `client`):

```bash
npm run build
```

---

## 🎯 Gameplay Controls

- **Buzz**: Click the giant 3D buzzer or press <kbd>SPACEBAR</kbd>.
- **Submit Answer**: Type answer and press <kbd>ENTER</kbd>.
- **Copy Room Link**: Click the room badge in the top bar to share with friends.
- **Audio Toggle**: Click the speaker icon in the top right to mute/unmute sound effects.
