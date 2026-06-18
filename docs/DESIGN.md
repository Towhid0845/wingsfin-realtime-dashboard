# WingsFin – System Architecture & Design Document

## 1. Overview

WingsFin is a real-time market data visualisation system that displays live line charts for:
- **DSEX** – Dhaka Stock Exchange index
- **GP** – Grameenphone Ltd. stock price

The system simulates a data source that pushes updates at random sub-3-second intervals and renders them as a continuously updating 1-minute-interval chart.

---

## 2. System Architecture

### High-Level Components

```
┌──────────────────────────────────────────────────┐
│                   Browser                        │
│  React + Chart.js                                │
│  ┌─────────────────┐  ┌──────────────────────┐   │
│  │ REST API Client │  │  WebSocket Client    │   │
│  └────────┬────────┘  └───────────┬──────────┘   │
└───────────┼───────────────────────┼──────────────┘
            │ HTTP                  │ WS
┌───────────┼───────────────────────┼──────────────┐
│           │     Node.js Backend   │              │
│  ┌────────▼────────┐  ┌───────────▼───────────┐  │
│  │  Express REST   │  │   WebSocket Server    │  │
│  │  /api/*         │  │   /ws                 │  │
│  └────────┬────────┘  └───────────┬───────────┘  │
│           │                       │ EventEmitter │
│  ┌────────▼───────────────────────▼───────────┐  │
│  │              Data Simulator                │  │
│  │  (random-interval tick generation)         │  │
│  └────────────────────┬───────────────────────┘  │
│                       │                          │
│  ┌────────────────────▼───────────────────────┐  │
│  │              Repository Layer              │  │
│  └─────────────────────┬──────────────────────┘  │
└────────────────────────┼─────────────────────────┘
                         │
┌────────────────────────▼──────────────────────────┐
│                    PostgreSQL                     │
│  index_snapshots  │  stock_snapshots              │
└───────────────────────────────────────────────────┘
```

### Data Flow

1. **On page load** → frontend calls `GET /api/index/DSEX/history`
2. Backend queries DB for all raw ticks since session open
3. `chartService.buildMinuteSeries()` aggregates ticks into 1-min buckets with carry-forward
4. Frontend renders the full historical chart immediately
5. Simultaneously, frontend opens a WebSocket to `/ws`
6. The **Data Simulator** emits `index_update` / `stock_update` events at ≤3s random intervals
7. WS server broadcasts these to all connected clients
8. Frontend's `mergeLiveTick()` function merges each update into the existing series (latest-in-minute wins)
9. Chart re-renders automatically via React state

---

## 3. Design Decisions

### 3.1 1-Minute Bucketing on the Backend

**Decision:** The backend returns pre-bucketed minute-series data rather than raw ticks.

**Rationale:**
- Reduces payload size significantly (30-min session = 30 rows vs potentially thousands of ticks)
- Moves computation off the browser's main thread
- Chart TTI is minimised – the frontend receives data ready to render

**Trade-off:** If a client needs sub-minute granularity in the future, the API must be extended.

### 3.2 Carry-Forward for Missing Minutes

**Decision:** If no tick arrives in a minute, the last known value is carried forward.

**Rationale:** The assignment specifies "there must not be any missing minutes in the timeline." Carrying forward the last value accurately reflects market reality (price is unchanged, not absent).

### 3.3 WebSocket Broadcast (No Per-Channel Filtering)

**Decision:** All connected clients receive all updates (both index and stock).

**Rationale:**
- For two symbols this is negligible overhead (~100 bytes per message)
- Simplifies server-side subscription management
- Frontend ignores events for the non-selected symbol

**Trade-off:** At scale with thousands of symbols, per-channel pub/sub (e.g. Redis Pub/Sub) would be required.

### 3.4 Demo Mode

**Decision:** `DEMO_MODE=true` creates a rolling 30-minute session window anchored to the current time.

**Rationale:** The assignment requires configurable market hours. Demo mode makes it possible to evaluate the live chart behaviour without waiting for DSE trading hours (which are in the BST timezone).

### 3.5 Client-Side `mergeLiveTick()`

**Decision:** Live ticks are merged directly into the chart series on the frontend without a round-trip to the backend.

**Rationale:**
- Minimises perceived latency ("instantaneous" feel)
- Avoids polling or re-fetching history on every update
- The same bucketing rules (latest-in-minute wins, carry-forward) are applied as on the backend

### 3.6 Chart.js with Segment Colouring

**Decision:** Chart.js `segment.borderColor` callback is used to colour each line segment individually based on whether the value is above/below/equal to yesterday's close.

**Rationale:** Chart.js natively supports per-segment colouring with minimal overhead. This avoids splitting the dataset into multiple series.

### 3.7 Blinking Dot via requestAnimationFrame

**Decision:** A custom Chart.js plugin (`blinkingDotPlugin`) drives the heartbeat animation via `requestAnimationFrame`.

**Rationale:** CSS animations cannot target Canvas-drawn elements. `rAF` gives 60fps control of the pulsing ring radius and opacity while keeping the animation off the main event loop.

---

## 4. Technology Choices

| Layer | Technology | Reason |
|-------|------------|--------|
| Backend framework | Express.js | Mature, minimal, widely understood |
| WebSocket | `ws` library | Lightweight, no abstraction overhead; native WS protocol |
| Database | PostgreSQL | Reliable, ACID, excellent time-series indexing with BIGINT epoch |
| ORM/Query | Raw `pg` (node-postgres) | No ORM overhead; full control of query plans |
| Frontend framework | React 18 | Composable, hooks-based state management fits the streaming pattern |
| Chart library | Chart.js + react-chartjs-2 | Per-segment colouring, custom plugins, high performance Canvas |
| Containerisation | Docker + Compose | Single `docker compose up` startup as required |
| Testing (BE) | Jest + Supertest | Standard Node.js testing stack |
| Testing (FE) | Jest + Testing Library | React component and utility testing |

---

## 5. Database Design

### `index_snapshots`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `index_id` | VARCHAR(20) | e.g. "DSEX" |
| `time` | BIGINT | Epoch milliseconds (matches assignment payload) |
| `capital_value` | NUMERIC(12,4) | Index value |
| `percentage_change_from_yesterday_close` | NUMERIC(8,4) | Computed |
| `yesterday_close_value` | NUMERIC(12,4) | Reference for colouring |

### `stock_snapshots`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `trade_code` | VARCHAR(20) | e.g. "GP" |
| `time` | BIGINT | Epoch milliseconds |
| `close_price` | NUMERIC(12,4) | Current price |
| `yesterday_close_price` | NUMERIC(12,4) | Reference for colouring |

**Index strategy:** Composite index on `(symbol, time DESC)` so history queries are O(log n) range scans rather than full table scans.

---

## 6. Scalability Considerations

### Current design handles:
- Multiple simultaneous browser clients efficiently (WS broadcast is O(n) but data is tiny)
- High tick frequency (simulator can be configured sub-500ms)

### To scale beyond this:
| Concern | Solution |
|---------|----------|
| Many browser clients | Add Redis Pub/Sub; multiple backend instances subscribe and fan out |
| Many symbols | Per-channel subscription management on the WS server |
| High write throughput | Use TimescaleDB (PostgreSQL extension) with hypertables and compression |
| Horizontal scaling | Stateless REST + WS behind a sticky-session load balancer |

---

## 7. Trade-offs & Justifications

| Trade-off | Choice | Why |
|-----------|--------|-----|
| Backend bucketing vs raw stream | Backend bucketing | Lower TTI, smaller payloads |
| Custom rAF animation vs CSS | Custom rAF | Canvas elements require imperative drawing |
| Single WS channel vs per-symbol | Single broadcast | Simpler for 2 symbols; document path to scale |
| Raw `pg` vs ORM | Raw `pg` | No query-plan surprises; explicit control |
| Demo mode rolling window | Always-on demo | Evaluators can test live charts any time |
| Seed data non-uniform intervals | Random 5–90s gaps | Reflects real-world irregular tick distribution |
