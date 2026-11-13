"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Mic, Square, Loader2, AlertCircle, CheckCircle2, Lightbulb, MessageCircle } from "lucide-react";
import ProtectedRoute from "../../components/auth/ProtectedRoute";
import apiClient from "../../../../lib/apiService";

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
    score >= 80
      ? "bg-green-100 text-green-700 border-green-200"
      : score >= 60
      ? "bg-yellow-100 text-yellow-700 border-yellow-200"
      : "bg-red-100 text-red-700 border-red-200";
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${color}`}>
      {score}/100
    </span>
  );
}

function PageSpinner() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
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
  const [transcribing, setTranscribing] = useState(false);
  const [answerMethod, setAnswerMethod] = useState<"text" | "voice">("text");
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const stored = sessionStorage.getItem("interview_session");
    if (!stored) {
      router.push("/interview");
      return;
    }
    try {
      const data = JSON.parse(stored);
      // Ignore a leftover session from a different interview
      if (sessionId && String(data.session_id) !== sessionId) {
        router.push("/interview");
        return;
      }
      setSession(data);
      setCurrentQ(data.current_question);
      setQuestionsAnswered(data.questions_answered ?? 0);
    } catch {
      router.push("/interview");
    }
  }, [sessionId, router]);

  // Release the microphone if the person leaves mid-recording
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ── Voice recording ───────────────────────────────────────────────────────
  async function startRecording() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const useWebm = typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm");
      const mr = useWebm ? new MediaRecorder(stream, { mimeType: "audio/webm" }) : new MediaRecorder(stream);

      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = mr.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        await transcribeAudio(blob, type.includes("mp4") ? "recording.m4a" : "recording.webm");
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
    } catch {
      setError("Microphone access denied. Please allow microphone access or type your answer.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  async function transcribeAudio(blob: Blob, filename: string) {
    setTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, filename);
      const res = await apiClient.post("/api/interview/transcribe", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const text = res.data?.text;
      if (text) {
        setAnswer((prev) => (prev ? prev + " " + text : text));
        setAnswerMethod("voice");
      }
    } catch {
      setError("Transcription failed. You can type your answer instead.");
    } finally {
      setTranscribing(false);
    }
  }

  // ── Submit answer ─────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim()) {
      setError("Please provide an answer before submitting.");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const res = await apiClient.post("/api/interview/answer", {
        session_id: parseInt(sessionId!),
        question_id: currentQ.id,
        answer: answer.trim(),
        answer_method: answerMethod,
      });
      setResult(res.data);
      setQuestionsAnswered(res.data.questions_answered);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to submit your answer. Please try again.");
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
      // Remember progress so a refresh doesn't send the person back to question 1
      const updated = {
        ...session,
        current_question: result.next_question,
        questions_answered: result.questions_answered,
      };
      sessionStorage.setItem("interview_session", JSON.stringify(updated));
      setSession(updated);

      setCurrentQ(result.next_question);
      setAnswer("");
      setAnswerMethod("text");
      setResult(null);
      setError("");
    }
  }

  if (!session || !currentQ) return <PageSpinner />;

  const progress = (questionsAnswered / session.total_questions) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compact top bar, no site nav so the interview stays focused */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center shrink-0">
              <Mic className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {session.role}
                {session.company && <span className="font-normal text-gray-400"> @ {session.company}</span>}
              </p>
              <p className="text-xs text-gray-500 capitalize">{session.interview_type} interview</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm text-gray-500">
              {questionsAnswered}/{session.total_questions}
            </span>
            <Link href="/interview" className="text-sm text-gray-500 hover:text-gray-700">
              Exit
            </Link>
          </div>
        </div>
        <div className="max-w-3xl mx-auto mt-2.5">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6 space-y-5">
        {/* Question card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">
              Question {currentQ.number} of {session.total_questions}
            </span>
            <span className="text-xs text-gray-400 capitalize">{session.difficulty}</span>
          </div>
          <p className="text-lg font-medium text-gray-900 leading-relaxed">{currentQ.text}</p>
        </div>

        {/* Answer area, hidden once submitted */}
        {!result && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-base font-semibold text-gray-900">Your answer</h3>
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={transcribing}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-all font-medium disabled:opacity-50 ${
                  isRecording
                    ? "bg-red-50 border-red-200 text-red-600"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {isRecording ? <Square className="w-3.5 h-3.5 fill-current" /> : <Mic className="w-4 h-4" />}
                {isRecording ? "Stop recording" : "Record answer"}
              </button>
            </div>

            {isRecording && (
              <div className="mb-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Recording. Speak your answer clearly.
              </div>
            )}
            {transcribing && (
              <div className="mb-3 flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-100 px-3 py-2 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin" />
                Turning your recording into text...
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <textarea
                value={answer}
                onChange={(e) => {
                  setAnswer(e.target.value);
                  setAnswerMethod("text");
                }}
                rows={6}
                placeholder="Type your answer here, or use the record button to speak it..."
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />

              {error && (
                <div
                  role="alert"
                  className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-xs text-gray-400">{answer.length} characters</span>
                <button
                  type="submit"
                  disabled={submitting || transcribing || !answer.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Scoring...
                    </span>
                  ) : (
                    "Submit answer"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Feedback card */}
        {result && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Feedback</h3>
              <ScoreBadge score={result.score} />
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
              <p className="text-xs font-medium text-gray-500 mb-1">Your answer</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{answer}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Feedback</p>
              <p className="text-sm text-gray-700 leading-relaxed">{result.feedback}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {result.strengths?.length > 0 && (
                <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-green-700 mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Strengths
                  </p>
                  <ul className="space-y-1">
                    {result.strengths.map((s, i) => (
                      <li key={i} className="text-xs text-green-800 leading-snug">
                        • {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.improvements?.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 mb-2">
                    <Lightbulb className="w-3.5 h-3.5" /> To improve
                  </p>
                  <ul className="space-y-1">
                    {result.improvements.map((imp, i) => (
                      <li key={i} className="text-xs text-amber-800 leading-snug">
                        • {imp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 mb-1">
                <MessageCircle className="w-3.5 h-3.5" /> Ideal answer
              </p>
              <p className="text-sm text-blue-900 leading-relaxed">{result.ideal_answer}</p>
            </div>

            <button
              onClick={handleNext}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-3 rounded-lg transition-colors"
            >
              {result.is_complete
                ? "View results"
                : `Next question (${result.questions_answered}/${result.total_questions})`}
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
      <Suspense fallback={<PageSpinner />}>
        <SessionContent />
      </Suspense>
    </ProtectedRoute>
  );
}