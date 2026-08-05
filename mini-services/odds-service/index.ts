import { createServer } from "http";
import { Server } from "socket.io";

// ─── Types ───────────────────────────────────────────────────────────────────

interface MatchOdds {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  odds: number;
}

interface OddsChangeEvent {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  newOdds: string;
  oldOdds: string;
  direction: "up" | "down";
  bookmaker: string;
  timestamp: number;
}

// ─── Seed Data ───────────────────────────────────────────────────────────────

const BOOKMAKERS = ["BetKing", "1xBet", "SportyBet", "Betway", "22Bet"];

const matches: MatchOdds[] = [
  { matchId: "match-1", homeTeam: "Arsenal", awayTeam: "Chelsea", league: "Premier League", odds: 1.75 },
  { matchId: "match-2", homeTeam: "Barcelona", awayTeam: "Atletico Madrid", league: "La Liga", odds: 2.10 },
  { matchId: "match-3", homeTeam: "AC Milan", awayTeam: "Napoli", league: "Serie A", odds: 1.85 },
  { matchId: "match-4", homeTeam: "Bayern Munich", awayTeam: "Leverkusen", league: "Bundesliga", odds: 1.65 },
  { matchId: "match-5", homeTeam: "PSG", awayTeam: "Lyon", league: "Ligue 1", odds: 1.55 },
  { matchId: "match-6", homeTeam: "Enyimba", awayTeam: "Rangers Intl", league: "NPFL", odds: 1.90 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatOdds(value: number): string {
  return value.toFixed(2);
}

// ─── HTTP + Socket.IO Server ─────────────────────────────────────────────────

const httpServer = createServer();

const io = new Server(httpServer, {
  path: "/",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ─── Connection Handling ─────────────────────────────────────────────────────

io.on("connection", (socket) => {
  console.log(`[odds-service] Client connected: ${socket.id}`);

  // Send initial odds snapshot for all matches
  const initialSnapshot = matches.map((m) => ({
    matchId: m.matchId,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    league: m.league,
    odds: formatOdds(m.odds),
    timestamp: Date.now(),
  }));
  socket.emit("initial-odds", initialSnapshot);

  // Join a specific match room for targeted updates
  socket.on("subscribe-match", (matchId: string) => {
    const match = matches.find((m) => m.matchId === matchId);
    if (match) {
      socket.join(matchId);
      console.log(`[odds-service] ${socket.id} subscribed to ${matchId}`);
    }
  });

  // Leave a specific match room
  socket.on("unsubscribe-match", (matchId: string) => {
    socket.leave(matchId);
    console.log(`[odds-service] ${socket.id} unsubscribed from ${matchId}`);
  });

  // Subscribe to all match rooms
  socket.on("subscribe-all", () => {
    for (const m of matches) {
      socket.join(m.matchId);
    }
    console.log(`[odds-service] ${socket.id} subscribed to all matches`);
  });

  socket.on("disconnect", () => {
    console.log(`[odds-service] Client disconnected: ${socket.id}`);
  });

  socket.on("error", (error) => {
    console.error(`[odds-service] Socket error (${socket.id}):`, error);
  });
});

// ─── Odds Simulation Loop ────────────────────────────────────────────────────

function simulateOddsChange(): void {
  const match = pickRandom(matches);
  const bookmaker = pickRandom(BOOKMAKERS);
  const change = randomBetween(0.05, 0.15) * (Math.random() > 0.5 ? 1 : -1);

  const oldOdds = match.odds;
  const newOdds = Math.max(1.01, oldOdds + change); // never go below 1.01
  match.odds = newOdds;

  const event: OddsChangeEvent = {
    matchId: match.matchId,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    newOdds: formatOdds(newOdds),
    oldOdds: formatOdds(oldOdds),
    direction: newOdds > oldOdds ? "up" : "down",
    bookmaker,
    timestamp: Date.now(),
  };

  // Broadcast to the specific match room AND to the general "all-odds" channel
  io.to(match.matchId).emit("odds-change", event);
  io.emit("odds-change", event);

  console.log(
    `[odds-service] ${match.homeTeam} vs ${match.awayTeam}: ${event.oldOdds} → ${event.newOdds} (${event.direction}) via ${bookmaker}`
  );
}

// Schedule odds changes every 5–8 seconds
function scheduleNextOddsChange(): void {
  const delay = randomBetween(5000, 8000);
  setTimeout(() => {
    simulateOddsChange();
    scheduleNextOddsChange();
  }, delay);
}

scheduleNextOddsChange();

// ─── Heartbeat ───────────────────────────────────────────────────────────────

setInterval(() => {
  io.emit("heartbeat", { timestamp: Date.now() });
}, 30000);

// ─── Start Server ────────────────────────────────────────────────────────────

const PORT = 3004;
httpServer.listen(PORT, () => {
  console.log(`[odds-service] Live odds WebSocket server running on port ${PORT}`);
});

// ─── Graceful Shutdown ───────────────────────────────────────────────────────

function shutdown(signal: string): void {
  console.log(`[odds-service] Received ${signal}, shutting down...`);
  httpServer.close(() => {
    console.log("[odds-service] Server closed");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));