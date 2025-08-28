// ---------------------------------------------------------------
//  In‑memory chat server for Roblox
//  • /join      → registers a player, returns a short‑lived token
//  • /message   → send a chat line (Bearer token required)
//  • /messages  → poll for new messages (Bearer token required)
//  Data lives only in RAM – when the process stops everything is lost.
// ---------------------------------------------------------------

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// ------------------------------------------------------------------
// Middleware
app.use(cors({ origin: '*' }));   // Roblox HttpService can call any origin
app.use(express.json());

// ------------------------------------------------------------------
// In‑memory stores
const players = new Map();   // token → { username, placeId, jobId, expires }
const messages = [];         // [{ username, content, timestamp }]

// ------------------------------------------------------------------
// Helper utilities
function jsonError(res, code, msg) {
  return res.status(code).json({ success: false, error: msg });
}

// Periodically purge expired player entries (every minute)
setInterval(() => {
  const now = Date.now();
  for (const [tok, p] of players.entries()) {
    if (p.expires <= now) players.delete(tok);
  }
}, 60_000);

// ------------------------------------------------------------------
// POST /join
//   body: { username: string, placeId: number, jobId: string }
app.post('/join', (req, res) => {
  const { username, placeId, jobId } = req.body;
  if (!username || !placeId || !jobId) {
    return jsonError(res, 400, 'Missing username / placeId / jobId');
  }

  const token = uuidv4();                     // unique session token
  const expires = Date.now() + 60 * 60 * 1000; // 1 hour validity
  players.set(token, { username, placeId, jobId, expires });

  res.json({ success: true, token });
});

// ------------------------------------------------------------------
// POST /message
//   headers: Authorization: Bearer <token>
//   body: { content: string }
app.post('/message', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return jsonError(res, 401, 'Missing Authorization header');
  }
  const token = auth.slice(7);
  const player = players.get(token);
  if (!player) return jsonError(res, 401, 'Invalid or expired token');

  const { content } = req.body;
  if (!content || typeof content !== 'string' || content.length > 200) {
    return jsonError(res, 400, 'Invalid message content');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  messages.push({ username: player.username, content, timestamp });

  // Optional: keep the array from growing forever (keep last 500 msgs)
  if (messages.length > 500) messages.shift();

  res.json({ success: true });
});

// ------------------------------------------------------------------
// GET /messages?since=unixTimestamp
//   headers: Authorization: Bearer <token>
app.get('/messages', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return jsonError(res, 401, 'Missing Authorization header');
  }
  const token = auth.slice(7);
  const player = players.get(token);
  if (!player) return jsonError(res, 401, 'Invalid or expired token');

  const since = Number(req.query.since) || 0;
  const newMsgs = messages.filter(m => m.timestamp > since);
  res.json({ success: true, messages: newMsgs });
});

// ------------------------------------------------------------------
// Simple health‑check (useful for Railway)
app.get('/ping', (req, res) => res.send('pong'));

// ------------------------------------------------------------------
// Start the server
app.listen(PORT, () => console.log(`🚀 Server listening on ${PORT}`));
