import { useCallback, useRef, useState } from "react";
import type { TraceEvent } from "../types";

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || "ws://localhost:8000";
const WS_PATH = "/api/readiness/ws/chat";

interface UseChatRunResult {
  events: TraceEvent[];
  isRunning: boolean;
  runId: string | null;
  error: string | null;
  start: (query: string, uploadedDocIds: string[]) => void;
  reset: () => void;
}

export function useChatRun(): UseChatRunResult {
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const reset = useCallback(() => {
    setEvents([]);
    setRunId(null);
    setError(null);
    setIsRunning(false);
    wsRef.current?.close();
  }, []);

  const start = useCallback((query: string, uploadedDocIds: string[]) => {
    setEvents([]);
    setError(null);
    setIsRunning(true);

    const ws = new WebSocket(`${WS_BASE_URL}${WS_PATH}`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          query,
          session_id: `sess-${Date.now()}`,
          uploaded_doc_ids: uploadedDocIds,
        })
      );
    };

    ws.onmessage = (msg) => {
      const event: TraceEvent = JSON.parse(msg.data);
      if (event.event_type === "error") {
        setError(event.message);
        setIsRunning(false);
        return;
      }
      setRunId(event.run_id);
      setEvents((prev) => [...prev, event]);
      if (event.event_type === "run_completed") {
        setIsRunning(false);
      }
    };

    ws.onerror = () => {
      setError("Connection error — is the backend running?");
      setIsRunning(false);
    };

    ws.onclose = () => {
      setIsRunning(false);
    };
  }, []);

  return { events, isRunning, runId, error, start, reset };
}
