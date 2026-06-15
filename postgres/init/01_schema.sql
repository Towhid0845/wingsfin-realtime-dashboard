-- ────────────────────────────────────────────────────────────────
-- WingsFin – Database Initialisation
-- ────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Index snapshots ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS index_snapshots (
    id                                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    index_id                                VARCHAR(20)  NOT NULL,
    time                                    BIGINT       NOT NULL,  -- epoch ms
    capital_value                           NUMERIC(12,4) NOT NULL,
    percentage_change_from_yesterday_close  NUMERIC(8,4)  NOT NULL,
    yesterday_close_value                   NUMERIC(12,4) NOT NULL,
    created_at                              TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_index_snapshots_index_id_time
    ON index_snapshots (index_id, time DESC);

-- ── Stock snapshots ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_snapshots (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_code            VARCHAR(20)  NOT NULL,
    time                  BIGINT       NOT NULL,  -- epoch ms
    close_price           NUMERIC(12,4) NOT NULL,
    yesterday_close_price NUMERIC(12,4) NOT NULL,
    created_at            TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_snapshots_trade_code_time
    ON stock_snapshots (trade_code, time DESC);

-- ── Market sessions (tracks demo / real sessions) ────────────────
CREATE TABLE IF NOT EXISTS market_sessions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    open_time   BIGINT NOT NULL,
    close_time  BIGINT NOT NULL,
    is_demo     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
