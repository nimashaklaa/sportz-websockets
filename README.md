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
