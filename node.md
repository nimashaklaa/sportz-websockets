# Ground-Level Notes — HTTP, WebSocket, Security & Architecture

---

## HTTP

### What HTTP Actually Is

HTTP is a text-based request/response protocol that runs over TCP. Every request is a new transaction — the client sends a message, the server replies, done.

A raw request:
```
POST /matches HTTP/1.1
Host: localhost:8000
Content-Type: application/json

{"sport": "football", "homeTeam": "Arsenal"}
```

A raw response:
```
HTTP/1.1 201 Created
Content-Type: application/json

{"data": {"id": 1, ...}}
```

Node's `http` module parses these bytes into `req` and `res` objects. Express wraps them with routing and helpers like `res.json()`, `res.status()`.

### Request Lifecycle in Express

```
Incoming request
      ↓
  Middleware 1   (e.g. express.json() — parses body bytes into req.body)
      ↓
  Middleware 2   (e.g. securityMiddleware() — Arcjet check)
      ↓
  Route handler  (your logic — reads req, writes res)
      ↓
  Response sent
```

Middleware calls `next()` to pass to the next layer. If it doesn't call `next()` and doesn't send a response, the request hangs.

### HTTP Status Codes That Matter

| Code | Meaning | When to use |
|---|---|---|
| 200 | OK | Successful GET |
| 201 | Created | Successful POST that created a resource |
| 400 | Bad Request | Invalid input (validation failed) |
| 403 | Forbidden | Authenticated but not allowed |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server failure |
| 503 | Service Unavailable | Server can't handle the request right now |

### Why `express.json()` is Needed

HTTP request bodies arrive as a stream of raw bytes. `express.json()` reads the full body stream, decodes it as UTF-8, and calls `JSON.parse()`. Without it, `req.body` is `undefined`.

---

## WebSocket

### What WebSocket Actually Is

WebSocket is a persistent, full-duplex communication channel over a single TCP connection. Unlike HTTP:
- The connection stays open
- Either side can send data at any time
- No request/response overhead after the initial handshake

### The Upgrade Handshake

WebSocket starts as an HTTP request. The client sends:
```
GET /ws HTTP/1.1
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
```

The server responds with `101 Switching Protocols`:
```
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

After this the connection is no longer HTTP — it becomes a raw bidirectional stream. This is why WebSocket can share the same port as Express — it intercepts the HTTP upgrade event before Express sees it.

```ts
const server = http.createServer(app); // HTTP handled by Express
attachWebSocketServer(server);         // WS intercepts the upgrade on same port
server.listen(8000);
```

### WebSocket Frames

Data is sent in **frames**, not plain text. Each frame has:
- An opcode (text, binary, ping, pong, close)
- A payload length
- The payload data

`socket.send(JSON.stringify(payload))` sends a text frame. The `ws` library handles framing automatically.

### Connection States

| State | Value | Meaning |
|---|---|---|
| CONNECTING | 0 | Handshake in progress |
| OPEN | 1 | Ready to send/receive |
| CLOSING | 2 | Close handshake in progress |
| CLOSED | 3 | Connection closed |

Always check `socket.readyState === WebSocket.OPEN` before sending.

### Keep-Alive: Why and How

TCP connections can silently die — a client goes offline, a NAT router drops the entry, a firewall times out the idle connection. The server won't know — from its side the socket looks open.

The solution: **ping/pong heartbeat**. The server sends a `ping` frame every 30 seconds; the client must respond with `pong`. If no pong comes back, the connection is dead and gets terminated.

```ts
socket.isAlive = true;
socket.on('pong', () => { socket.isAlive = true; });

const interval = setInterval(() => {
  wss.clients.forEach((socket) => {
    if (!socket.isAlive) return socket.terminate();
    socket.isAlive = false;
    socket.ping();
  });
}, 30000);
```

### Match Subscriptions

Clients subscribe to specific matches to receive targeted updates instead of receiving everything.

```
Client → { "type": "subscribe", "matchId": 3 }
Server → stores socket in matchSubscriptions Map<matchId, Set<WebSocket>>

New commentary on match 3 → only subscribers of match 3 are notified
New match created → broadcast to all connected clients
```

The server maintains:
```ts
const matchSubscriptions = new Map<string, Set<WebSocket>>();
```

On disconnect, `clearSubscriptions()` removes the socket from all match subscription sets it was part of.

### WebSocket Close Codes

| Code | Meaning |
|---|---|
| 1000 | Normal closure |
| 1008 | Policy violation (auth/security rejection) |
| 1011 | Internal server error |
| 1013 | Try again later (rate limit) |

### Broadcasting

Two broadcast patterns are used:

**Broadcast to all** — used for `match_created`:
```ts
for (const client of wss.clients) {
  if (client.readyState !== WebSocket.OPEN) continue;
  client.send(JSON.stringify(payload));
}
```

**Broadcast to match subscribers** — used for `commentary_update`:
```ts
const subscribers = matchSubscriptions.get(matchId);
for (const socket of subscribers) {
  if (socket.readyState !== WebSocket.OPEN) continue;
  socket.send(message);
}
```

---

## Validation Architecture

### DTOs vs Zod Output Types

Two layers of types exist for each resource:

**DTOs** — raw wire shape as Express receives it (strings for params/query, JSON for body):
```ts
type MatchParamsDTO = { matchId: string };       // params are always strings
type ListCommentaryQueryDTO = { limit?: string }; // query params are always strings
```

**Zod output types** — after validation and coercion:
```ts
type CreateCommentaryInput = z.infer<typeof createCommentarySchema>;
// { matchId: number, minute?: number, ... }  ← coerced to proper types
```

Using DTOs as `Request<Params, _, Body, Query>` generics gives TypeScript full type safety without `as unknown` casts.

### Parse Helpers

Zod v4 + TypeScript 6 cannot infer `safeParse` return types from complex schemas (`.refine()`, `.omit()`). The fix is explicit parse helpers with declared return types:

```ts
type ParseResult<T> = { success: true; data: T } | { success: false; error: z.ZodError };

export function parseCreateCommentaryBody(body: unknown): ParseResult<CreateCommentaryDTO> {
  return createCommentaryBodySchema.safeParse(body);
}
```

The function declaration carries the type — callers always get a properly typed result.

### Why `.omit()` Must Be Hoisted

Calling `.omit()` inline inside a function breaks TS6 inference:
```ts
// Bad — TS6 can't resolve the inline .omit() type
function parse(body: unknown) {
  return createCommentarySchema.omit({ matchId: true }).safeParse(body); // returns any
}

// Good — hoisted constant, TypeScript resolves it once
export const createCommentaryBodySchema = createCommentarySchema.omit({ matchId: true });
```

---

## Commentary

Commentary is a real-time event log for a match. Each entry represents something that happened during the game:

| Field | Purpose |
|---|---|
| `minute` | When it happened in the match |
| `eventType` | Category — `goal`, `yellow_card`, `red_card`, `substitution`, `penalty`, `foul` |
| `actor` | Player involved |
| `team` | Which team |
| `message` | Human-readable description |
| `period` | Match period — `first_half`, `second_half`, `extra_time` |
| `tags` | Searchable labels |
| `metadata` | Flexible JSON for extra context |

Commentary is scoped to a match via the nested route:
```
POST /matches/:matchId/commentary
GET  /matches/:matchId/commentary
```

`matchId` comes from the URL — it is never in the request body.

---

## Frontend State Management

### Why Zustand

The app needed shared state across components that are not in a direct parent-child relationship (sidebar list ↔ detail panel ↔ WebSocket updates). Options:

- **useState + prop drilling** — works for simple cases, breaks with deeply nested or sibling components
- **React Context** — good for infrequently changing state, causes full subtree re-renders
- **Zustand** — minimal boilerplate, selective subscriptions, outside-React access (useful for WS handlers)

### Store Shape

```ts
{
  matches: Match[]              // sidebar list
  matchesLoading: boolean
  filter: MatchStatus | 'all'  // active filter tab

  selectedMatch: Match | null   // detail panel

  commentary: Record<number, Commentary[]>  // keyed by matchId — cached per match
  commentaryLoading: boolean
}
```

Commentary is stored as a map rather than a single array so switching between matches doesn't lose or re-fetch data.

### WebSocket + Store Integration

The WebSocket hook lives in `MatchDetail`. When a `commentary_update` arrives, it calls `appendCommentary(entry)` on the store. Because the commentary feed reads from `store.commentary[matchId]`, it re-renders automatically.

```
WS message arrives
      ↓
appendCommentary(entry)  ← store action
      ↓
store.commentary[matchId] updated
      ↓
CommentaryFeed re-renders (Zustand selector)
```

---

## Security with Arcjet

### What Arcjet Does

Arcjet evaluates each request against a set of rules before your code runs. If denied, the request is stopped immediately — your database is never touched.

```
Request → Arcjet rules → allowed → your handler
                       → denied  → 429 / 403 returned immediately
```

### The Three Rules Used

**Shield** — blocks common attack patterns (SQLi, XSS, suspicious headers).

**detectBot** — identifies automated traffic by headers, TLS fingerprint, request patterns. Allows specific bots (crawlers, link preview) while blocking the rest.

**slidingWindow** — rate limiting. Counts requests per IP in the last N seconds. Sliding window prevents burst exploits at interval boundaries.

### Two Instances — Different Limits

```ts
// HTTP: general API traffic
slidingWindow({ interval: '10s', max: 50 })

// WebSocket: connection handshake only — tighter
slidingWindow({ interval: '2s', max: 5 })
```

WebSocket connections are persistent — you only need to allow legitimate clients to establish the connection, not allow high-frequency reconnects.

### DRY_RUN Mode

```
ARCJET_MODE=DRY_RUN  →  decisions logged, requests always allowed
ARCJET_MODE=LIVE     →  decisions enforced
```

Use `DRY_RUN` during development to see what would be blocked without disrupting your workflow.
