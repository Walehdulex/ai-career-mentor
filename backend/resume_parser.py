import PyPDF2
import docx
import re
from typing import Dict, List

class ResumeParser:
    def __init__(self):
        self.tech_skills = {
            'languages': ['python', 'javascript', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'typescript'],
            'frameworks': ['react', 'angular', 'vue', 'django', 'flask', 'express', 'spring', 'laravel', 'rails', 'fastapi'],
            'databases': ['mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'sqlite'],
            'cloud': ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform'],
            'tools': ['git', 'jenkins', 'jira', 'confluence', 'figma', 'photoshop']
        }

    def extract_text_from_pdf(self, fiile_path: str) -> str:
        # Extract text from PDF file
        try:
            with open(fiile_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text()
                return text
        except Exception as e:
            print(f"Error reading PDF: {e}")
            return ""
        
    
    def extract_text_from_docx(self, file_path: str) -> str:
        #Extract from text from docx file
        try:
            doc = docx.Document(file_path)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text 
        except Exception as e:
            print(f"Error rerading DOCX: {e}")
            return ""
    
    def extract_text(self, file_path: str, file_type: str) -> str:
         """Extract text based on file type"""
         if file_type.lower() == 'pdf':
              return self.extract_text_from_pdf(file_path)
         elif file_type.lower() == 'docx':
             return self.extract_text_from_docx(file_path)
         else:
             return ""
         
    def extract_email(self, text: str) -> str:
        """Extract email from resume text"""
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, text)
        return emails[0] if emails else ""
    
    def extract_phone(self, text: str) -> str:
        """Extract phone number from resume text"""
        phone_pattern = r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
        phones = re.findall(phone_pattern, text)
        return ''.join(phones[0]) if phones else ""
    
    def extract_skills(self, text: str) -> Dict[str, List[str]]:
        """Extract technical skills from resume text"""
        text_lower = text.lower()
        found_skills = {}

        for category, skills in self.tech_skills.items():
            found_skills[category] = []
            for skill in skills:
                if skill in text_lower:
                    found_skills[category].append(skill.title())
        
        return found_skills
    
    def extract_experience_years(self, text: str) -> int:
        """Estimate years of experience from resume"""
        # Look for patterns like "3 years", "5+ years", etc.
        experience_patterns = [
            r'(\d+)\+?\s*years?\s*(of\s*)?experience',
            r'(\d+)\+?\s*yrs?\s*(of\s*)?experience',
            r'experience[:\s]*(\d+)\+?\s*years?'
        ]

        years = []
        text_lower = text.lower()
        
        for pattern in experience_patterns:
            matches = re.findall(pattern, text_lower)
            for match in matches:
                if isinstance(match, tuple):
                    years.append(int(match[0]))
                else:
                    years.append(int(match))
        
        return max(years) if years else 0
    
    def parse_resume(self, file_path: str, file_type: str) -> Dict:
        """Parse resume and return structured data"""
        text = self.extract_text(file_path, file_type)
        if not text:
            return {"error": "Could not extract text from file"}
        
        return {
            "raw_text": text,
            "email": self.extract_email(text),
            "phone": self.extract_phone(text),
            "skills": self.extract_skills(text),
            "estimated_experience": self.extract_experience_years(text),
            "word_count": len(text.split()),
            "character_count": len(text)
        }