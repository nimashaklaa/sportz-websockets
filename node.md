# Ground-Level Notes — HTTP, WebSocket & Security

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

After this the connection is no longer HTTP — it becomes a raw bidirectional stream using the WebSocket framing protocol. This is why you can attach a WebSocket server to the same port as Express — it intercepts the HTTP upgrade event before Express sees it.

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

A WebSocket has 4 states:

| State | Value | Meaning |
|---|---|---|
| CONNECTING | 0 | Handshake in progress |
| OPEN | 1 | Ready to send/receive |
| CLOSING | 2 | Close handshake in progress |
| CLOSED | 3 | Connection closed |

Always check `socket.readyState === WebSocket.OPEN` before sending:
```ts
if (socket.readyState !== WebSocket.OPEN) return;
socket.send(data);
```

### Keep-Alive: Why and How

TCP connections can silently die — a client goes offline, a NAT router drops the entry, a firewall times out the idle connection. The server won't know — from its side the socket looks open.

The solution: **ping/pong heartbeat**. The server sends a `ping` frame; the client must respond with `pong`. If no pong comes back within the interval, the connection is dead.

```
Server                    Client
  |------- ping -------→   |
  |←------ pong ---------  |   (alive)

Server                    Client (gone)
  |------- ping -------→   |
  |                        |   (no pong)
  → terminate()
```

Implementation:
```ts
socket.isAlive = true;
socket.on('pong', () => { socket.isAlive = true; });

const interval = setInterval(() => {
  wss.clients.forEach((socket) => {
    if (!socket.isAlive) return socket.terminate(); // dead — kill it
    socket.isAlive = false;  // assume dead until pong comes back
    socket.ping();
  });
}, 30000);

wss.on('close', () => clearInterval(interval)); // clean up on server shutdown
```

### WebSocket Close Codes

When closing a WebSocket connection, you send a status code:

| Code | Meaning |
|---|---|
| 1000 | Normal closure |
| 1008 | Policy violation (used for auth/security rejection) |
| 1011 | Internal server error |
| 1013 | Try again later (used for rate limit) |

```ts
socket.close(1013, 'Rate limit exceeded');
```

### Broadcasting to All Clients

The WebSocket server maintains a `clients` Set of all open connections. Iterating it and sending to each is how you broadcast:

```ts
function broadcast(wss: WebSocketServer, payload: unknown): void {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;
    client.send(JSON.stringify(payload));
  }
}
```

---

## Security with Arcjet

### What Arcjet Does

Arcjet sits in front of your handlers and evaluates each request against a set of rules before your code runs. If a request is denied, you stop it there — your database and business logic are never touched.

```
Request → Arcjet rules evaluated → allowed → your handler
                                 → denied  → 429 / 403 returned immediately
```

### The Three Rules Used

**Shield** — detects and blocks common attack patterns (SQL injection attempts, XSS payloads, suspicious headers). Operates passively — just add it and it works.

**detectBot** — identifies automated traffic by analyzing headers, TLS fingerprint, and request patterns. You can allow specific bots (search engine crawlers, link preview fetchers) while blocking everything else.

**slidingWindow** — rate limiting. Tracks how many requests a client (by IP) made in the last N seconds. If they exceed the threshold, requests are rejected with 429.

### Sliding Window vs Fixed Window Rate Limiting

**Fixed window**: count resets at fixed intervals (e.g. every 10s). A client can burst 50 requests at second 9, then another 50 at second 11 — 100 requests in 2 seconds.

**Sliding window**: counts requests in the last N seconds from *now*. The window moves with time — no burst exploit at the boundary.

```
Fixed:    [0----10s] reset [10s----20s] reset
Sliding:  always looking back 10s from current moment
```

### Two Instances — Different Limits

HTTP and WebSocket connections have different threat models:

```ts
// HTTP: general API traffic — more lenient
slidingWindow({ mode: arcjetMode, interval: '10s', max: 50 })

// WebSocket: handshake only — tighter, because WS connections are persistent
slidingWindow({ mode: arcjetMode, interval: '2s', max: 5 })
```

A WebSocket connection lasts a long time — you only need to allow legitimate clients to connect, not allow high-frequency reconnects.

### DRY_RUN Mode

Setting `ARCJET_MODE=DRY_RUN` makes Arcjet evaluate rules and log decisions but never actually block anything. Use this during development to see what would be blocked without disrupting your workflow.

```
ARCJET_MODE=DRY_RUN  →  decisions logged, requests always allowed
ARCJET_MODE=LIVE     →  decisions enforced (default)
```

### Where Arcjet Runs in the Stack

**HTTP** — as Express middleware, before route handlers:
```ts
app.use(securityMiddleware()); // runs on every request
app.use('/matches', matchRouter);
```

**WebSocket** — inside the connection handler, before the socket is accepted:
```ts
wss.on('connection', async (socket, req) => {
  const decision = await wsArcjet.protect(req);
  if (decision.isDenied()) {
    socket.close(1013, 'Rate limit exceeded');
    return; // socket rejected before any app logic runs
  }
  // ... rest of connection setup
});
```

### Reading the Decision

```ts
const decision = await arcjet.protect(req);

decision.isDenied()              // was this request blocked?
decision.reason.isRateLimit()    // specifically rate limited?
decision.reason.isBot()          // blocked as a bot?
decision.reason.isShield()       // blocked by shield?
```