# WingsFin – Real-Time Market Dashboard

A full-stack real-time data visualisation system featuring live line charts for the DSEX index and GP stock price, built with Node.js, React, PostgreSQL, and Docker.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Demo Mode vs Real Market Hours](#demo-mode-vs-real-market-hours)
- [Running Tests](#running-tests)
- [API Reference](#api-reference)
- [WebSocket Protocol](#websocket-protocol)
- [Architecture](#architecture)
- [Seed Data Strategy](#seed-data-strategy)
- [Chart Behaviour](#chart-behaviour)

---

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) ≥ 24
- [Docker Compose](https://docs.docker.com/compose/) ≥ 2.24

### 1. Clone and configure

```bash
git clone <your-repo-url> wingsfin
cd wingsfin

# Copy the default env file (edit if needed)
cp .env.local .env
```

### 2. Start the full system

```bash
docker compose up --build
```

That's it. Docker Compose will:

1. Start **PostgreSQL** and run the schema migration
2. Start the **Node.js backend** – seeds historical data, starts the simulator, opens WebSocket
3. Start the **React frontend** – built and served via Vite dev server

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **Backend API** | http://localhost:4000/api |
| **WebSocket** | ws://localhost:4000/ws |
| **PostgreSQL** | localhost:5432 |

### 3. Open the dashboard

Navigate to **http://localhost:3000**.

- By default **DEMO MODE is active** (`DEMO_MODE=true`) so the market is always "open" regardless of the time of day — ideal for evaluation.
- Use the **dropdown** (top-left) to switch between **Index (DSEX)** and **Stock (GP)** charts.
- Historical data is automatically seeded for the current session window.
- Live ticks arrive every 0.5–3 seconds and update the chart in real time.

---

## Project Structure

```
wingsfin/
├── docker-compose.yml          # Orchestrates all services
├── .env                        # Environment configuration
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js            # Entry point: DB → seed → HTTP+WS → simulator
│       ├── app.js              # Express app factory (testable)
│       ├── config/
│       │   └── market.js       # Market hours / demo mode logic
│       ├── db/
│       │   ├── pool.js         # pg connection pool
│       │   ├── repository.js   # Data access layer
│       │   └── seeder.js       # Historical seed data generator
│       ├── services/
│       │   └── chartService.js # 1-min bucketing & carry-forward logic
│       ├── simulators/
│       │   └── dataSimulator.js # Random-interval live tick generator
│       ├── websocket/
│       │   └── wsServer.js     # WebSocket broadcast server
│       ├── controllers/        # Route handlers
│       ├── routes/
│       │   └── api.js          # Express router
│       └── middleware/
│           └── errorHandler.js
│   └── tests/
│       ├── chartService.test.js
│       ├── market.test.js
│       └── api.test.js
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx            # React entry point
│       ├── App.jsx             # Root component with dropdown + layout
│       ├── index.css           # Global styles
│       ├── components/
│       │   ├── RealTimeChart.jsx  # Chart.js line chart with blinking dot plugin
│       │   ├── ChartPanel.jsx     # Chart wrapper: header, latest value badge, legend
│       │   └── MarketClosed.jsx   # Shown when market is not open
│       ├── hooks/
│       │   └── useMarketData.js   # Fetches history + merges live WS ticks
│       ├── services/
│       │   ├── api.js             # REST fetch helpers
│       │   └── websocket.js       # Singleton WS with auto-reconnect
│       └── utils/
│           ├── chartUtils.js      # Colour logic, mergeLiveTick, formatTime
│           └── chartUtils.test.js
│
├── postgres/
│   └── init/
│       └── 01_schema.sql       # Schema auto-run on first DB start
│
└── docs/
    ├── DESIGN.md               # Architecture & design decisions
    └── architecture-diagram.md # Mermaid system diagram
```

---

## Configuration

All configuration is done via environment variables in `.env` (or Docker Compose environment blocks).

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_DB` | `wingsfin` | Database name |
| `POSTGRES_USER` | `wingsfin` | Database user |
| `POSTGRES_PASSWORD` | `wingsfin123` | Database password |
| `BACKEND_PORT` | `4000` | Backend HTTP/WS port |
| `FRONTEND_PORT` | `3000` | Frontend dev server port |
| `MARKET_OPEN_HOUR` | `10` | Market open hour (24h, local TZ) |
| `MARKET_OPEN_MINUTE` | `0` | Market open minute |
| `MARKET_CLOSE_HOUR` | `14` | Market close hour (24h) |
| `MARKET_CLOSE_MINUTE` | `30` | Market close minute |
| `MARKET_TIMEZONE` | `Asia/Dhaka` | IANA timezone for market hours |
| `DEMO_MODE` | `true` | Rolling session window (ignores clock) |
| `DEMO_SESSION_DURATION_MINUTES` | `30` | Length of demo session window |
| `SIM_MIN_INTERVAL_MS` | `500` | Minimum simulator tick interval |
| `SIM_MAX_INTERVAL_MS` | `3000` | Maximum simulator tick interval |
| `VITE_API_BASE_URL` | `http://localhost:4000` | Frontend → backend REST URL |
| `VITE_WS_URL` | `ws://localhost:4000` | Frontend → backend WS URL |

---

## Demo Mode vs Real Market Hours

### Demo Mode (`DEMO_MODE=true`, default)

The market is **always open**. A rolling session window of `DEMO_SESSION_DURATION_MINUTES` (default 30) is used. The session start is anchored to `now - 30min` and the close is `now`. This means:

- You can test the app at **any time of day**
- Historical data is seeded for the past 30 minutes
- Live updates flow in real time
- The chart x-axis always shows the full rolling window

### Real Market Hours (`DEMO_MODE=false`)

The system respects actual DSE hours:

- **Open:** 10:00 AM Asia/Dhaka (BST+6)
- **Close:** 2:30 PM Asia/Dhaka
- **Days:** Sunday through Thursday

Outside these hours the frontend displays the **Market Closed** screen.

To switch to real hours:

```bash
# In .env
DEMO_MODE=false
MARKET_TIMEZONE=Asia/Dhaka
MARKET_OPEN_HOUR=10
MARKET_OPEN_MINUTE=0
MARKET_CLOSE_HOUR=14
MARKET_CLOSE_MINUTE=30
```

Then restart: `docker compose up --build`

---

## Running Tests

### Backend Tests (Jest + Supertest)

```bash
cd backend
npm install
npm test
```

Or with coverage:

```bash
npm run test:coverage
```

Tests cover:
- `chartService` – `floorToMinute`, `buildMinuteSeries` (carry-forward, latest-wins, null gaps, future exclusion)
- `market config` – demo mode session, duration, real-mode isDemo flag
- REST API endpoints – health, market status, index/stock history and latest (DB mocked)

### Frontend Tests (Jest + Testing Library)

```bash
cd frontend
npm install
npm test
```

Tests cover:
- `chartUtils` – `getPointColor`, `buildColorArrays`, `formatTime`, `mergeLiveTick` (same-minute overwrite, carry-forward, skip-minutes fill)

### Running All Tests (from root)

```bash
# Backend
docker compose exec backend npm test

# Frontend
docker compose exec frontend npm test
```

---

## API Reference

All endpoints return `{ success: boolean, data: ... }`.

### `GET /api/health`
```json
{ "status": "ok", "ts": 1718000000000 }
```

### `GET /api/market/status`
```json
{
  "success": true,
  "data": {
    "open": 1718000000000,
    "close": 1718001800000,
    "isOpen": true,
    "isDemo": true
  }
}
```

### `GET /api/index/:indexId/history`

Returns a complete 1-minute bucketed series from session open to now.

```json
{
  "success": true,
  "data": {
    "indexId": "DSEX",
    "session": { "open": 1718000000000, "close": 1718001800000, "isOpen": true },
    "yesterdayClose": 5200.0,
    "series": [
      { "minuteMs": 1718000000000, "value": 5204.32 },
      { "minuteMs": 1718000060000, "value": 5204.32 },
      { "minuteMs": 1718000120000, "value": 5197.88 }
    ]
  }
}
```

### `GET /api/index/:indexId/latest`

Returns the single most recent raw snapshot.

### `GET /api/stock/:tradeCode/history`

Same structure as index history, with `tradeCode` and `close_price`-based series.

### `GET /api/stock/:tradeCode/latest`

Returns the most recent stock snapshot.

---

## WebSocket Protocol

Connect to `ws://localhost:4000/ws`.

### Client → Server

```json
{ "type": "subscribe", "channel": "index" }
```
```json
{ "type": "subscribe", "channel": "stock" }
```

(Currently informational — all clients receive all updates.)

### Server → Client

**Market status** (sent on connect and every 10s):
```json
{
  "type": "market_status",
  "payload": { "open": 1718000000000, "close": 1718001800000, "isOpen": true, "isDemo": true }
}
```

**Index update** (on each simulator tick):
```json
{
  "type": "index_update",
  "payload": {
    "index_id": "DSEX",
    "time": 1718000045000,
    "capital_value": 5207.14,
    "percentage_change_from_yesterday_close_value": 0.137,
    "yesterday_close_value": 5200.0
  }
}
```

**Stock update:**
```json
{
  "type": "stock_update",
  "payload": {
    "trade_code": "GP",
    "time": 1718000047000,
    "close_price": 239.12,
    "yesterday_close_price": 238.88
  }
}
```

---

## Architecture

See [`docs/DESIGN.md`](docs/DESIGN.md) for the full architecture document and [`docs/architecture-diagram.md`](docs/architecture-diagram.md) for the Mermaid system diagram.

### Summary

```
Browser ←── REST (history) ──→ Express ──→ ChartService ──→ PostgreSQL
Browser ←── WebSocket ────────→ WS Server ←── Simulator ──→ PostgreSQL
```

- **REST** serves pre-bucketed 1-min series for fast initial render
- **WebSocket** delivers sub-3-second live ticks for real-time updates
- **Simulator** generates random-walk data with non-uniform intervals and persists to DB
- **PostgreSQL** stores all raw ticks; indexed on `(symbol, time DESC)` for fast range queries

---

## Seed Data Strategy

On startup, the backend seeds historical data for the current session window:

- **DSEX:** Random walk from `yesterday_close=5200`, delta ±5 per tick, clamped within ±100
- **GP:** Random walk from `yesterday_close=238.88`, delta ±0.1 per tick, clamped within ±1

Ticks are generated with **non-uniform intervals** (5–90 seconds) to simulate real-world irregular data arrival. Multiple ticks in the same minute are expected — the latest value in each minute is used for chart display.

---

## Chart Behaviour

| Rule | Implementation |
|------|----------------|
| X-axis = full session (open → close) | `buildMinuteSeries` walks from `sessionOpen` to `min(sessionClose, now)` |
| 1-minute intervals, no gaps | Every minute always present; carry-forward fills missing ticks |
| Latest value in a minute wins | `mergeLiveTick` overwrites when `tickMinute === lastMinute` |
| Colour: above close → `#7327F5` | `getPointColor()` + Chart.js `segment.borderColor` callback |
| Colour: below close → `#F52738` | Same |
| Colour: equal → `#EE27F5` | Same |
| Yesterday close reference line | Second dataset with `borderDash: [6,4]` at constant `yesterdayClose` |
| Blinking latest point | Custom `blinkingDotPlugin` using `requestAnimationFrame` 60fps loop |
| Latest value top-right | `LatestBadge` component with live `latestValue` state |
| Hover tooltip: time + value | Chart.js `tooltip.callbacks` using `minuteMs` from series |
| Market closed screen | Frontend checks `session.isOpen`; shows `<MarketClosed />` |
