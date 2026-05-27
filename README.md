# Sportz

A real-time sports match management platform — REST API, live WebSocket updates, and a React frontend.

## Tech Stack

### Backend
| Layer | Choice |
|---|---|
| Runtime | Node.js (ESM) |
| Language | TypeScript 6 |
| Framework | Express 5 |
| Database | PostgreSQL + Drizzle ORM |
| WebSocket | `ws` |
| Validation | Zod v4 |
| Security | Arcjet (`@arcjet/node`) |
| APM | apminsight |

### Frontend
| Layer | Choice |
|---|---|
| Framework | React 19 + Vite |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| State | Zustand |

## Project Structure

```
sportz/
├── src/
│   ├── index.ts                  # Entry point — Express, WebSocket, Arcjet
│   ├── arcjet.ts                 # Arcjet instances + securityMiddleware()
│   ├── db/
│   │   ├── db.ts                 # PostgreSQL pool + Drizzle instance
│   │   └── schema.ts             # Tables: matches, commentary
│   ├── routes/
│   │   ├── matches.ts            # GET /matches, POST /matches
│   │   └── commentary.ts        # CRUD /matches/:matchId/commentary
│   ├── validation/
│   │   ├── matches.ts            # Zod schemas + DTOs for matches
│   │   └── commentary.ts        # Zod schemas + DTOs + parse helpers for commentary
│   ├── utils/
│   │   └── match-status.ts      # Derive match status from start/end times
│   └── ws/
│       └── server.ts            # WebSocket server — keep-alive, subscriptions, Arcjet guard
└── client/
    └── src/
        ├── App.tsx               # Root layout — header, sidebar, main panel
        ├── store.ts              # Zustand store — matches, commentary, filter, selected match
        ├── types.ts              # Shared TypeScript types
        ├── hooks/
        │   └── useMatchSocket.ts # WebSocket hook — connect, subscribe, receive events
        └── components/
            ├── MatchCard.tsx     # Match list item
            ├── MatchDetail.tsx   # Scoreboard + commentary feed
            ├── CommentaryFeed.tsx# Timeline of commentary entries
            └── StatusBadge.tsx   # LIVE / UPCOMING / FINISHED pill badge
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL
- `.env` file with `DATABASE_URL`

### Backend

```bash
npm install
npm run db:migrate
npm run dev
```

Runs on `http://localhost:8000`.

### Frontend

```bash
cd client
npm install
npm run dev
```

Runs on `http://localhost:5173`. Proxies `/matches` and `/matches/:id/commentary` to the backend.

## API Reference

### Matches

| Method | Route | Description |
|---|---|---|
| `GET` | `/matches` | List matches. Query: `?status=live\|scheduled\|finished&limit=N` |
| `POST` | `/matches` | Create a match |

### Commentary

| Method | Route | Description |
|---|---|---|
| `GET` | `/matches/:matchId/commentary` | List commentary for a match |
| `GET` | `/matches/:matchId/commentary/:id` | Get a single commentary entry |
| `POST` | `/matches/:matchId/commentary` | Add a commentary entry |
| `PATCH` | `/matches/:matchId/commentary/:id` | Update a commentary entry |
| `DELETE` | `/matches/:matchId/commentary/:id` | Delete a commentary entry |

### POST /matches — Request Body

```json
{
  "sport": "football",
  "homeTeam": "Arsenal",
  "awayTeam": "Chelsea",
  "startTime": "2026-06-01T15:00:00Z",
  "endTime": "2026-06-01T17:00:00Z",
  "homeScore": 0,
  "awayScore": 0
}
```

### POST /matches/:matchId/commentary — Request Body

```json
{
  "minute": 45,
  "sequence": 1,
  "period": "first_half",
  "eventType": "goal",
  "actor": "Cristiano Ronaldo",
  "team": "Real Madrid",
  "message": "Ronaldo scores with a header from a corner kick!",
  "metadata": { "assistedBy": "Modric", "shotType": "header" },
  "tags": ["goal", "header", "corner"]
}
```

## WebSocket

Connect to `ws://localhost:8000/ws`.

### Server → Client events

| Event | When |
|---|---|
| `{"type":"welcome"}` | On connection |
| `{"type":"match_created","data":{...}}` | A new match is created (broadcast to all) |
| `{"type":"commentary_update","data":{...}}` | New commentary added (sent to match subscribers only) |

### Client → Server messages

```json
{ "type": "subscribe", "matchId": 3 }
{ "type": "unsubscribe", "matchId": 3 }
```

Subscribe to a match to receive `commentary_update` events for it.

### Test with wscat

```bash
npm install -g wscat
wscat -c ws://localhost:8000/ws
> {"type":"subscribe","matchId":3}
< {"type":"subscribed","matchId":3}
```

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `ARCJET_KEY` | Arcjet API key |
| `ARCJET_MODE` | `LIVE` (default) or `DRY_RUN` (log only, never block) |
| `PORT` | Server port (default: `8000`) |
