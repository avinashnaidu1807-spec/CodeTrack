import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, ArrowUpRight, Check, CircleDot, Code2, ExternalLink,
  Filter, Plus, Search, Target, Trash2, Trophy, X, RefreshCw, Link2,
  Unplug, UserRound, Clock3, AlertCircle, ChevronDown, ChevronUp,
  ListFilter, CheckCircle2, XCircle, Code, Flame, CalendarDays, CalendarCheck, Award
} from "lucide-react";
import { calculateActivityStreak } from "./utils/activity-streak.js";

const STORAGE_KEY = "codetrack-problems-v1";
const CODEFORCES_STORAGE_KEY = "codetrack-codeforces-data-v1";
const LEETCODE_STORAGE_KEY = "codetrack-leetcode-data-v1";

function userStorageKey(key, userId) {
  return `${key}:${userId}`;
}

function readSavedCodeforces(userId) {
  try {
    const saved = localStorage.getItem(userStorageKey(CODEFORCES_STORAGE_KEY, userId));
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function readSavedLeetCode(userId) {
  try {
    const saved = localStorage.getItem(userStorageKey(LEETCODE_STORAGE_KEY, userId));
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}



function readInitialProblems() {
  // Never load seeded or demo problems.
  // Platform activity comes from the connected platform APIs.
  return [];
}

function submissionPageUrl(submission) {
  if (submission?.submissionUrl) return submission.submissionUrl;
  if (submission?.contestId != null && submission?.submissionId != null) {
    const section = Number(submission.contestId) >= 100000 ? "gym" : "contest";
    return `https://codeforces.com/${section}/${submission.contestId}/submission/${submission.submissionId}`;
  }
  return "https://codeforces.com/submissions";
}

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function StatCard({ label, value, detail, icon: Icon, tone }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${tone}`}><Icon size={19} /></div>
      <div className="stat-copy">
        <span className="stat-label">{label}</span>
        <strong>{value}</strong>
        <span className="stat-detail">{detail}</span>
      </div>
    </article>
  );
}

function ProblemForm({ initialValue, onSave, onCancel }) {
  const [form, setForm] = useState(initialValue);
  const [error, setError] = useState("");

  function updateField(event) {
    const { name, value } = event.target;
    setForm(current => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.title.trim()) {
      setError("Enter a problem title.");
      return;
    }
    if (!isValidHttpUrl(form.url.trim())) {
      setError("Enter a valid http:// or https:// problem URL.");
      return;
    }

    onSave({
      ...form,
      title: form.title.trim(),
      url: form.url.trim(),
      notes: form.notes.trim()
    });
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={event => {
      if (event.target === event.currentTarget) onCancel();
    }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="form-title">
        <div className="modal-heading">
          <div>
            <p className="eyebrow">PROBLEM LIBRARY</p>
            <h2 id="form-title">{initialValue.id ? "Edit problem" : "Add a problem"}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onCancel} aria-label="Close form"><X size={19} /></button>
        </div>

        <form onSubmit={handleSubmit} className="problem-form">
          <label>
            Problem title *
            <input name="title" value={form.title} onChange={updateField} placeholder="e.g. Two Sum" autoFocus />
          </label>
          <label>
            Problem URL *
            <input name="url" value={form.url} onChange={updateField} placeholder="https://..." />
          </label>
          <div className="form-grid">
            <label>
              Platform
              <select name="platform" value={form.platform} onChange={updateField}>
                <option>Codeforces</option><option>LeetCode</option><option>AtCoder</option><option>Other</option>
              </select>
            </label>
            <label>
              Topic
              <select name="topic" value={form.topic} onChange={updateField}>
                <option>Arrays</option><option>Strings</option><option>Math</option><option>Binary Search</option>
                <option>Dynamic Programming</option><option>Graphs</option><option>Greedy</option><option>Stack</option><option>Other</option>
              </select>
            </label>
            <label>
              Difficulty / rating
              <input name="rating" value={form.rating} onChange={updateField} placeholder="e.g. 800 or Easy" />
            </label>
            <label>
              Status
              <select name="status" value={form.status} onChange={updateField}>
                <option>To Do</option><option>In Progress</option><option>Solved</option>
              </select>
            </label>
          </div>
          <label>
            Notes (optional)
            <textarea name="notes" value={form.notes} onChange={updateField} rows="3" placeholder="Approach, mistake to revisit, or key insight..." />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions">
            <button type="button" className="button button-quiet" onClick={onCancel}>Cancel</button>
            <button type="submit" className="button button-primary"><Check size={16} /> Save problem</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function DashboardApp({ user, onLogout }) {
  const [problems, setProblems] = useState(() => readInitialProblems(user.id, user.problems));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [topicFilter, setTopicFilter] = useState("All topics");
  const [modalState, setModalState] = useState(null);
  const [notice, setNotice] = useState("");
  const [codeforcesData, setCodeforcesData] = useState(() => user.linkedProfiles?.codeforces || readSavedCodeforces(user.id));
  const [leetcodeData, setLeetCodeData] = useState(() => user.linkedProfiles?.leetcode || readSavedLeetCode(user.id));
  const [leetcodeUsername, setLeetCodeUsername] = useState("");
  const [leetcodeLoading, setLeetCodeLoading] = useState(false);
  const [leetcodeError, setLeetCodeError] = useState("");
  const [now, setNow] = useState(() => new Date());
  const hasAutoSyncedRef = useRef(false);
  const [codeforcesHandle, setCodeforcesHandle] = useState("");
  const [codeforcesLoading, setCodeforcesLoading] = useState(false);
  const [codeforcesError, setCodeforcesError] = useState("");
  const [showCodeforcesHistory, setShowCodeforcesHistory] = useState(false);
  const [explorerSearch, setExplorerSearch] = useState("");
  const [explorerStatusFilter, setExplorerStatusFilter] = useState("All problems");
  const [explorerSort, setExplorerSort] = useState("Recently attempted");
  const [expandedProblemId, setExpandedProblemId] = useState(null);


  useEffect(() => {
    try {
      if (codeforcesData) {
        localStorage.setItem(userStorageKey(CODEFORCES_STORAGE_KEY, user.id), JSON.stringify(codeforcesData));
      } else {
        localStorage.removeItem(userStorageKey(CODEFORCES_STORAGE_KEY, user.id));
      }
    } catch {
      setCodeforcesError("Could not save the connected profile in this browser.");
    }
  }, [codeforcesData, user.id]);

  useEffect(() => {
    try {
      if (leetcodeData) localStorage.setItem(userStorageKey(LEETCODE_STORAGE_KEY, user.id), JSON.stringify(leetcodeData));
      else localStorage.removeItem(userStorageKey(LEETCODE_STORAGE_KEY, user.id));
    } catch {
      setLeetCodeError("Could not save the connected profile in this browser.");
    }
  }, [leetcodeData, user.id]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  async function syncCodeforces(handleValue) {
    const handle = handleValue.trim();
    setCodeforcesError("");
    if (!handle) {
      setCodeforcesError("Enter your Codeforces handle.");
      return;
    }

    setCodeforcesLoading(true);
    try {
      const response = await fetch("/api/codeforces/connect", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle })
      });
      const payload = await response.json();
      if (response.status === 401) { window.location.assign("/"); return; }
      if (!response.ok) throw new Error(payload.error || "Could not connect to Codeforces.");
      setCodeforcesData(payload);
      setCodeforcesHandle(payload.profile.handle);
      setNotice(`Synced Codeforces profile: ${payload.profile.handle}`);
    } catch (error) {
      setCodeforcesError(
        error instanceof TypeError
          ? "Could not reach the CodeTrack backend. Start it with npm run dev in the backend folder."
          : error.message
      );
    } finally {
      setCodeforcesLoading(false);
    }
  }

  
  function connectCodeforces(event) {
    event.preventDefault();
    void syncCodeforces(codeforcesHandle);
  }


  function disconnectCodeforces() {
    void fetch("/api/codeforces/connect", { method: "DELETE", credentials: "include" }).then(response => { if (response.status === 401) window.location.assign("/"); }).catch(() => {});
    setCodeforcesData(null);
    setCodeforcesHandle("");
    setCodeforcesError("");
    setShowCodeforcesHistory(false);
    setNotice("Codeforces profile disconnected from this browser.");
  }

  async function syncLeetCode(usernameValue) {
    const username = usernameValue.trim();
    setLeetCodeError("");
    if (!username) {
      setLeetCodeError("Enter your LeetCode username.");
      return;
    }

    setLeetCodeLoading(true);
    try {
      const response = await fetch("/api/leetcode/connect", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
      });
      const payload = await response.json();
      if (response.status === 401) { window.location.assign("/"); return; }
      if (!response.ok) throw new Error(payload.error || "Could not connect to LeetCode.");
      setLeetCodeData(payload);
      setLeetCodeUsername(payload.profile.username);
      setNotice(`Synced LeetCode profile: ${payload.profile.username}`);
    } catch (error) {
      setLeetCodeError(
        error instanceof TypeError
          ? "Could not reach the CodeTrack backend. Start it with npm run dev from the repository root."
          : error.message
      );
    } finally {
      setLeetCodeLoading(false);
    }
  }

  function connectLeetCode(event) {
    event.preventDefault();
    void syncLeetCode(leetcodeUsername);
  }

  function disconnectLeetCode() {
    void fetch("/api/leetcode/connect", { method: "DELETE", credentials: "include" }).then(response => { if (response.status === 401) window.location.assign("/"); }).catch(() => {});
    setLeetCodeData(null);
    setLeetCodeUsername("");
    setLeetCodeError("");
    setNotice("LeetCode profile disconnected from this browser.");
  }

  useEffect(() => {
    if (hasAutoSyncedRef.current) return;
    hasAutoSyncedRef.current = true;
    if (codeforcesData?.profile?.handle) void syncCodeforces(codeforcesData.profile.handle);
    if (leetcodeData?.profile?.username) void syncLeetCode(leetcodeData.profile.username);
  }, []);

  const codeforcesProblems = codeforcesData?.problems || [];
  const cfSolved = codeforcesData?.summary.uniqueProblemsSolved || 0;
  const cfAttemptedNotSolved = codeforcesData?.summary.attemptedNotSolved || 0;
  const cfSubmissions = codeforcesData?.submissions || [];
  const leetcodeAcceptedSubmissions = leetcodeData?.acceptedSubmissions || [];
  const streakActivities = useMemo(() => [
    ...cfSubmissions
      .filter(submission => submission.verdict === "OK")
      .map(submission => ({ timestamp: submission.creationTimeSeconds, platform: "Codeforces" })),
    ...leetcodeAcceptedSubmissions.map(submission => ({ timestamp: submission.timestamp, platform: "LeetCode" }))
  ], [cfSubmissions, leetcodeAcceptedSubmissions]);
  const activityStreak = useMemo(
    () => calculateActivityStreak(streakActivities, now, 35),
    [streakActivities, now]
  );

  const explorerProblems = useMemo(() => {
    const query = explorerSearch.trim().toLowerCase();
    const matching = codeforcesProblems.filter(problem => {
      const matchesQuery = [problem.name, problem.problemId, problem.contestId, problem.index,
        problem.rating, problem.latestVerdict, ...(problem.tags || [])]
        .some(value => String(value ?? "").toLowerCase().includes(query));
      const matchesStatus = explorerStatusFilter === "All problems"
        || (explorerStatusFilter === "Solved" && problem.solved)
        || (explorerStatusFilter === "Unsolved" && !problem.solved);
      return matchesQuery && matchesStatus;
    });

    return matching.sort((a, b) => {
      if (explorerSort === "Most attempts") return b.attemptsObserved - a.attemptsObserved;
      if (explorerSort === "Rating: low to high") return (a.rating ?? Number.MAX_SAFE_INTEGER) - (b.rating ?? Number.MAX_SAFE_INTEGER);
      if (explorerSort === "Rating: high to low") return (b.rating ?? -1) - (a.rating ?? -1);
      return (b.lastSubmittedAt ?? 0) - (a.lastSubmittedAt ?? 0);
    });
  }, [codeforcesProblems, explorerSearch, explorerStatusFilter, explorerSort]);

  const solvedCount = problems.filter(problem => problem.status === "Solved").length;
  const activeCount = problems.filter(problem => problem.status === "In Progress").length;
  const completion = problems.length === 0 ? 0 : Math.round((solvedCount / problems.length) * 100);

  const filteredProblems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return problems.filter(problem => {
      const matchesSearch = [problem.title, problem.topic, problem.platform, problem.notes]
        .some(value => value.toLowerCase().includes(query));
      const matchesStatus = statusFilter === "All statuses" || problem.status === statusFilter;
      const matchesTopic = topicFilter === "All topics" || problem.topic === topicFilter;
      return matchesSearch && matchesStatus && matchesTopic;
    });
  }, [problems, search, statusFilter, topicFilter]);

  function saveProblem(formData) {
    if (formData.id) {
      setProblems(current => current.map(problem => problem.id === formData.id ? formData : problem));
      setNotice("Problem updated.");
    } else {
      setProblems(current => [{ ...formData, id: crypto.randomUUID() }, ...current]);
      setNotice("Problem added.");
    }
    setModalState(null);
  }

  function deleteProblem(id) {
    const confirmed = window.confirm("Delete this problem from your tracker?");
    if (!confirmed) return;
    setProblems(current => current.filter(problem => problem.id !== id));
    setNotice("Problem deleted.");
  }

  function toggleSolved(problem) {
    const nextStatus = problem.status === "Solved" ? "To Do" : "Solved";
    setProblems(current => current.map(item =>
      item.id === problem.id ? { ...item, status: nextStatus } : item
    ));
  }

  const topics = [...new Set(problems.map(problem => problem.topic))].sort();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#top" aria-label="CodeTrack home">
          <img
            className="brand-logo"
            src="/codetrack-logo.png"
            alt=""
            aria-hidden="true"
            style={{ width: 42, height: 42, objectFit: "contain", flexShrink: 0 }}
          />
          <span>code<span className="brand-accent">track</span><small> PRACTICE WITH PURPOSE</small></span>
        </a>
        <div className="sidebar-label">WORKSPACE</div>
        <a className="nav-link active" href="#dashboard"><Activity size={17} /> Overview</a>
        <a className="nav-link" href="#problem-library"><CircleDot size={17} /> Problem library <span className="nav-count">{problems.length}</span></a>
        <a className="nav-link" href="#daily-streak"><Flame size={17} /> Daily streak <span className="nav-count">{activityStreak.currentStreak}</span></a>
        {codeforcesData && <a className="nav-link" href="#problem-explorer"><Search size={17} /> Problem Explorer <span className="nav-count">{codeforcesProblems.length}</span></a>}
        <div className="sidebar-bottom">
          <div className="goal-card">
            <div className="goal-icon"><Target size={18} /></div>
            <strong>Small steps add up.</strong>
            <p>Track the problems you solve, and learn from the ones you miss.</p>
          </div>
          <span className="sidebar-footer">PERSONAL PRACTICE SPACE</span>
        </div>
      </aside>

      <main className="main-content" id="top">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> Overview</div>
          <div className="topbar-right account-menu">
            {user.avatarUrl ? <img className="account-avatar" src={user.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <span className="account-avatar account-avatar-fallback">{user.name?.slice(0, 1)?.toUpperCase() || "U"}</span>}
            <span className="account-identity"><strong>{user.name}</strong><small>{user.email}</small></span>
            <button className="button button-quiet sign-out-button" onClick={onLogout}><UserRound size={15} /> Sign out</button>
          </div>
        </header>

        <section className="page-intro" id="dashboard">
          <div>
            <p className="eyebrow">YOUR LEARNING, ORGANIZED</p>
            <h1>Practice dashboard<span>.</span></h1>
            <p className="intro-copy">One place to organize problems, build consistency, and see your progress.</p>
          </div>
          <button className="button button-primary add-top" onClick={() => setModalState({ mode: "add", value: emptyForm })}>
            <Plus size={17} /> Add problem
          </button>
        </section>

        <section className="stats-grid" aria-label="Platform statistics">
          <StatCard
            label="Codeforces solved"
            value={codeforcesData ? cfSolved : "—"}
            detail={
              codeforcesData
                ? "Unique solved problems in imported history"
                : "Connect Codeforces to fetch data"
            }
            icon={Trophy}
            tone="green"
          />

          <StatCard
            label="LeetCode solved"
            value={leetcodeData ? leetcodeData.summary.totalSolved : "—"}
            detail={
              leetcodeData
                ? "From the connected public profile"
                : "Connect LeetCode to fetch data"
            }
            icon={CheckCircle2}
            tone="blue"
          />

          <StatCard
            label="Current streak"
            value={`${activityStreak.currentStreak} days`}
            detail="Based on imported accepted submissions"
            icon={Flame}
            tone="orange"
          />

          <StatCard
            label="Longest streak"
            value={`${activityStreak.longestStreak} days`}
            detail={`${activityStreak.solvedDays} active days observed`}
            icon={CalendarDays}
            tone="purple"
          />
        </section>

        <section className="connections-section" id="connected-platforms">
          <div className="section-heading connection-heading">
            <div>
              <p className="eyebrow">PLATFORM INTEGRATION</p>
              <h2>Connected platforms</h2>
              <p>Connect public profiles. Any accepted solution on a connected platform contributes to your daily streak.</p>
            </div>
          </div>

          <div className={`platform-card ${codeforcesData ? "is-connected" : ""}`}>
            <div className="platform-brand">
              <div className="cf-logo">CF</div>
              <div>
                <strong>Codeforces</strong>
                <span>Official public API · Read-only</span>
              </div>
            </div>

            {codeforcesData ? (
              <div className="connected-profile">
                <div className="connected-user">
                  {codeforcesData.profile.avatar
                    ? <img src={codeforcesData.profile.avatar} alt="" className="cf-avatar" />
                    : <div className="cf-avatar avatar-placeholder"><UserRound size={19} /></div>}
                  <div className="connected-user-copy">
                    <strong>{codeforcesData.profile.handle}</strong>
                    <span>{codeforcesData.profile.rank} {codeforcesData.profile.rating != null ? `· ${codeforcesData.profile.rating}` : "· Unrated"}</span>
                  </div>
                  <span className="connected-badge"><span /> Connected</span>
                </div>
                <div className="profile-stats">
                  <div><span>Current rating</span><strong>{codeforcesData.profile.rating ?? "—"}</strong></div>
                  <div><span>Max rating</span><strong>{codeforcesData.profile.maxRating ?? "—"}</strong></div>
                  <div><span>Problems solved</span><strong>{cfSolved}</strong></div>
                  <div><span>Attempted, unsolved</span><strong>{cfAttemptedNotSolved}</strong></div>
                </div>
                <div className="sync-meta">
                  <span><Clock3 size={13} /> Last synced {new Date(codeforcesData.syncedAt).toLocaleString()}</span>
                  <span>{codeforcesData.summary.submissionsObserved} submissions imported</span>
                </div>
                {!codeforcesData.historyIsComplete && <div className="history-warning"><AlertCircle size={14} /> Showing the latest {codeforcesData.historyLimit} submissions; older history may be missing from these totals.</div>}
                <div className="connected-actions">
                  <button className="button button-primary" onClick={() => void syncCodeforces(codeforcesData.profile.handle)} disabled={codeforcesLoading}><RefreshCw size={15} className={codeforcesLoading ? "spin" : ""} /> {codeforcesLoading ? "Syncing..." : "Sync now"}</button>
                  <button className="button button-quiet" onClick={() => setShowCodeforcesHistory(value => !value)}>{showCodeforcesHistory ? "Hide history" : "View submissions"}</button>
                  <button className="button button-quiet disconnect-button" onClick={disconnectCodeforces}><Unplug size={14} /> Disconnect</button>
                </div>
              </div>
            ) : (
              <form id="codeforces-connect-form" className="connect-form" onSubmit={connectCodeforces}>
                <label htmlFor="codeforces-handle">Codeforces handle</label>
                <div className="connect-input-row">
                  <input id="codeforces-handle" value={codeforcesHandle} onChange={event => setCodeforcesHandle(event.target.value)} placeholder="e.g. tourist" autoComplete="off" maxLength={24} />
                  <button type="submit" className="button button-primary" disabled={codeforcesLoading}>
                    {codeforcesLoading ? <><RefreshCw size={15} className="spin" /> Connecting...</> : <><Link2 size={15} /> Connect</>}
                  </button>
                </div>
                <p className="connect-help">Uses the official Codeforces API. No password or API key required. First sync may take a few seconds to respect API rate limits.</p>
              </form>
            )}
            {codeforcesError && <div className="connection-error" role="alert"><AlertCircle size={15} /> {codeforcesError}</div>}
          </div>

          {codeforcesData && showCodeforcesHistory && (
            <div className="cf-history-panel">
              <div className="history-heading"><h3>Recent submissions</h3><span>Latest {Math.min(cfSubmissions.length, 100)} shown</span></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>PROBLEM</th><th>VERDICT</th><th>LANGUAGE</th><th>SUBMITTED</th></tr></thead>
                  <tbody>
                    {cfSubmissions.slice(0, 100).map(submission => (
                      <tr key={submission.submissionId}>
                        <td><a className="cf-problem-link" href={submission.problemUrl} target="_blank" rel="noreferrer">{submission.name} <ExternalLink size={11} /></a><div className="problem-meta">{submission.tags.slice(0, 3).join(" · ") || "No tags"}</div></td>
                        <td><span className={`verdict-pill ${submission.verdict === "OK" ? "verdict-ok" : "verdict-failed"}`}>{submission.verdict.replaceAll("_", " ")}</span></td>
                        <td>{submission.language}</td>
                        <td>{submission.creationTimeSeconds ? new Date(submission.creationTimeSeconds * 1000).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                    {cfSubmissions.length === 0 && <tr><td colSpan="4" className="empty-state">No public submissions were returned for this handle.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <div className={`platform-card leetcode-card ${leetcodeData ? "is-connected" : ""}`}>
          <div className="platform-brand">
            <div className="cf-logo leetcode-logo">LC</div>
            <div>
              <strong>LeetCode</strong>
              <span>Public profile GraphQL endpoint · Read-only</span>
            </div>
          </div>
          {leetcodeData ? (
            <div className="connected-profile">
              <div className="connected-user">
                {leetcodeData.profile.avatar
                  ? <img src={leetcodeData.profile.avatar} alt="" className="cf-avatar" />
                  : <div className="cf-avatar avatar-placeholder"><UserRound size={19} /></div>}
                <div className="connected-user-copy">
                  <strong>{leetcodeData.profile.username}</strong>
                  <span>{leetcodeData.profile.realName || "LeetCode member"}{leetcodeData.profile.ranking ? ` · Rank ${Number(leetcodeData.profile.ranking).toLocaleString()}` : ""}</span>
                </div>
                <span className="connected-badge"><span /> Connected</span>
              </div>
              <div className="profile-stats leetcode-profile-stats">
                <div><span>Total solved</span><strong>{leetcodeData.summary.totalSolved}</strong></div>
                <div><span>Easy</span><strong>{leetcodeData.summary.easySolved}</strong></div>
                <div><span>Medium</span><strong>{leetcodeData.summary.mediumSolved}</strong></div>
                <div><span>Hard</span><strong>{leetcodeData.summary.hardSolved}</strong></div>
              </div>
              <div className="sync-meta">
                <span><Clock3 size={13} /> Last synced {new Date(leetcodeData.syncedAt).toLocaleString()}</span>
                <span>{leetcodeAcceptedSubmissions.length} accepted submissions imported for streak history</span>
              </div>
              {!leetcodeData.historyIsComplete && <div className="history-warning"><AlertCircle size={14} /> Only the latest {leetcodeData.historyLimit} accepted submissions are requested; older activity may not be included in longest-streak history.</div>}
              <div className="connected-actions">
                <button className="button button-primary" onClick={() => void syncLeetCode(leetcodeData.profile.username)} disabled={leetcodeLoading}><RefreshCw size={15} className={leetcodeLoading ? "spin" : ""} /> {leetcodeLoading ? "Syncing..." : "Sync now"}</button>
                <a className="button button-quiet external-profile-button" href={`https://leetcode.com/${encodeURIComponent(leetcodeData.profile.username)}/`} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Open profile</a>
                <button className="button button-quiet disconnect-button" onClick={disconnectLeetCode}><Unplug size={14} /> Disconnect</button>
              </div>
            </div>
          ) : (
            <form id="leetcode-connect-form" className="connect-form" onSubmit={connectLeetCode}>
              <label htmlFor="leetcode-username">LeetCode username</label>
              <div className="connect-input-row">
                <input id="leetcode-username" value={leetcodeUsername} onChange={event => setLeetCodeUsername(event.target.value)} placeholder="e.g. neetcode" autoComplete="off" maxLength={30} />
                <button type="submit" className="button button-primary" disabled={leetcodeLoading}>
                  {leetcodeLoading ? <><RefreshCw size={15} className="spin" /> Connecting...</> : <><Link2 size={15} /> Connect</>}
                </button>
              </div>
              <p className="connect-help">Uses public profile data. No password, cookie, or API key required. LeetCode's public GraphQL endpoint is unofficial and may change or rate-limit requests.</p>
            </form>
          )}
          {leetcodeError && <div className="connection-error" role="alert"><AlertCircle size={15} /> {leetcodeError}</div>}
        </div>

        <section className="streak-section" id="daily-streak">
          <div className="section-heading streak-heading">
            <div>
              <p className="eyebrow">CONSISTENCY OVER INTENSITY</p>
              <h2>Daily solving streak</h2>
              <p>One accepted solution on any connected platform keeps the streak alive.</p>
            </div>
            <span className={`today-status ${activityStreak.todayActive ? "is-active" : ""}`}>
              <span /> {activityStreak.todayActive ? "Solved today" : "No accepted solve today"}
            </span>
          </div>
          <div className="streak-stats-grid">
            <article className="streak-stat-card streak-current"><div className="streak-stat-icon"><Flame size={21} /></div><span>Current streak</span><strong>{activityStreak.currentStreak} <small>days</small></strong><p>{activityStreak.currentStreak ? "Keep the momentum going." : "Solve one problem to start today."}</p></article>
            <article className="streak-stat-card"><div className="streak-stat-icon"><Award size={21} /></div><span>Longest streak</span><strong>{activityStreak.longestStreak} <small>days</small></strong><p>Your best consecutive run in imported history.</p></article>
            <article className="streak-stat-card"><div className="streak-stat-icon"><CalendarCheck size={21} /></div><span>Active days</span><strong>{activityStreak.solvedDays}</strong><p>Unique days with at least one accepted submission.</p></article>
          </div>
          <div className="activity-calendar-panel">
            <div className="activity-calendar-heading"><div><CalendarDays size={16} /><strong>Last 35 days</strong></div><span>Local calendar dates · all connected platforms combined</span></div>
            <div className="activity-calendar-grid" aria-label="Daily accepted-solution activity">
              {activityStreak.grid.map(day => <span key={day.date} className={`activity-day ${day.active ? `level-${Math.min(4, day.count)}` : ""}`} title={`${day.date}: ${day.count} accepted submission${day.count === 1 ? "" : "s"}${day.platforms.length ? ` (${day.platforms.join(", ")})` : ""}`} aria-label={`${day.date}, ${day.count} accepted submissions`} />)}
            </div>
            <div className="activity-calendar-legend"><span>Less</span><i className="activity-day" /><i className="activity-day level-1" /><i className="activity-day level-2" /><i className="activity-day level-3" /><i className="activity-day level-4" /><span>More</span></div>
            {!codeforcesData && !leetcodeData && <p className="streak-note"><AlertCircle size={14} /> Connect Codeforces or LeetCode above to calculate your streak from accepted submissions.</p>}
            {(codeforcesData && !codeforcesData.historyIsComplete) || (leetcodeData && !leetcodeData.historyIsComplete) ? <p className="streak-note"><AlertCircle size={14} /> Streaks use imported accepted submissions. If a platform returns only recent history, the longest streak may be lower than your lifetime record.</p> : null}
          </div>
        </section>

        {codeforcesData && (
          <section className="explorer-section" id="problem-explorer">
            <div className="section-heading">
              <div>
                <p className="eyebrow">CODEFORCES SUBMISSION INTELLIGENCE</p>
                <h2>Problem Explorer</h2>
                <p>Explore every unique problem in the imported history, review verdicts, and open original submissions.</p>
              </div>
              <span className="explorer-total"><Code2 size={14} /> {codeforcesProblems.length} problems</span>
            </div>

            <div className="explorer-summary-grid">
              <div className="explorer-summary-card"><CheckCircle2 size={17} /><span>Accepted</span><strong>{cfSolved}</strong></div>
              <div className="explorer-summary-card is-unsolved"><XCircle size={17} /><span>Not solved yet</span><strong>{cfAttemptedNotSolved}</strong></div>
              <div className="explorer-summary-card"><Activity size={17} /><span>Submissions</span><strong>{cfSubmissions.length}</strong></div>
            </div>

            <div className="filter-bar explorer-filter-bar">
              <div className="search-box"><Search size={16} /><input value={explorerSearch} onChange={event => setExplorerSearch(event.target.value)} placeholder="Search problem, ID, tag, or verdict..." aria-label="Search Codeforces problems" /></div>
              <div className="filter-select"><ListFilter size={14} /><select value={explorerStatusFilter} onChange={event => setExplorerStatusFilter(event.target.value)} aria-label="Filter Codeforces problems by status">
                <option>All problems</option><option>Solved</option><option>Unsolved</option>
              </select></div>
              <div className="filter-select"><select value={explorerSort} onChange={event => setExplorerSort(event.target.value)} aria-label="Sort Codeforces problems">
                <option>Recently attempted</option><option>Most attempts</option><option>Rating: low to high</option><option>Rating: high to low</option>
              </select></div>
            </div>

            <div className="explorer-list">
              {explorerProblems.map(problem => {
                const latestSubmission = problem.submissions?.[0];
                const isExpanded = expandedProblemId === problem.problemId;
                return (
                  <article className={`explorer-problem ${problem.solved ? "is-solved" : "is-unsolved"}`} key={problem.problemId}>
                    <div className="explorer-problem-main">
                      <div className="explorer-status-icon" aria-label={problem.solved ? "Solved" : "Unsolved"}>
                        {problem.solved ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                      </div>
                      <div className="explorer-problem-copy">
                        <a className="explorer-problem-title" href={problem.problemUrl} target="_blank" rel="noreferrer">{problem.name} <ExternalLink size={12} /></a>
                        <div className="explorer-problem-meta">
                          <span>{problem.problemId}</span>
                          {problem.rating != null && <span>Rating {problem.rating}</span>}
                          <span>{problem.attemptsObserved} {problem.attemptsObserved === 1 ? "attempt" : "attempts"}</span>
                          <span>{problem.tags?.slice(0, 3).join(" · ") || "No tags"}</span>
                        </div>
                      </div>
                      <div className="explorer-problem-verdict">
                        <span className={`verdict-pill ${problem.solved ? "verdict-ok" : "verdict-failed"}`}>{problem.solved ? "SOLVED" : (problem.latestVerdict || "UNSOLVED").replaceAll("_", " ")}</span>
                        <small>{problem.lastSubmittedAt ? new Date(problem.lastSubmittedAt * 1000).toLocaleDateString() : "Date unavailable"}</small>
                      </div>
                      <div className="explorer-problem-actions">
                        {latestSubmission && (
                          <a className="submission-link" href={submissionPageUrl(latestSubmission)} target="_blank" rel="noreferrer" title="Open latest submission and inspect its verdict and code"><Code size={14} /> Latest submission</a>
                        )}
                        <button className="icon-button explorer-expand" onClick={() => setExpandedProblemId(isExpanded ? null : problem.problemId)} aria-expanded={isExpanded} aria-label={`${isExpanded ? "Hide" : "Show"} submissions for ${problem.name}`} title={isExpanded ? "Hide submissions" : "Show all submissions"}>
                          {isExpanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="explorer-attempts">
                        <div className="explorer-attempts-heading"><strong>Submission history</strong><span>{problem.submissions?.length || 0} attempts in imported history</span></div>
                        {(problem.submissions || []).map(submission => (
                          <div className="explorer-attempt-row" key={submission.submissionId}>
                            <span className={`attempt-verdict-dot ${submission.verdict === "OK" ? "is-ok" : ""}`} />
                            <div className="explorer-attempt-copy"><strong>{(submission.verdict || "TESTING").replaceAll("_", " ")}</strong><span>{submission.language} · {submission.creationTimeSeconds ? new Date(submission.creationTimeSeconds * 1000).toLocaleString() : "Submission date unavailable"}</span></div>
                            <a href={submissionPageUrl(submission)} target="_blank" rel="noreferrer" className="attempt-open-link">View verdict &amp; code <ExternalLink size={11} /></a>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
              {explorerProblems.length === 0 && (
                <div className="explorer-empty"><Search size={22} /><strong>No problems match these filters</strong><span>Try another search or choose a different status.</span></div>
              )}
            </div>
            <div className="table-footer explorer-footer"><span>Showing {explorerProblems.length} of {codeforcesProblems.length} unique problems</span><span>Problem and submission pages open on Codeforces</span></div>
            {!codeforcesData.historyIsComplete && <p className="explorer-limit-note"><AlertCircle size={13} /> This explorer reflects only the imported submission window (up to {codeforcesData.historyLimit} submissions), not necessarily your complete lifetime history.</p>}
          </section>
        )}

        <section className="progress-panel">
          <div className="progress-copy">
            <div>
              <p className="eyebrow">OVERALL COMPLETION</p>
              <h2>Keep your momentum</h2>
              <p>Mark a problem solved when you can explain its approach.</p>
            </div>
            <strong>{completion}%</strong>
          </div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${completion}%` }} /></div>
          <div className="progress-foot"><span>{solvedCount} solved</span><span>{Math.max(0, problems.length - solvedCount)} remaining or in progress</span></div>
        </section>

        <section className="library-section" id="problem-library">
          <div className="section-heading">
            <div>
              <p className="eyebrow">YOUR COLLECTION</p>
              <h2>Problem library</h2>
              <p>Keep links, topics, status, and notes together.</p>
            </div>
            <button className="button button-secondary" onClick={() => setModalState({ mode: "add", value: emptyForm })}>
              <Plus size={16} /> New problem
            </button>
          </div>

          <div className="filter-bar">
            <div className="search-box"><Search size={17} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search title, topic, or notes..." aria-label="Search problems" /></div>
            <div className="filter-select"><Filter size={15} /><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filter by status">
              <option>All statuses</option><option>To Do</option><option>In Progress</option><option>Solved</option>
            </select></div>
            <div className="filter-select"><select value={topicFilter} onChange={event => setTopicFilter(event.target.value)} aria-label="Filter by topic">
              <option>All topics</option>{topics.map(topic => <option key={topic}>{topic}</option>)}
            </select></div>
          </div>

          {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notice"><X size={14} /></button></div>}

          <div className="table-wrap">
            <table>
              <thead><tr><th>PROBLEM</th><th>TOPIC</th><th>DIFFICULTY</th><th>STATUS</th><th className="actions-heading">ACTIONS</th></tr></thead>
              <tbody>
                {filteredProblems.map(problem => (
                  <tr key={problem.id}>
                    <td>
                      <div className="problem-title">{problem.title}</div>
                      <div className="problem-meta">{problem.platform} <span>·</span> <a href={problem.url} target="_blank" rel="noreferrer">Open problem <ExternalLink size={11} /></a></div>
                      {problem.notes && <div className="problem-notes">{problem.notes}</div>}
                    </td>
                    <td><span className="topic-chip">{problem.topic}</span></td>
                    <td><span className="rating-text">{problem.rating || "—"}</span></td>
                    <td><span className={`status-pill ${problem.status.toLowerCase().replace(" ", "-")}`}><span />{problem.status}</span></td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-button" title={problem.status === "Solved" ? "Mark to do" : "Mark solved"} aria-label={problem.status === "Solved" ? "Mark to do" : "Mark solved"} onClick={() => toggleSolved(problem)}><Check size={15} /></button>
                        <button className="icon-button" title="Edit problem" aria-label="Edit problem" onClick={() => setModalState({ mode: "edit", value: problem })}><ArrowUpRight size={15} /></button>
                        <button className="icon-button danger" title="Delete problem" aria-label="Delete problem" onClick={() => deleteProblem(problem.id)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredProblems.length === 0 && (
                  <tr><td colSpan="5" className="empty-state"><Search size={22} /><strong>No matching problems</strong><span>Try another search or add a problem to your library.</span></td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="table-footer"><span>Showing {filteredProblems.length} of {problems.length} problems</span><span>Saved to your account <span className="status-dot" /></span></div>
        </section>

        <footer className="page-footer"><span>CODETRACK</span><span>Built for deliberate practice, one problem at a time.</span></footer>
      </main>

      {modalState && <ProblemForm
        key={`${modalState.mode}-${modalState.value.id || "new"}`}
        initialValue={modalState.value}
        onSave={saveProblem}
        onCancel={() => setModalState(null)}
      />}
    </div>
  );
}

const AUTH_ERROR_MESSAGES = {
  google_not_configured: "Google sign-in is not configured yet. Add your Google OAuth credentials to the server .env file.",
  database_unavailable: "The database is unavailable. Start MongoDB and check MONGODB_URI.",
  oauth_state_missing: "The sign-in request expired or was incomplete. Please try again.",
  oauth_state_invalid: "We couldn't validate the sign-in request. Please try again.",
  google_cancelled: "Google sign-in was cancelled.",
  email_not_verified: "Google must confirm that your email address is verified.",
  google_login_failed: "Google sign-in failed. Please try again."
};

function LoginScreen({ message, authStatus, loading }) {
  const setupIncomplete = authStatus && (!authStatus.googleConfigured || !authStatus.databaseReady || !authStatus.jwtConfigured);
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <a className="brand auth-brand" href="/" aria-label="CodeTrack home">
          <img
            className="brand-logo"
            src="/codetrack-logo.png"
            alt=""
            aria-hidden="true"
            style={{ width: 42, height: 42, objectFit: "contain", flexShrink: 0 }}
          />
          <span>code<span className="brand-accent">track</span><small> PRACTICE WITH PURPOSE</small></span>
        </a>
        <div className="auth-hero-icon"><Activity size={26} /></div>
        <p className="eyebrow">YOUR PERSONAL CODING WORKSPACE</p>
        <h1>Make every practice session count<span>.</span></h1>
        <p className="auth-description">Sign in to keep your problem library, platform connections, and daily streak tied to your own account.</p>
        {message && <div className="auth-message" role="alert"><AlertCircle size={17} />{message}</div>}
        {setupIncomplete && (
          <div className="auth-setup-note">
            <strong>One-time setup required</strong>
            <span>{!authStatus.databaseReady ? "Connect MongoDB using MONGODB_URI. " : ""}{!authStatus.googleConfigured ? "Configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET. " : ""}{!authStatus.jwtConfigured ? "Set a JWT_SECRET with at least 32 characters." : ""}</span>
            <small>See the README section “Authentication setup”.</small>
          </div>
        )}
        <button className="google-signin-button" onClick={() => { window.location.assign("/api/auth/google"); }} disabled={loading || setupIncomplete}>
          <span className="google-g" aria-hidden="true">G</span>
          {loading ? "Checking sign-in…" : "Continue with Google"}
          <ArrowUpRight size={17} />
        </button>
        <div className="auth-divider"><span /> <small>AFTER YOU SIGN IN</small> <span /></div>
        <div className="auth-benefits">
          <div><CheckCircle2 size={17} /><span><strong>Your own dashboard</strong><small>Account data is kept separate from other users.</small></span></div>
          <div><Flame size={17} /><span><strong>One combined streak</strong><small>Count accepted solutions from linked platforms.</small></span></div>
          <div><Link2 size={17} /><span><strong>Link coding profiles</strong><small>Connect public Codeforces and LeetCode profiles after sign-in.</small></span></div>
        </div>
        <p className="auth-footnote">Google secures your CodeTrack sign-in. Codeforces and LeetCode profiles are linked separately; they do not provide a supported Google-style OAuth login flow in this app.</p>
      </section>
      <footer className="auth-footer">CODETRACK <span>·</span> BUILT FOR DELIBERATE PRACTICE</footer>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState(null);
  const [authMessage, setAuthMessage] = useState("");

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("authError");
    if (authError && AUTH_ERROR_MESSAGES[authError]) setAuthMessage(AUTH_ERROR_MESSAGES[authError]);
    if (params.has("authError") || params.has("signedIn")) {
      window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    }

    Promise.all([
      fetch("/api/auth/me", { credentials: "include" }),
      fetch("/api/auth/status")
    ]).then(async ([meResponse, statusResponse]) => {
      const status = statusResponse.ok ? await statusResponse.json() : null;
      const mePayload = meResponse.ok ? await meResponse.json() : null;
      if (!active) return;
      setAuthStatus(status);
      if (mePayload?.user) {
        setUser(mePayload.user);
        setAuthMessage("");
      }
    }).catch(() => {
      if (active) setAuthMessage("Couldn't reach the CodeTrack API. Start the backend and try again.");
    }).finally(() => {
      if (active) setAuthLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function signOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      setUser(null);
      setAuthMessage("You have signed out of CodeTrack.");
    }
  }

  if (authLoading) {
    return <main className="auth-shell auth-loading"><div className="auth-loading-mark"><Code2 size={25} /></div><p>Checking your CodeTrack session…</p></main>;
  }
  if (!user) return <LoginScreen message={authMessage} authStatus={authStatus} loading={authLoading} />;
  return <DashboardApp key={user.id} user={user} onLogout={signOut} />;
}
