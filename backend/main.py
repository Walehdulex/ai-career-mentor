from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import openai
import os
import shutil
from pathlib import Path
from dotenv import load_dotenv
from resume_parser import ResumeParser

load_dotenv()

app = FastAPI()

#Enabling CORS for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Next.js defaul port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

openai.api_key = os.getenv("OPENAI_API_KEY")

# Initializing resume parser
resume_parser = ResumeParser()

#Creating Uploads directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

class ChatMessage(BaseModel):
    message: str

@app.get("/")
async def root():
    return {"message": "AI Career Mentor API is running"}

@app.post("/api/chat")
async def chat_with_ai(chat_message: ChatMessage):
    try:
        # Tech Career focused prompt
        system_prompt = """You are an AI career mentor specializing in tech careers.
        Help with resume advice, career transitions, skill devopment, interview prep,
        and job search strategies in the tech industry. Be practical and actionable"""

        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": chat_message.message}
            ],
            max_tokens=500,
            temperature=0.7
        )
        return {
            "response": response.choices[0].message.content,
            "status": "success"
        }
    except Exception as e:
        return {
            "response": f"Sorry, there was an error: {str(e)}",
            "status": "error"
        }
    
@app.post("/api/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    """Upload and parse resume file"""
    try:
        # Validate file type
        if not file.filename.lower().endswith(('.pdf', '.docx')):
            raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")
        
        # Save uploaded file
        file_path = UPLOAD_DIR / file.filename
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Parse resume
        file_type = file.filename.split('.')[-1].lower()
        parsed_data = resume_parser.parse_resume(str(file_path), file_type)
        
        # Clean up uploaded file
        os.remove(file_path)
        
        if "error" in parsed_data:
            raise HTTPException(status_code=500, detail=parsed_data["error"])
        
        return {
            "status": "success",
            "filename": file.filename,
            "data": parsed_data
        }
    except Exception as e:
        # Clean up file if it exists
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

        response = openai.chat.completions.create(
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
