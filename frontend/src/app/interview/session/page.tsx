"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "../../components/auth/ProtectedRoute";

type AnswerResult = {
  score: number;
  feedback: string;
  ideal_answer: string;
  strengths: string[];
  improvements: string[];
  is_complete: boolean;
  next_question: { id: number; number: number; text: string } | null;
  overall_score: number | null;
  questions_answered: number;
  total_questions: number;
};

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-green-100 text-green-700" :
    score >= 60 ? "bg-yellow-100 text-yellow-700" :
    "bg-red-100 text-red-700";
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${color}`}>
      {score}/100
    </span>
  );
}

function SessionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("id");

  const [session, setSession] = useState<any>(null);
  const [currentQ, setCurrentQ] = useState<any>(null);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [answerMethod, setAnswerMethod] = useState<"text" | "voice">("text");
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const stored = sessionStorage.getItem("interview_session");
    if (stored) {
      const data = JSON.parse(stored);
      setSession(data);
      setCurrentQ(data.current_question);
    } else if (sessionId) {
      router.push("/interview");
    }
  }, [sessionId, router]);

  // ── Voice recording ───────────────────────────────────────────────────────
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await transcribeAudio(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
    } catch {
      setError("Microphone access denied. Please allow microphone access or use text input.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  async function transcribeAudio(blob: Blob) {
    try {
      const token = localStorage.getItem("auth_token");
      const formData = new FormData();
      formData.append("file", blob, "recording.webm");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/interview/transcribe`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.text) {
        setAnswer(prev => prev ? prev + " " + data.text : data.text);
        setAnswerMethod("voice");
      }
    } catch {
      setError("Transcription failed. Your answer has been kept as-is.");
    }
  }

  // ── Submit answer ─────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim()) { setError("Please provide an answer before submitting."); return; }
    setSubmitting(true);
    setError("");

    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/interview/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          session_id: parseInt(sessionId!),
          question_id: currentQ.id,
          answer: answer.trim(),
          answer_method: answerMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to submit answer.");
      setResult(data);
      setQuestionsAnswered(data.questions_answered);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    if (result?.is_complete) {
      sessionStorage.removeItem("interview_session");
      router.push(`/interview/results?id=${sessionId}`);
      return;
    }
    if (result?.next_question) {
      setCurrentQ(result.next_question);
      setAnswer("");
      setAnswerMethod("text");
      setResult(null);
      setError("");
    }
  }

  if (!session || !currentQ) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const progress = ((questionsAnswered) / session.total_questions) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-900">{session.role}</span>
            {session.company && <span className="text-sm text-gray-400">@ {session.company}</span>}
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full capitalize">
              {session.interview_type}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {questionsAnswered}/{session.total_questions} answered
            </span>
            <Link href="/interview" className="text-xs text-gray-400 hover:text-gray-600">Exit</Link>
          </div>
        </div>
        {/* Progress bar */}
        <div className="max-w-3xl mx-auto mt-2">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
        {/* Question card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
              Question {currentQ.number} of {session.total_questions}
            </span>
            <span className="text-xs text-gray-400 capitalize">{session.difficulty}</span>
          </div>
          <p className="text-lg font-medium text-gray-900 leading-relaxed">{currentQ.text}</p>
        </div>

        {/* Answer area — only show if not yet submitted */}
        {!result && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Your answer</h3>
              {/* Voice / Text toggle */}
              <div className="flex items-center gap-2">
                <button type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all font-medium ${
                    isRecording
                      ? "bg-red-50 border-red-200 text-red-600 animate-pulse"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}>
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd"
                      d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                      clipRule="evenodd"/>
                  </svg>
                  {isRecording ? "Stop recording" : "Record answer"}
                </button>
              </div>
            </div>

            {isRecording && (
              <div className="mb-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Recording… speak your answer clearly
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <textarea
                value={answer}
                onChange={e => { setAnswer(e.target.value); setAnswerMethod("text"); }}
                rows={6}
                placeholder="Type your answer here, or use the record button above to speak it…"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900
                           placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
                           focus:border-transparent resize-none"
              />

              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}

              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-gray-400">{answer.length} characters</span>
                <button type="submit" disabled={submitting || !answer.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white
                             font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors">
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Scoring…
                    </span>
                  ) : "Submit answer →"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Feedback card */}
        {result && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Feedback</h3>
              <ScoreBadge score={result.score} />
            </div>

            {/* Your answer recap */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-500 mb-1">Your answer</p>
              <p className="text-sm text-gray-700">{answer}</p>
            </div>

            {/* Feedback */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Feedback</p>
              <p className="text-sm text-gray-700 leading-relaxed">{result.feedback}</p>
            </div>

            {/* Strengths + Improvements */}
            <div className="grid grid-cols-2 gap-4">
              {result.strengths?.length > 0 && (
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-green-700 mb-2">✅ Strengths</p>
                  <ul className="space-y-1">
                    {result.strengths.map((s, i) => (
                      <li key={i} className="text-xs text-green-800">• {s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.improvements?.length > 0 && (
                <div className="bg-amber-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-amber-700 mb-2">💡 Improve</p>
                  <ul className="space-y-1">
                    {result.improvements.map((imp, i) => (
                      <li key={i} className="text-xs text-amber-800">• {imp}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Ideal answer */}
            <div className="bg-indigo-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-indigo-700 mb-1">💬 Ideal answer</p>
              <p className="text-sm text-indigo-900 leading-relaxed">{result.ideal_answer}</p>
            </div>

            <button onClick={handleNext}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold
                         text-sm py-3 rounded-xl transition-colors">
              {result.is_complete ? "View results →" : `Next question (${result.questions_answered}/${result.total_questions}) →`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InterviewSessionPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      }>
        <SessionContent />
      </Suspense>
    </ProtectedRoute>
  );
}