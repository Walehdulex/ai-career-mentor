from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
import os
import shutil
import json
import uuid
from pathlib import Path
from dotenv import load_dotenv
from resume_parser import ResumeParser
from database import create_tables, get_db, ChatSession, ChatMessage, ResumeAnalysis
from sqlalchemy.orm import Session


load_dotenv()

app = FastAPI()

#Creating database table
create_tables()

#Enabling CORS for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Next.js default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

client = OpenAI(api_key= os.getenv("OPENAI_API_KEY"))

# Initializing resume parser
resume_parser = ResumeParser()

#Creating Uploads directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

class ChatMessageSchema(BaseModel):
    message: str
    session_id: str | None = None

@app.get("/")
async def root():
    return {"message": "AI Career Mentor API is running"}

@app.post("/api/chat")
async def chat_with_ai(chat_message: ChatMessageSchema, db: Session = Depends(get_db)):
    try:
        #Creating or getting session
        session_id = chat_message.session_id or str(uuid.uuid4())


        #gettting or creating session
        chat_session = db.query(ChatSession).filter(ChatSession.session_id == session_id).first()
        if not chat_session:
            chat_session = ChatSession(session_id=session_id)
            db.add(chat_session)
            db.commit()
            db.refresh(chat_session)

        # Save user message (SQLAlchemy model, not Pydantic one)
        user_message = ChatMessage(
            session_id=session_id,
            role="user",
            content=chat_message.message
        )
        db.add(user_message)
        db.commit()
        db.refresh(user_message)

        # Get conversation history (last 10 messages)
        recent_messages = db.query(ChatMessage).filter(
            ChatMessage.session_id == session_id
        ).order_by(ChatMessage.timestamp.desc()).limit(10).all()

        # Build conversation context
        conversation_history = []
        for msg in reversed(recent_messages):
            role = "assistant" if msg.role == "ai" else msg.role  # Fix the role mapping
            conversation_history.append({
                "role": role,
                "content": msg.content
            })
        # Add current user message
        conversation_history.append({
            "role": "user",
            "content": chat_message.message
        })

        # System prompt
        system_prompt = """You are an AI career mentor specializing in tech careers.
        Help with resume advice, career transitions, skill development, interview prep,
        and job search strategies in the tech industry. Be practical and actionable.
        Remember previous context in this conversation."""

        # Prepare messages for OpenAI
        messages = [{"role": "system", "content": system_prompt}] + conversation_history

        # Call OpenAI
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=500,
            temperature=0.7
        )

        ai_response = response.choices[0].message.content

        # Save AI response
        ai_message = ChatMessage(
            session_id=session_id,
            role="ai",
            content=ai_response
        )
        db.add(ai_message)

        # Update session title if it's the first message
        if chat_session.title == "New Conversation":
            title = (
                chat_message.message[:50] + "..."
                if len(chat_message.message) > 50
                else chat_message.message
            )
            chat_session.title = title

        db.commit()

        return {
            "response": ai_response,
            "session_id": session_id,
            "status": "success"
        }

    except Exception as e:
        return {
            "response": f"Sorry, there was an error: {str(e)}",
            "status": "error"
        }
    
@app.get("/api/chat/sessions")
async def get_chat_sessions(db: Session = Depends(get_db)):
    """Get all chat sessions"""
    sessions = db.query(ChatSession).order_by(ChatSession.updated_at.desc()).all()
    return [
        {
            "session_id": session.session_id,
            "title": session.title,
            "created_at": session.created_at.isoformat(),
            "updated_at": session.updated_at.isoformat()
        }
        for session in sessions
    ]

@app.get("/api/chat/sessions/{session_id}")
async def get_chat_history(session_id: str, db: Session = Depends(get_db)):
    """Get chat history for a specific session"""
    messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.timestamp.asc()).all()
    
    return [
        {
            "role": msg.role,
            "content": msg.content,
            "timestamp": msg.timestamp.isoformat()
        }
        for msg in messages
    ]

@app.delete("/api/chat/sessions/{session_id}")
async def delete_chat_session(session_id: str, db: Session = Depends(get_db)):
    """Delete a chat session and all its messages"""
    chat_session = db.query(ChatSession).filter(ChatSession.session_id == session_id).first()
    if chat_session:
        db.delete(chat_session)
        db.commit()
        return {"status": "success", "message": "Session deleted"}
    return {"status": "error", "message": "Session not found"}    
@app.post("/api/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    """Uploading and parsing resume file"""
    try:
        # Validating file type
        if not file.filename.lower().endswith(('.pdf', '.docx')):
            raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")
        
        # Saving uploaded file
        file_path = UPLOAD_DIR / file.filename
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Parsing resume
        file_type = file.filename.split('.')[-1].lower()
        parsed_data = resume_parser.parse_resume(str(file_path), file_type)
        
        # Cleaning up uploaded file
        os.remove(file_path)
        
        if "error" in parsed_data:
            raise HTTPException(status_code=500, detail=parsed_data["error"])
        
        return {
            "status": "success",
            "filename": file.filename,
            "data": parsed_data
        }
    except Exception as e:
        # Cleaning up file if it exists
        if file_path.exists():
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Error processing resume: {str(e)}")
    
@app.post("/api/analyze-resume")
async def analyze_resume(resume_data: dict):
    #Analyzing parsed resume with AI and providing feedback
    try:
        # Create analysis prompt
        skills_text = ""
        for category, skills in resume_data.get("skills", {}).items():
            if skills:
                skills_text += f"{category.title()}: {', '.join(skills)}\n"
        
        analysis_prompt = f"""
        As a tech career expert, analyze this resume data and provide actionable feedback:
        
        Skills Found:
        {skills_text}
        
        Estimated Experience: {resume_data.get('estimated_experience', 0)} years
        Resume Length: {resume_data.get('word_count', 0)} words

        Provide feedback in these areas:
        1. **Technical Skills Assessment**: What skills are missing for current tech market?
        2. **ATS Optimization**: How to improve for Applicant Tracking Systems?
        3. **Content Structure**: Resume length, formatting suggestions
        4. **Career Level Feedback**: Advice based on experience level
        5. **Action Items**: 3 specific things to improve immediately
        
        Keep feedback practical and actionable for tech professionals.
        """

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an expert tech recruiter and career coach specializing in resume optimization for software engineers, developers, and tech professionals."},
                {"role": "user", "content": analysis_prompt}
            ],
            max_tokens=800,
            temperature=0.7
        )
        
        return {
            "status": "success",
            "analysis": response.choices[0].message.content,
            "resume_data": resume_data
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing resume: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
