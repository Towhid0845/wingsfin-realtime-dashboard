const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:4000";

let ws = null;
const listeners = new Set();
let reconnectTimer = null;
let shouldConnect = false;

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  ws = new WebSocket(`${WS_URL}/ws`);

  ws.onopen = () => {
    console.log("[WS] Connected"); 
    ws.send(JSON.stringify({ type: "subscribe", channel: "all" }));
    if (reconnectTimer) clearTimeout(reconnectTimer);
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      listeners.forEach((fn) => fn(msg));
    } catch (_) {}
  };

  ws.onclose = () => {
    console.log("[WS] Disconnected – reconnecting in 2s");
    if (shouldConnect) {
      reconnectTimer = setTimeout(connect, 2_000);
    }
  };

  ws.onerror = (err) => {
    console.error("[WS] Error", err);
    ws.close();
  };
}

export function startWebSocket() {
  shouldConnect = true;
  connect();
}

export function stopWebSocket() {
  shouldConnect = false;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (ws) ws.close();
  ws = null;
}

export function addMessageListener(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
