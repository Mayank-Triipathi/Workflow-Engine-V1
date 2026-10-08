import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API;
console.log("API =", API);
const STATUS_COLOR = {
  running: "#f59e0b",
  success: "#10b981",
  failed: "#ef4444",
  pending: "#6b7280",
};

const badge = (status) => ({
  display: "inline-block",
  padding: "2px 10px",
  borderRadius: 4,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.05em",
  background: STATUS_COLOR[status] + "22",
  color: STATUS_COLOR[status] || "#aaa",
  border: `1px solid ${STATUS_COLOR[status] || "#aaa"}44`,
  textTransform: "uppercase",
});

async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

/* ─── Sidebar ─── */
function Sidebar({ page, setPage }) {
  const items = [
    { id: "dashboard", label: "Dashboard" },
    { id: "workflows", label: "Workflows" },
    { id: "runs", label: "Runs" },
  ];
  return (
    <aside style={{
      width: 200, minHeight: "100vh", background: "#0f1117",
      borderRight: "1px solid #1e2130", display: "flex", flexDirection: "column",
      padding: "24px 0", gap: 4, flexShrink: 0,
    }}>
      <div style={{ padding: "0 20px 24px", fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#4ade80", letterSpacing: "0.1em", fontWeight: 700 }}>
        ⬡ WORKFLOW
      </div>
      {items.map(({ id, label }) => (
        <button key={id} onClick={() => setPage(id)} style={{
          background: page === id ? "#1e2130" : "transparent",
          border: "none", color: page === id ? "#e2e8f0" : "#64748b",
          textAlign: "left", padding: "10px 20px", cursor: "pointer",
          fontSize: 13, fontFamily: "'DM Mono', monospace",
          borderLeft: page === id ? "2px solid #4ade80" : "2px solid transparent",
          transition: "all 0.15s",
        }}>
          {label}
        </button>
      ))}
    </aside>
  );
}

/* ─── Dashboard ─── */
function Dashboard() {
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
  const load = () =>
    apiFetch("/workflows/dashboard").then(setStats).catch(e => setErr(e.message));

  load();
  const interval = setInterval(load, 30000);
  return () => clearInterval(interval);
}, []);

  if (err) return <Msg error>{err}</Msg>;
  if (!stats) return <Msg>Loading…</Msg>;

  const cards = [
    { label: "Total Workflows", value: stats.total_workflows, color: "#818cf8" },
    { label: "Total Runs", value: stats.total_runs, color: "#38bdf8" },
    { label: "Running", value: stats.running_runs, color: "#f59e0b" },
    { label: "Completed", value: stats.success_runs, color: "#10b981" },
    { label: "Failed", value: stats.failed_runs, color: "#ef4444" },
  ];

  return (
    <div>
      <PageTitle>Dashboard</PageTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16 }}>
        {cards.map(({ label, value, color }) => (
          <div key={label} style={{
            background: "#0f1117", border: "1px solid #1e2130",
            borderRadius: 8, padding: "20px 16px",
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "'DM Mono', monospace" }}>
              {value ?? 0}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Workflows List ─── */
function Workflows() {
  const [workflows, setWorkflows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [newName, setNewName] = useState("");
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => apiFetch("/workflows").then(setWorkflows).catch(e => setErr(e.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!newName.trim()) return;
    try {
      await apiFetch("/workflows", { method: "POST", body: JSON.stringify({ name: newName }) });
      setNewName("");
      load();
    } catch (e) { setErr(e.message); }
  };

  const del = async (id, force = false) => {
    if (!confirm(force ? "Delete workflow AND all instances?" : "Delete this workflow?")) return;
    try {
      await apiFetch(`/workflows/${id}${force ? "?force=true" : ""}`, { method: "DELETE" });
      if (selected?.workflow?.id === id) setSelected(null);
      load();
    } catch (e) {
      if (e.message.includes("instances")) {
        if (confirm("Workflow has instances. Force delete everything?")) del(id, true);
      } else setErr(e.message);
    }
  };

  if (loading) return <Msg>Loading…</Msg>;

  return (
    <div style={{ display: "flex", gap: 24 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <PageTitle>Workflows</PageTitle>

        {/* Create form */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <input
            value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && create()}
            placeholder="New workflow name…"
            style={inputStyle}
          />
          <Btn onClick={create}>+ Create</Btn>
        </div>

        {err && <Msg error>{err}</Msg>}

        {workflows.length === 0 ? (
          <Msg>No workflows yet.</Msg>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                {["Name", "ID", "Created", ""].map(h => <Th key={h}>{h}</Th>)}
              </tr>
            </thead>
            <tbody>
              {workflows.map(w => (
                <tr key={w.id} style={{ borderBottom: "1px solid #1e2130" }}>
                  <Td>
                    <button onClick={() => setSelected(null) || apiFetch(`/workflows/${w.id}`).then(setSelected).catch(e => setErr(e.message))}
                      style={{ background: "none", border: "none", color: "#818cf8", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
                      {w.name}
                    </button>
                  </Td>
                  <Td mono muted>{w.id.slice(0, 8)}…</Td>
                  <Td muted>{new Date(w.created_at).toLocaleDateString()}</Td>
                  <Td>
                    <button onClick={() => del(w.id)}
                      style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 12 }}>
                      Delete
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <WorkflowDetail data={selected} onClose={() => setSelected(null)} onRefresh={() => apiFetch(`/workflows/${selected.workflow.id}`).then(setSelected)} />
      )}
    </div>
  );
}

function WorkflowDetail({ data, onClose, onRefresh }) {
  const { workflow, steps } = data;
  const [stepName, setStepName] = useState("");
  const [stepOrder, setStepOrder] = useState("");
  const [err, setErr] = useState(null);

  const addStep = async () => {
    if (!stepName.trim() || stepOrder === "") return;
    try {
      await apiFetch(`/workflows/${workflow.id}/steps`, {
        method: "POST",
        body: JSON.stringify({ step_name: stepName, step_order: Number(stepOrder) }),
      });
      setStepName(""); setStepOrder("");
      onRefresh();
    } catch (e) { setErr(e.message); }
  };

  const delStep = async (step_id) => {
    try {
      await apiFetch(`/workflows/${workflow.id}/steps/${step_id}`, { method: "DELETE" });
      onRefresh();
    } catch (e) { setErr(e.message); }
  };

  return (
    <div style={{
      width: 320, background: "#0f1117", border: "1px solid #1e2130",
      borderRadius: 8, padding: 20, alignSelf: "flex-start", flexShrink: 0,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 14 }}>{workflow.name}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 16 }}>✕</button>
      </div>

      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 16, fontFamily: "'DM Mono', monospace" }}>
        {workflow.id}
      </div>

      <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Steps ({steps.length})
      </div>

      {steps.length === 0 ? (
        <div style={{ fontSize: 12, color: "#475569", marginBottom: 12 }}>No steps yet.</div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #1e2130" }}>
              <span style={{ fontSize: 12, color: "#cbd5e1" }}>
                <span style={{ color: "#4ade80", fontFamily: "'DM Mono', monospace", marginRight: 8 }}>#{s.step_order}</span>
                {s.step_name}
              </span>
              {s.id && (
                <button onClick={() => delStep(s.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 11 }}>✕</button>
              )}
            </div>
          ))}
        </div>
      )}

      {err && <Msg error>{err}</Msg>}

      <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Add Step
      </div>
      <input value={stepName} onChange={e => setStepName(e.target.value)} placeholder="Step name" style={{ ...inputStyle, marginBottom: 6 }} />
      <input value={stepOrder} onChange={e => setStepOrder(e.target.value)} placeholder="Order (1, 2, 3…)" type="number" style={{ ...inputStyle, marginBottom: 8 }} />
      <Btn onClick={addStep} full>+ Add Step</Btn>
    </div>
  );
}

/* ─── Runs ─── */
function Runs() {
  const [runs, setRuns] = useState([]);
  const [selected, setSelected] = useState(null);
  const [steps, setSteps] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => { apiFetch("/runs").then(setRuns).catch(e => setErr(e.message)).finally(() => setLoading(false)); }, []);

  const viewRun = async (id) => {
    try {
      const [run, runSteps] = await Promise.all([apiFetch(`/runs/${id}`), apiFetch(`/runs/${id}/steps`)]);
      setSelected(run); setSteps(runSteps);
    } catch (e) { setErr(e.message); }
  };

  if (loading) return <Msg>Loading…</Msg>;

  return (
    <div style={{ display: "flex", gap: 24 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <PageTitle>Runs</PageTitle>
        {err && <Msg error>{err}</Msg>}
        {runs.length === 0 ? <Msg>No runs found.</Msg> : (
          <table style={tableStyle}>
            <thead>
              <tr>{["ID", "Workflow", "Status", "Started", ""].map(h => <Th key={h}>{h}</Th>)}</tr>
            </thead>
            <tbody>
              {runs.map(r => (
                <tr key={r.id} style={{ borderBottom: "1px solid #1e2130" }}>
                  <Td mono muted>{r.id.slice(0, 8)}…</Td>
                  <Td mono muted>{r.workflow_id?.slice(0, 8)}…</Td>
                  <Td><span style={badge(r.status)}>{r.status}</span></Td>
                  <Td muted>{new Date(r.created_at).toLocaleString()}</Td>
                  <Td>
                    <button onClick={() => viewRun(r.id)}
                      style={{ background: "none", border: "none", color: "#818cf8", cursor: "pointer", fontSize: 12 }}>
                      Details
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && steps && (
        <div style={{ width: 320, background: "#0f1117", border: "1px solid #1e2130", borderRadius: 8, padding: 20, alignSelf: "flex-start", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#e2e8f0" }}>Run Details</span>
            <button onClick={() => { setSelected(null); setSteps(null); }} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>
          <div style={{ marginBottom: 12 }}>
            <Row label="ID"><span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#94a3b8" }}>{selected.id}</span></Row>
            <Row label="Workflow"><span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#94a3b8" }}>{selected.workflow_id}</span></Row>
            <Row label="Status"><span style={badge(selected.status)}>{selected.status}</span></Row>
            <Row label="Started">{new Date(selected.created_at).toLocaleString()}</Row>
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Step Executions ({steps.length})
          </div>
          {steps.length === 0 ? <div style={{ fontSize: 12, color: "#475569" }}>No steps recorded.</div> : (
            steps.map((s, i) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid #1e2130" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "#cbd5e1" }}>{s.step_name}</span>
                  <span style={badge(s.status)}>{s.status}</span>
                </div>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                  Attempt {s.attempt} · {new Date(s.created_at).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Shared Components ─── */
function PageTitle({ children }) {
  return <h1 style={{ fontSize: 20, fontWeight: 800, color: "#e2e8f0", marginBottom: 20, marginTop: 0, fontFamily: "'DM Mono', monospace" }}>{children}</h1>;
}
function Msg({ children, error }) {
  return <div style={{ fontSize: 13, color: error ? "#ef4444" : "#64748b", padding: "8px 0" }}>{children}</div>;
}
function Btn({ children, onClick, full }) {
  return (
    <button onClick={onClick} style={{
      background: "#4ade8022", border: "1px solid #4ade8044", color: "#4ade80",
      borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontSize: 12,
      fontFamily: "'DM Mono', monospace", fontWeight: 700, letterSpacing: "0.05em",
      width: full ? "100%" : undefined, transition: "background 0.15s",
    }}
      onMouseEnter={e => e.target.style.background = "#4ade8033"}
      onMouseLeave={e => e.target.style.background = "#4ade8022"}>
      {children}
    </button>
  );
}
function Th({ children }) {
  return <th style={{ textAlign: "left", padding: "8px 12px", fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: "1px solid #1e2130" }}>{children}</th>;
}
function Td({ children, mono, muted }) {
  return <td style={{ padding: "10px 12px", fontSize: 13, color: muted ? "#64748b" : "#cbd5e1", fontFamily: mono ? "'DM Mono', monospace" : undefined }}>{children}</td>;
}
function Row({ label, children }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", fontSize: 12 }}>
      <span style={{ color: "#475569", textTransform: "uppercase", fontSize: 10, letterSpacing: "0.08em" }}>{label}</span>
      <span style={{ color: "#94a3b8" }}>{children}</span>
    </div>
  );
}

const inputStyle = {
  background: "#0f1117", border: "1px solid #1e2130", borderRadius: 6,
  color: "#e2e8f0", padding: "8px 12px", fontSize: 13,
  fontFamily: "'DM Mono', monospace", width: "100%", boxSizing: "border-box",
  outline: "none",
};
const tableStyle = { width: "100%", borderCollapse: "collapse", background: "#0f1117", border: "1px solid #1e2130", borderRadius: 8, overflow: "hidden" };

/* ─── App Root ─── */
export default function App() {
  const [page, setPage] = useState("dashboard");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: #080b10; color: #e2e8f0; font-family: 'DM Mono', monospace; }
        input:focus { border-color: #4ade8066 !important; }
        tr:hover td { background: #1e213022; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0f1117; } ::-webkit-scrollbar-thumb { background: #1e2130; border-radius: 3px; }
      `}</style>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar page={page} setPage={setPage} />
        <main style={{ flex: 1, padding: 32, overflowX: "auto" }}>
          {page === "dashboard" && <Dashboard />}
          {page === "workflows" && <Workflows />}
          {page === "runs" && <Runs />}
        </main>
      </div>
    </>
  );
}