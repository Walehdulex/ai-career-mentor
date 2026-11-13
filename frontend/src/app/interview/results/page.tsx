"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, Loader2, AlertCircle, Mic, MessageCircle } from "lucide-react";
import ProtectedRoute from "../../components/auth/ProtectedRoute";
import { Header, MobileBottomNav } from "../../components/layout/Header";
import apiClient from "../../../../lib/apiService";

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
  const label = score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Needs work" : "Keep practising";
  const r = 54,
    circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label={`Overall score ${score} out of 100`}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="#f3f4f6" strokeWidth="12" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
        />
        <text x="70" y="65" textAnchor="middle" fontSize="28" fontWeight="700" fill="#111827">
          {score}
        </text>
        <text x="70" y="84" textAnchor="middle" fontSize="12" fill="#6b7280">
          /100
        </text>
      </svg>
      <span className="text-sm font-semibold" style={{ color }}>
        {label}
      </span>
    </div>
  );
}

const scoreColor = (s: number) =>
  s >= 80
    ? "text-green-700 bg-green-50 border-green-200"
    : s >= 60
    ? "text-yellow-700 bg-yellow-50 border-yellow-200"
    : "text-red-700 bg-red-50 border-red-200";

function PageSpinner() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("id");
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<number | null>(0);

  useEffect(() => {
    if (!sessionId) {
      router.push("/interview");
      return;
    }
    (async () => {
      try {
        const res = await apiClient.get(`/api/interview/sessions/${sessionId}`);
        setSession(res.data);
      } catch (err: any) {
        const detail = err.response?.data?.detail;
        setError(typeof detail === "string" ? detail : "We couldn't load these results.");
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, router]);

  if (loading) return <PageSpinner />;

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24 sm:pb-0">
        <Header />
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-1">Results not available</h1>
          <p className="text-sm text-gray-500 mb-6">{error || "We couldn't find that interview session."}</p>
          <Link
            href="/interview/history"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors"
          >
            View all sessions
          </Link>
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  const questions: any[] = Array.isArray(session.questions) ? session.questions : [];
  const best = questions.length
    ? questions.reduce((b, q) => ((q.score ?? 0) > (b.score ?? 0) ? q : b), questions[0])
    : null;
  const overall = Math.round(session.overall_score ?? 0);

  const stats = [
    { label: "Average score", value: `${overall}%` },
    { label: "Best answer", value: best ? `Q${best.number ?? best.question_number ?? 1}` : "-" },
    {
      label: "Completed",
      value: session.completed_at
        ? new Date(session.completed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
        : "-",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24 sm:pb-0">
      <Header />

      {/* Banner, same gradient as the dashboard */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold mb-1 leading-tight">Interview results</h1>
            <p className="text-blue-100 text-sm">Review your score and feedback on each answer</p>
          </div>
          <Link
            href="/interview/history"
            className="shrink-0 text-sm font-medium text-white border border-white/40 hover:bg-white/10 px-3 py-2 rounded-lg transition-colors"
          >
            All sessions
          </Link>
        </div>
      </div>

      <main className="max-w-3xl mx-auto py-6 px-4 sm:px-6 space-y-6">
        {/* Summary card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
            <ScoreRing score={overall} />
            <div className="flex-1 text-center sm:text-left min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                {session.role}
                {session.company ? ` @ ${session.company}` : ""}
              </h2>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start mb-4">
                <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full capitalize">
                  {session.interview_type}
                </span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full capitalize">
                  {session.difficulty}
                </span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                  {session.total_questions} questions
                </span>
              </div>

              {/* Jump to a question */}
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                {questions.map((q, i) => (
                  <button
                    key={q.id}
                    onClick={() => setExpanded(expanded === i ? null : i)}
                    aria-label={`Question ${q.number ?? i + 1}`}
                    className={`w-10 h-9 rounded-lg border text-xs font-semibold transition-all ${scoreColor(
                      q.score ?? 0
                    )} ${expanded === i ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
                  >
                    Q{q.number ?? i + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4 pt-6 border-t border-gray-100">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Per-question breakdown */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900">Question breakdown</h2>
          {questions.map((q, i) => (
            <div key={q.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === i ? null : i)}
                aria-expanded={expanded === i}
                className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-bold text-gray-400 shrink-0">Q{q.number ?? i + 1}</span>
                  <p className="text-sm font-medium text-gray-900 line-clamp-1">{q.text}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-sm font-semibold px-2.5 py-1 rounded-lg border ${scoreColor(q.score ?? 0)}`}>
                    {q.score ?? "-"}/100
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform ${expanded === i ? "rotate-180" : ""}`}
                  />
                </div>
              </button>

              {expanded === i && (
                <div className="px-4 sm:px-5 pb-5 space-y-4 border-t border-gray-100">
                  <div className="pt-4">
                    <p className="text-xs font-medium text-gray-500 mb-1">Question</p>
                    <p className="text-sm text-gray-800">{q.text}</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                      Your answer
                      {q.answer_method === "voice" && (
                        <span className="inline-flex items-center gap-1 text-blue-600">
                          <Mic className="w-3 h-3" /> voice
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{q.user_answer || "Not answered"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Feedback</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{q.feedback}</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 mb-1">
                      <MessageCircle className="w-3.5 h-3.5" /> Ideal answer
                    </p>
                    <p className="text-sm text-blue-900 leading-relaxed">{q.ideal_answer}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </section>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/interview"
            className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-3 rounded-lg transition-colors"
          >
            Practice again
          </Link>
          <Link
            href="/interview/history"
            className="flex-1 text-center bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium text-sm py-3 rounded-lg transition-colors"
          >
            All sessions
          </Link>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}

export default function InterviewResultsPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<PageSpinner />}>
        <ResultsContent />
      </Suspense>
    </ProtectedRoute>
  );
}