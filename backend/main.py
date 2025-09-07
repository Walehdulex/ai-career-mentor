from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from openai import OpenAI
import os
import shutil
import json
import uuid
from pathlib import Path
from dotenv import load_dotenv
from enhanced_resume_parser import EnhancedResumeParser
from database import create_tables, get_db, ChatSession, ChatMessage, ResumeAnalysis, User, UserProfile, UserActivity
from sqlalchemy.orm import Session
from docx import Document
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
import tempfile
from datetime import datetime
from auth import verify_password, get_password_hash, create_access_token, get_current_user_id


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

class DocxGenerationRequest(BaseModel):
    content: str
    filename: str
    doc_type: str
    company_name: str
    position_title: str

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    role: str ="job_seeker"

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id:int
    username: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    resume_analyses_count: int
    cover_letters_count: int
    optimizations_count: int
    chat_messages_count: int

class ProfileUpdate(BaseModel):
    current_title: str = None
    experience_level: str = None
    industry: str = None
    location: str = None
    salary_range: str = None
    technical_skills: list = None
    soft_skills: list = None
    certifications: list = None
    languages: list = None
    preferred_roles: list = None
    preferred_companies: list = None
    remote_preference: str = None
    willing_to_relocate: bool = None
    linkedin_url: str = None
    github_url: str = None
    portfolio_url: str = None

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
    
@app.post("/api/generate-cover-letter-docx")
async def generate_cover_letter_docx(request: DocxGenerationRequest):
    """Generate a professionally formatted DOCX cover letter"""
    try:
        # Create a new Document
        doc = Document()
        
        # Set document margins
        sections = doc.sections
        for section in sections:
            section.top_margin = Inches(1)
            section.bottom_margin = Inches(1)
            section.left_margin = Inches(1)
            section.right_margin = Inches(1)
        
        # Split content into lines
        lines = request.content.split('\n')
        
        # Track if we're in the header (contact info)
        in_header = True
        
        for line in lines:
            line = line.strip()
            if not line:
                doc.add_paragraph()
                continue
            
            # Check if this is a header line (contact info at the top)
            if in_header and any(indicator in line.lower() for indicator in ['@', 'linkedin', 'github', 'phone', '|']):
                p = doc.add_paragraph(line)
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p.runs[0].bold = True
            # Check if this is the date line
            elif 'dear' in line.lower() or line.startswith('Dear'):
                # Add date first
                date_p = doc.add_paragraph(datetime.now().strftime("%B %d, %Y"))
                date_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
                doc.add_paragraph()  # Empty line
                
                # Add the greeting
                p = doc.add_paragraph(line)
                in_header = False
            # Regular paragraph content
            else:
                p = doc.add_paragraph(line)
                if in_header:
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    if not any(char.islower() for char in line):  # If all caps (like name)
                        p.runs[0].bold = True
                        p.runs[0].font.size = docx.shared.Pt(14)
                in_header = False
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.docx') as tmp:
            doc.save(tmp.name)
            tmp_path = tmp.name
        
        # Generate filename
        safe_company = "".join(c for c in request.company_name if c.isalnum() or c in (' ', '-', '_')).strip()
        safe_position = "".join(c for c in request.position_title if c.isalnum() or c in (' ', '-', '_')).strip()
        filename = f"Cover_Letter_{safe_company}_{safe_position}.docx".replace(' ', '_')
        
        return FileResponse(
            path=tmp_path,
            filename=filename,
            media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        
    except Exception as e:
        return {"status": "error", "message": f"Error generating DOCX: {str(e)}"}

@app.post("/api/generate-resume-docx")
async def generate_resume_docx(request: DocxGenerationRequest):
    """Generate a professionally formatted DOCX resume"""
    try:
        # Create a new Document
        doc = Document()
        
        # Set document margins
        sections = doc.sections
        for section in sections:
            section.top_margin = Inches(0.5)
            section.bottom_margin = Inches(0.5)
            section.left_margin = Inches(0.75)
            section.right_margin = Inches(0.75)
        
        # Split content into lines and process
        lines = request.content.split('\n')
        current_section = ""
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check if this is a section header (ALL CAPS or starts with specific keywords)
            if (line.isupper() and len(line) > 3) or any(line.upper().startswith(section) for section in 
                ['PROFESSIONAL SUMMARY', 'TECHNICAL SKILLS', 'PROFESSIONAL EXPERIENCE', 
                 'WORK EXPERIENCE', 'EDUCATION', 'CERTIFICATIONS', 'PROJECTS']):
                
                if current_section:  # Add space before new section
                    doc.add_paragraph()
                
                p = doc.add_paragraph(line)
                p.runs[0].bold = True
                p.runs[0].font.size = Pt(12)
                current_section = line
                
            # Contact information (first few lines with email, phone, etc.)
            elif '@' in line or 'linkedin' in line.lower() or 'github' in line.lower() or any(char.isdigit() for char in line):
                if not current_section:  # This is likely the header
                    if '@' in line and not any(p.text == line for p in doc.paragraphs):  # Name line
                        name_line = doc.paragraphs[0].text if doc.paragraphs else ""
                        if not '@' in name_line:
                            p = doc.add_paragraph(line)
                            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                        else:
                            p = doc.add_paragraph(line)
                            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    else:
                        p = doc.add_paragraph(line)
                        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                else:
                    doc.add_paragraph(line)
                    
            # Job titles and company names (likely bold)
            elif any(keyword in line for keyword in [' at ', ' - ', 'Engineer', 'Developer', 'Manager', 'Analyst']):
                p = doc.add_paragraph()
                run = p.add_run(line)
                run.bold = True
                
            # Bullet points
            elif line.startswith(('•', '-', '*')):
                p = doc.add_paragraph(line, style='List Bullet')
                
            # Regular content
            else:
                # If it's the very first line and doesn't contain contact info, it's likely the name
                if not doc.paragraphs and not any(indicator in line.lower() for indicator in ['@', 'phone', 'linkedin']):
                    p = doc.add_paragraph(line)
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    p.runs[0].bold = True
                    p.runs[0].font.size = Pt(16)
                else:
                    doc.add_paragraph(line)
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.docx') as tmp:
            doc.save(tmp.name)
            tmp_path = tmp.name
        
        # Generate filename
        safe_company = "".join(c for c in request.company_name if c.isalnum() or c in (' ', '-', '_')).strip()
        safe_position = "".join(c for c in request.position_title if c.isalnum() or c in (' ', '-', '_')).strip()
        
        if safe_company and safe_position:
            filename = f"Resume_{safe_company}_{safe_position}.docx".replace(' ', '_')
        else:
            filename = f"Optimized_Resume_{datetime.now().strftime('%Y%m%d')}.docx"
        
        return FileResponse(
            path=tmp_path,
            filename=filename,
            media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        
    except Exception as e:
        return {"status": "error", "message": f"Error generating DOCX: {str(e)}"}
    
@app.on_event("startup")
async def startup_event():
    import tempfile
    import glob
    temp_dir = tempfile.gettempdir()
    for file in glob.glob(os.path.join(temp_dir, "tmp*.docx")):
        try:
            os.remove(file)
        except:
            pass

@app.post("/api/auth/register")
async def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(
            (User.email == user_data.email) | (User.username == user_data.username)
        ).first()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email or username already exists"
            )
        
        # Create new user
        hashed_password = get_password_hash(user_data.password)
        db_user = User(
            username=user_data.username,
            email=user_data.email,
            hashed_password=hashed_password,
            full_name=user_data.full_name,
            role=user_data.role
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        # Create user profile
        user_profile = UserProfile(user_id=db_user.id)
        db.add(user_profile)
        db.commit()
        
        # Create access token
        access_token = create_access_token(data={"sub": str(db_user.id)})
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": db_user.id,
                "username": db_user.username,
                "email": db_user.email,
                "full_name": db_user.full_name,
                "role": db_user.role
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user: {str(e)}"
        )

@app.post("/api/auth/login")
async def login_user(login_data: UserLogin, db: Session = Depends(get_db)):
    """Login user and return access token"""
    try:
        # Find user by username or email
        user = db.query(User).filter(
            (User.username == login_data.username) | (User.email == login_data.username)
        ).first()
        
        if not user or not verify_password(login_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username/email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user account"
            )
        
        # Create access token
        access_token = create_access_token(data={"sub": str(user.id)})
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "resume_analyses_count": user.resume_analyses_count,
                "cover_letters_count": user.cover_letters_count,
                "optimizations_count": user.optimizations_count,
                "chat_messages_count": user.chat_messages_count
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during login: {str(e)}"
        )
    
@app.get("/api/auth/me")
async def get_current_user(current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """Get current user information"""
    try:
        user = db.query(User).filter(User.id == int(current_user_id)).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": user.is_active,
            "created_at": user.created_at,
            "resume_analyses_count": user.resume_analyses_count,
            "cover_letters_count": user.cover_letters_count,
            "optimizations_count": user.optimizations_count,
            "chat_messages_count": user.chat_messages_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting user: {str(e)}"
        )

@app.get("/api/profile")
async def get_user_profile(current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """Get user profile information"""
    try:
        profile = db.query(UserProfile).filter(UserProfile.user_id == int(current_user_id)).first()
        if not profile:
            # Create empty profile if it doesn't exist
            profile = UserProfile(user_id=int(current_user_id))
            db.add(profile)
            db.commit()
            db.refresh(profile)
        
        return {
            "current_title": profile.current_title,
            "experience_level": profile.experience_level,
            "industry": profile.industry,
            "location": profile.location,
            "salary_range": profile.salary_range,
            "technical_skills": json.loads(profile.technical_skills) if profile.technical_skills else [],
            "soft_skills": json.loads(profile.soft_skills) if profile.soft_skills else [],
            "certifications": json.loads(profile.certifications) if profile.certifications else [],
            "languages": json.loads(profile.languages) if profile.languages else [],
            "preferred_roles": json.loads(profile.preferred_roles) if profile.preferred_roles else [],
            "preferred_companies": json.loads(profile.preferred_companies) if profile.preferred_companies else [],
            "remote_preference": profile.remote_preference,
            "willing_to_relocate": profile.willing_to_relocate,
            "linkedin_url": profile.linkedin_url,
            "github_url": profile.github_url,
            "portfolio_url": profile.portfolio_url,
            "updated_at": profile.updated_at
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting profile: {str(e)}"
        )

@app.put("/api/profile")
async def update_user_profile(
    profile_data: ProfileUpdate, 
    current_user_id: str = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
):
    """Update user profile information"""
    try:
        profile = db.query(UserProfile).filter(UserProfile.user_id == int(current_user_id)).first()
        if not profile:
            profile = UserProfile(user_id=int(current_user_id))
            db.add(profile)
        
        # Update profile fields
        update_data = profile_data.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            if field in ['technical_skills', 'soft_skills', 'certifications', 'languages', 
                        'preferred_roles', 'preferred_companies'] and value is not None:
                setattr(profile, field, json.dumps(value))
            elif value is not None:
                setattr(profile, field, value)
        
        db.commit()
        db.refresh(profile)
        
        return {"message": "Profile updated successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating profile: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
