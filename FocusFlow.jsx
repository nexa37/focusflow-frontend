import React, { useState, useMemo } from "react";
import {
  LayoutGrid, CheckSquare, Target, FolderKanban, Bell, Users, StickyNote,
  Plus, X, Check, Clock, ChevronRight, Flame, Circle, CheckCircle2,
  Phone, Mail, Calendar as CalendarIcon, Trash2, Edit3, BellRing, BellOff, WifiOff
} from "lucide-react";
import { api } from "./api.js";
import { enablePushNotifications, getPushStatus } from "./push.js";

// ---------- API field mapping ----------
// The backend uses snake_case (follow_up) and a separate time field for
// reminders; the UI uses camelCase (followUp) and folds date+time together
// for display. These converters keep that boundary in one place.
function mapContactFromApi(row) {
  return { ...row, followUp: row.follow_up };
}
function mapReminderFromApi(row) {
  return row; // date/time/priority/notes already match UI field names
}

// ---------- Design tokens ----------
// True-black theme with an indigo/violet accent, in the spirit of the
// reference brand palette (deep indigo family) tuned for contrast on black.
const COLORS = {
  bg: "#000000",
  bgElevated: "#0B0B10",
  bgCard: "#131318",
  border: "#232330",
  text: "#F2F1F7",
  textDim: "#9A99AC",
  textFaint: "#5F5E70",
  amber: "#6C5CE7",
  amberDim: "#443790",
  sage: "#5FD0A6",
  coral: "#2DD4C8",
};

const FONTS = {
  display: "'Fraunces', serif",
  body: "'Inter', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

// ---------- Sample data ----------
const todayStr = () => new Date().toISOString().slice(0, 10);
const addDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const initialTasks = [
  { id: "t1", name: "Send Q3 client proposal", due: todayStr(), priority: "High", status: "In Progress", notes: "Attach updated pricing sheet before sending." },
  { id: "t2", name: "Morning run — 5k", due: todayStr(), priority: "Medium", status: "Pending", notes: "" },
  { id: "t3", name: "Review design mockups", due: todayStr(), priority: "High", status: "Pending", notes: "Feedback due to Sam by EOD." },
  { id: "t4", name: "Grocery shopping", due: addDays(0), priority: "Low", status: "Pending", notes: "Milk, eggs, coffee, greens." },
  { id: "t5", name: "Book dentist appointment", due: addDays(2), priority: "Medium", status: "Pending", notes: "" },
  { id: "t6", name: "Finish tax documents", due: addDays(-1), priority: "High", status: "Completed", notes: "Filed and confirmed." },
  { id: "t7", name: "Team retro notes", due: addDays(1), priority: "Low", status: "Pending", notes: "Summarize sprint wins/blockers." },
];

const initialGoals = [
  { id: "g1", name: "Launch personal portfolio site", target: addDays(30), progress: 65, notes: "Design done, building the projects page next." },
  { id: "g2", name: "Read 12 books this year", target: "2026-12-31", progress: 42, notes: "5 of 12 finished. Currently reading Deep Work." },
  { id: "g3", name: "Run a half marathon", target: addDays(60), progress: 30, notes: "Following an 8-week base-building plan." },
  { id: "g4", name: "Save $5,000 emergency fund", target: addDays(90), progress: 78, notes: "Auto-transfer $200/week on track." },
];

const initialProjects = [
  { id: "p1", name: "Website Redesign", deadline: addDays(14), status: "In Progress", description: "Full visual refresh of company marketing site.", notes: "Waiting on final copy from marketing team." },
  { id: "p2", name: "Mobile App v2.0", deadline: addDays(45), status: "In Progress", description: "Add offline mode and dark theme.", notes: "Dev sprint 2 of 5 underway." },
  { id: "p3", name: "Client Onboarding Kit", deadline: addDays(-3), status: "Completed", description: "Templates and docs for new client kickoff.", notes: "Shipped and in use by sales team." },
  { id: "p4", name: "Q4 Content Calendar", deadline: addDays(7), status: "Pending", description: "Plan blog + social content for next quarter.", notes: "Kickoff meeting scheduled." },
];

const initialReminders = [
  { id: "r1", title: "Call mom", date: todayStr(), time: "18:00", priority: "Medium", notes: "" },
  { id: "r2", title: "Pay credit card bill", date: addDays(1), time: "09:00", priority: "High", notes: "Due before late fee kicks in." },
  { id: "r3", title: "Renew car insurance", date: addDays(5), time: "09:00", priority: "High", notes: "" },
  { id: "r4", title: "Water the plants", date: todayStr(), time: "08:00", priority: "Low", notes: "" },
];

const initialContacts = [
  { id: "c1", name: "Jordan Lee", phone: "(555) 213-4489", email: "jordan.lee@brightpath.co", followUp: addDays(3), notes: "Discuss renewal terms." },
  { id: "c2", name: "Priya Nair", phone: "(555) 887-2201", email: "priya.n@studio-forge.com", followUp: addDays(7), notes: "Send updated portfolio." },
  { id: "c3", name: "Marcus Webb", phone: "(555) 664-9021", email: "marcus@webbconsulting.io", followUp: addDays(-2), notes: "Overdue — follow up on contract." },
];

const initialNotes = [
  { id: "n1", title: "Meeting takeaways", content: "Team agreed to move launch date by one week. Need sign-off from design lead before Friday.", date: addDays(-1) },
  { id: "n2", title: "App idea", content: "A habit tracker that pairs streaks with a small savings jar — miss a day, skip a coffee.", date: addDays(-4) },
  { id: "n3", title: "Books to read next", content: "Atomic Habits, The Pragmatic Programmer, Four Thousand Weeks.", date: addDays(-8) },
];

// ---------- Small helpers ----------
const priorityColor = (p) => (p === "High" ? COLORS.coral : p === "Medium" ? COLORS.amber : COLORS.sage);
const statusColor = (s) => (s === "Completed" ? COLORS.sage : s === "In Progress" ? COLORS.amber : COLORS.textDim);

function fmtDate(dstr) {
  const d = new Date(dstr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function daysUntil(dstr) {
  const d = new Date(dstr + "T00:00:00");
  const today = new Date(todayStr() + "T00:00:00");
  return Math.round((d - today) / 86400000);
}
function dueLabel(dstr) {
  const n = daysUntil(dstr);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  if (n < 0) return `${Math.abs(n)}d overdue`;
  return fmtDate(dstr);
}

// ---------- Reusable UI ----------
function Pill({ children, color, filled }) {
  return (
    <span
      style={{
        fontFamily: FONTS.mono,
        fontSize: 11,
        letterSpacing: 0.3,
        padding: "3px 8px",
        borderRadius: 999,
        border: `1px solid ${color}`,
        color: filled ? COLORS.bg : color,
        background: filled ? color : "transparent",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Card({ children, style, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 14,
        padding: 16,
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.15s ease",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionHeader({ eyebrow, title, action }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16 }}>
      <div>
        {eyebrow && (
          <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.amber, letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" }}>
            {eyebrow}
          </div>
        )}
        <h1 style={{ fontFamily: FONTS.display, fontSize: 26, fontWeight: 600, color: COLORS.text, margin: 0 }}>{title}</h1>
      </div>
      {action}
    </div>
  );
}

function IconButton({ icon: Icon, onClick, label }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        background: COLORS.amber, color: "#FFFFFF",
        border: "none", borderRadius: 10, padding: "9px 14px",
        fontFamily: FONTS.body, fontSize: 13, fontWeight: 600,
        cursor: "pointer",
      }}
    >
      <Icon size={15} /> {label}
    </button>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{ padding: "32px 16px", textAlign: "center", color: COLORS.textFaint, fontFamily: FONTS.body, fontSize: 13.5 }}>
      {text}
    </div>
  );
}

// Modal for add/edit forms
function Modal({ title, onClose, children }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(8,10,14,0.7)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        zIndex: 100, backdropFilter: "blur(2px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: COLORS.bgElevated, borderTop: `1px solid ${COLORS.border}`,
          borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480,
          maxHeight: "85vh", overflowY: "auto", padding: 20,
          animation: "slideUp 0.2s ease",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontFamily: FONTS.display, fontSize: 20, color: COLORS.text, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.textDim, cursor: "pointer", padding: 4 }}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontFamily: FONTS.mono, fontSize: 11, color: COLORS.textDim, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", boxSizing: "border-box", background: COLORS.bgCard,
  border: `1px solid ${COLORS.border}`, borderRadius: 9, padding: "10px 12px",
  color: COLORS.text, fontFamily: FONTS.body, fontSize: 14, outline: "none",
};

function TextInput(props) { return <input {...props} style={inputStyle} />; }
function TextArea(props) { return <textarea {...props} rows={3} style={{ ...inputStyle, resize: "vertical", fontFamily: FONTS.body }} />; }
function Select({ options, ...props }) {
  return (
    <select {...props} style={inputStyle}>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function SubmitButton({ children }) {
  return (
    <button
      type="submit"
      style={{
        width: "100%", background: COLORS.amber, color: "#FFFFFF", border: "none",
        borderRadius: 10, padding: "12px", fontFamily: FONTS.body, fontWeight: 700,
        fontSize: 14, cursor: "pointer", marginTop: 6,
      }}
    >
      {children}
    </button>
  );
}

// ---------- Focus Ring (signature element) ----------
function FocusRing({ pct, size = 96 }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke={COLORS.border} strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        stroke={COLORS.amber} strokeWidth={stroke} fill="none"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

// ---------- Main App ----------
export default function FocusFlow() {
  const [tab, setTab] = useState("dashboard");
  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [projects, setProjects] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [notes, setNotes] = useState([]);
  const [modal, setModal] = useState(null); // { type, item? }
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [pushStatus, setPushStatus] = useState("unknown");

  // Load everything from the backend on mount. Falls back to sample data
  // if the API isn't reachable, so the UI is still demoable offline.
  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [t, g, p, r, c, n] = await Promise.all([
          api.list("tasks"), api.list("goals"), api.list("projects"),
          api.list("reminders"), api.list("contacts"), api.list("notes"),
        ]);
        if (cancelled) return;
        setTasks(t.length ? t : initialTasks);
        setGoals(g.length ? g : initialGoals);
        setProjects(p.length ? p : initialProjects);
        setReminders(r.length ? r.map(mapReminderFromApi) : initialReminders);
        setContacts(c.length ? c.map(mapContactFromApi) : initialContacts);
        setNotes(n.length ? n : initialNotes);
      } catch (err) {
        console.warn("Backend unreachable, using local sample data:", err.message);
        if (cancelled) return;
        setLoadError(err.message);
        setTasks(initialTasks); setGoals(initialGoals); setProjects(initialProjects);
        setReminders(initialReminders); setContacts(initialContacts); setNotes(initialNotes);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    getPushStatus().then(setPushStatus).catch(() => setPushStatus("unsupported"));
    return () => { cancelled = true; };
  }, []);

  const todayTasks = useMemo(() => tasks.filter((t) => t.due === todayStr()), [tasks]);
  const completedToday = todayTasks.filter((t) => t.status === "Completed").length;
  const upcomingReminders = useMemo(
    () => [...reminders].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4),
    [reminders]
  );
  const activeProjects = projects.filter((p) => p.status !== "Completed");
  const avgGoalProgress = goals.length ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length) : 0;

  const overallFocus = useMemo(() => {
    const taskPct = todayTasks.length ? (completedToday / todayTasks.length) * 100 : 0;
    return Math.round(taskPct * 0.5 + avgGoalProgress * 0.5);
  }, [todayTasks, completedToday, avgGoalProgress]);

  const toggleTaskStatus = (id) => {
    setTasks((ts) => ts.map((t) => {
      if (t.id !== id) return t;
      const next = t.status === "Completed" ? "Pending" : t.status === "Pending" ? "In Progress" : "Completed";
      api.update("tasks", id, { status: next }).catch((err) => console.error("Failed to save task:", err));
      return { ...t, status: next };
    }));
  };

  async function handleEnablePush() {
    const result = await enablePushNotifications();
    setPushStatus(result.status === "subscribed" ? "subscribed" : result.status);
  }

  // ---------- Form submit handlers ----------
  // Each handler updates local state immediately (optimistic) and syncs to
  // the backend in the background; if the request fails the item stays
  // local-only until the connection is available again.
  function handleAddTask(e) {
    e.preventDefault();
    const f = e.target;
    const payload = { name: f.name.value, due: f.due.value || todayStr(), priority: f.priority.value, status: f.status.value, notes: f.notes.value };
    const tempId = `t_local_${Date.now()}`;
    setTasks((ts) => [{ id: tempId, ...payload }, ...ts]);
    api.create("tasks", payload)
      .then((row) => setTasks((ts) => ts.map((t) => (t.id === tempId ? row : t))))
      .catch((err) => console.error("Failed to save task:", err));
    setModal(null);
  }
  function handleAddGoal(e) {
    e.preventDefault();
    const f = e.target;
    const payload = { name: f.name.value, target: f.target.value || addDays(30), progress: Number(f.progress.value) || 0, notes: f.notes.value };
    const tempId = `g_local_${Date.now()}`;
    setGoals((gs) => [{ id: tempId, ...payload }, ...gs]);
    api.create("goals", payload)
      .then((row) => setGoals((gs) => gs.map((g) => (g.id === tempId ? row : g))))
      .catch((err) => console.error("Failed to save goal:", err));
    setModal(null);
  }
  function handleAddProject(e) {
    e.preventDefault();
    const f = e.target;
    const payload = { name: f.name.value, deadline: f.deadline.value || addDays(14), status: f.status.value, description: f.description.value, notes: f.notes.value };
    const tempId = `p_local_${Date.now()}`;
    setProjects((ps) => [{ id: tempId, ...payload }, ...ps]);
    api.create("projects", payload)
      .then((row) => setProjects((ps) => ps.map((p) => (p.id === tempId ? row : p))))
      .catch((err) => console.error("Failed to save project:", err));
    setModal(null);
  }
  function handleAddReminder(e) {
    e.preventDefault();
    const f = e.target;
    const payload = { title: f.title.value, date: f.date.value || todayStr(), time: f.time.value || "09:00", priority: f.priority.value, notes: f.notes.value };
    const tempId = `r_local_${Date.now()}`;
    setReminders((rs) => [{ id: tempId, ...payload }, ...rs]);
    api.create("reminders", payload)
      .then((row) => setReminders((rs) => rs.map((r) => (r.id === tempId ? mapReminderFromApi(row) : r))))
      .catch((err) => console.error("Failed to save reminder:", err));
    setModal(null);
  }
  function handleAddContact(e) {
    e.preventDefault();
    const f = e.target;
    const payload = { name: f.name.value, phone: f.phone.value, email: f.email.value, follow_up: f.followUp.value || addDays(7), notes: f.notes.value };
    const tempId = `c_local_${Date.now()}`;
    setContacts((cs) => [{ id: tempId, ...payload, followUp: payload.follow_up }, ...cs]);
    api.create("contacts", payload)
      .then((row) => setContacts((cs) => cs.map((c) => (c.id === tempId ? mapContactFromApi(row) : c))))
      .catch((err) => console.error("Failed to save contact:", err));
    setModal(null);
  }
  function handleAddNote(e) {
    e.preventDefault();
    const f = e.target;
    const payload = { title: f.title.value, content: f.content.value, date: todayStr() };
    const tempId = `n_local_${Date.now()}`;
    setNotes((ns) => [{ id: tempId, ...payload }, ...ns]);
    api.create("notes", payload)
      .then((row) => setNotes((ns) => ns.map((n) => (n.id === tempId ? row : n))))
      .catch((err) => console.error("Failed to save note:", err));
    setModal(null);
  }

  const del = (setter, resource) => (id) => {
    setter((arr) => arr.filter((x) => x.id !== id));
    if (!id.includes("_local_")) {
      api.remove(resource, id).catch((err) => console.error(`Failed to delete ${resource}:`, err));
    }
  };

  // ---------- Nav ----------
  const NAV = [
    { id: "dashboard", label: "Home", icon: LayoutGrid },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "goals", label: "Goals", icon: Target },
    { id: "projects", label: "Projects", icon: FolderKanban },
    { id: "reminders", label: "Alerts", icon: Bell },
    { id: "contacts", label: "Contacts", icon: Users },
    { id: "notes", label: "Notes", icon: StickyNote },
  ];

  return (
    <div style={{
      fontFamily: FONTS.body, background: COLORS.bg, color: COLORS.text,
      minHeight: "100vh", width: "100%",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        html, body, #root { background: ${COLORS.bg}; margin: 0; }
        ::placeholder { color: ${COLORS.textFaint}; }
        @keyframes slideUp { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        select option { background: ${COLORS.bgCard}; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.7); }

        .ff-shell {
          max-width: 480px;
          margin: 0 auto;
          position: relative;
          padding-bottom: 84px;
          min-height: 100vh;
        }
        @media (min-width: 720px) {
          .ff-shell {
            max-width: 460px;
            margin: 24px auto;
            min-height: calc(100vh - 48px);
            border: 1px solid ${COLORS.border};
            border-radius: 28px;
            overflow: hidden;
            box-shadow: 0 40px 100px -30px rgba(0,0,0,0.9);
          }
        }
        @media (min-width: 1100px) {
          .ff-shell { max-width: 500px; }
        }
        @media (min-width: 720px) {
          .ff-bottomnav { position: absolute !important; max-width: 100% !important; left: 0 !important; transform: none !important; }
        }
      `}</style>

      <div className="ff-shell">
      {/* Top bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10, background: COLORS.bg,
        borderBottom: `1px solid ${COLORS.border}`, padding: "18px 20px 14px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, background: COLORS.amber,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Flame size={16} color="#FFFFFF" />
          </div>
          <span style={{ fontFamily: FONTS.display, fontSize: 19, fontWeight: 700 }}>FocusFlow</span>
        </div>
        <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.textDim }}>
          {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
        </div>
      </div>

      <div style={{ padding: "20px 20px 0" }}>
        {loadError && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
            padding: "10px 12px", borderRadius: 10, background: "rgba(45,212,200,0.08)",
            border: `1px solid ${COLORS.coral}`, fontSize: 12.5, color: COLORS.coral,
          }}>
            <WifiOff size={15} />
            Can't reach the server — showing local sample data. Changes won't be saved.
          </div>
        )}
        {tab === "dashboard" && (
          <Dashboard
            todayTasks={todayTasks} completedToday={completedToday}
            upcomingReminders={upcomingReminders} activeProjects={activeProjects}
            goals={goals} avgGoalProgress={avgGoalProgress} overallFocus={overallFocus}
            toggleTaskStatus={toggleTaskStatus} setTab={setTab}
            pushStatus={pushStatus} onEnablePush={handleEnablePush}
          />
        )}
        {tab === "tasks" && (
          <TasksView tasks={tasks} toggleTaskStatus={toggleTaskStatus}
            onAdd={() => setModal({ type: "task" })} onDelete={del(setTasks, "tasks")} />
        )}
        {tab === "goals" && (
          <GoalsView goals={goals} onAdd={() => setModal({ type: "goal" })} onDelete={del(setGoals, "goals")} />
        )}
        {tab === "projects" && (
          <ProjectsView projects={projects} onAdd={() => setModal({ type: "project" })} onDelete={del(setProjects, "projects")} />
        )}
        {tab === "reminders" && (
          <RemindersView reminders={reminders} onAdd={() => setModal({ type: "reminder" })} onDelete={del(setReminders, "reminders")} />
        )}
        {tab === "contacts" && (
          <ContactsView contacts={contacts} onAdd={() => setModal({ type: "contact" })} onDelete={del(setContacts, "contacts")} />
        )}
        {tab === "notes" && (
          <NotesView notes={notes} onAdd={() => setModal({ type: "note" })} onDelete={del(setNotes, "notes")} />
        )}
      </div>

      {/* Bottom nav */}
      <div className="ff-bottomnav" style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, background: COLORS.bgElevated,
        borderTop: `1px solid ${COLORS.border}`, display: "flex", padding: "8px 4px",
        zIndex: 20,
      }}>
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = tab === n.id;
          return (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                gap: 3, background: "none", border: "none", cursor: "pointer",
                color: active ? COLORS.amber : COLORS.textFaint, padding: "6px 2px",
              }}
            >
              <Icon size={19} strokeWidth={active ? 2.4 : 2} />
              <span style={{ fontSize: 10, fontFamily: FONTS.body, fontWeight: active ? 700 : 500 }}>{n.label}</span>
            </button>
          );
        })}
      </div>

      {/* Modals */}
      {modal?.type === "task" && (
        <Modal title="New task" onClose={() => setModal(null)}>
          <form onSubmit={handleAddTask}>
            <Field label="Task name"><TextInput name="name" required placeholder="e.g. Write weekly report" /></Field>
            <Field label="Due date"><TextInput type="date" name="due" defaultValue={todayStr()} /></Field>
            <Field label="Priority"><Select name="priority" options={["High", "Medium", "Low"]} defaultValue="Medium" /></Field>
            <Field label="Status"><Select name="status" options={["Pending", "In Progress", "Completed"]} defaultValue="Pending" /></Field>
            <Field label="Notes"><TextArea name="notes" placeholder="Optional details..." /></Field>
            <SubmitButton>Add task</SubmitButton>
          </form>
        </Modal>
      )}
      {modal?.type === "goal" && (
        <Modal title="New goal" onClose={() => setModal(null)}>
          <form onSubmit={handleAddGoal}>
            <Field label="Goal name"><TextInput name="name" required placeholder="e.g. Learn Spanish" /></Field>
            <Field label="Target date"><TextInput type="date" name="target" defaultValue={addDays(30)} /></Field>
            <Field label="Progress (%)"><TextInput type="number" name="progress" min="0" max="100" defaultValue="0" /></Field>
            <Field label="Notes"><TextArea name="notes" placeholder="What does success look like?" /></Field>
            <SubmitButton>Add goal</SubmitButton>
          </form>
        </Modal>
      )}
      {modal?.type === "project" && (
        <Modal title="New project" onClose={() => setModal(null)}>
          <form onSubmit={handleAddProject}>
            <Field label="Project name"><TextInput name="name" required placeholder="e.g. Brand refresh" /></Field>
            <Field label="Deadline"><TextInput type="date" name="deadline" defaultValue={addDays(14)} /></Field>
            <Field label="Status"><Select name="status" options={["Pending", "In Progress", "Completed"]} defaultValue="Pending" /></Field>
            <Field label="Description"><TextArea name="description" placeholder="What is this project about?" /></Field>
            <Field label="Notes"><TextArea name="notes" placeholder="Optional details..." /></Field>
            <SubmitButton>Add project</SubmitButton>
          </form>
        </Modal>
      )}
      {modal?.type === "reminder" && (
        <Modal title="New reminder" onClose={() => setModal(null)}>
          <form onSubmit={handleAddReminder}>
            <Field label="Reminder title"><TextInput name="title" required placeholder="e.g. Pay rent" /></Field>
            <Field label="Date"><TextInput type="date" name="date" defaultValue={todayStr()} /></Field>
            <Field label="Time"><TextInput type="time" name="time" defaultValue="09:00" /></Field>
            <Field label="Priority"><Select name="priority" options={["High", "Medium", "Low"]} defaultValue="Medium" /></Field>
            <Field label="Notes"><TextArea name="notes" placeholder="Optional details..." /></Field>
            <SubmitButton>Add reminder</SubmitButton>
          </form>
        </Modal>
      )}
      {modal?.type === "contact" && (
        <Modal title="New contact" onClose={() => setModal(null)}>
          <form onSubmit={handleAddContact}>
            <Field label="Name"><TextInput name="name" required placeholder="e.g. Alex Rivera" /></Field>
            <Field label="Phone"><TextInput name="phone" placeholder="(555) 123-4567" /></Field>
            <Field label="Email"><TextInput type="email" name="email" placeholder="name@email.com" /></Field>
            <Field label="Follow-up date"><TextInput type="date" name="followUp" defaultValue={addDays(7)} /></Field>
            <Field label="Notes"><TextArea name="notes" placeholder="Context on this contact..." /></Field>
            <SubmitButton>Add contact</SubmitButton>
          </form>
        </Modal>
      )}
      {modal?.type === "note" && (
        <Modal title="New note" onClose={() => setModal(null)}>
          <form onSubmit={handleAddNote}>
            <Field label="Title"><TextInput name="title" required placeholder="e.g. Meeting takeaways" /></Field>
            <Field label="Content"><TextArea name="content" rows={5} placeholder="Write your note..." /></Field>
            <SubmitButton>Add note</SubmitButton>
          </form>
        </Modal>
      )}
      </div>
    </div>
  );
}

// ---------- Dashboard ----------
function Dashboard({ todayTasks, completedToday, upcomingReminders, activeProjects, goals, avgGoalProgress, overallFocus, toggleTaskStatus, setTab, pushStatus, onEnablePush }) {
  return (
    <div>
      {/* Notification enable prompt */}
      {(pushStatus === "not-subscribed" || pushStatus === "unknown") && (
        <Card style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, borderColor: COLORS.amberDim }}>
          <BellRing size={18} color={COLORS.amber} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>Turn on reminders</div>
            <div style={{ fontSize: 12, color: COLORS.textDim, marginTop: 2 }}>Get notified when reminders are due, even if the app is closed.</div>
          </div>
          <button onClick={onEnablePush} style={{
            background: COLORS.amber, color: "#FFFFFF", border: "none", borderRadius: 8,
            padding: "8px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", flexShrink: 0,
          }}>Enable</button>
        </Card>
      )}
      {pushStatus === "denied" && (
        <Card style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, borderColor: COLORS.border }}>
          <BellOff size={18} color={COLORS.textFaint} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 12.5, color: COLORS.textDim }}>
            Notifications are blocked in your browser settings. Enable them in your browser/OS settings for this site to get reminder alerts.
          </div>
        </Card>
      )}
      {pushStatus === "not-configured" && (
        <Card style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, borderColor: COLORS.border }}>
          <BellOff size={18} color={COLORS.textFaint} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 12.5, color: COLORS.textDim }}>
            Push notifications aren't set up on the server yet. See the server README for VAPID key setup.
          </div>
        </Card>
      )}

      {/* Focus summary hero */}
      <Card style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 20, background: COLORS.bgElevated }}>
        <div style={{ position: "relative", width: 96, height: 96, flexShrink: 0 }}>
          <FocusRing pct={overallFocus} />
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontFamily: FONTS.display, fontSize: 22, fontWeight: 700 }}>{overallFocus}%</span>
          </div>
        </div>
        <div>
          <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.amber, letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" }}>
            Today's focus
          </div>
          <div style={{ fontFamily: FONTS.body, fontSize: 13.5, color: COLORS.textDim, lineHeight: 1.5 }}>
            {completedToday} of {todayTasks.length} tasks done · avg goal progress {avgGoalProgress}%
          </div>
        </div>
      </Card>

      {/* Today's tasks */}
      <SectionBlock title="Today's tasks" onSeeAll={() => setTab("tasks")}>
        {todayTasks.length === 0 ? <EmptyState text="Nothing due today — enjoy the clear runway." /> :
          todayTasks.map((t) => (
            <TaskRow key={t.id} task={t} onToggle={() => toggleTaskStatus(t.id)} />
          ))}
      </SectionBlock>

      {/* Upcoming reminders */}
      <SectionBlock title="Upcoming reminders" onSeeAll={() => setTab("reminders")}>
        {upcomingReminders.length === 0 ? <EmptyState text="No reminders on the horizon." /> :
          upcomingReminders.map((r) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${COLORS.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Bell size={14} color={priorityColor(r.priority)} />
                <span style={{ fontSize: 14 }}>{r.title}</span>
              </div>
              <span style={{ fontFamily: FONTS.mono, fontSize: 11.5, color: COLORS.textDim }}>{dueLabel(r.date)}</span>
            </div>
          ))}
      </SectionBlock>

      {/* Active projects */}
      <SectionBlock title="Active projects" onSeeAll={() => setTab("projects")}>
        {activeProjects.length === 0 ? <EmptyState text="No active projects right now." /> :
          activeProjects.map((p) => (
            <div key={p.id} style={{ padding: "10px 0", borderBottom: `1px solid ${COLORS.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</span>
                <Pill color={statusColor(p.status)}>{p.status}</Pill>
              </div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 11.5, color: COLORS.textDim }}>Due {dueLabel(p.deadline)}</div>
            </div>
          ))}
      </SectionBlock>

      {/* Goals progress */}
      <SectionBlock title="Goals progress" onSeeAll={() => setTab("goals")}>
        {goals.map((g) => (
          <div key={g.id} style={{ padding: "10px 0", borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 14 }}>{g.name}</span>
              <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.amber }}>{g.progress}%</span>
            </div>
            <ProgressBar pct={g.progress} />
          </div>
        ))}
      </SectionBlock>
    </div>
  );
}

function SectionBlock({ title, onSeeAll, children }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ fontFamily: FONTS.body, fontSize: 13, fontWeight: 700, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: 0.6, margin: 0 }}>
          {title}
        </h3>
        {onSeeAll && (
          <button onClick={onSeeAll} style={{ background: "none", border: "none", color: COLORS.amber, fontSize: 12, fontFamily: FONTS.body, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 2 }}>
            See all <ChevronRight size={13} />
          </button>
        )}
      </div>
      <Card>{children}</Card>
    </div>
  );
}

function ProgressBar({ pct, color = COLORS.amber }) {
  return (
    <div style={{ height: 6, background: COLORS.border, borderRadius: 999, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 999, transition: "width 0.4s ease" }} />
    </div>
  );
}

function TaskRow({ task, onToggle }) {
  const done = task.status === "Completed";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${COLORS.border}` }}>
      <button onClick={onToggle} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
        {done ? <CheckCircle2 size={19} color={COLORS.sage} /> : <Circle size={19} color={COLORS.textFaint} />}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: done ? COLORS.textFaint : COLORS.text, textDecoration: done ? "line-through" : "none" }}>
          {task.name}
        </div>
      </div>
      <Pill color={priorityColor(task.priority)}>{task.priority}</Pill>
    </div>
  );
}

// ---------- Tasks ----------
function TasksView({ tasks, toggleTaskStatus, onAdd, onDelete }) {
  const [filter, setFilter] = useState("All");
  const filtered = filter === "All" ? tasks : tasks.filter((t) => t.status === filter);
  const sorted = [...filtered].sort((a, b) => a.due.localeCompare(b.due));

  return (
    <div>
      <SectionHeader eyebrow={`${tasks.length} total`} title="Tasks" action={<IconButton icon={Plus} label="Add" onClick={onAdd} />} />
      <FilterRow options={["All", "Pending", "In Progress", "Completed"]} value={filter} onChange={setFilter} />
      {sorted.length === 0 ? <EmptyState text="No tasks here yet." /> : sorted.map((t) => (
        <Card key={t.id} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <button onClick={() => toggleTaskStatus(t.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 1 }}>
              {t.status === "Completed" ? <CheckCircle2 size={20} color={COLORS.sage} /> : <Circle size={20} color={COLORS.textFaint} />}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 600, textDecoration: t.status === "Completed" ? "line-through" : "none", color: t.status === "Completed" ? COLORS.textFaint : COLORS.text }}>
                  {t.name}
                </span>
                <button onClick={() => onDelete(t.id)} style={{ background: "none", border: "none", color: COLORS.textFaint, cursor: "pointer", flexShrink: 0 }}>
                  <Trash2 size={15} />
                </button>
              </div>
              {t.notes && <div style={{ fontSize: 13, color: COLORS.textDim, marginTop: 4 }}>{t.notes}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <Pill color={priorityColor(t.priority)}>{t.priority}</Pill>
                <Pill color={statusColor(t.status)}>{t.status}</Pill>
                <span style={{ fontFamily: FONTS.mono, fontSize: 11.5, color: COLORS.textDim, alignSelf: "center" }}>
                  <Clock size={11} style={{ verticalAlign: -1, marginRight: 3 }} />{dueLabel(t.due)}
                </span>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function FilterRow({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 2 }}>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          style={{
            fontFamily: FONTS.body, fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap",
            padding: "7px 13px", borderRadius: 999, cursor: "pointer",
            border: `1px solid ${value === o ? COLORS.amber : COLORS.border}`,
            background: value === o ? COLORS.amber : "transparent",
            color: value === o ? "#FFFFFF" : COLORS.textDim,
          }}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

// ---------- Goals ----------
function GoalsView({ goals, onAdd, onDelete }) {
  return (
    <div>
      <SectionHeader eyebrow={`${goals.length} goals`} title="Goals" action={<IconButton icon={Plus} label="Add" onClick={onAdd} />} />
      {goals.length === 0 ? <EmptyState text="No goals yet — set your first one." /> : goals.map((g) => (
        <Card key={g.id} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{g.name}</span>
            <button onClick={() => onDelete(g.id)} style={{ background: "none", border: "none", color: COLORS.textFaint, cursor: "pointer" }}>
              <Trash2 size={15} />
            </button>
          </div>
          <div style={{ fontFamily: FONTS.mono, fontSize: 11.5, color: COLORS.textDim, margin: "4px 0 10px" }}>
            <CalendarIcon size={11} style={{ verticalAlign: -1, marginRight: 3 }} />Target {fmtDate(g.target)}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.amber }}>{g.progress}% complete</span>
          </div>
          <ProgressBar pct={g.progress} color={g.progress >= 100 ? COLORS.sage : COLORS.amber} />
          {g.notes && <div style={{ fontSize: 13, color: COLORS.textDim, marginTop: 10 }}>{g.notes}</div>}
        </Card>
      ))}
    </div>
  );
}

// ---------- Projects ----------
function ProjectsView({ projects, onAdd, onDelete }) {
  return (
    <div>
      <SectionHeader eyebrow={`${projects.length} projects`} title="Projects" action={<IconButton icon={Plus} label="Add" onClick={onAdd} />} />
      {projects.length === 0 ? <EmptyState text="No projects yet." /> : projects.map((p) => (
        <Card key={p.id} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</span>
            <button onClick={() => onDelete(p.id)} style={{ background: "none", border: "none", color: COLORS.textFaint, cursor: "pointer" }}>
              <Trash2 size={15} />
            </button>
          </div>
          {p.description && <div style={{ fontSize: 13.5, color: COLORS.textDim, margin: "6px 0" }}>{p.description}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Pill color={statusColor(p.status)}>{p.status}</Pill>
            <span style={{ fontFamily: FONTS.mono, fontSize: 11.5, color: COLORS.textDim }}>
              <Clock size={11} style={{ verticalAlign: -1, marginRight: 3 }} />{dueLabel(p.deadline)}
            </span>
          </div>
          {p.notes && <div style={{ fontSize: 13, color: COLORS.textFaint, marginTop: 10, fontStyle: "italic" }}>{p.notes}</div>}
        </Card>
      ))}
    </div>
  );
}

// ---------- Reminders ----------
function RemindersView({ reminders, onAdd, onDelete }) {
  const sorted = [...reminders].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <div>
      <SectionHeader eyebrow={`${reminders.length} reminders`} title="Reminders" action={<IconButton icon={Plus} label="Add" onClick={onAdd} />} />
      {sorted.length === 0 ? <EmptyState text="No reminders set." /> : sorted.map((r) => (
        <Card key={r.id} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Bell size={15} color={priorityColor(r.priority)} />
              <span style={{ fontSize: 15, fontWeight: 600 }}>{r.title}</span>
            </div>
            <button onClick={() => onDelete(r.id)} style={{ background: "none", border: "none", color: COLORS.textFaint, cursor: "pointer" }}>
              <Trash2 size={15} />
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
            <Pill color={priorityColor(r.priority)}>{r.priority}</Pill>
            <span style={{ fontFamily: FONTS.mono, fontSize: 11.5, color: COLORS.textDim }}>
              {dueLabel(r.date)}{r.time ? ` · ${r.time}` : ""}
            </span>
            {r.notified === 1 && <Pill color={COLORS.sage}>Sent</Pill>}
          </div>
          {r.notes && <div style={{ fontSize: 13, color: COLORS.textDim, marginTop: 10 }}>{r.notes}</div>}
        </Card>
      ))}
    </div>
  );
}

// ---------- Contacts ----------
function ContactsView({ contacts, onAdd, onDelete }) {
  return (
    <div>
      <SectionHeader eyebrow={`${contacts.length} contacts`} title="Contacts" action={<IconButton icon={Plus} label="Add" onClick={onAdd} />} />
      {contacts.length === 0 ? <EmptyState text="No contacts saved yet." /> : contacts.map((c) => (
        <Card key={c.id} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{c.name}</span>
            <button onClick={() => onDelete(c.id)} style={{ background: "none", border: "none", color: COLORS.textFaint, cursor: "pointer" }}>
              <Trash2 size={15} />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
            {c.phone && <div style={{ fontSize: 13, color: COLORS.textDim, display: "flex", alignItems: "center", gap: 6 }}><Phone size={12} />{c.phone}</div>}
            {c.email && <div style={{ fontSize: 13, color: COLORS.textDim, display: "flex", alignItems: "center", gap: 6 }}><Mail size={12} />{c.email}</div>}
          </div>
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: FONTS.mono, fontSize: 11.5, color: daysUntil(c.followUp) < 0 ? COLORS.coral : COLORS.textDim }}>
              Follow up {dueLabel(c.followUp)}
            </span>
          </div>
          {c.notes && <div style={{ fontSize: 13, color: COLORS.textFaint, marginTop: 8, fontStyle: "italic" }}>{c.notes}</div>}
        </Card>
      ))}
    </div>
  );
}

// ---------- Notes ----------
function NotesView({ notes, onAdd, onDelete }) {
  const sorted = [...notes].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div>
      <SectionHeader eyebrow={`${notes.length} notes`} title="Notes" action={<IconButton icon={Plus} label="Add" onClick={onAdd} />} />
      {sorted.length === 0 ? <EmptyState text="No notes yet." /> : sorted.map((n) => (
        <Card key={n.id} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{n.title}</span>
            <button onClick={() => onDelete(n.id)} style={{ background: "none", border: "none", color: COLORS.textFaint, cursor: "pointer" }}>
              <Trash2 size={15} />
            </button>
          </div>
          <div style={{ fontSize: 13.5, color: COLORS.textDim, marginTop: 8, lineHeight: 1.5 }}>{n.content}</div>
          <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.textFaint, marginTop: 10 }}>{fmtDate(n.date)}</div>
        </Card>
      ))}
    </div>
  );
}
