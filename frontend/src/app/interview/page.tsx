"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MobileBottomNav } from "../components/layout/Header";
import ProtectedRoute from "../components/auth/ProtectedRoute";

const INTERVIEW_TYPES = [
  { id: "technical",    label: "Technical",    icon: "💻", desc: "Coding, system design, problem solving" },
  { id: "behavioural",  label: "Behavioural",  icon: "🌟", desc: "STAR-format past experience questions" },
  { id: "situational",  label: "Situational",  icon: "🤔", desc: "\"What would you do if...\" scenarios" },
  { id: "hr",           label: "HR / Culture", icon: "🤝", desc: "Values, motivation, teamwork fit" },
];

const DIFFICULTIES = [
  { id: "easy",   label: "Entry Level",  desc: "0–2 years experience" },
  { id: "medium", label: "Mid Level",    desc: "2–5 years experience" },
  { id: "hard",   label: "Senior Level", desc: "5+ years experience" },
];

const QUESTION_COUNTS = [5, 10, 15];

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
    if (!role.trim()) { setError("Please enter the role you're interviewing for."); return; }
    setLoading(true);
    setError("");

    try {
      // Read token at submit time — tries both keys in case of register vs login
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      if (!token) { setError("You must be logged in to start an interview."); setLoading(false); return; }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/interview/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          role: role.trim(),
          company: company.trim() || null,
          interview_type: interviewType,
          difficulty,
          num_questions: numQuestions,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to start interview.");

      // Store session in sessionStorage for the live page
      sessionStorage.setItem("interview_session", JSON.stringify(data));
      router.push(`/interview/session?id=${data.session_id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold">M</span>
          </div>
          <span className="font-semibold text-gray-900">Mock Interview</span>
        </div>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Dashboard</Link>
      </div>

      <div className="max-w-2xl mx-auto py-10 px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Set up your interview</h1>
          <p className="text-gray-500">AI-powered questions tailored to your role and experience level</p>
        </div>

        <form onSubmit={handleStart} className="space-y-6">
          {/* Role + Company */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">About the role</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Job title / Role <span className="text-red-500">*</span>
              </label>
              <input
                type="text" value={role} onChange={e => setRole(e.target.value)}
                placeholder="e.g. Software Engineer, Data Analyst, Product Manager"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900
                           placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Company <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text" value={company} onChange={e => setCompany(e.target.value)}
                placeholder="e.g. Google, NHS, Deloitte"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900
                           placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Interview Type */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Interview type</h2>
            <div className="grid grid-cols-2 gap-3">
              {INTERVIEW_TYPES.map(t => (
                <button key={t.id} type="button" onClick={() => setInterviewType(t.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    interviewType === t.id
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}>
                  <div className="text-2xl mb-1">{t.icon}</div>
                  <div className="font-medium text-gray-900 text-sm">{t.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Difficulty</h2>
            <div className="grid grid-cols-3 gap-3">
              {DIFFICULTIES.map(d => (
                <button key={d.id} type="button" onClick={() => setDifficulty(d.id)}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    difficulty === d.id
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}>
                  <div className="font-medium text-gray-900 text-sm">{d.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{d.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Number of questions */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Number of questions</h2>
            <div className="flex gap-3">
              {QUESTION_COUNTS.map(n => (
                <button key={n} type="button" onClick={() => setNumQuestions(n)}
                  className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                    numQuestions === n
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}>
                  {n} questions
                  <div className="text-xs font-normal text-gray-400 mt-0.5">
                    ~{n * 3} min
                  </div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white
                       font-semibold py-3.5 rounded-xl transition-colors text-sm">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Generating questions…
              </span>
            ) : "Start interview →"}
          </button>

          <div className="text-center">
            <Link href="/interview/history" className="text-sm text-indigo-600 hover:text-indigo-700">
              View past sessions →
            </Link>
          </div>
        </form>
      </div>
      <MobileBottomNav />
    </div>
  );
}

export default function InterviewSetupPage() {
  return <ProtectedRoute><SetupContent /></ProtectedRoute>;
}