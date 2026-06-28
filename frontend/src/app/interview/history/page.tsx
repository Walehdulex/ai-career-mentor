"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ProtectedRoute from "../../components/auth/ProtectedRoute";

function ScorePill({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-gray-400">In progress</span>;
  const cls = score >= 80 ? "bg-green-100 text-green-700" : score >= 60 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700";
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>{Math.round(score)}%</span>;
}

function HistoryContent() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => { fetchSessions(); }, []);

  async function fetchSessions() {
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/interview/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  async function deleteSession(id: number) {
    setDeleting(id);
    try {
      const token = localStorage.getItem("auth_token");
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/interview/sessions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setSessions(s => s.filter(x => x.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  const typeIcon: Record<string, string> = {
    technical: "💻", behavioural: "🌟", situational: "🤔", hr: "🤝",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/interview" className="text-sm text-gray-500 hover:text-gray-700">← New session</Link>
          <span className="text-gray-300">|</span>
          <span className="font-semibold text-gray-900">Interview History</span>
        </div>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">Dashboard</Link>
      </div>

      <div className="max-w-3xl mx-auto py-8 px-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🎤</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No sessions yet</h2>
            <p className="text-gray-500 mb-6">Start your first mock interview to see results here.</p>
            <Link href="/interview"
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold
                         text-sm px-6 py-3 rounded-xl transition-colors">
              Start interview
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1 mb-4">
              <h2 className="font-semibold text-gray-900">{sessions.length} session{sessions.length !== 1 ? "s" : ""}</h2>
              <Link href="/interview"
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold
                           px-4 py-2 rounded-lg transition-colors">
                + New session
              </Link>
            </div>

            {sessions.map(s => (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <span className="text-2xl flex-shrink-0">{typeIcon[s.interview_type] ?? "🎤"}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 truncate">{s.role}</span>
                      {s.company && <span className="text-sm text-gray-400 truncate">@ {s.company}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-gray-400 capitalize">{s.interview_type}</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-400 capitalize">{s.difficulty}</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{s.total_questions} questions</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-400">
                        {new Date(s.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <ScorePill score={s.overall_score} />
                  {s.status === "completed" ? (
                    <Link href={`/interview/results?id=${s.id}`}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                      View →
                    </Link>
                  ) : (
                    <span className="text-xs text-amber-600 font-medium">In progress</span>
                  )}
                  <button onClick={() => deleteSession(s.id)} disabled={deleting === s.id}
                    className="text-gray-300 hover:text-red-400 transition-colors disabled:opacity-50">
                    {deleting === s.id ? (
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function InterviewHistoryPage() {
  return <ProtectedRoute><HistoryContent /></ProtectedRoute>;
}