"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Code2, Sparkles, Lightbulb, Users, Loader2, AlertCircle, ChevronRight } from "lucide-react";
import { Header, MobileBottomNav } from "../components/layout/Header";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import apiClient from "../../../lib/apiService";

const INTERVIEW_TYPES = [
  { id: "technical", label: "Technical", icon: Code2, iconBg: "bg-blue-600", desc: "Coding, system design, problem solving" },
  { id: "behavioural", label: "Behavioural", icon: Sparkles, iconBg: "bg-purple-600", desc: "STAR-format past experience questions" },
  { id: "situational", label: "Situational", icon: Lightbulb, iconBg: "bg-orange-500", desc: "\"What would you do if...\" scenarios" },
  { id: "hr", label: "HR / Culture", icon: Users, iconBg: "bg-green-600", desc: "Values, motivation, teamwork fit" },
];

const DIFFICULTIES = [
  { id: "easy", label: "Entry level", desc: "0–2 years experience" },
  { id: "medium", label: "Mid level", desc: "2–5 years experience" },
  { id: "hard", label: "Senior level", desc: "5+ years experience" },
];

const QUESTION_COUNTS = [5, 10, 15];

const inputClass =
  "w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

const cardClass = "bg-white rounded-xl border border-gray-100 shadow-sm p-5 sm:p-6";

function optionClass(selected: boolean) {
  return `rounded-xl border-2 transition-all ${
    selected ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
  }`;
}

function SetupContent() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [interviewType, setInterviewType] = useState("behavioural");
  const [difficulty, setDifficulty] = useState("medium");
  const [numQuestions, setNumQuestions] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!role.trim()) {
      setError("Please enter the role you're interviewing for.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await apiClient.post("/api/interview/start", {
        role: role.trim(),
        company: company.trim() || null,
        interview_type: interviewType,
        difficulty,
        num_questions: numQuestions,
      });
      const data = res.data;

      // The live session page reads this
      sessionStorage.setItem("interview_session", JSON.stringify(data));
      router.push(`/interview/session?id=${data.session_id}`);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to start the interview. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 sm:pb-0">
      <Header />

      {/* Banner, same gradient as the dashboard */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <h1 className="text-xl sm:text-3xl font-bold mb-1 leading-tight">Mock interview</h1>
          <p className="text-blue-100 text-sm">
            AI-generated questions for your role and level, with scoring and feedback on every answer.
          </p>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <form onSubmit={handleStart} className="space-y-5">
          {/* Role and company */}
          <section className={`${cardClass} space-y-4`}>
            <h2 className="text-base font-semibold text-gray-900">About the role</h2>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1.5">
                Job title <span className="text-red-500">*</span>
              </label>
              <input
                id="role"
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Software Engineer, Data Analyst"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1.5">
                Company <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="company"
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Monzo, NHS, Deloitte"
                className={inputClass}
              />
            </div>
          </section>

          {/* Interview type */}
          <section className={cardClass}>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Interview type</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {INTERVIEW_TYPES.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setInterviewType(t.id)}
                    aria-pressed={interviewType === t.id}
                    className={`${optionClass(interviewType === t.id)} p-4 text-left flex items-start gap-3`}
                  >
                    <div className={`${t.iconBg} w-10 h-10 rounded-lg flex items-center justify-center shrink-0`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 text-sm">{t.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5 leading-snug">{t.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Difficulty */}
          <section className={cardClass}>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Difficulty</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDifficulty(d.id)}
                  aria-pressed={difficulty === d.id}
                  className={`${optionClass(difficulty === d.id)} p-4 text-center`}
                >
                  <div className="font-semibold text-gray-900 text-sm">{d.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{d.desc}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Number of questions */}
          <section className={cardClass}>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Number of questions</h2>
            <div className="grid grid-cols-3 gap-3">
              {QUESTION_COUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNumQuestions(n)}
                  aria-pressed={numQuestions === n}
                  className={`${optionClass(numQuestions === n)} py-3 font-semibold text-sm ${
                    numQuestions === n ? "text-blue-700" : "text-gray-700"
                  }`}
                >
                  {n} questions
                  <div className="text-xs font-normal text-gray-400 mt-0.5">about {n * 3} min</div>
                </button>
              ))}
            </div>
          </section>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating questions...
              </>
            ) : (
              "Start interview"
            )}
          </button>

          <div className="text-center">
            <Link
              href="/interview/history"
              className="inline-flex items-center gap-0.5 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View past sessions <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </form>
      </main>

      <MobileBottomNav />
    </div>
  );
}

export default function InterviewSetupPage() {
  return (
    <ProtectedRoute>
      <SetupContent />
    </ProtectedRoute>
  );
}