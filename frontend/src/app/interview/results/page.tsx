"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "../../components/auth/ProtectedRoute";

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
  const label = score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Needs Work" : "Keep Practising";
  const r = 54, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#f3f4f6" strokeWidth="12" />
        <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 70 70)" />
        <text x="70" y="65" textAnchor="middle" fontSize="28" fontWeight="700" fill="#111827">{score}</text>
        <text x="70" y="84" textAnchor="middle" fontSize="12" fill="#6b7280">/100</text>
      </svg>
      <span className="text-sm font-semibold" style={{ color }}>{label}</span>
    </div>
  );
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("id");
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(0);

  useEffect(() => {
    if (!sessionId) { router.push("/interview"); return; }
    (async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/interview/sessions/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setSession(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, router]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );

  if (!session) return null;

  const scoreColor = (s: number) =>
    s >= 80 ? "text-green-600 bg-green-50" :
    s >= 60 ? "text-yellow-600 bg-yellow-50" :
    "text-red-600 bg-red-50";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-gray-900">Interview Results</span>
        <Link href="/interview/history" className="text-sm text-indigo-600 hover:text-indigo-700">
          View all sessions →
        </Link>
      </div>

      <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
        {/* Summary card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <ScoreRing score={Math.round(session.overall_score ?? 0)} />
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {session.role}{session.company ? ` @ ${session.company}` : ""}
              </h1>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start mb-4">
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full capitalize">
                  {session.interview_type}
                </span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full capitalize">
                  {session.difficulty}
                </span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                  {session.total_questions} questions
                </span>
              </div>

              {/* Per-question score row */}
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                {session.questions.map((q: any) => (
                  <button key={q.id} onClick={() => setExpanded(expanded === q.number - 1 ? null : q.number - 1)}
                    className={`w-9 h-9 rounded-lg text-xs font-semibold transition-all ${scoreColor(q.score ?? 0)}`}>
                    Q{q.number}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-6 grid grid-cols-3 gap-4 pt-6 border-t border-gray-100">
            {[
              { label: "Avg score", value: `${Math.round(session.overall_score ?? 0)}%` },
              { label: "Best answer", value: `Q${session.questions.reduce((best: any, q: any) => (q.score ?? 0) > (best.score ?? 0) ? q : best, session.questions[0])?.question_number}` },
              { label: "Completed", value: session.completed_at ? new Date(session.completed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—" },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <div className="text-xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Per-question breakdown */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900 px-1">Question breakdown</h2>
          {session.questions.map((q: any, i: number) => (
            <div key={q.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <button onClick={() => setExpanded(expanded === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400">Q{q.number}</span>
                  <p className="text-sm font-medium text-gray-900 line-clamp-1">{q.text}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                  <span className={`text-sm font-semibold px-2.5 py-1 rounded-lg ${scoreColor(q.score ?? 0)}`}>
                    {q.score ?? "—"}/100
                  </span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded === i ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {expanded === i && (
                <div className="px-5 pb-5 space-y-4 border-t border-gray-100">
                  <div className="pt-4">
                    <p className="text-xs font-medium text-gray-500 mb-1">Question</p>
                    <p className="text-sm text-gray-800">{q.text}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-medium text-gray-500 mb-1">Your answer
                      {q.answer_method === "voice" && <span className="ml-1 text-indigo-500">🎤 voice</span>}
                    </p>
                    <p className="text-sm text-gray-700">{q.user_answer || "Not answered"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Feedback</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{q.feedback}</p>
                  </div>
                  <div className="bg-indigo-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-indigo-700 mb-1">💬 Ideal answer</p>
                    <p className="text-sm text-indigo-900 leading-relaxed">{q.ideal_answer}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex gap-3">
          <Link href="/interview"
            className="flex-1 text-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold
                       text-sm py-3 rounded-xl transition-colors">
            Practice again
          </Link>
          <Link href="/interview/history"
            className="flex-1 text-center bg-white border border-gray-200 hover:bg-gray-50 text-gray-700
                       font-semibold text-sm py-3 rounded-xl transition-colors">
            All sessions
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function InterviewResultsPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      }>
        <ResultsContent />
      </Suspense>
    </ProtectedRoute>
  );
}