import PyPDF2
import docx
import re
from typing import Dict, List, Optional
from datetime import datetime

class EnhancedResumeParser:
    def __init__(self):
        self.tech_skills = {
            'programming_languages': [
                'python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'php', 
                'ruby', 'go', 'rust', 'swift', 'kotlin', 'scala', 'r', 'matlab',
                'html', 'css', 'sql', 'bash', 'powershell'
            ],
            'frameworks_libraries': [
                'react', 'angular', 'vue', 'svelte', 'django', 'flask', 'fastapi',
                'express', 'nestjs', 'spring', 'laravel', 'rails', 'asp.net',
                'jquery', 'bootstrap', 'tailwind', 'nodejs', 'nextjs', 'nuxtjs'
            ],
            'databases': [
                'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 
                'sqlite', 'oracle', 'cassandra', 'dynamodb', 'firebase'
            ],
            'cloud_devops': [
                'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform',
                'ansible', 'jenkins', 'github actions', 'gitlab ci', 'circleci',
                'nginx', 'apache', 'linux', 'ubuntu', 'centos'
            ],
            'tools_platforms': [
                'git', 'github', 'gitlab', 'bitbucket', 'jira', 'confluence',
                'slack', 'figma', 'sketch', 'photoshop', 'postman', 'insomnia',
                'vscode', 'intellij', 'eclipse', 'vim'
            ]
        }
        
        # Common certifications
        self.certifications = [
            'aws certified', 'azure certified', 'gcp certified', 'google cloud',
            'certified kubernetes', 'docker certified', 'pmp', 'scrum master',
            'cissp', 'comptia', 'microsoft certified', 'oracle certified',
            'salesforce certified', 'tensorflow certified'
        ]
        
        # Education keywords
        self.education_keywords = [
            'bachelor', 'master', 'phd', 'doctorate', 'degree', 'university',
            'college', 'institute', 'school', 'education', 'graduated',
            'computer science', 'software engineering', 'information technology',
            'data science', 'cybersecurity'
        ]
        
        # Experience section keywords
        self.experience_keywords = [
            'experience', 'work history', 'employment', 'professional experience',
            'career history', 'work experience', 'job history'
        ]
    def extract_text_from_pdf(self, file_path: str) -> str:
        """Extract text from PDF file"""
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
                return text
        except Exception as e:
            print(f"Error reading PDF: {e}")
            return ""
    
    def extract_text_from_docx(self, file_path: str) -> str:
        """Extract text from DOCX file"""
        try:
            doc = docx.Document(file_path)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text
        except Exception as e:
            print(f"Error reading DOCX: {e}")
            return ""
    
    def extract_text(self, file_path: str, file_type: str) -> str:
        """Extract text based on file type"""
        if file_type.lower() == 'pdf':
            return self.extract_text_from_pdf(file_path)
        elif file_type.lower() == 'docx':
            return self.extract_text_from_docx(file_path)
        else:
            return ""
    
    def extract_contact_info(self, text: str) -> Dict[str, str]:
        """Extract comprehensive contact information"""
        contact_info = {}
        
        # Email
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, text)
        contact_info['email'] = emails[0] if emails else ""
        
        # Phone
        phone_patterns = [
            r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',
            r'(\+?\d{1,3}[-.\s]?)?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}'
        ]
        phones = []
        for pattern in phone_patterns:
            phones.extend(re.findall(pattern, text))
        contact_info['phone'] = ''.join(phones[0]) if phones else ""
        
        # LinkedIn
        linkedin_pattern = r'linkedin\.com/in/([A-Za-z0-9-]+)'
        linkedin_matches = re.findall(linkedin_pattern, text.lower())
        contact_info['linkedin'] = f"linkedin.com/in/{linkedin_matches[0]}" if linkedin_matches else ""
        
        # GitHub
        github_pattern = r'github\.com/([A-Za-z0-9-]+)'
        github_matches = re.findall(github_pattern, text.lower())
        contact_info['github'] = f"github.com/{github_matches[0]}" if github_matches else ""
        
        # Portfolio/Website
        website_pattern = r'https?://[^\s]+'
        websites = re.findall(website_pattern, text)
        # Filter out LinkedIn and GitHub from websites
        portfolio_sites = [site for site in websites if 'linkedin.com' not in site and 'github.com' not in site]
        contact_info['portfolio'] = portfolio_sites[0] if portfolio_sites else ""
        
        return contact_info
    
    def extract_skills(self, text: str) -> Dict[str, List[str]]:
        """Extract technical skills with improved categorization"""
        text_lower = text.lower()
        found_skills = {}
        
        for category, skills in self.tech_skills.items():
            found_skills[category] = []
            for skill in skills:
                # More flexible matching
                skill_patterns = [
                    rf'\b{re.escape(skill)}\b',
                    rf'{re.escape(skill)}\.js\b',  # For JavaScript frameworks
                    rf'{re.escape(skill)} certified\b'  # For certifications
                ]
                
                for pattern in skill_patterns:
                    if re.search(pattern, text_lower):
                        skill_name = skill.replace('_', ' ').title()
                        if skill_name not in found_skills[category]:
                            found_skills[category].append(skill_name)
                        break
        
        return found_skills
    
    def extract_education(self, text: str) -> List[Dict[str, str]]:
        """Extract education information"""
        education_list = []
        lines = text.split('\n')
        
        education_section_found = False
        for i, line in enumerate(lines):
            line_lower = line.lower().strip()
            
            # Check if we're in education section
            if any(keyword in line_lower for keyword in ['education', 'academic']):
                education_section_found = True
                continue
            
            # Stop if we hit another major section
            if education_section_found and any(keyword in line_lower for keyword in ['experience', 'skills', 'projects']):
                break
            
            # Look for degree patterns
            degree_patterns = [
                r'(bachelor|master|phd|doctorate|b\.s\.|b\.a\.|m\.s\.|m\.a\.|ph\.d\.)',
                r'(computer science|software engineering|information technology|engineering)'
            ]
            
            for pattern in degree_patterns:
                if re.search(pattern, line_lower):
                    # Extract year if present
                    year_pattern = r'(19|20)\d{2}'
                    years = re.findall(year_pattern, line)
                    
                    education_entry = {
                        'degree': line.strip(),
                        'year': years[-1] if years else '',
                        'institution': ''
                    }
                    
                    # Look for institution in nearby lines
                    for j in range(max(0, i-2), min(len(lines), i+3)):
                        if 'university' in lines[j].lower() or 'college' in lines[j].lower():
                            education_entry['institution'] = lines[j].strip()
                            break
                    
                    education_list.append(education_entry)
                    break
        
        return education_list
    
    def extract_experience(self, text: str) -> List[Dict[str, str]]:
        """Extract work experience"""
        experience_list = []
        lines = text.split('\n')
        
        experience_section_found = False
        current_job = {}
        
        for i, line in enumerate(lines):
            line_lower = line.lower().strip()
            
            # Check if we're in experience section
            if any(keyword in line_lower for keyword in self.experience_keywords):
                experience_section_found = True
                continue
            
            # Stop if we hit another major section
            if experience_section_found and any(keyword in line_lower for keyword in ['education', 'skills', 'projects', 'certifications']):
                if current_job:
                    experience_list.append(current_job)
                break
            
            if experience_section_found and line.strip():
                # Look for job titles and companies
                # Common patterns: "Software Engineer at Google", "Google - Software Engineer"
                if ' at ' in line or ' - ' in line or re.search(r'\d{4}.*\d{4}', line):
                    if current_job:
                        experience_list.append(current_job)
                    
                    # Extract dates
                    date_pattern = r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{1,2}/|\d{4})'
                    dates = re.findall(date_pattern, line)
                    
                    current_job = {
                        'title': line.strip(),
                        'company': '',
                        'dates': ' '.join(dates) if dates else '',
                        'description': ''
                    }
                elif current_job and line.startswith(('•', '-', '*')):
                    # Add bullet points to description
                    current_job['description'] += line.strip() + '\n'
        
        if current_job:
            experience_list.append(current_job)
        
        return experience_list
    
    def extract_certifications(self, text: str) -> List[str]:
        """Extract certifications"""
        text_lower = text.lower()
        found_certs = []
        
        for cert in self.certifications:
            if cert in text_lower:
                found_certs.append(cert.title())
        
        return found_certs
    
    def calculate_resume_score(self, parsed_data: Dict) -> Dict[str, any]:
        """Calculate ATS compatibility and completeness score"""
        score = 0
        max_score = 100
        feedback = []
        
        # Contact information (20 points)
        contact_score = 0
        if parsed_data['contact_info']['email']:
            contact_score += 5
        if parsed_data['contact_info']['phone']:
            contact_score += 5
        if parsed_data['contact_info']['linkedin']:
            contact_score += 5
        if parsed_data['contact_info']['github']:
            contact_score += 5
        score += contact_score
        
        if contact_score < 15:
            feedback.append("Add missing contact information (LinkedIn, GitHub)")
        
        # Skills (25 points)
        total_skills = sum(len(skills) for skills in parsed_data['skills'].values())
        skills_score = min(25, total_skills * 2)
        score += skills_score
        
        if skills_score < 15:
            feedback.append("Add more relevant technical skills")
        
        # Experience (25 points)
        exp_score = min(25, len(parsed_data['experience']) * 8)
        score += exp_score
        
        if exp_score < 15:
            feedback.append("Add more detailed work experience")
        
        # Education (15 points)
        edu_score = min(15, len(parsed_data['education']) * 15)
        score += edu_score
        
        # Word count (10 points)
        word_count = parsed_data['word_count']
        if 400 <= word_count <= 800:
            score += 10
        elif word_count < 400:
            feedback.append("Resume is too short, add more details")
        elif word_count > 1000:
            feedback.append("Resume is too long, consider condensing")
        else:
            score += 5
        
        # Certifications bonus (5 points)
        if parsed_data['certifications']:
            score += 5
        
        return {
            'score': min(score, max_score),
            'max_score': max_score,
            'feedback': feedback,
            'ats_compatible': score >= 70
        }
    
    def parse_resume(self, file_path: str, file_type: str) -> Dict:
        """Enhanced resume parsing with comprehensive data extraction"""
        text = self.extract_text(file_path, file_type)
        
        if not text:
            return {"error": "Could not extract text from file"}
        
        # Extract all components
        contact_info = self.extract_contact_info(text)
        skills = self.extract_skills(text)
        education = self.extract_education(text)
        experience = self.extract_experience(text)
        certifications = self.extract_certifications(text)
        
        # Calculate experience years (improved)
        experience_years = 0
        for exp in experience:
            # Try to extract years from dates
            dates_text = exp.get('dates', '')
            years_mentioned = re.findall(r'\d{4}', dates_text)
            if len(years_mentioned) >= 2:
                try:
                    start_year = int(years_mentioned[0])
                    end_year = int(years_mentioned[-1])
                    if end_year > start_year:
                        experience_years += (end_year - start_year)
                except:
                    pass
        
        # If no experience dates found, fallback to text analysis
        if experience_years == 0:
            exp_patterns = [
                r'(\d+)\+?\s*years?\s*(of\s*)?experience',
                r'(\d+)\+?\s*yrs?\s*(of\s*)?experience',
                r'experience[:\s]*(\d+)\+?\s*years?'
            ]
            
            for pattern in exp_patterns:
                matches = re.findall(pattern, text.lower())
                if matches:
                    try:
                        experience_years = max(experience_years, int(matches[0][0] if isinstance(matches[0], tuple) else matches[0]))
                    except:
                        pass
        
        parsed_data = {
            "raw_text": text,
            "contact_info": contact_info,
            "skills": skills,
            "education": education,
            "experience": experience,
            "certifications": certifications,
            "estimated_experience": experience_years,
            "word_count": len(text.split()),
            "character_count": len(text)
        }
        
        # Calculate resume score
        score_data = self.calculate_resume_score(parsed_data)
        parsed_data["resume_score"] = score_data
        
        return parsed_data