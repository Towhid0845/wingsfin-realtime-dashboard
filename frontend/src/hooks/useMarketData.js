import { useState, useEffect, useRef, useCallback } from "react";
import { fetchIndexHistory, fetchStockHistory } from "../services/api";
import { addMessageListener } from "../services/websocket";
import { mergeLiveTick } from "../utils/chartUtils";

/*
  1. Fetches historical series on mount / chartType change
  2. Listens for live WS updates and merges them into the series
  3. Returns { series, yesterdayClose, session, loading, error, latestValue }
 */
export function useMarketData(chartType = "index") {
  const [series, setSeries] = useState([]);
  const [yesterdayClose, setYesterdayClose] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [latestValue, setLatestValue] = useState(null);

  const seriesRef = useRef([]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res =
        chartType === "index"
          ? await fetchIndexHistory("DSEX")
          : await fetchStockHistory("GP");

      const { series: s, yesterdayClose: yc, session: sess } = res.data;
      seriesRef.current = s ?? [];
      setSeries([...(s ?? [])]);
      setYesterdayClose(yc);
      setSession(sess);

      const lastValid = [...(s ?? [])].reverse().find((p) => p.value !== null);
      setLatestValue(lastValid?.value ?? null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [chartType]);

  // Load history whenever chartType changes
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // WebSocket listener
  useEffect(() => {
    const remove = addMessageListener((msg) => {
      if (msg.type === "market_status") {
        setSession(msg.payload);
        return;
      }

      if (chartType === "index" && msg.type === "index_update") {
        const { time, capital_value } = msg.payload;
        const updated = mergeLiveTick(
          seriesRef.current,
          Number(time),
          parseFloat(capital_value),
          seriesRef.current[0]?.minuteMs ?? 0
        );
        seriesRef.current = updated;
        setSeries([...updated]);
        setLatestValue(parseFloat(capital_value));
      }

      if (chartType === "stock" && msg.type === "stock_update") {
        const { time, close_price } = msg.payload;
        const updated = mergeLiveTick(
          seriesRef.current,
          Number(time),
          parseFloat(close_price),
          seriesRef.current[0]?.minuteMs ?? 0
        );
        seriesRef.current = updated;
        setSeries([...updated]);
        setLatestValue(parseFloat(close_price));
      }
    });

    return remove;
  }, [chartType]);

  return { series, yesterdayClose, session, loading, error, latestValue };
}
