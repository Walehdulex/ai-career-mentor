'use client';

import React, { useState } from 'react';
import { ATSTemplate, ModernTemplate, EngineeringTemplate, parseResumeText } from './resume-templates/ResumeTemplates';

type TemplateType = 'ats' | 'modern' | 'engineering';

interface TemplateOption {
  id: TemplateType;
  name: string;
  description: string;
  icon: React.ReactNode;
  bestFor: string;
}

interface ResumeTemplateSelectorProps {
  resumeText: string;
  companyName: string;
  positionTitle: string;
  onTemplateChange?: (template: TemplateType) => void;
}

export const ResumeTemplateSelector: React.FC<ResumeTemplateSelectorProps> = ({
  resumeText,
  companyName,
  positionTitle,
  onTemplateChange,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('ats');
  const sections = parseResumeText(resumeText);

  const templates: TemplateOption[] = [
    {
      id: 'ats',
      name: 'ATS Standard',
      description: 'Clean, simple format optimized for Applicant Tracking Systems',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      bestFor: 'Corporate jobs, traditional companies, maximum ATS compatibility',
    },
    {
      id: 'modern',
      name: 'Modern Professional',
      description: 'Stylish design with color accents and modern typography',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      ),
      bestFor: 'Startups, creative roles, design-forward companies',
    },
    {
      id: 'engineering',
      name: 'Engineering',
      description: 'Terminal-inspired design for technical professionals',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      bestFor: 'Software engineering, DevOps, technical roles, tech companies',
    },
  ];

  const handleTemplateChange = (template: TemplateType) => {
    setSelectedTemplate(template);
    onTemplateChange?.(template);
  };

  const renderTemplate = () => {
    const props = { sections, companyName, positionTitle };
    
    switch (selectedTemplate) {
      case 'ats':
        return <ATSTemplate {...props} />;
      case 'modern':
        return <ModernTemplate {...props} />;
      case 'engineering':
        return <EngineeringTemplate {...props} />;
      default:
        return <ATSTemplate {...props} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Template Selector */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          Choose Resume Template
        </h3>
        
        <div className="grid md:grid-cols-3 gap-4">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => handleTemplateChange(template.id)}
              className={`p-4 border-2 rounded-lg text-left transition-all hover:shadow-md ${
                selectedTemplate === template.id
                  ? 'border-blue-600 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center mb-2">
                <div className={`p-2 rounded-lg ${
                  selectedTemplate === template.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {template.icon}
                </div>
                {selectedTemplate === template.id && (
                  <svg className="w-5 h-5 text-blue-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              
              <h4 className="font-semibold text-gray-900 mb-1">{template.name}</h4>
              <p className="text-xs text-gray-600 mb-2">{template.description}</p>
              <div className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
                <span className="font-medium">Best for:</span> {template.bestFor}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Resume Preview */}
      <div className="border rounded-lg overflow-hidden shadow-xl">
        {renderTemplate()}
      </div>
    </div>
  );
};