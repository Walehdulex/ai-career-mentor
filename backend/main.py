from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, status 
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.shared import OxmlElement, qn
import tempfile
from datetime import datetime
from auth import verify_password, get_password_hash, create_access_token, get_current_user_id
from typing import Optional

security = HTTPBearer(auto_error=False)

async def get_current_user_optional(
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security), 
        db: Session = Depends(get_db)
) -> Optional[int]:
    if not credentials:
        return None
    try:
        from auth import verify_token
        token_data = verify_token(credentials)
        return int(token_data.get("sub"))
    except: 
        return None

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
async def chat_with_ai(
    chat_message: ChatMessageSchema, 
    db: Session = Depends(get_db),
    current_user_id: Optional[int] = Depends(get_current_user_optional)
):
    try:
        # Creating or getting session
        session_id = chat_message.session_id or str(uuid.uuid4())

        # Getting or creating session
        chat_session = db.query(ChatSession).filter(ChatSession.session_id == session_id).first()
        if not chat_session:
            chat_session = ChatSession(
                session_id=session_id,
                user_id=current_user_id  # This will be None if not authenticated
            )
            db.add(chat_session)
            db.commit()
            db.refresh(chat_session)

        # Save user message
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
            role = "assistant" if msg.role == "ai" else msg.role
            conversation_history.append({
                "role": role,
                "content": msg.content
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

        # Increment user's chat message count if authenticated
        if current_user_id:
            user = db.query(User).filter(User.id == current_user_id).first()
            if user:
                user.chat_messages_count = (user.chat_messages_count or 0) + 1

        db.commit()

        return {
            "response": ai_response,
            "session_id": session_id,
            "status": "success"
        }

    except Exception as e:
        db.rollback()
        return {
            "response": f"Sorry, there was an error: {str(e)}",
            "status": "error"
        }
    
@app.get("/api/chat/sessions")
async def get_chat_sessions(
    db: Session = Depends(get_db),
    current_user_id: Optional[int] = Depends(get_current_user_optional)
):
    """Get chat sessions for current user only"""
    if current_user_id:
        # Get sessions for authenticated user
        sessions = db.query(ChatSession).filter(
            ChatSession.user_id == current_user_id
        ).order_by(ChatSession.updated_at.desc()).all()
    else:
        # For non-authenticated users, return empty list or sessions without user_id
        sessions = db.query(ChatSession).filter(
            ChatSession.user_id.is_(None)
        ).order_by(ChatSession.updated_at.desc()).all()
    
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
async def analyze_resume(
    resume_data: dict, 
    db: Session = Depends(get_db),
    current_user_id: Optional[int] = Depends(get_current_user_optional)
    ):
    """Analyzing parsed resume with AI and providing feedback"""
    try:
        # Try to get current user ID if authenticated
        user_id = None
        try:
            user_id = current_user_id
        except:
            pass  # Continue without authentication

        # Create analysis prompt (your existing code)
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

        # Increment user's resume analysis count if authenticated
        if user_id:
            try:
                user = db.query(User).filter(User.id == int(user_id)).first()
                if user:
                    user.resume_analyses_count = (user.resume_analyses_count or 0) + 1
                    db.commit()
                    print(f"Updated resume count for user {current_user_id}: {user.resume_analyses_count}")
            except Exception as e:
                print(f"Error updating resume analysis count: {e}")
        
        return {
            "status": "success",
            "analysis": response.choices[0].message.content,
            "resume_data": resume_data
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing resume: {str(e)}")

@app.post("/api/generate-cover-letter")
async def generate_cover_letter(
    request: CoverLetterRequest,
    db: Session = Depends(get_db),
    current_user_id: Optional[int] = Depends(get_current_user_optional)
    ):
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

        # Increment user's cover letter count if authenticated
        if current_user_id:
            try:
                user = db.query(User).filter(User.id == int(current_user_id)).first()
                if user:
                    user.cover_letters_count = (user.cover_letters_count or 0) + 1
                    db.commit()
                    print(f"Updated cover letter count for user {current_user_id}: {user.cover_letters_count}")
            except Exception as e:
                print(f"Error updating cover letter count: {e}")
        
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
async def optimize_resume(
    request: ResumeOptimizationRequest,
    db: Session = Depends(get_db),
    current_user_id: Optional[int] = Depends(get_current_user_optional)
):
    """Optimize resume using professional two-column template structure"""
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

        # Build experience summary from the candidate's actual experience
        experience_summary = ""
        for exp in experience:
            title = exp.get('title', 'Position')
            company = exp.get('company', 'Company')
            dates = exp.get('dates', 'Recent')
            description = exp.get('description', '')
            experience_summary += f"{title} at {company} ({dates}). {description[:100]}... "

        # If no experience found, use a default
        if not experience_summary:
            experience_summary = "Software development experience with various technologies"

        
        # Create professional template optimization prompt
        optimization_prompt = f"""
        You are an expert resume writer. Create a concise, 1-page optimized resume for {request.position_title} at {request.company_name} using the ACTUAL candidate information provided.

        ## CANDIDATE'S ACTUAL INFORMATION:
        Name: Extract from resume or use "Professional Candidate" if not clear
        Email: {contact_info.get('email', 'email@example.com')}
        Phone: {contact_info.get('phone', 'phone number')}
        LinkedIn: {contact_info.get('linkedin', 'Available on request')}
        GitHub: {contact_info.get('github', 'Available on request')}

        Current Skills: {current_skills}
        Experience: {experience_summary[:500] if experience_summary else 'Software development experience'}
        Education: {', '.join([f"{edu.get('degree', 'Degree')} from {edu.get('institution', 'University')}" for edu in education]) if education else 'Computer Science education'}

        ## TARGET JOB REQUIREMENTS:
        {request.job_description[:1000]}

        ## OUTPUT REQUIREMENTS:
        - Use REAL candidate information, not placeholders
        - Maximum 600 words total
        - Professional Summary: 2-3 lines targeting this specific role
        - Experience: Use candidate's ACTUAL job titles and companies
        - Projects: Use candidate's ACTUAL projects
        - Skills: Use candidate's ACTUAL skills, prioritized for this job

        ## TEMPLATE:

        **[Use actual candidate name or "PROFESSIONAL CANDIDATE"]**

        **{contact_info.get('email', 'email@example.com')} | {contact_info.get('phone', 'phone')} | United Kingdom | LinkedIn | GitHub**

        **PROFESSIONAL SUMMARY**
        [2-3 lines specifically targeting {request.position_title} using candidate's actual background and skills relevant to this job]

        **CORE SKILLS**
        [Organize candidate's actual skills by relevance to job posting]

        **EXPERIENCE** 
        [Use candidate's ACTUAL job history - select 2-3 most relevant positions with real titles, companies, and dates]

        **PROJECTS**
        [Use candidate's ACTUAL projects - select 2 most relevant with real project names and technologies]

        **EDUCATION**
        [Use candidate's actual education with real degree, institution, and relevant modules]

        Use the candidate's REAL information throughout - no placeholders or generic content.
        """
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system", 
                    "content": "You are an expert resume writer specializing in creating professional, ATS-optimized resumes using structured templates. You excel at matching candidate backgrounds to specific job requirements while maintaining formatting consistency and professional presentation."
                },
                {"role": "user", "content": optimization_prompt}
            ],
            max_tokens=2500,  # Increased for comprehensive template
            temperature=0.5   # Lower temperature for more consistent formatting
        )

        optimized_resume = response.choices[0].message.content
        
        # Generate detailed optimization summary
        changes_prompt = f"""
        Analyze the resume optimization for {request.position_title} at {request.company_name}:

        ## Original Resume Summary:
        - Skills: {current_skills[:200]}...
        - Experience: {len(experience)} positions
        - Education: {len(education)} qualifications

        ## Optimization Results:
        Provide a summary of:

        **1. Template Improvements**
        - Applied professional two-column layout
        - Enhanced visual hierarchy and readability
        - Optimized section organization for ATS scanning

        **2. Content Optimization**
        - Keywords added from job description
        - Skills reordered by relevance to target role
        - Quantified achievements where possible
        - Enhanced professional summary for target position

        **3. ATS Enhancements**
        - Improved keyword density for target role
        - Standardized formatting for ATS compatibility
        - Clear section headers and structure

        **4. Match Score Improvement**
        - Estimated increase in job match percentage
        - Key alignment points with job requirements
        - Competitive advantages highlighted

        **5. Recommendations**
        - Additional skills to develop for this role
        - Interview preparation focus areas
        - Portfolio projects to emphasize

        Keep the summary concise but comprehensive.
        """
        
        changes_response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a resume optimization analyst. Provide clear, actionable summaries of improvements made."
                },
                {"role": "user", "content": changes_prompt}
            ],
            max_tokens=700,
            temperature=0.5
        )
        
        optimization_summary = changes_response.choices[0].message.content

        # Increment user's optimization count if authenticated
        if current_user_id:
            user = db.query(User).filter(User.id == current_user_id).first()
            if user:
                user.optimizations_count = (user.optimizations_count or 0) + 1
                db.commit()
        
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
                        p.runs[0].font.size = Pt(14)
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
    """Generate a compact, 1-page professional DOCX resume"""
    try:
        # Create a new Document
        doc = Document()
        
        # Set tight margins for maximum space
        sections = doc.sections
        for section in sections:
            section.top_margin = Inches(0.5)
            section.bottom_margin = Inches(0.5)
            section.left_margin = Inches(0.5)
            section.right_margin = Inches(0.5)
        
        # Set default font to save space
        style = doc.styles['Normal']
        font = style.font
        font.name = 'Calibri'
        font.size = Pt(10)
        
        # Split content into lines
        lines = request.content.split('\n')
        
        # Process content with minimal spacing
        for line in lines:
            line = line.strip()
            if not line:
                continue  # Skip empty lines to save space
            
            # Remove markdown formatting
            line = line.replace('**', '')
            
            # Detect content types and format compactly
            if line.isupper() and len(line) > 5 and len(line) < 30:
                # Name header
                p = doc.add_paragraph()
                run = p.add_run(line)
                run.font.bold = True
                run.font.size = Pt(14)
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p.space_after = Pt(6)  # Minimal spacing
                
            elif any(header in line.upper() for header in ['PROFESSIONAL SUMMARY', 'CORE SKILLS', 'EXPERIENCE', 'PROJECTS', 'EDUCATION']):
                # Section headers
                p = doc.add_paragraph()
                run = p.add_run(line.upper())
                run.font.bold = True
                run.font.size = Pt(11)
                p.space_before = Pt(8)
                p.space_after = Pt(4)
                
            elif line.startswith('-') or line.startswith('•'):
                # Bullet points - use hanging indent to save space
                bullet_text = line.lstrip('- •')
                p = doc.add_paragraph()
                p.paragraph_format.left_indent = Inches(0.2)
                p.paragraph_format.first_line_indent = Inches(-0.2)
                run = p.add_run(f"• {bullet_text}")
                run.font.size = Pt(9)
                p.space_after = Pt(2)
                
            elif '|' in line and ('@' in line or 'linkedin' in line.lower()):
                # Contact information
                p = doc.add_paragraph()
                run = p.add_run(line)
                run.font.size = Pt(9)
                run.font.bold = True
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p.space_after = Pt(6)
                
            elif len(line) > 80 and not line.startswith('-'):
                # Long paragraphs - professional summary
                p = doc.add_paragraph()
                run = p.add_run(line)
                run.font.size = Pt(9)
                p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
                p.space_after = Pt(4)
                
            else:
                # Regular content - compact formatting
                p = doc.add_paragraph()
                
                # Check if it's a job title/company line
                if any(word in line for word in ['|', 'Engineer', 'Developer', 'Manager', 'Analyst', 'Intern']):
                    run = p.add_run(line)
                    run.font.bold = True
                    run.font.size = Pt(10)
                else:
                    run = p.add_run(line)
                    run.font.size = Pt(9)
                
                p.space_after = Pt(2)
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.docx') as tmp:
            doc.save(tmp.name)
            tmp_path = tmp.name
        
        # Generate filename
        safe_company = "".join(c for c in request.company_name if c.isalnum() or c in (' ', '-', '_')).strip()
        safe_position = "".join(c for c in request.position_title if c.isalnum() or c in (' ', '-', '_')).strip()
        
        filename = f"Resume_{safe_company}_{safe_position}_1Page.docx".replace(' ', '_')
        
        return FileResponse(
            path=tmp_path,
            filename=filename,
            media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        
    except Exception as e:
        return {"status": "error", "message": f"Error generating compact DOCX: {str(e)}"}
    
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
