# Sportz

A real-time sports match management API. Create matches, list them, and receive live notifications via WebSocket when a new match is created.

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js (ESM) |
| Language | TypeScript 6 |
| Framework | Express 5 |
| Database | PostgreSQL + Drizzle ORM |
| WebSocket | `ws` |
| Validation | Zod |
| Security | Arcjet (`@arcjet/node`) |

## Project Structure

```
src/
  index.ts              # Entry point — wires Express, WebSocket, Arcjet middleware
  arcjet.ts             # Arcjet instances + securityMiddleware()
  db/
    db.ts               # PostgreSQL pool + Drizzle instance
    schema.ts           # Table definitions: matches, commentary
  routes/
    matches.ts          # GET /matches, POST /matches
  validation/
    matches.ts          # Zod schemas for all match-related inputs
  utils/
    match-status.ts     # Derive match status from start/end times
  ws/
    server.ts           # WebSocket server with keep-alive + Arcjet guard
```

## Testing WebSockets with wscat

`wscat` is a command-line WebSocket client — like `curl` but for WebSocket connections.

### Install

```bash
npm install -g wscat
```

### Connect

```bash
wscat -c ws://localhost:8000/ws
```

On successful connection the server sends a welcome message:
```json
{"type":"welcome"}
```

### Try it

Open two terminals. In terminal 1, connect with wscat:
```bash
wscat -c ws://localhost:8000/ws
```

In terminal 2, create a match via HTTP:
```bash
curl -X POST http://localhost:8000/matches \
  -H "Content-Type: application/json" \
  -d '{"sport":"football","homeTeam":"Arsenal","awayTeam":"Chelsea","startTime":"2026-06-01T15:00:00Z"}'
```

Terminal 1 will instantly receive:
```json
{"type":"match_created","data":{"id":1,"sport":"football",...}}
```

### Useful flags

| Flag | Description |
|---|---|
| `-c <url>` | Connect to a WebSocket URL |
| `-w <seconds>` | Wait N seconds before closing |
| `--no-color` | Plain output |
