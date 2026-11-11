
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, ClipboardList, MapPin, Settings, Search, Plus,Activity,
  X, Building2, Clock3, CheckCircle2, AlertTriangle, RefreshCw, LogOut,
  GraduationCap, ShieldCheck, ArrowRight, Eye, EyeOff, Filter,
  UserRound, LockKeyhole, Mail, Sparkles, Shield, MapPinned
} from "lucide-react";
import "./App.css";

const API = "http://localhost:5000/api";
const UNIVERSITY = "Chandigarh University";
const LOCATIONS = ["NC4", "NC5", "Zakir A", "Zakir B", "Zakir C", "Zakir D"];
const CATEGORIES = ["Wi-Fi / Internet", "Water Supply", "Electricity", "Washroom", "Cleanliness", "Maintenance", "Equipment", "Other"];
const STATUSES = ["Reported", "In Progress", "Resolved"];
const PRIORITIES = ["Low", "Medium", "High"];
const TOKEN_KEY = "fixora_token";

async function request(path, options = {}, token = "") {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data;
}

function normalize(report) {
  return {
    ...report,
    id: String(report.id ?? ""),
    code: report.code || "",
    title: report.title || "Untitled report",
    category: report.category || "Other",
    location: report.location || "",
    floor: report.floor || "",
room_number: report.room_number || "",
issue_location: report.issue_location || "",
    description: report.description || "",
    status: report.status || "Reported",
    priority: report.priority || "Medium",
    createdAt: report.createdAt || new Date().toISOString()
  };
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authRole, setAuthRole] = useState("student");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState("Overview");
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("All Locations");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("success");
  const [busy, setBusy] = useState(false);
 const [form, setForm] = useState({
  title: "",
  location: "NC4",
  floor: "",
  room_number: "",
  issue_location: "Inside room",
  category: "Wi-Fi / Internet",
  priority: "Medium",
  description: ""
});

  const isAdmin = user?.role === "admin";

  const notify = useCallback((message, type = "success") => {
    setNotice(message);
    setNoticeType(type);
  }, []);

  const logout = useCallback((message = "") => {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setUser(null);
    setReports([]);
    setSelected(null);
    setPage("Overview");
    setAuthForm({ name: "", email: "", password: "" });
    setShowPassword(false);
    setAuthMode("login");
    setAuthRole("student");
    if (message) notify(message);
  }, [notify]);

  const loadReports = useCallback(async (activeToken = token) => {
    setLoading(true);
    try {
      const data = await request("/reports", {}, activeToken);
      if (!Array.isArray(data)) throw new Error("Unexpected reports response.");
      setReports(data.map(normalize));
    } catch (error) {
      if (/token|authentication|expired/i.test(error.message)) {
        logout("Your session expired. Please log in again.");
      } else {
        notify(error.message || "Could not load reports.", "error");
      }
    } finally {
      setLoading(false);
    }
  }, [token, logout, notify]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await request("/auth/me", {}, token);
        if (cancelled) return;
        setUser(data.user);
        await loadReports(token);
      } catch {
        if (!cancelled) logout("Please log in to continue.");
      }
    })();

    return () => { cancelled = true; };
  }, [token]);

  async function handleAuth(event) {
    event.preventDefault();
    if (authBusy) return;
    setAuthBusy(true);

    try {
      if (authMode === "register" && authRole !== "student") {
        throw new Error("Admin accounts are created securely by the system administrator.");
      }

      const endpoint = authMode === "register" ? "/auth/register" : "/auth/login";
      const payload = authMode === "register"
        ? { name: authForm.name.trim(), email: authForm.email.trim(), password: authForm.password }
        : { email: authForm.email.trim(), password: authForm.password };

      if (authMode === "register") {
        await request(endpoint, {
          method: "POST",
          body: JSON.stringify(payload)
        });
        setAuthMode("login");
        setAuthForm({ name: "", email: payload.email, password: "" });
        notify("Account created. Please log in.");
        return;
      }

      const data = await request(endpoint, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (authRole === "admin" && data.user.role !== "admin") {
        throw new Error("This account does not have administrator access.");
      }

      if (authRole === "student" && data.user.role !== "student") {
        throw new Error("Please choose Admin login for this account.");
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      setAuthForm({ name: "", email: payload.email, password: "" });
      notify(`Welcome, ${data.user.name}!`);
    } catch (error) {
      notify(error.message || "Authentication failed.", "error");
    } finally {
      setAuthBusy(false);
    }
  }

  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase();

    return reports.filter(r =>
      (!q || [r.code, r.title, r.location, r.category, r.description]
        .some(v => String(v || "").toLowerCase().includes(q))) &&
      (locationFilter === "All Locations" || r.location === locationFilter) &&
      (categoryFilter === "All Categories" || r.category === categoryFilter) &&
      (statusFilter === "All Statuses" || r.status === statusFilter)
    );
  }, [reports, search, locationFilter, categoryFilter, statusFilter]);

  const stats = useMemo(() => [
    { label: "Total reports", value: reports.length, icon: ClipboardList, tone: "violet" },
    { label: "Reported", value: reports.filter(r => r.status === "Reported").length, icon: AlertTriangle, tone: "amber" },
    { label: "In progress", value: reports.filter(r => r.status === "In Progress").length, icon: Clock3, tone: "blue" },
    { label: "Resolved", value: reports.filter(r => r.status === "Resolved").length, icon: CheckCircle2, tone: "green" }
  ], [reports]);
  const [apiStatus, setApiStatus] = useState("Checking");

useEffect(() => {
  let active = true;

  fetch(`${API}/health`)
    .then(response => {
      if (!response.ok) throw new Error("API unavailable");
      return response.json();
    })
    .then(() => {
      if (active) setApiStatus("Connected");
    })
    .catch(() => {
      if (active) setApiStatus("Disconnected");
    });

  return () => { active = false; };
}, []);

  function clearFilters() {
    setSearch("");
    setLocationFilter("All Locations");
    setCategoryFilter("All Categories");
    setStatusFilter("All Statuses");
  }

  async function submitReport(event) {
    event.preventDefault();

    if (busy) return;

    if (!form.title.trim() || !form.description.trim()) {
  notify("Please complete the title and description.", "error");
  return;
}

if (
  (form.issue_location === "Inside room" || form.issue_location === "Washroom") &&
  (!form.floor.trim() || !form.room_number.trim())
) {
  notify("Please enter the floor and room number.", "error");
  return;
}

    setBusy(true);

    try {
      const created = await request("/reports", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          title: form.title.trim(),
          description: form.description.trim()
        })
      }, token);

      setReports(previous => [normalize(created), ...previous]);
      setShowForm(false);
      setForm({
  title: "",
  location: "NC4",
  floor: "",
  room_number: "",
  issue_location: "Inside room",
  category: "Wi-Fi / Internet",
  priority: "Medium",
  description: ""
});
      clearFilters();
      setPage("All Reports");
      notify("Your complaint has been submitted successfully.");
    } catch (error) {
      notify(error.message || "Could not submit complaint.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(report, status) {
    try {
      const result = await request(`/reports/${encodeURIComponent(report.id)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      }, token);

      const updated = normalize(result.report || { ...report, status });

      setReports(current => current.map(item =>
        item.id === report.id ? updated : item
      ));

      setSelected(current =>
        current?.id === report.id ? updated : current
      );

      notify("Complaint status updated.");
    } catch (error) {
      notify(error.message || "Could not update status.", "error");
    }
  }

  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-orb orb-one"/>
        <div className="auth-orb orb-two"/>

        <div className="auth-layout">
          <section className="auth-brand-panel">
            <div className="brand-lockup">
              <div className="brand-symbol"><GraduationCap size={27}/></div>
              <div><b>fixora</b><span>CAMPUS</span></div>
            </div>

            <div className="auth-pitch">
              <span className="eyebrow light">CAMPUS ISSUE RESOLUTION</span>
              <h1>A better campus<br/><em>starts with you.</em></h1>
              <p>One place to report campus issues, follow progress, and make everyday life at Chandigarh University better.</p>

              <div className="auth-benefits">
                <div>
                  <span><ShieldCheck size={18}/></span>
                  <div><b>Secure access</b><small>Your account and reports stay protected.</small></div>
                </div>
                <div>
                  <span><Clock3 size={18}/></span>
                  <div><b>Track every update</b><small>Know what's reported, in progress, and resolved.</small></div>
                </div>
              </div>
            </div>

            <div className="auth-footer">
              © {new Date().getFullYear()} Fixora Campus · {UNIVERSITY}
            </div>
          </section>

          <section className="auth-form-panel">
            <div className="auth-card">
              <div className="mobile-brand"><GraduationCap/> FIXORA CAMPUS</div>
              <span className="eyebrow">WELCOME TO FIXORA</span>
              <h2>{authMode === "login" ? "Sign in to continue" : "Create your student account"}</h2>
              <p className="auth-subtitle">
                {authMode === "login"
                  ? "Access your campus workspace securely."
                  : "Join the campus community and raise your first report."}
              </p>

              <div className="role-switch">
                <button type="button" className={authRole === "student" ? "selected" : ""}
                  onClick={() => { setAuthRole("student"); setAuthMode("login"); }}>
                  <UserRound size={17}/> Student
                </button>
                <button type="button" className={authRole === "admin" ? "selected" : ""}
                  onClick={() => { setAuthRole("admin"); setAuthMode("login"); }}>
                  <ShieldCheck size={17}/> Admin
                </button>
              </div>

              <form className="auth-form" onSubmit={handleAuth} autoComplete="off">
                {authMode === "register" && (
                  <label className="field">
                    <span>Full name</span>
                    <div className="input-wrap">
                      <UserRound size={17}/>
                      <input required minLength="2" maxLength="100"
                        autoComplete="off"
                        value={authForm.name}
                        onChange={e => setAuthForm({ ...authForm, name: e.target.value })}
                        placeholder="Your full name"/>
                    </div>
                  </label>
                )}

                <label className="field">
                  <span>Email address</span>
                  <div className="input-wrap">
                    <Mail size={17}/>
                    <input required type="email" autoComplete="off"
                      value={authForm.email}
                      onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                      placeholder="you@example.com"/>
                  </div>
                </label>

                <label className="field">
                  <span>Password</span>
                  <div className="input-wrap">
                    <LockKeyhole size={17}/>
                    <input required
                      minLength={authMode === "register" ? 8 : undefined}
                      autoComplete="new-password"
                      type={showPassword ? "text" : "password"}
                      value={authForm.password}
                      onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                      placeholder="Enter your password"/>
                    <button className="reveal" type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="Toggle password visibility">
                      {showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}
                    </button>
                  </div>
                </label>

                <button className="auth-submit" disabled={authBusy}>
                  {authBusy ? "Please wait..." : authMode === "login" ? "Sign in" : "Create account"}
                  <ArrowRight size={18}/>
                </button>
              </form>

              {authRole === "student" && (
                <p className="auth-toggle">
                  {authMode === "login" ? "New to Fixora?" : "Already have an account?"}
                  <button type="button"
                    onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>
                    {authMode === "login" ? "Create account" : "Sign in"}
                  </button>
                </p>
              )}

              {authRole === "admin" && (
                <p className="admin-note">
                  <ShieldCheck size={15}/> Administrator accounts are provisioned securely.
                </p>
              )}
            </div>

            <div className="auth-university"><GraduationCap size={16}/> {UNIVERSITY}</div>
          </section>
        </div>

        {notice && <Toast message={notice} type={noticeType} close={() => setNotice("")}/>}
      </div>
    );
  }

  const navigation = [
    { label: "Overview", icon: LayoutDashboard },
    { label: "All Reports", icon: ClipboardList },
    { label: "Campus Locations", icon: MapPin },
    ...(isAdmin ? [{ label: "Settings", icon: Settings }] : [])
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-symbol"><GraduationCap size={26}/></div>
          <div><b>fixora</b><span>CAMPUS</span></div>
        </div>

        <div className="side-caption">WORKSPACE</div>

        <nav className="side-nav">
          {navigation.map(({ label, icon: Icon }) => (
            <button key={label}
              className={page === label ? "nav-link active" : "nav-link"}
              onClick={() => setPage(label)}>
              <Icon size={19}/>
              <span>{label}</span>
              {page === label && <i/>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="support-mark"><Sparkles size={18}/></div>
          <div><b>Campus support</b><small>Report. Track. Resolve.</small></div>
        </div>

        <div className="sidebar-user">
          <div className="avatar">{(user.name || "U").slice(0, 1).toUpperCase()}</div>
          <div className="user-meta">
            <b>{user.name}</b>
            <small>{isAdmin ? "Administrator" : "Student"}</small>
          </div>
          <button title="Log out" onClick={() => logout("You have been logged out.")}>
            <LogOut size={17}/>
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <div className="crumb">FIXORA <span>/</span> <b>{page}</b></div>
            <div className="topbar-university">{UNIVERSITY}</div>
          </div>
          <div className="topbar-right">
            <span className={`role-pill ${isAdmin ? "admin" : ""}`}>
              {isAdmin ? <ShieldCheck size={14}/> : <UserRound size={14}/>}
              {isAdmin ? "Admin workspace" : "Student workspace"}
            </span>
            <button className="topbar-avatar" title={user.name}>
              {(user.name || "U").slice(0, 1).toUpperCase()}
            </button>
          </div>
        </header>

        <div className="content">
          {page === "Overview" && (
            isAdmin ? (
             <>
  <section className="admin-command-hero">
    <div className="admin-hero-content">
      <span className="admin-hero-tag">
        <ShieldCheck size={15} /> CAMPUS OPERATIONS CENTER
      </span>
      <h1>Campus command center</h1>
      <p>
        Your central workspace to monitor campus issues, track progress
        and keep every report moving toward resolution.
      </p>
      <div className="admin-hero-actions">
        <button onClick={() => setPage("All Reports")}>
          Manage reports <ArrowRight size={16} />
        </button>
        <span><span className="live-dot" /> Live campus overview</span>
      </div>
    </div>

    <div className="admin-hero-visual">
      <div className="admin-visual-ring ring-one" />
      <div className="admin-visual-ring ring-two" />
      <div className="admin-visual-icon">
        <Building2 size={55} />
      </div>
      <span className="visual-chip chip-one"><CheckCircle2 size={15}/> Resolved</span>
      <span className="visual-chip chip-two"><AlertTriangle size={15}/> Attention</span>
    </div>
    <div className="admin-hero-bottom">
      <span>CAMPUS REPORTS</span>
      <strong>{reports.length} total submissions</strong>
    </div>
  </section>

  <section className="admin-stat-grid">
    {stats.map(({ label, value, icon: Icon, tone }) => {
      const percentage = reports.length
        ? Math.round((value / reports.length) * 100)
        : 0;

      return (
        <article className={`admin-stat-card ${tone}`} key={label}>
          <div className="admin-stat-top">
            <div className="admin-stat-icon"><Icon size={21}/></div>
            <span>{percentage}%</span>
          </div>
          <div className="admin-stat-label">{label}</div>
          <div className="admin-stat-value">{value}</div>
          <div className="admin-stat-track">
            <div style={{ width: `${percentage}%` }} />
          </div>
          <div className="admin-stat-caption">Share of campus reports</div>
        </article>
      );
    })}
  </section>

  <section className="admin-insights-grid">
    <div className="admin-insight-panel">
      <div className="admin-panel-heading">
        <div>
          <span>REPORT ANALYTICS</span>
          <h2>Resolution overview</h2>
        </div>
        <Activity size={21}/>
      </div>

      {["Reported", "In Progress", "Resolved"].map((status, index) => {
        const count = reports.filter(r => r.status === status).length;
        const percent = reports.length
          ? Math.round((count / reports.length) * 100)
          : 0;

        return (
          <div className="admin-progress-row" key={status}>
            <div className="admin-progress-info">
              <span>{status}</span>
              <strong>{count} <small>({percent}%)</small></strong>
            </div>
            <div className={`admin-progress-track progress-${index}`}>
              <div style={{ width: `${percent}%` }} />
            </div>
          </div>
        );
      })}
    </div>

    <div className="admin-insight-panel admin-priority-panel">
      <div className="admin-panel-heading">
        <div>
          <span>ATTENTION REQUIRED</span>
          <h2>Priority breakdown</h2>
        </div>
        <AlertTriangle size={21}/>
      </div>

      <div className="admin-priority-number">
        {reports.filter(r => String(r.priority).toLowerCase() === "high").length}
        <span>High priority issues</span>
      </div>

      <div className="admin-priority-footer">
        <div>
          <span className="priority-dot high-dot"/>
          High priority
        </div>
        <strong>
          {reports.filter(r => String(r.priority).toLowerCase() === "high").length}
        </strong>
      </div>
      <div className="admin-priority-footer">
        <div>
          <span className="priority-dot low-dot"/>
          Other priorities
        </div>
        <strong>
          {reports.filter(r => String(r.priority).toLowerCase() !== "high").length}
        </strong>
      </div>
    </div>
  </section>

  <section className="section-title admin-recent-heading">
    <div>
      <span className="eyebrow">LATEST ACTIVITY</span>
      <h2>Recent campus reports</h2>
      <p>Monitor the latest issues submitted by students.</p>
    </div>
    <button className="text-link" onClick={() => setPage("All Reports")}>
      View all <ArrowRight size={16}/>
    </button>
  </section>

  <ReportList
    reports={[...reports]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)}
    isAdmin={isAdmin}
    onSelect={setSelected}
    onStatus={updateStatus}
    loading={loading}
  />
</>
            ) : (
              <StudentOverview
                user={user}
                reports={reports}
                stats={stats}
                loading={loading}
                onNewReport={() => setShowForm(true)}
                onViewAll={() => setPage("All Reports")}
                onSelect={setSelected}
              />
            )
          )}

          {page === "All Reports" && (
            <>
<section className={isAdmin ? "page-heading" : "page-heading student-page-heading"}>
  <div>
    <span className="eyebrow">
      {isAdmin ? "CAMPUS MANAGEMENT" : "YOUR ACTIVITY"}
    </span>
    <h1>{isAdmin ? "All campus reports" : "My reports"}</h1>
    <p>
      {isAdmin
        ? "Review, filter and manage issues reported across campus."
        : "Every report matters. Track your submissions and see campus improvements."}
    </p>
  </div>

  {!isAdmin && (
    <button
      className="button-primary student-new-report"
      onClick={() => setShowForm(true)}
    >
      <Plus size={18} /> New report
    </button>
  )}
</section>

<section className={isAdmin ? "filter-panel" : "filter-panel student-filter-panel"}>
  <div className="search-input">
    <Search size={18} />
    <input
      value={search}
      onChange={e => setSearch(e.target.value)}
      placeholder="Search reports, IDs, locations..."
    />
  </div>

  <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)}>
    <option>All Locations</option>
    {LOCATIONS.map(v => <option key={v}>{v}</option>)}
  </select>

  <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
    <option>All Categories</option>
    {CATEGORIES.map(v => <option key={v}>{v}</option>)}
  </select>

  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
    <option>All Statuses</option>
    {STATUSES.map(v => <option key={v}>{v}</option>)}
  </select>

  <button className="clear-button" onClick={clearFilters}>
    <Filter size={16} /> Clear
  </button>
</section>

<div className={!isAdmin ? "student-report-results" : undefined}>
 <ReportList
  reports={filteredReports}
  isAdmin={isAdmin}
  onSelect={setSelected}
  onStatus={updateStatus}
  loading={loading}
/>

          </div>
        </>
      )}

     {page === "Campus Locations" && <>
  <section className="page-heading locations-heading">
    <div>
      <span className="eyebrow">CAMPUS OPERATIONS</span>
      <h1>Campus locations</h1>
      <p>Monitor complaints and resolution progress across university locations.</p>
    </div>
  </section>

  <section className="location-overview-stats">
    <article className="location-overview-card">
      <div className="location-overview-icon purple"><Building2 size={21}/></div>
      <div><span>Total locations</span><b>{LOCATIONS.length}</b></div>
    </article>
    <article className="location-overview-card">
      <div className="location-overview-icon blue"><ClipboardList size={21}/></div>
      <div><span>Total reports</span><b>{reports.length}</b></div>
    </article>
    <article className="location-overview-card">
      <div className="location-overview-icon orange"><Clock3 size={21}/></div>
      <div><span>Unresolved issues</span><b>{reports.filter(r => r.status !== "Resolved").length}</b></div>
    </article>
    <article className="location-overview-card">
      <div className="location-overview-icon green"><CheckCircle2 size={21}/></div>
      <div><span>Resolved issues</span><b>{reports.filter(r => r.status === "Resolved").length}</b></div>
    </article>
  </section>

  <section className="locations-section-heading">
    <div>
      <h2>Building overview</h2>
      <p>Select a location to view its complaints.</p>
    </div>
    <span>{LOCATIONS.length} locations</span>
  </section>

  <section className="location-grid location-grid-upgraded">
    {LOCATIONS.map((location, index) => {
      const items = reports.filter(r => r.location === location);
      const reported = items.filter(r => r.status === "Reported").length;
      const progress = items.filter(r => r.status === "In Progress").length;
      const resolved = items.filter(r => r.status === "Resolved").length;
      const open = reported + progress;
      const percentage = items.length ? Math.round((resolved / items.length) * 100) : 0;

      return (
        <button
          className={`location-card location-card-upgraded location-card-${index}`}
          key={location}
          onClick={() => {
            clearFilters();
            setLocationFilter(location);
            setPage("All Reports");
          }}
        >
          <div className="location-card-top">
            <div className="location-icon location-icon-upgraded">
              <Building2 size={25}/>
            </div>
            <span className={open ? "location-open-label" : "location-clear-label"}>
              {open ? `${open} open` : "All clear"}
            </span>
          </div>

          <h3>{location}</h3>
          <p className="location-total">
            {items.length} {items.length === 1 ? "report" : "reports"} submitted
          </p>

          <div className="location-progress-track">
            <div style={{width: `${percentage}%`}}/>
          </div>
          <div className="location-progress-label">
            <span>{percentage}% resolved</span>
            <span>{resolved}/{items.length}</span>
          </div>

          <div className="location-status-breakdown">
            <span><i className="reported-dot"/>Reported <b>{reported}</b></span>
            <span><i className="progress-dot"/>In progress <b>{progress}</b></span>
            <span><i className="resolved-dot"/>Resolved <b>{resolved}</b></span>
          </div>

          <div className="location-card-footer">
            <span>View location reports</span>
            <ArrowRight size={17}/>
          </div>
        </button>
      );
    })}
  </section>
</>}

     {page === "Settings" && isAdmin && <>
  <section className="page-heading">
    <div>
      <span className="eyebrow">ADMINISTRATION</span>
      <h1>Admin control center</h1>
      <p>Manage your workspace and monitor application information.</p>
    </div>
  </section>

  <section className="control-stats">
    <article><div className="control-stat-icon purple"><ClipboardList/></div><span>Total reports</span><b>{reports.length}</b><small>Campus-wide submissions</small></article>
    <article><div className="control-stat-icon green"><CheckCircle2/></div><span>Resolved</span><b>{reports.filter(r => r.status === "Resolved").length}</b><small>Successfully completed</small></article>
    <article><div className="control-stat-icon orange"><Clock3/></div><span>Pending</span><b>{reports.filter(r => r.status !== "Resolved").length}</b><small>Awaiting resolution</small></article>
  </section>

  <div className="control-settings-grid">
    <section className="control-panel">
      <div className="control-panel-heading">
        <div className="control-panel-icon"><Settings/></div>
        <div><h2>Workspace information</h2><p>Your application configuration</p></div>
      </div>
      <div className="control-info-row"><span>Platform</span><b>Fixora Campus</b></div>
      <div className="control-info-row"><span>University</span><b>{UNIVERSITY}</b></div>
      <div className="control-info-row"><span>Backend API</span><b>localhost:5000</b></div>
      <div className="control-info-row"><span>Database</span><b>MySQL</b></div>
      <div className="control-info-row"><span>Environment</span><b>Local development</b></div>
    </section>

    <section className="control-panel">
      <div className="control-panel-heading">
        <div className="control-panel-icon green"><ShieldCheck/></div>
        <div><h2>System health</h2><p>Current backend connectivity</p></div>
      </div>
      <div className="health-status-row">
        <div><span className="health-indicator"/>Backend API</div>
        <span className={`health-pill ${apiStatus === "Connected" ? "healthy" : apiStatus === "Disconnected" ? "unhealthy" : "checking"}`}>{apiStatus}</span>
      </div>
      <div className="control-info-row"><span>Authentication</span><b>JWT enabled</b></div>
      <div className="control-info-row"><span>Access control</span><b>Role-based</b></div>
      <div className="control-info-row"><span>Database engine</span><b>MySQL</b></div>
      <p className="control-note">Database availability is configured through the backend. The API indicator checks backend connectivity.</p>
    </section>

    <section className="control-panel admin-profile-panel">
      <div className="control-panel-heading">
        <div className="control-panel-icon purple"><UserRound/></div>
        <div><h2>Administrator profile</h2><p>Currently signed-in account</p></div>
      </div>
      <div className="admin-profile-content">
        <div className="admin-profile-avatar">{(user.name || "A").charAt(0).toUpperCase()}</div>
        <div><h3>{user.name}</h3><p>{user.email}</p><span>Administrator</span></div>
      </div>
      <div className="control-info-row"><span>Account role</span><b>Admin</b></div>
      <div className="control-info-row"><span>Access level</span><b>Full administration</b></div>
    </section>

    <section className="control-panel">
      <div className="control-panel-heading">
        <div className="control-panel-icon orange"><LockKeyhole/></div>
        <div><h2>Security overview</h2><p>Application access protection</p></div>
      </div>
      <div className="security-feature"><ShieldCheck size={19}/><div><b>Protected authentication</b><span>JWT-based login sessions</span></div></div>
      <div className="security-feature"><UserRound size={19}/><div><b>Role-based permissions</b><span>Separate student and admin access</span></div></div>
      <div className="security-feature"><LockKeyhole size={19}/><div><b>Protected API routes</b><span>Authenticated backend operations</span></div></div>
    </section>
  </div>
</>}
        </div>
      </main>

      {showForm && (
        <div className="modal-backdrop"
          onMouseDown={e => {
            if (e.target === e.currentTarget && !busy) setShowForm(false);
          }}>
          <section className="modal-card">
            <div className="modal-heading">
              <div>
                <span className="eyebrow">CAMPUS SUPPORT</span>
                <h2>Report an issue</h2>
                <p>Share the details so the right team can take action.</p>
              </div>
              <button className="icon-close" onClick={() => setShowForm(false)}><X/></button>
            </div>

            <form className="report-form" onSubmit={submitReport}>
              <label className="field">
                <span>Issue title</span>
                <input required maxLength="180" value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Wi-Fi not working in hostel"/>
              </label>

              <div className="form-two">
                <label className="field">
                  <span>Location</span>
                  <select value={form.location}
                    onChange={e => setForm({ ...form, location: e.target.value })}>
                    {LOCATIONS.map(v => <option key={v}>{v}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Category</span>
                  <select value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map(v => <option key={v}>{v}</option>)}
                  </select>
                </label>
              </div>

<div className="form-two">
  <label className="field">
    <span>Exact issue location</span>
    <select
      value={form.issue_location}
      onChange={e => setForm({ ...form, issue_location: e.target.value })}
    >
      <option value="Inside room">Inside room</option>
      <option value="Washroom">Washroom</option>
      <option value="Corridor">Corridor</option>
      <option value="Common area">Common area</option>
      <option value="Other">Other</option>
    </select>
  </label>

  <label className="field">
    <span>Floor number</span>
    <input
      value={form.floor}
      onChange={e => setForm({ ...form, floor: e.target.value })}
      placeholder="e.g. 2"
      required={form.issue_location === "Inside room" || form.issue_location === "Washroom"}
    />
  </label>
</div>

{(form.issue_location === "Inside room" || form.issue_location === "Washroom") && (
  <label className="field">
    <span>Room number</span>
    <input
      value={form.room_number}
      onChange={e => setForm({ ...form, room_number: e.target.value })}
      placeholder="e.g. 204"
      required
    />
  </label>
)}

              <div className="form-two">
                <label className="field">
                  <span>Priority</span>
                  <select value={form.priority}
                    onChange={e => setForm({ ...form, priority: e.target.value })}>
                    {PRIORITIES.map(v => <option key={v}>{v}</option>)}
                  </select>
                </label>
                <div className="field">
                  <span>Submitted by</span>
                  <div className="readonly-field">{user.name}</div>
                </div>
              </div>

              <label className="field">
                <span>Description</span>
                <textarea required rows="4" maxLength="2000"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the issue and where it is happening..."/>
              </label>

              <button className="button-primary submit-wide" disabled={busy}>
                {busy ? "Submitting..." : "Submit complaint"} <ArrowRight size={17}/>
              </button>
            </form>
          </section>
        </div>
      )}

      {selected && (
        <div className="modal-backdrop"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setSelected(null);
          }}>
          <section className="modal-card detail-card">
            <div className="modal-heading">
              <div>
                <span className="eyebrow">{selected.code || "CAMPUS REPORT"}</span>
                <h2>{selected.title}</h2>
                <p>{selected.location} · {selected.category}</p>
              </div>
              <button className="icon-close" onClick={() => setSelected(null)}><X/></button>
            </div>

            <div className="detail-badges">
              <StatusBadge status={selected.status}/>
              <span className={`priority-badge ${selected.priority.toLowerCase()}`}>
                {selected.priority} priority
              </span>
            </div>

            <h3 className="detail-label">Issue description</h3>
            <p className="detail-description">{selected.description}</p>

           <div className="detail-meta">
  <div><small>Report ID</small><b>{selected.code || selected.id}</b></div>
  <div><small>Hostel / Building</small><b>{selected.location || "—"}</b></div>
  <div><small>Floor</small><b>{selected.floor || "—"}</b></div>
  <div><small>Room number</small><b>{selected.room_number || "—"}</b></div>
  <div><small>Exact issue location</small><b>{selected.issue_location || "—"}</b></div>
  <div><small>Submitted</small><b>{new Date(selected.createdAt).toLocaleString()}</b></div>
</div>

            {isAdmin && (
              <label className="field status-control">
                <span>Update complaint status</span>
                <select value={selected.status}
                  onChange={e => updateStatus(selected, e.target.value)}>
                  {STATUSES.map(v => <option key={v}>{v}</option>)}
                </select>
              </label>
            )}
          </section>
        </div>
      )}

      {notice && <Toast message={notice} type={noticeType} close={() => setNotice("")}/>}
    </div>
  );
}

function StudentOverview({ user, reports, stats, loading, onNewReport, onViewAll, onSelect }) {
  const resolved = reports.filter(r => r.status === "Resolved").length;
  const total = reports.length;
  const progress = total ? Math.round((resolved / total) * 100) : 0;
  const recent = [...reports]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="student-dashboard">
      <section className="student-hero">
        <div className="student-hero-content">
          <span className="student-hero-tag">
            <Sparkles size={14}/> YOUR CAMPUS. YOUR IMPACT.
          </span>
          <h1>{greeting}, {user.name?.split(" ")[0] || "Student"}!</h1>
          <p>Your voice matters. Report issues, track updates and help make campus life better.</p>
          <button className="student-hero-button" onClick={onNewReport}>
            <Plus size={19}/> Report a new issue <ArrowRight size={17}/>
          </button>
          <div className="student-hero-note">
            <ShieldCheck size={15}/> Your reports are visible only to you and campus administrators.
          </div>
        </div>

        <div className="student-hero-visual">
          <div className="student-visual-glow"/>
          <div className="student-visual-ring ring-one"/>
          <div className="student-visual-ring ring-two"/>
          <div className="student-building"><Building2 size={76} strokeWidth={1.4}/></div>
          <div className="floating-chip chip-top"><CheckCircle2 size={16}/> Campus care</div>
          <div className="floating-chip chip-bottom"><MapPin size={16}/> Chandigarh University</div>
          <span className="student-star star-one">✦</span>
          <span className="student-star star-two">✧</span>
        </div>
      </section>

      <div className="student-section-heading">
        <div>
          <span className="student-overline">YOUR ACTIVITY</span>
          <h2>Your report overview</h2>
          <p>A quick look at the issues you've raised.</p>
        </div>
        <span className="student-live-label"><span/> Live summary</span>
      </div>

      <section className="student-stat-grid">
        {stats.map(({ label, value, icon: Icon, tone }, index) => (
          <article className={`student-stat-card student-stat-${tone}`} key={label}>
            <div className="student-stat-top">
              <div className="student-stat-icon"><Icon size={21}/></div>
              <span className="student-stat-number">0{index + 1}</span>
            </div>
            <div className="student-stat-value">{value}</div>
            <div className="student-stat-label">{label}</div>
            <div className="student-stat-bottom">
              <span>{label === "Total reports" ? "All your submissions" : "Your submissions"}</span>
              <ArrowRight size={15}/>
            </div>
          </article>
        ))}
      </section>

      <section className="student-lower-grid">
        <div className="student-activity-panel">
          <div className="student-panel-heading">
            <div>
              <span className="student-overline">RECENT SUBMISSIONS</span>
              <h2>Your recent reports</h2>
              <p>Track what's happening with your complaints.</p>
            </div>
            <button className="student-view-link" onClick={onViewAll}>
              View all <ArrowRight size={16}/>
            </button>
          </div>

          {loading ? (
            <div className="student-empty">
              <RefreshCw className="spin" size={24}/> Loading your reports...
            </div>
          ) : recent.length ? (
            <div className="student-report-list">
              {recent.map(report => (
                <button className="student-report-item" key={report.id}
                  onClick={() => onSelect(report)}>
                  <div className="student-report-icon"><ClipboardList size={20}/></div>
                  <div className="student-report-info">
                    <b>{report.title}</b>
                <span>
  {report.code || `#${report.id}`} · {report.location}
  {report.floor && ` · Floor ${report.floor}`}
  {report.room_number && ` · Room ${report.room_number}`}
  {report.issue_location && ` · ${report.issue_location}`}
  · {report.category}
</span>
                  </div>
                  <div className="student-report-right">
                    <StatusBadge status={report.status}/>
                    <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                  </div>
                  <ArrowRight className="student-report-arrow" size={17}/>
                </button>
              ))}
            </div>
          ) : (
            <div className="student-empty">
              <ClipboardList size={32}/>
              <b>No reports yet</b>
              <span>Your submitted complaints will appear here.</span>
              <button onClick={onNewReport}>
                Submit your first report <ArrowRight size={15}/>
              </button>
            </div>
          )}
        </div>

        <aside className="student-progress-panel">
          <div className="student-progress-icon"><CheckCircle2 size={23}/></div>
          <span className="student-overline">RESOLUTION TRACKER</span>
          <h2>Your campus impact</h2>
          <p>See how many of your submitted issues have been resolved.</p>
          <div className="student-progress-number">{progress}<small>%</small></div>
          <div className="student-progress-track">
            <div style={{ width: `${progress}%` }}/>
          </div>
          <div className="student-progress-legend">
            <span><i/> Resolved</span>
            <b>{resolved} of {total}</b>
          </div>
          <div className="student-progress-footer">
            {total === 0
              ? "Submit your first report to start tracking."
              : resolved === total
                ? "All your reported issues are resolved. Great!"
                : "Every report helps make campus better."}
          </div>
        </aside>
      </section>
    </div>
  );
}

function StatusBadge({ status }) {
  const cls = status === "Resolved"
    ? "resolved"
    : status === "In Progress" ? "progress" : "reported";

  return <span className={`status-badge ${cls}`}><i/>{status}</span>;
}


function ReportList({ reports, isAdmin, onSelect, onStatus, loading }) {
  if (loading) return (
    <div className="empty-state">
      <RefreshCw className="spin" size={24}/>
      <b>Loading reports...</b>
      <span>Connecting to Fixora securely.</span>
    </div>
  );

  if (!reports.length) return (
    <div className="empty-state">
      <ClipboardList size={30}/>
      <b>No reports found</b>
      <span>{isAdmin ? "No campus complaints match these filters." : "You haven't submitted any complaints yet."}</span>
    </div>
  );

  if (isAdmin) {
    return (
      <section className="admin-reports-list">
        <div className="admin-list-header">
          <div>
            <h3>Issue management</h3>
            <p>Review and manage campus complaints</p>
          </div>
          <span>{reports.length} reports</span>
        </div>

        {reports.map(r => (
          <article className="admin-report-row" key={r.id}>
            <div className={`admin-report-category ${
              r.category.toLowerCase().includes("wifi") ? "cat-wifi" :
              r.category.toLowerCase().includes("water") ? "cat-water" :
              r.category.toLowerCase().includes("electric") ? "cat-electric" :
              r.category.toLowerCase().includes("clean") ? "cat-clean" :
              "cat-default"
            }`}>
              {r.category.toLowerCase().includes("wifi") ? "⌁" :
               r.category.toLowerCase().includes("water") ? "◉" :
               r.category.toLowerCase().includes("electric") ? "ϟ" :
               r.category.toLowerCase().includes("clean") ? "✦" : "▤"}
            </div>

            <div className="admin-report-details">
              <button onClick={() => onSelect(r)} className="admin-report-title">
                {r.title}
              </button>
              <span>{r.code || `#${r.id}`} <i/> {r.category}</span>
            <div className="admin-report-location">
  <MapPin size={13}/>
  {r.location}
  {r.floor && ` · Floor ${r.floor}`}
  {r.room_number && ` · Room ${r.room_number}`}
  {r.issue_location && ` · ${r.issue_location}`}
</div>
            </div>

            <div className="admin-report-priority">
              <span className={`priority-badge ${r.priority.toLowerCase()}`}>
                {r.priority} priority
              </span>
            </div>

            <div className="admin-report-status">
              <label>STATUS</label>
              <select
                className={`admin-status-select ${
                  r.status === "Resolved" ? "status-resolved" :
                  r.status === "In Progress" ? "status-progress" : "status-reported"
                }`}
                value={r.status}
                onChange={e => onStatus(r, e.target.value)}
              >
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div className="admin-report-date">
              <label>SUBMITTED</label>
              <span>{new Date(r.createdAt).toLocaleDateString()}</span>
            </div>

            <button
              className="admin-report-open"
              onClick={() => onSelect(r)}
              aria-label="View report"
            >
              <ArrowRight size={18}/>
            </button>
          </article>
        ))}
      </section>
    );
  }

  return (
    <section className="reports-table-card">
      <div className="table-scroll">
        <table className="reports-table">
          <thead>
            <tr>
              <th>REPORT</th>
              <th>LOCATION</th>
              <th>PRIORITY</th>
              <th>STATUS</th>
              <th>DATE</th>
              <th/>
            </tr>
          </thead>
          <tbody>
            {reports.map(r => (
              <tr key={r.id}>
                <td>
                  <button className="report-title-button" onClick={() => onSelect(r)}>
                    <b>{r.title}</b>
                    <small>{r.code || `#${r.id}`} · {r.category}</small>
                  </button>
                </td>
                <td>
  <span className="table-location">
    <MapPin size={14}/>
    {r.location}
    {r.floor && ` · Floor ${r.floor}`}
    {r.room_number && ` · Room ${r.room_number}`}
    {r.issue_location && ` · ${r.issue_location}`}
  </span>
</td>
                <td><span className={`priority-badge ${r.priority.toLowerCase()}`}>{r.priority}</span></td>
                <td><StatusBadge status={r.status}/></td>
                <td className="date-cell">{new Date(r.createdAt).toLocaleDateString()}</td>
                <td><button className="row-arrow" onClick={() => onSelect(r)}><ArrowRight size={17}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}


function Toast({ message, type, close }) {
  return (
    <div className={`toast ${type === "error" ? "toast-error" : ""}`} role="status">
      <span className="toast-mark">{type === "error" ? "!" : "✓"}</span>
      <span>{message}</span>
      <button onClick={close} aria-label="Dismiss"><X size={17}/></button>
    </div>
  );
}

export default App;
