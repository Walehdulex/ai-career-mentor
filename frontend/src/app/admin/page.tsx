"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users, Briefcase, Database, RefreshCw, CheckCircle,
  AlertCircle, Loader2, TrendingUp, MessageSquare,
  FileText, Mic, LogOut, Settings, Activity
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function StatCard({ label, value, sub, color }: { label: string; value: any; sub?: string; color: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value ?? "—"}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [actionResult, setActionResult] = useState<any>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [schedulerStatus, setSchedulerStatus] = useState<any>(null);

  const token = () => typeof window !== "undefined" ? localStorage.getItem("auth_token") : "";

  useEffect(() => { fetchStats(); }, []);

  async function fetchStats() {
    setStatsLoading(true);
    try {
      const [dbRes, schedRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/check-jobs`),
        fetch(`${API_URL}/api/admin/scheduler-status`),
      ]);
      const db = await dbRes.json();
      const sched = await schedRes.json();
      setStats(db);
      setSchedulerStatus(sched);
    } catch (e) {
      console.error(e);
    } finally {
      setStatsLoading(false);
    }
  }

  async function fetchUsers() {
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, {
        headers: {
          Authorization: `Bearer ${token()}`,
          "x-admin-secret": process.env.NEXT_PUBLIC_ADMIN_SECRET || "",
        },
      });
      if (res.ok) setUsers(await res.json());
      else console.error("Admin users fetch failed:", res.status);
    } catch (e) { console.error(e); }
  }

  useEffect(() => {
    if (activeTab === "users") fetchUsers();
  }, [activeTab]);

  async function runAction(path: string, method = "GET") {
    setLoading(true);
    setActionResult(null);
    setActionError(null);
    try {
      const res = await fetch(`${API_URL}${path}`, { method });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Error ${res.status}`);
      setActionResult(data);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/admin-auth", { method: "DELETE" });
    router.push("/admin/login");
  }

  const tabs = [
    { key: "overview", label: "Overview", icon: <Activity className="w-4 h-4" /> },
    { key: "jobs",     label: "Jobs",     icon: <Briefcase className="w-4 h-4" /> },
    { key: "users",    label: "Users",    icon: <Users className="w-4 h-4" /> },
    { key: "system",   label: "System",   icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top bar */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">CML</span>
          </div>
          <div>
            <h1 className="font-bold text-white text-sm">CareerMentorLab</h1>
            <p className="text-xs text-gray-500">Admin Dashboard</p>
          </div>
        </div>
        <button onClick={logout}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-red-400 transition-colors px-3 py-2 rounded-lg hover:bg-gray-800">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-48 min-h-[calc(100vh-64px)] bg-gray-900 border-r border-gray-800 p-3 space-y-1">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </nav>

        {/* Main content */}
        <main className="flex-1 p-6">

          {/* ── OVERVIEW ── */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Platform Overview</h2>
                <button onClick={fetchStats} disabled={statsLoading}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors">
                  <RefreshCw className={`w-3.5 h-3.5 ${statsLoading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>

              {statsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Total Jobs" value={stats?.total_jobs} color="text-blue-400" />
                    <StatCard label="Active Jobs" value={stats?.active_jobs} color="text-green-400" />
                    <StatCard label="Adzuna Jobs" value={stats?.adzuna_jobs} color="text-purple-400" />
                    <StatCard label="Mock Jobs" value={stats?.mock_jobs} color="text-orange-400" />
                  </div>

                  {/* Scheduler status */}
                  {schedulerStatus && (
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                      <h3 className="text-sm font-semibold text-gray-300 mb-3">Scheduler Status</h3>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`w-2 h-2 rounded-full ${schedulerStatus.scheduler_running ? "bg-green-400" : "bg-red-400"}`} />
                        <span className="text-sm text-gray-400">
                          {schedulerStatus.scheduler_running ? "Running" : "Stopped"}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {schedulerStatus.next_runs?.map((job: any) => (
                          <div key={job.job_id} className="flex items-center justify-between text-xs">
                            <span className="text-gray-500 font-mono">{job.job_id}</span>
                            <span className="text-gray-400">{job.next_run}</span>
                          </div>
                        ))}
                      </div>
                      {schedulerStatus.latest_job_added && (
                        <p className="text-xs text-gray-600 mt-3">
                          Last job added: {new Date(schedulerStatus.latest_job_added).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Sample jobs */}
                  {stats?.sample_jobs?.length > 0 && (
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                      <h3 className="text-sm font-semibold text-gray-300 mb-3">Recent Jobs (sample)</h3>
                      <div className="space-y-2">
                        {stats.sample_jobs.map((job: any) => (
                          <div key={job.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                            <div>
                              <p className="text-sm font-medium text-white">{job.title}</p>
                              <p className="text-xs text-gray-500">{job.company} · {job.source}</p>
                            </div>
                            <span className="text-xs text-gray-600 font-mono">#{job.id}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── JOBS ── */}
          {activeTab === "jobs" && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold">Job Management</h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: "Populate Jobs", desc: "Fetch from Adzuna API", color: "bg-blue-600 hover:bg-blue-700", action: () => runAction("/api/admin/populate-jobs", "POST") },
                  { label: "Check Database", desc: "View job stats", color: "bg-green-600 hover:bg-green-700", action: () => runAction("/api/admin/check-jobs") },
                  { label: "Check API Config", desc: "Verify API keys", color: "bg-purple-600 hover:bg-purple-700", action: () => runAction("/api/admin/check-config") },
                ].map(btn => (
                  <button key={btn.label} onClick={btn.action} disabled={loading}
                    className={`${btn.color} disabled:bg-gray-700 text-white rounded-xl p-5 text-left transition-colors`}>
                    {loading ? <Loader2 className="w-6 h-6 animate-spin mb-2" /> : <Database className="w-6 h-6 mb-2" />}
                    <p className="font-semibold text-sm">{btn.label}</p>
                    <p className="text-xs opacity-75 mt-0.5">{btn.desc}</p>
                  </button>
                ))}
              </div>

              {actionError && (
                <div className="bg-red-950 border border-red-800 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-300">Error</p>
                    <p className="text-xs text-red-400 mt-0.5">{actionError}</p>
                  </div>
                </div>
              )}

              {actionResult && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <h3 className="text-sm font-semibold text-gray-300">Result</h3>
                  </div>

                  {/* Populate result */}
                  {actionResult.jobs_added !== undefined && (
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {[
                        { label: "Added", value: actionResult.jobs_added, color: "text-green-400" },
                        { label: "Updated", value: actionResult.jobs_updated, color: "text-blue-400" },
                        { label: "Total", value: actionResult.total, color: "text-white" },
                      ].map(s => (
                        <div key={s.label} className="bg-gray-800 rounded-lg p-3 text-center">
                          <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* DB stats */}
                  {actionResult.total_jobs !== undefined && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      {[
                        { label: "Total", value: actionResult.total_jobs, color: "text-blue-400" },
                        { label: "Active", value: actionResult.active_jobs, color: "text-green-400" },
                        { label: "Adzuna", value: actionResult.adzuna_jobs, color: "text-purple-400" },
                        { label: "Mock", value: actionResult.mock_jobs, color: "text-orange-400" },
                      ].map(s => (
                        <div key={s.label} className="bg-gray-800 rounded-lg p-3 text-center">
                          <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* API config */}
                  {actionResult.adzuna_configured !== undefined && (
                    <div className="space-y-2">
                      {[
                        { label: "Adzuna API", ok: actionResult.adzuna_configured },
                        { label: "JSearch API", ok: actionResult.jsearch_configured },
                      ].map(item => (
                        <div key={item.label} className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${item.ok ? "bg-green-400" : "bg-red-400"}`} />
                          <span className="text-sm text-gray-400">{item.label}</span>
                          <span className={`text-xs font-medium ${item.ok ? "text-green-400" : "text-red-400"}`}>
                            {item.ok ? "Configured" : "Missing"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Raw JSON fallback */}
                  <details className="mt-3">
                    <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-400">Raw JSON</summary>
                    <pre className="mt-2 bg-gray-800 rounded-lg p-3 text-xs text-gray-400 overflow-x-auto">
                      {JSON.stringify(actionResult, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          )}

          {/* ── USERS ── */}
          {activeTab === "users" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Users ({users.length})</h2>
                <button onClick={fetchUsers}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>

              {users.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                  <p className="text-gray-500 text-sm">No user data available — make sure the backend /api/admin/users endpoint exists.</p>
                </div>
              ) : (
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800">
                        {["ID", "Name", "Email", "Joined", "Analyses", "Cover Letters", "Chats"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {users.map((u: any) => (
                        <tr key={u.id} className="hover:bg-gray-800 transition-colors">
                          <td className="px-4 py-3 text-gray-600 font-mono text-xs">#{u.id}</td>
                          <td className="px-4 py-3 text-white font-medium">{u.full_name}</td>
                          <td className="px-4 py-3 text-gray-400">{u.email}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                          <td className="px-4 py-3 text-center"><span className="text-blue-400 font-semibold">{u.resume_analyses_count ?? 0}</span></td>
                          <td className="px-4 py-3 text-center"><span className="text-green-400 font-semibold">{u.cover_letters_count ?? 0}</span></td>
                          <td className="px-4 py-3 text-center"><span className="text-purple-400 font-semibold">{u.chat_messages_count ?? 0}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── SYSTEM ── */}
          {activeTab === "system" && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold">System</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Environment</h3>
                  <div className="space-y-2 text-xs">
                    {[
                      { label: "API URL", value: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000" },
                      { label: "Environment", value: process.env.NODE_ENV },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between py-1 border-b border-gray-800">
                        <span className="text-gray-500">{item.label}</span>
                        <span className="text-gray-300 font-mono">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Quick Actions</h3>
                  <div className="space-y-2">
                    {[
                      { label: "Check scheduler", action: () => { fetchStats(); setActiveTab("overview"); } },
                      { label: "Populate jobs", action: () => { setActiveTab("jobs"); runAction("/api/admin/populate-jobs", "POST"); } },
                      { label: "View users", action: () => setActiveTab("users") },
                    ].map(item => (
                      <button key={item.label} onClick={item.action}
                        className="w-full text-left px-3 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                        → {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}