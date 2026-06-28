import json
import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from backend.database import Base, get_db, User, UserProfile
from backend.auth import get_current_user_id
from openai import OpenAI
from fastapi import UploadFile, File
import tempfile, os

router = APIRouter(prefix="/api/interview", tags=["interview"])
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# ── Models ────────────────────────────────────────────────────────────────────
class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id             = Column(Integer, primary_key=True, index=True)
    user_id        = Column(Integer, ForeignKey("users.id"), nullable=False)
    role           = Column(String, nullable=False)
    company        = Column(String, nullable=True)
    interview_type = Column(String, nullable=False)   # technical | behavioural | situational | hr
    difficulty     = Column(String, nullable=False)   # easy | medium | hard
    total_questions= Column(Integer, nullable=False)
    status         = Column(String, default="in_progress")  # in_progress | completed
    overall_score  = Column(Float, nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow)
    completed_at   = Column(DateTime, nullable=True)

    questions = relationship("InterviewQuestion", back_populates="session", cascade="all, delete-orphan")


class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id             = Column(Integer, primary_key=True, index=True)
    session_id     = Column(Integer, ForeignKey("interview_sessions.id"), nullable=False)
    question_number= Column(Integer, nullable=False)
    question_text  = Column(Text, nullable=False)
    question_type  = Column(String, nullable=False)
    user_answer    = Column(Text, nullable=True)
    answer_method  = Column(String, nullable=True)   # text | voice
    score          = Column(Float, nullable=True)    # 0-100
    feedback       = Column(Text, nullable=True)
    ideal_answer   = Column(Text, nullable=True)
    answered_at    = Column(DateTime, nullable=True)

    session = relationship("InterviewSession", back_populates="questions")


# ── Schemas ───────────────────────────────────────────────────────────────────
class StartInterviewRequest(BaseModel):
    role: str
    company: Optional[str] = None
    interview_type: str   # technical | behavioural | situational | hr
    difficulty: str       # easy | medium | hard
    num_questions: int    # 5 | 10 | 15


class SubmitAnswerRequest(BaseModel):
    session_id: int
    question_id: int
    answer: str
    answer_method: str = "text"   # text | voice


class NextQuestionRequest(BaseModel):
    session_id: int


# ── Helpers ───────────────────────────────────────────────────────────────────
QUESTION_PROMPTS = {
    "technical": "Generate a technical interview question testing {role} skills. Focus on coding, system design, or problem solving. Difficulty: {difficulty}.",
    "behavioural": "Generate a behavioural interview question for a {role} role using the STAR framework (Situation, Task, Action, Result). Difficulty: {difficulty}.",
    "situational": "Generate a situational 'what would you do if...' interview question for a {role} role. Difficulty: {difficulty}.",
    "hr": "Generate an HR/culture fit interview question for a {role} role. Focus on motivation, values, teamwork, or career goals. Difficulty: {difficulty}.",
}


def _generate_questions(role: str, company: Optional[str], interview_type: str, difficulty: str, count: int) -> list[str]:
    company_ctx = f" at {company}" if company else ""
    type_prompt = QUESTION_PROMPTS.get(interview_type, QUESTION_PROMPTS["behavioural"])

    prompt = f"""You are an expert interviewer at a top tech company.
Generate exactly {count} unique interview questions for a {role} position{company_ctx}.
Interview type: {interview_type}
Difficulty: {difficulty}

{type_prompt.format(role=role, difficulty=difficulty)}

Rules:
- Each question must be distinct and non-repetitive
- Match the difficulty level: easy=entry level, medium=mid level, hard=senior level
- For technical: include at least one coding or system design question if count > 3
- For behavioural: use varied STAR scenarios
- Return ONLY a JSON array of question strings, no numbering, no extra text

Example format:
["Question 1?", "Question 2?", "Question 3?"]"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1500,
        temperature=0.8,
    )

    raw = response.choices[0].message.content.strip()
    # Strip markdown fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    questions = json.loads(raw.strip())
    return questions[:count]


def _score_answer(question: str, answer: str, role: str, interview_type: str, difficulty: str) -> dict:
    prompt = f"""You are an expert interviewer evaluating a candidate's answer.

Role: {role}
Interview Type: {interview_type}
Difficulty: {difficulty}
Question: {question}
Candidate's Answer: {answer}

Evaluate the answer and return ONLY a JSON object with these exact keys:
{{
  "score": <number 0-100>,
  "feedback": "<2-3 sentences of specific, constructive feedback on what was good and what could be improved>",
  "ideal_answer": "<a concise ideal answer or key points that should have been covered (3-5 sentences)>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"]
}}

Scoring guide:
- 90-100: Exceptional, clear, specific with great examples
- 75-89: Good with minor gaps
- 60-74: Adequate but lacks depth or specifics
- 40-59: Partially answers but missing key elements
- 0-39: Insufficient or off-topic

Return ONLY the JSON, no extra text."""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=600,
        temperature=0.3,
    )

    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


# ── Routes ────────────────────────────────────────────────────────────────────
@router.post("/start")
async def start_interview(
    req: StartInterviewRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Create a new interview session and generate all questions upfront."""
    if req.num_questions not in [5, 10, 15]:
        raise HTTPException(status_code=422, detail="num_questions must be 5, 10, or 15.")
    if req.interview_type not in ["technical", "behavioural", "situational", "hr"]:
        raise HTTPException(status_code=422, detail="Invalid interview_type.")
    if req.difficulty not in ["easy", "medium", "hard"]:
        raise HTTPException(status_code=422, detail="Invalid difficulty.")

    try:
        questions_text = _generate_questions(
            req.role, req.company, req.interview_type, req.difficulty, req.num_questions
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate questions: {str(e)}")

    session = InterviewSession(
        user_id=int(current_user_id),
        role=req.role,
        company=req.company,
        interview_type=req.interview_type,
        difficulty=req.difficulty,
        total_questions=req.num_questions,
        status="in_progress",
    )
    db.add(session)
    db.flush()

    for i, q_text in enumerate(questions_text, start=1):
        db.add(InterviewQuestion(
            session_id=session.id,
            question_number=i,
            question_text=q_text,
            question_type=req.interview_type,
        ))

    db.commit()
    db.refresh(session)

    first_q = db.query(InterviewQuestion).filter(
        InterviewQuestion.session_id == session.id,
        InterviewQuestion.question_number == 1,
    ).first()

    return {
        "session_id": session.id,
        "role": session.role,
        "company": session.company,
        "interview_type": session.interview_type,
        "difficulty": session.difficulty,
        "total_questions": session.total_questions,
        "current_question": {
            "id": first_q.id,
            "number": first_q.question_number,
            "text": first_q.question_text,
        },
    }


@router.post("/answer")
async def submit_answer(
    req: SubmitAnswerRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Score the submitted answer and return feedback + next question if any."""
    session = db.query(InterviewSession).filter(
        InterviewSession.id == req.session_id,
        InterviewSession.user_id == int(current_user_id),
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if session.status == "completed":
        raise HTTPException(status_code=400, detail="Session already completed.")

    question = db.query(InterviewQuestion).filter(
        InterviewQuestion.id == req.question_id,
        InterviewQuestion.session_id == req.session_id,
    ).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found.")
    if question.user_answer:
        raise HTTPException(status_code=400, detail="Question already answered.")

    if not req.answer.strip():
        raise HTTPException(status_code=422, detail="Answer cannot be empty.")

    try:
        result = _score_answer(
            question.question_text, req.answer,
            session.role, session.interview_type, session.difficulty,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scoring failed: {str(e)}")

    question.user_answer  = req.answer
    question.answer_method= req.answer_method
    question.score        = result["score"]
    question.feedback     = result["feedback"]
    question.ideal_answer = result["ideal_answer"]
    question.answered_at  = datetime.utcnow()
    db.commit()

    # Check if all questions answered
    answered = db.query(InterviewQuestion).filter(
        InterviewQuestion.session_id == session.id,
        InterviewQuestion.user_answer.isnot(None),
    ).count()

    next_q = None
    if answered < session.total_questions:
        next_q_obj = db.query(InterviewQuestion).filter(
            InterviewQuestion.session_id == session.id,
            InterviewQuestion.question_number == question.question_number + 1,
        ).first()
        if next_q_obj:
            next_q = {"id": next_q_obj.id, "number": next_q_obj.question_number, "text": next_q_obj.question_text}

    # Complete session if all answered
    is_complete = answered >= session.total_questions
    if is_complete:
        all_scores = db.query(InterviewQuestion).filter(
            InterviewQuestion.session_id == session.id
        ).all()
        scores = [q.score for q in all_scores if q.score is not None]
        session.overall_score = round(sum(scores) / len(scores), 1) if scores else 0
        session.status = "completed"
        session.completed_at = datetime.utcnow()
        db.commit()

    return {
        "question_id": question.id,
        "score": result["score"],
        "feedback": result["feedback"],
        "ideal_answer": result["ideal_answer"],
        "strengths": result.get("strengths", []),
        "improvements": result.get("improvements", []),
        "questions_answered": answered,
        "total_questions": session.total_questions,
        "is_complete": is_complete,
        "next_question": next_q,
        "overall_score": session.overall_score if is_complete else None,
    }

@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    current_user_id: str = Depends(get_current_user_id),
):
    """Transcribe a voice recording using OpenAI Whisper."""
    try:
        # Save to temp file (Whisper needs a real file path)
        suffix = ".webm"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
 
        with open(tmp_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="text",
            )
 
        os.unlink(tmp_path)
        return {"text": transcript.strip()}
 
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@router.get("/sessions")
async def get_interview_sessions(
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """List all interview sessions for the current user."""
    sessions = db.query(InterviewSession).filter(
        InterviewSession.user_id == int(current_user_id)
    ).order_by(InterviewSession.created_at.desc()).all()

    return [
        {
            "id": s.id,
            "role": s.role,
            "company": s.company,
            "interview_type": s.interview_type,
            "difficulty": s.difficulty,
            "total_questions": s.total_questions,
            "status": s.status,
            "overall_score": s.overall_score,
            "created_at": s.created_at.isoformat(),
            "completed_at": s.completed_at.isoformat() if s.completed_at else None,
        }
        for s in sessions
    ]


@router.get("/sessions/{session_id}")
async def get_session_results(
    session_id: int,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Full session detail with all Q&A, scores, and feedback."""
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == int(current_user_id),
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    questions = db.query(InterviewQuestion).filter(
        InterviewQuestion.session_id == session_id
    ).order_by(InterviewQuestion.question_number).all()

    return {
        "id": session.id,
        "role": session.role,
        "company": session.company,
        "interview_type": session.interview_type,
        "difficulty": session.difficulty,
        "total_questions": session.total_questions,
        "status": session.status,
        "overall_score": session.overall_score,
        "created_at": session.created_at.isoformat(),
        "completed_at": session.completed_at.isoformat() if session.completed_at else None,
        "questions": [
            {
                "id": q.id,
                "number": q.question_number,
                "text": q.question_text,
                "type": q.question_type,
                "user_answer": q.user_answer,
                "answer_method": q.answer_method,
                "score": q.score,
                "feedback": q.feedback,
                "ideal_answer": q.ideal_answer,
            }
            for q in questions
        ],
    }


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: int,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == int(current_user_id),
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    db.delete(session)
    db.commit()
    return {"message": "Session deleted."}