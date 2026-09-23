import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useSession } from "../../context/SessionContext.jsx";
import ConnectorStrip from "../../components/planner/ConnectorStrip.jsx";
import PlanCards from "../../components/planner/PlanCards.jsx";
import ChatRail from "../../components/planner/ChatRail.jsx";

const TIME_CHIPS = [
  { key: "morning", label: "Morning" },
  { key: "afternoon", label: "Afternoon" },
  { key: "evening", label: "Evening" },
];

export default function Planner() {
  const { session } = useSession();
  const navigate = useNavigate();

  const [timeOfDay, setTimeOfDay] = useState("morning");
  const [freeText, setFreeText] = useState("");
  const [statusByTool, setStatusByTool] = useState({});
  const [plan, setPlan] = useState([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [hasRun, setHasRun] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState(null);
  const esRef = useRef(null);

  function handleStatusChange(updatedRun) {
    setPlan(updatedRun.plan);
  }

  async function handleFeedback(itemTitle, feedback, note) {
    setAdjusting(true);
    setFeedbackNote(null);
    setError(null);
    try {
      const updated = await api.planner.sendFeedback(itemTitle, feedback, note, session.sessionToken);
      setPlan(updated.plan);
      setFeedbackNote(updated.last_feedback);
    } catch (e) {
      setError(e.message || "Could not adjust the plan based on that feedback.");
    } finally {
      setAdjusting(false);
    }
  }

  function runPlan() {
    setRunning(true);
    setError(null);
    setStatusByTool({});
    setPlan([]);
    setHasRun(true);
    setFeedbackNote(null);

    const es = api.planner.streamPlan(timeOfDay, freeText, session.sessionToken);
    esRef.current = es;

    es.addEventListener("connector", (e) => {
      const event = JSON.parse(e.data);
      setStatusByTool((prev) => ({ ...prev, [event.tool]: event.status }));
      if (event.status === "error") setError(event.error || `The ${event.tool} connector failed.`);
    });

    es.addEventListener("reasoning", (e) => {
      const event = JSON.parse(e.data);
      if (event.status === "done" && event.output) setPlan(event.output);
      if (event.status === "error") setError(event.error || "The assistant could not build a plan.");
    });

    es.addEventListener("done", () => {
      setRunning(false);
      es.close();
    });

    es.onerror = () => {
      setRunning(false);
      es.close();
    };
  }

  return (
    <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "auto" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", width: "100%", padding: "48px 24px 40px" }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 6 }}>
              Signed in as <strong style={{ color: "var(--text-secondary)" }}>{session.name}</strong> · {session.role}
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 600, margin: "0 0 6px" }}>What should I focus on?</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 14.5, margin: 0 }}>
              I'll check your connected tools and build a prioritized plan.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {TIME_CHIPS.map((c) => (
              <button
                key={c.key}
                onClick={() => setTimeOfDay(c.key)}
                style={{
                  padding: "8px 18px",
                  borderRadius: 20,
                  border: `1.5px solid ${timeOfDay === c.key ? "var(--accent-primary)" : "var(--border-default)"}`,
                  background: timeOfDay === c.key ? "var(--accent-primary-tint)" : "var(--surface-card)",
                  color: timeOfDay === c.key ? "var(--accent-primary)" : "var(--text-secondary)",
                  fontWeight: 600,
                  fontSize: 13.5,
                  cursor: "pointer",
                }}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <input
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="Optional: add anything specific to consider…"
              style={{
                flex: 1,
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: "11px 14px",
                fontSize: 14,
                outline: "none",
              }}
            />
            <button
              onClick={runPlan}
              disabled={running}
              style={{
                background: "var(--accent-primary)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius-md)",
                padding: "0 20px",
                fontSize: 14,
                fontWeight: 600,
                cursor: running ? "default" : "pointer",
                opacity: running ? 0.7 : 1,
              }}
            >
              {running ? "Planning…" : hasRun ? "Run again" : "Get my plan"}
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <ConnectorStrip statusByTool={statusByTool} connectedTools={session.connectedTools} />
            <button
              onClick={() => navigate("/planner/system-flow")}
              style={{
                border: "1px solid var(--border-default)",
                background: "var(--surface-card)",
                borderRadius: "var(--radius-md)",
                padding: "8px 14px",
                fontSize: 12.5,
                cursor: "pointer",
                whiteSpace: "nowrap",
                marginLeft: 12,
                alignSelf: "flex-start",
              }}
            >
              View system flow
            </button>
          </div>

          {error && (
            <div
              style={{
                background: "var(--danger-tint)",
                color: "var(--danger)",
                padding: "8px 12px",
                borderRadius: "var(--radius-md)",
                fontSize: 12.5,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          {feedbackNote && (
            <div
              style={{
                background: "var(--success-tint)", color: "var(--success)", padding: "8px 12px",
                borderRadius: "var(--radius-md)", fontSize: 12.5, marginBottom: 16,
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              <span>✓</span> {feedbackNote}
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            <PlanCards plan={plan} onFeedback={hasRun && !running ? handleFeedback : null} onStatusChange={handleStatusChange} adjusting={adjusting} />
          </div>
        </div>
      </div>

      <ChatRail />
    </div>
  );
}
