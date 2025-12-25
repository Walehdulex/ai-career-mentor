'use client';

import React from 'react';

interface ResumeSection {
  type: 'header' | 'section' | 'experience' | 'education' | 'skills' | 'text' | 'bullet';
  content: string;
  subsections?: { title?: string; company?: string; date?: string; items?: string[] }[];
}

interface ProfessionalResumeDisplayProps {
  resumeText: string;
  companyName: string;
  positionTitle: string;
}

export const ProfessionalResumeDisplay: React.FC<ProfessionalResumeDisplayProps> = ({
  resumeText,
  companyName,
  positionTitle,
}) => {
  const parseResume = (text: string): ResumeSection[] => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const sections: ResumeSection[] = [];
    let currentSection: ResumeSection | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Remove markdown formatting
      const cleanLine = line.replace(/\*\*/g, '');
      
      // Detect name/header (first line or all caps)
      if (i === 0 || (cleanLine === cleanLine.toUpperCase() && cleanLine.length < 40 && !cleanLine.includes('|'))) {
        if (i === 0 || sections.length === 0) {
          sections.push({ type: 'header', content: cleanLine });
          continue;
        }
      }
      
      // Detect contact info (has email, phone, or multiple |)
      if (line.includes('@') || line.includes('|') || line.includes('linkedin') || line.includes('github')) {
        sections.push({ type: 'header', content: cleanLine });
        continue;
      }
      
      // Detect section headers (all caps or common headers)
      const sectionHeaders = [
        'PROFESSIONAL SUMMARY', 'SUMMARY', 'PROFILE',
        'CORE SKILLS', 'SKILLS', 'TECHNICAL SKILLS',
        'EXPERIENCE', 'PROFESSIONAL EXPERIENCE', 'WORK EXPERIENCE',
        'PROJECTS', 'KEY PROJECTS',
        'EDUCATION', 'ACADEMIC BACKGROUND'
      ];
      
      const upperLine = cleanLine.toUpperCase();
      if (sectionHeaders.some(header => upperLine.includes(header))) {
        currentSection = { type: 'section', content: cleanLine, subsections: [] };
        sections.push(currentSection);
        continue;
      }
      
      // Detect job title line (has company name or date pattern)
      if (cleanLine.includes('|') || /\d{4}/.test(cleanLine) || cleanLine.includes('at ') || cleanLine.includes(' - ')) {
        if (currentSection && currentSection.type === 'section' && currentSection.content.toUpperCase().includes('EXPERIENCE')) {
          currentSection.subsections = currentSection.subsections || [];
          currentSection.subsections.push({ title: cleanLine, items: [] });
          continue;
        }
      }
      
      // Detect bullet points
      if (line.startsWith('-') || line.startsWith('•') || line.startsWith('*')) {
        const bulletText = cleanLine.replace(/^[-•*]\s*/, '');
        if (currentSection && currentSection.subsections && currentSection.subsections.length > 0) {
          const lastSubsection = currentSection.subsections[currentSection.subsections.length - 1];
          lastSubsection.items = lastSubsection.items || [];
          lastSubsection.items.push(bulletText);
        } else {
          sections.push({ type: 'bullet', content: bulletText });
        }
        continue;
      }
      
      // Regular text
      sections.push({ type: 'text', content: cleanLine });
    }
    
    return sections;
  };

  const sections = parseResume(resumeText);

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto">
      {/* Resume Content */}
      <div className="space-y-6">
        {sections.map((section, index) => {
          switch (section.type) {
            case 'header':
              // Name and contact info
              if (index === 0) {
                return (
                  <div key={index} className="text-center border-b-2 border-gray-800 pb-4">
                    <h1 className="text-3xl font-bold text-gray-900 tracking-wide uppercase">
                      {section.content}
                    </h1>
                  </div>
                );
              } else {
                return (
                  <div key={index} className="text-center text-sm text-gray-600">
                    {section.content.split('|').map((part, i) => (
                      <span key={i} className="mx-2">
                        {part.trim()}
                      </span>
                    ))}
                  </div>
                );
              }
            
            case 'section':
              return (
                <div key={index} className="mt-6">
                  <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wide border-b-2 border-gray-300 pb-1 mb-3">
                    {section.content}
                  </h2>
                  
                  {section.subsections && section.subsections.length > 0 ? (
                    <div className="space-y-4">
                      {section.subsections.map((sub, subIndex) => (
                        <div key={subIndex} className="ml-2">
                          <div className="flex justify-between items-baseline mb-1">
                            <h3 className="font-semibold text-gray-900">
                              {sub.title}
                            </h3>
                          </div>
                          {sub.items && sub.items.length > 0 && (
                            <ul className="space-y-1 ml-4 mt-2">
                              {sub.items.map((item, itemIndex) => (
                                <li key={itemIndex} className="text-gray-700 text-sm flex items-start">
                                  <span className="inline-block w-2 h-2 bg-gray-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            
            case 'bullet':
              return (
                <div key={index} className="flex items-start ml-4">
                  <span className="inline-block w-2 h-2 bg-gray-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                  <p className="text-gray-700 text-sm">{section.content}</p>
                </div>
              );
            
            case 'text':
              return (
                <p key={index} className="text-gray-700 text-sm leading-relaxed ml-2">
                  {section.content}
                </p>
              );
            
            default:
              return null;
          }
        })}
      </div>
      
      {/* Footer metadata */}
      <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-500 text-center">
        Optimized for {positionTitle} at {companyName}
      </div>
    </div>
  );
};

// Also create print-friendly version
export const PrintableResumeDisplay: React.FC<ProfessionalResumeDisplayProps> = ({
  resumeText,
  companyName,
  positionTitle,
}) => {
  return (
    <div className="bg-white p-12 max-w-[8.5in] mx-auto" style={{ fontFamily: 'Georgia, serif' }}>
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0.5in;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
      
      <ProfessionalResumeDisplay 
        resumeText={resumeText}
        companyName={companyName}
        positionTitle={positionTitle}
      />
    </div>
  );
};