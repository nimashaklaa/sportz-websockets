import { useEffect, useRef, useCallback } from 'react';

type SocketMessage = Record<string, unknown>;

export function useMatchSocket(onMessage: (msg: SocketMessage) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/ws`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as SocketMessage;
        onMessageRef.current(msg);
      } catch {
        // ignore malformed
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const subscribe = useCallback((matchId: number) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'subscribe', matchId }));
    }
  }, []);

  const unsubscribe = useCallback((matchId: number) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'unsubscribe', matchId }));
    }
  }, []);

  return { subscribe, unsubscribe };
}
