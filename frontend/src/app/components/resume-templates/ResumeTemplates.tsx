// components/resume-templates/ResumeTemplates.tsx
'use client';

import React from 'react';

interface ResumeSection {
  type: 'header' | 'contact' | 'section' | 'experience' | 'education' | 'skills' | 'text' | 'bullet';
  content: string;
  subsections?: { title?: string; items?: string[] }[];
}

interface TemplateProps {
  sections: ResumeSection[];
  companyName: string;
  positionTitle: string;
}

// Shared parsing function
export const parseResumeText = (text: string): ResumeSection[] => {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  const sections: ResumeSection[] = [];
  let currentSection: ResumeSection | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cleanLine = line.replace(/\*\*/g, '');
    
    // Name (first line or all caps short line)
    if (i === 0 || (i < 3 && cleanLine === cleanLine.toUpperCase() && cleanLine.length < 40 && !cleanLine.includes('|'))) {
      sections.push({ type: 'header', content: cleanLine });
      continue;
    }
    
    // Contact info
    if (line.includes('@') || (line.includes('|') && i < 5) || line.toLowerCase().includes('linkedin')) {
      sections.push({ type: 'contact', content: cleanLine });
      continue;
    }
    
    // Section headers
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
    
    // Job/Project titles (has dates or company indicators)
    if (cleanLine.includes('|') || /\d{4}/.test(cleanLine)) {
      if (currentSection && currentSection.subsections) {
        currentSection.subsections.push({ title: cleanLine, items: [] });
        continue;
      }
    }
    
    // Bullet points
    if (line.startsWith('-') || line.startsWith('•') || line.startsWith('*')) {
      const bulletText = cleanLine.replace(/^[-•*]\s*/, '');
      if (currentSection?.subsections?.length) {
        const lastSub = currentSection.subsections[currentSection.subsections.length - 1];
        lastSub.items = lastSub.items || [];
        lastSub.items.push(bulletText);
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

// ========== ATS STANDARD TEMPLATE (Clean, Simple, ATS-Friendly) ==========
export const ATSTemplate: React.FC<TemplateProps> = ({ sections, companyName, positionTitle }) => {
  return (
    <div className="bg-white p-10 max-w-[8.5in] mx-auto font-sans">
      <style jsx>{`
        @media print {
          .ats-resume { font-size: 11pt; }
        }
      `}</style>
      
      <div className="ats-resume space-y-5">
        {sections.map((section, index) => {
          switch (section.type) {
            case 'header':
              return (
                <div key={index} className="text-center">
                  <h1 className="text-2xl font-bold text-gray-900 tracking-wide uppercase">
                    {section.content}
                  </h1>
                </div>
              );
            
            case 'contact':
              return (
                <div key={index} className="text-center text-sm text-gray-700 border-b border-gray-300 pb-3">
                  {section.content.split('|').map((part, i) => (
                    <span key={i} className="mx-2">{part.trim()}</span>
                  ))}
                </div>
              );
            
            case 'section':
              return (
                <div key={index} className="mt-4">
                  <h2 className="text-base font-bold text-gray-900 uppercase border-b border-gray-400 pb-1 mb-2">
                    {section.content}
                  </h2>
                  {section.subsections?.map((sub, subIndex) => (
                    <div key={subIndex} className="mb-3">
                      <div className="font-semibold text-gray-900 text-sm mb-1">
                        {sub.title}
                      </div>
                      {sub.items && (
                        <ul className="ml-5 space-y-1">
                          {sub.items.map((item, itemIndex) => (
                            <li key={itemIndex} className="text-gray-800 text-sm list-disc">
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              );
            
            case 'bullet':
              return (
                <div key={index} className="ml-5 text-sm text-gray-800">
                  <span className="inline-block mr-2">•</span>
                  {section.content}
                </div>
              );
            
            case 'text':
              return (
                <p key={index} className="text-gray-800 text-sm leading-relaxed">
                  {section.content}
                </p>
              );
            
            default:
              return null;
          }
        })}
      </div>
      
      <div className="mt-6 pt-3 border-t border-gray-200 text-xs text-gray-400 text-center print:hidden">
        Optimized for {positionTitle} at {companyName}
      </div>
    </div>
  );
};

// ========== MODERN PROFESSIONAL TEMPLATE (Stylish, Color Accents) ==========
export const ModernTemplate: React.FC<TemplateProps> = ({ sections, companyName, positionTitle }) => {
  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-10 max-w-[8.5in] mx-auto">
      <div className="bg-white rounded-lg shadow-xl overflow-hidden">
        {/* Header Section with Accent */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-8 py-6">
          {sections.filter(s => s.type === 'header' || s.type === 'contact').map((section, index) => (
            <div key={index}>
              {section.type === 'header' && (
                <h1 className="text-3xl font-bold tracking-wide mb-2">
                  {section.content}
                </h1>
              )}
              {section.type === 'contact' && (
                <div className="text-blue-100 text-sm flex flex-wrap gap-3">
                  {section.content.split('|').map((part, i) => (
                    <span key={i} className="flex items-center">
                      {i > 0 && <span className="mr-3">•</span>}
                      {part.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Content */}
        <div className="px-8 py-6 space-y-6">
          {sections.filter(s => s.type === 'section' || s.type === 'text' || s.type === 'bullet').map((section, index) => {
            switch (section.type) {
              case 'section':
                return (
                  <div key={index}>
                    <div className="flex items-center mb-3">
                      <div className="w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full mr-3"></div>
                      <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wide">
                        {section.content}
                      </h2>
                    </div>
                    
                    {section.subsections?.map((sub, subIndex) => (
                      <div key={subIndex} className="mb-4 ml-4">
                        <div className="font-semibold text-gray-900 mb-1 flex items-baseline">
                          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs mr-2">
                            {sub.title?.includes('|') ? sub.title.split('|')[0].trim() : sub.title}
                          </span>
                          {sub.title?.includes('|') && (
                            <span className="text-sm text-gray-600">
                              {sub.title.split('|').slice(1).join(' | ')}
                            </span>
                          )}
                        </div>
                        {sub.items && (
                          <ul className="space-y-1.5 mt-2">
                            {sub.items.map((item, itemIndex) => (
                              <li key={itemIndex} className="text-gray-700 text-sm flex items-start">
                                <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                );
              
              case 'bullet':
                return (
                  <div key={index} className="flex items-start ml-4">
                    <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    <p className="text-gray-700 text-sm">{section.content}</p>
                  </div>
                );
              
              case 'text':
                return (
                  <p key={index} className="text-gray-700 text-sm leading-relaxed ml-4">
                    {section.content}
                  </p>
                );
              
              default:
                return null;
            }
          })}
        </div>
        
        {/* Footer */}
        <div className="bg-slate-50 px-8 py-3 border-t border-slate-200">
          <p className="text-xs text-slate-500 text-center print:hidden">
            Tailored for {positionTitle} • {companyName}
          </p>
        </div>
      </div>
    </div>
  );
};

// ========== ENGINEERING TEMPLATE (Technical, Monospace Accents) ==========
export const EngineeringTemplate: React.FC<TemplateProps> = ({ sections, companyName, positionTitle }) => {
  return (
    <div className="bg-slate-900 p-10 max-w-[8.5in] mx-auto">
      <div className="bg-white rounded-lg shadow-2xl overflow-hidden border-2 border-slate-800">
        {/* Terminal-style Header */}
        <div className="bg-slate-800 text-green-400 px-6 py-4 font-mono border-b-2 border-green-500">
          {sections.filter(s => s.type === 'header').map((section, index) => (
            <div key={index} className="flex items-center">
              <span className="text-green-500 mr-2">~/portfolio$</span>
              <h1 className="text-2xl font-bold">
                {section.content.toLowerCase()}
              </h1>
            </div>
          ))}
          
          {sections.filter(s => s.type === 'contact').map((section, index) => (
            <div key={index} className="mt-2 text-sm text-green-300 font-mono">
              <span className="text-slate-500">{'> '}</span>
              {section.content.split('|').map((part, i) => (
                <span key={i} className="mr-4">{part.trim()}</span>
              ))}
            </div>
          ))}
        </div>
        
        {/* Content with Code-style */}
        <div className="px-6 py-6 space-y-6 bg-slate-50">
          {sections.filter(s => s.type === 'section' || s.type === 'text' || s.type === 'bullet').map((section, index) => {
            switch (section.type) {
              case 'section':
                return (
                  <div key={index} className="bg-white rounded-lg border-l-4 border-green-500 p-4 shadow-sm">
                    <div className="flex items-center mb-3">
                      <span className="font-mono text-green-600 mr-2">{'// '}</span>
                      <h2 className="text-base font-bold text-slate-900 uppercase font-mono tracking-wider">
                        {section.content}
                      </h2>
                    </div>
                    
                    {section.subsections?.map((sub, subIndex) => (
                      <div key={subIndex} className="mb-4 ml-4 border-l-2 border-slate-200 pl-4">
                        <div className="font-mono text-sm">
                          <span className="text-blue-600 font-semibold">const</span>{' '}
                          <span className="text-slate-900 font-bold">
                            {sub.title?.split('|')[0]?.trim() || 'role'}
                          </span>{' '}
                          <span className="text-slate-400">=</span>{' '}
                          {sub.title?.includes('|') && (
                            <span className="text-green-600">
                              "{sub.title.split('|').slice(1).join(' | ').trim()}"
                            </span>
                          )}
                        </div>
                        {sub.items && (
                          <div className="mt-2 space-y-1 ml-4">
                            {sub.items.map((item, itemIndex) => (
                              <div key={itemIndex} className="text-slate-700 text-sm flex items-start font-sans">
                                <span className="text-green-500 font-mono mr-2 flex-shrink-0">▹</span>
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              
              case 'bullet':
                return (
                  <div key={index} className="flex items-start ml-4">
                    <span className="text-green-500 font-mono mr-2 flex-shrink-0">▹</span>
                    <p className="text-slate-700 text-sm">{section.content}</p>
                  </div>
                );
              
              case 'text':
                return (
                  <p key={index} className="text-slate-700 text-sm leading-relaxed ml-4 font-sans">
                    {section.content}
                  </p>
                );
              
              default:
                return null;
            }
          })}
        </div>
        
        {/* Terminal Footer */}
        <div className="bg-slate-800 px-6 py-3 border-t-2 border-green-500">
          <p className="font-mono text-xs text-green-400 print:hidden">
            <span className="text-slate-500">{'> '}</span>
            optimized_for: "{positionTitle} @ {companyName}"
          </p>
        </div>
      </div>
    </div>
  );
};