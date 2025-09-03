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
from enhanced_resume_parser import EnhancedResumeParser
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
resume_parser = EnhancedResumeParser()

#Creating Uploads directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

class ChatMessageSchema(BaseModel):
    message: str
    session_id: str | None = None

class CoverLetterRequest(BaseModel):
    resume_data: dict
    job_description: str
    company_name: str
    position_title: str
    tone: str = "professional" # professional, friendly, enthusiastic

class ResumeOptimizationRequest(BaseModel):
    resume_data : dict
    job_description : str
    company_name : str
    position_title: str
    optimization_level: str = "moderate" # conservative, moderate, aggressive


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
        As a tech career expert and ATS specialist, analyze this comprehensive resume data:

        ## Resume Overview
        - **Experience**: {resume_data.get('estimated_experience', 0)} years
        - **Resume Length**: {resume_data.get('word_count', 0)} words
        - **ATS Score**: {resume_data.get('resume_score', {}).get('score', 0)}/100

        ## Contact Information
        - Email: {resume_data.get('contact_info', {}).get('email', 'Missing')}
        - LinkedIn: {resume_data.get('contact_info', {}).get('linkedin', 'Missing')}
        - GitHub: {resume_data.get('contact_info', {}).get('github', 'Missing')}
        - Portfolio: {resume_data.get('contact_info', {}).get('portfolio', 'Missing')}

        ## Technical Skills Found
        {chr(10).join([f"**{category.replace('_', ' ').title()}**: {', '.join(skills)}" 
                    for category, skills in resume_data.get('skills', {}).items() if skills])}

        ## Education
        {chr(10).join([f"- {edu.get('degree', 'N/A')} at {edu.get('institution', 'N/A')} ({edu.get('year', 'N/A')})" 
                    for edu in resume_data.get('education', [])])}

        ## Work Experience
        {chr(10).join([f"- {exp.get('title', 'N/A')} ({exp.get('dates', 'N/A')})" 
                    for exp in resume_data.get('experience', [])])}

        ## Certifications
        {', '.join(resume_data.get('certifications', [])) or 'None found'}

        Please provide a comprehensive analysis with:

        ### 1. 🎯 Overall Assessment
        Rate the resume's strength for tech roles and current market competitiveness.

        ### 2. 📊 ATS Optimization
        Specific improvements for Applicant Tracking Systems based on the {resume_data.get('resume_score', {}).get('score', 0)}/100 score.

        ### 3. 🔧 Technical Skills Gap Analysis
        What skills are missing for 2024/2025 tech market? Which skills need more prominence?

        ### 4. 📝 Content & Structure Improvements
        How to improve work experience descriptions, education section, and overall format.

        ### 5. 🔗 Professional Presence
        Recommendations for LinkedIn, GitHub, and portfolio optimization.

        ### 6. 🚀 Top 3 Priority Actions
        Most important changes to make immediately for better results.

        Keep feedback specific, actionable, and tailored to current tech industry standards.
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

@app.post("/api/generate-cover-letter")
async def generate_cover_letter(request: CoverLetterRequest):
    """Generate personalized cover letter based on resume and job description"""
    try:
        # Extract key information from resume
        contact_info = request.resume_data.get('contact_info', {})
        skills = request.resume_data.get('skills', {})
        experience = request.resume_data.get('experience', [])
        education = request.resume_data.get('education', [])
        
        # Build skills summary
        all_skills = []
        for category, skill_list in skills.items():
            all_skills.extend(skill_list)
        skills_text = ', '.join(all_skills[:10])  # Top 10 skills
        
        # Build experience summary
        recent_experience = experience[:2] if experience else []
        experience_text = ""
        for exp in recent_experience:
            experience_text += f"- {exp.get('title', 'N/A')} at {exp.get('company', 'Previous Company')} ({exp.get('dates', 'Recent')})\n"
        
        # Education summary
        education_text = ""
        if education:
            latest_edu = education[0]
            education_text = f"{latest_edu.get('degree', 'Degree')} from {latest_edu.get('institution', 'University')}"
        
        # Set tone-based instructions
        tone_instructions = {
            "professional": "Write in a formal, professional tone. Be concise and focus on qualifications.",
            "friendly": "Write in a warm, approachable tone while maintaining professionalism.",
            "enthusiastic": "Write with enthusiasm and energy, showing genuine excitement for the role."
        }
        
        tone_instruction = tone_instructions.get(request.tone, tone_instructions["professional"])
        
        # Create comprehensive prompt
        cover_letter_prompt = f"""
        Write a personalized, compelling cover letter for a tech professional applying to {request.company_name} for the {request.position_title} position.
        
        {tone_instruction}
        
        ## Candidate Information:
        **Contact**: {contact_info.get('email', 'candidate@email.com')}
        **LinkedIn**: {contact_info.get('linkedin', 'Available upon request')}
        **GitHub**: {contact_info.get('github', 'Available upon request')}
        
        **Technical Skills**: {skills_text}
        
        **Recent Experience**:
        {experience_text or "Recent experience in software development"}
        
        **Education**: {education_text or "Computer Science background"}
        
        ## Job Description:
        {request.job_description}
        
        ## Cover Letter Requirements:
        1. **Professional header** with contact information
        2. **Engaging opening** that mentions the specific role and company
        3. **Skills alignment** - match candidate's skills to job requirements
        4. **Experience highlights** - specific examples relevant to the role
        5. **Company knowledge** - show research about the company (if possible from job description)
        6. **Strong closing** with clear next steps
        
        ## Important Guidelines:
        - Keep to 3-4 paragraphs maximum
        - Use specific examples from the candidate's background
        - Match keywords from the job description for ATS optimization
        - Show genuine interest in the company and role
        - End with a professional call-to-action
        - Do not use placeholder text - make it feel personal and specific
        
        Format as a complete cover letter ready to send.
        """
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system", 
                    "content": "You are an expert career coach and professional writer specializing in creating compelling cover letters for tech professionals. You write personalized, ATS-optimized cover letters that get results."
                },
                {"role": "user", "content": cover_letter_prompt}
            ],
            max_tokens=1000,
            temperature=0.7
        )
        
        cover_letter = response.choices[0].message.content
        
        # Generate additional tips
        tips_prompt = f"""
        Based on this cover letter for a {request.position_title} role at {request.company_name}, provide 3-5 specific tips to make it even stronger:
        
        {cover_letter}
        
        Focus on:
        - ATS optimization opportunities
        - Ways to make it more compelling
        - Industry-specific improvements
        - Quantification opportunities
        """
        
        tips_response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a cover letter optimization expert. Provide specific, actionable improvement tips."
                },
                {"role": "user", "content": tips_prompt}
            ],
            max_tokens=400,
            temperature=0.6
        )
        
        optimization_tips = tips_response.choices[0].message.content
        
        return {
            "status": "success",
            "cover_letter": cover_letter,
            "optimization_tips": optimization_tips,
            "word_count": len(cover_letter.split()),
            "company_name": request.company_name,
            "position_title": request.position_title,
            "tone": request.tone
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": f"Error generating cover letter: {str(e)}"
        }
@app.post("/api/optimize-resume")
async def optimize_resume(request: ResumeOptimizationRequest):
    """Optimize resume for specific job posting with ATS keywords and content matching"""
    try:
        # Extract current resume information
        contact_info = request.resume_data.get('contact_info', {})
        skills = request.resume_data.get('skills', {})
        experience = request.resume_data.get('experience', [])
        education = request.resume_data.get('education', [])
        raw_text = request.resume_data.get('raw_text', '')
        
        # Build current skills summary
        all_skills = []
        for category, skill_list in skills.items():
            all_skills.extend(skill_list)
        current_skills = ', '.join(all_skills)
        
        # Build experience summary
        experience_summary = ""
        for exp in experience:
            title = exp.get('title', 'Position')
            company = exp.get('company', 'Company')
            dates = exp.get('dates', 'Recent')
            description = exp.get('description', '')
            experience_summary += f"**{title}** at {company} ({dates})\n{description}\n\n"
        
        # Set optimization level instructions
        optimization_instructions = {
            "conservative": "Make minimal, natural changes. Only add keywords where they fit organically. Maintain original tone and structure.",
            "moderate": "Add relevant keywords and rephrase content to better match job requirements. Make strategic improvements while keeping authenticity.",
            "aggressive": "Significantly optimize for ATS and keyword matching. Restructure content to closely align with job requirements while remaining truthful."
        }
        
        opt_instruction = optimization_instructions.get(request.optimization_level, optimization_instructions["moderate"])
        
        # Create comprehensive optimization prompt
        optimization_prompt = f"""
        You are an expert ATS optimization specialist and career coach. Optimize this resume for the specific job posting while maintaining authenticity and truthfulness.
        
        ## Optimization Level: {request.optimization_level.title()}
        {opt_instruction}
        
        ## Target Role Information:
        **Company**: {request.company_name}
        **Position**: {request.position_title}
        
        ## Job Description & Requirements:
        {request.job_description}
        
        ## Current Resume Information:
        
        **Contact Information:**
        - Email: {contact_info.get('email', 'email@example.com')}
        - Phone: {contact_info.get('phone', 'Phone number')}
        - LinkedIn: {contact_info.get('linkedin', 'LinkedIn profile')}
        - GitHub: {contact_info.get('github', 'GitHub profile')}
        - Portfolio: {contact_info.get('portfolio', 'Portfolio website')}
        
        **Current Technical Skills:**
        {current_skills}
        
        **Experience:**
        {experience_summary}
        
        **Education:**
        {chr(10).join([f"- {edu.get('degree', 'Degree')} from {edu.get('institution', 'Institution')} ({edu.get('year', 'Year')})" for edu in education])}
        
        ## Optimization Task:
        
        1. **Analyze Job Requirements**: Identify key skills, technologies, and qualifications mentioned in the job description.
        
        2. **Keyword Integration**: Naturally incorporate relevant keywords from the job posting into appropriate sections.
        
        3. **Skills Section Optimization**: 
           - Add missing relevant skills that the candidate likely has
           - Prioritize skills mentioned in the job description
           - Use exact terminology from the job posting when possible
        
        4. **Experience Description Enhancement**:
           - Rephrase bullet points to match job requirements
           - Add quantifiable achievements where appropriate
           - Use action verbs that align with the job description
           - Highlight relevant projects and responsibilities
        
        5. **Professional Summary**: Create a compelling 2-3 line professional summary that directly addresses the job requirements.
        
        ## Output Format:
        Provide a complete, optimized resume in a clean, professional format that includes:
        
        **[Full Name]**
        [Contact Information]
        
        **PROFESSIONAL SUMMARY**
        [2-3 lines highlighting relevant experience and skills for this specific role]
        
        **TECHNICAL SKILLS**
        [Organized, keyword-optimized skills section]
        
        **PROFESSIONAL EXPERIENCE**
        [Optimized work experience with job-relevant descriptions]
        
        **EDUCATION**
        [Education information]
        
        **ADDITIONAL SECTIONS** (if applicable)
        [Certifications, Projects, etc.]
        
        ## Important Guidelines:
        - Use keywords from the job description naturally throughout
        - Maintain truthfulness - don't add skills or experience the candidate doesn't have
        - Prioritize most relevant information at the top of each section
        - Use ATS-friendly formatting (no tables, simple bullet points)
        - Match the tone and terminology used in the job posting
        - Include quantifiable achievements where possible
        - Keep total length appropriate (1-2 pages worth of content)
        
        Focus on making this resume highly likely to pass ATS screening and catch the recruiter's attention for this specific role.
        """
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system", 
                    "content": "You are an expert ATS optimization specialist with deep knowledge of applicant tracking systems and recruiting best practices. You create highly optimized resumes that get past ATS filters while maintaining authenticity."
                },
                {"role": "user", "content": optimization_prompt}
            ],
            max_tokens=1500,
            temperature=0.6
        )

        optimized_resume = response.choices[0].message.content
        
        # Generate optimization summary and changes made
        changes_prompt = f"""
        Compare the original resume content with the optimized version and provide a detailed summary of changes made:
        
        ## Original Resume Key Points:
        Skills: {current_skills}
        Experience: {len(experience)} positions listed
        
        ## Optimized Resume:
        {optimized_resume}
        
        ## Job Requirements:
        {request.job_description[:500]}...
        
        Provide a summary including:
        1. **Key Changes Made**: Specific modifications to content
        2. **Keywords Added**: New relevant keywords incorporated
        3. **ATS Improvements**: How the resume is now more ATS-friendly
        4. **Match Score**: Estimated improvement in job-match percentage
        5. **Recommendations**: Any additional suggestions for the candidate
        
        Keep the summary concise but comprehensive.
        """
        
        changes_response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a resume optimization analyst. Provide clear, actionable summaries of resume improvements."
                },
                {"role": "user", "content": changes_prompt}
            ],
            max_tokens=600,
            temperature=0.5
        )
        
        optimization_summary = changes_response.choices[0].message.content
        
        return {
            "status": "success",
            "optimized_resume": optimized_resume,
            "optimization_summary": optimization_summary,
            "original_word_count": len(raw_text.split()),
            "optimized_word_count": len(optimized_resume.split()),
            "company_name": request.company_name,
            "position_title": request.position_title,
            "optimization_level": request.optimization_level
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": f"Error optimizing resume: {str(e)}"
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
