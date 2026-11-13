"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Code2, Sparkles, Lightbulb, Users, Mic, Trash2, Loader2, AlertCircle, Plus, ChevronRight } from "lucide-react";
import ProtectedRoute from "../../components/auth/ProtectedRoute";
import { Header, MobileBottomNav } from "../../components/layout/Header";
import apiClient from "../../../../lib/apiService";

const typeStyle: Record<string, { icon: any; bg: string }> = {
  technical: { icon: Code2, bg: "bg-blue-600" },
  behavioural: { icon: Sparkles, bg: "bg-purple-600" },
  situational: { icon: Lightbulb, bg: "bg-orange-500" },
  hr: { icon: Users, bg: "bg-green-600" },
};

function ScorePill({ score }: { score: number | null }) {
  if (score === null || score === undefined) {
    return <span className="text-xs text-gray-400">No score yet</span>;
  }
  const cls =
    score >= 80
      ? "bg-green-100 text-green-700 border-green-200"
      : score >= 60
      ? "bg-yellow-100 text-yellow-700 border-yellow-200"
      : "bg-red-100 text-red-700 border-red-200";
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cls}`}>{Math.round(score)}%</span>
  );
}

function HistoryContent() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSessions();
  }, []);

  async function fetchSessions() {
    try {
      const res = await apiClient.get("/api/interview/sessions");
      setSessions(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError("We couldn't load your sessions. Please refresh to try again.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteSession(id: number) {
    if (!window.confirm("Delete this interview session? This can't be undone.")) return;
    setDeleting(id);
    setError("");
    try {
      await apiClient.delete(`/api/interview/sessions/${id}`);
      setSessions((s) => s.filter((x) => x.id !== id));
    } catch {
      setError("Couldn't delete that session. Please try again.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 sm:pb-0">
      <Header />

      {/* Banner, same gradient as the dashboard */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold mb-1 leading-tight">Interview history</h1>
            <p className="text-blue-100 text-sm">Your past mock interviews and scores</p>
          </div>
          <Link
            href="/interview"
            className="shrink-0 flex items-center gap-1.5 bg-white text-blue-700 hover:bg-blue-50 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New session</span>
            <span className="sm:hidden">New</span>
          </Link>
        </div>
      </div>

      <main className="max-w-3xl mx-auto py-6 px-4 sm:px-6">
        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : sessions.length === 0 && !error ? (
          <div className="text-center py-14 bg-white rounded-xl border border-gray-100 shadow-sm px-4">
            <div className="w-12 h-12 rounded-lg bg-purple-600 flex items-center justify-center mx-auto mb-4">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">No sessions yet</h2>
            <p className="text-sm text-gray-500 mb-6">Start your first mock interview to see results here.</p>
            <Link
              href="/interview"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors"
            >
              Start interview
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.length > 0 && (
              <h2 className="text-base font-semibold text-gray-900 px-1">
                {sessions.length} session{sessions.length !== 1 ? "s" : ""}
              </h2>
            )}

            {sessions.map((s) => {
              const style = typeStyle[s.interview_type] ?? { icon: Mic, bg: "bg-gray-500" };
              const Icon = style.icon;
              const completed = s.status === "completed";

              return (
                <div
                  key={s.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`${style.bg} w-10 h-10 rounded-lg flex items-center justify-center shrink-0`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-x-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm sm:text-base truncate">{s.role}</span>
                        {s.company && <span className="text-sm text-gray-400 truncate">@ {s.company}</span>}
                      </div>
                      <div className="flex items-center gap-x-2 mt-0.5 flex-wrap text-xs text-gray-500">
                        <span className="capitalize">{s.interview_type}</span>
                        <span className="text-gray-300">·</span>
                        <span className="capitalize">{s.difficulty}</span>
                        <span className="text-gray-300">·</span>
                        <span>{s.total_questions} questions</span>
                        <span className="text-gray-300">·</span>
                        <span>
                          {new Date(s.created_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <ScorePill score={completed ? s.overall_score : null} />
                    {completed ? (
                      <Link
                        href={`/interview/results?id=${s.id}`}
                        className="inline-flex items-center gap-0.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View <ChevronRight className="w-4 h-4" />
                      </Link>
                    ) : (
                      <span className="text-xs text-amber-600 font-medium">In progress</span>
                    )}
                    <button
                      onClick={() => deleteSession(s.id)}
                      disabled={deleting === s.id}
                      aria-label="Delete session"
                      className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {deleting === s.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}

export default function InterviewHistoryPage() {
  return (
    <ProtectedRoute>
      <HistoryContent />
    </ProtectedRoute>
  );
}