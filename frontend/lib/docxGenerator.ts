import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, Packer } from 'docx';
import { saveAs } from 'file-saver';

interface ResumeSection {
  type: 'header' | 'contact' | 'section' | 'text' | 'bullet';
  content: string;
  subsections?: { title?: string; items?: string[] }[];
}

export const generateTemplateDocx = async (
  resumeText: string,
  companyName: string,
  positionTitle: string,
  template: 'ats' | 'modern' | 'engineering'
) => {
  // Parse resume text
  const sections = parseResumeText(resumeText);
  
  // Create document based on template
  let doc: Document;
  
  switch (template) {
    case 'ats':
      doc = createATSDocument(sections, companyName, positionTitle);
      break;
    case 'modern':
      doc = createModernDocument(sections, companyName, positionTitle);
      break;
    case 'engineering':
      doc = createEngineeringDocument(sections, companyName, positionTitle);
      break;
    default:
      doc = createATSDocument(sections, companyName, positionTitle);
  }
  
  // ✅ Use Packer.toBlob() instead of doc.toBlob()
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Resume-${companyName.replace(/\s+/g, '-')}-${positionTitle.replace(/\s+/g, '-')}.docx`);
};

function parseResumeText(text: string): ResumeSection[] {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  const sections: ResumeSection[] = [];
  let currentSection: ResumeSection | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cleanLine = line.replace(/\*\*/g, '');
    
    // Name (first line)
    if (i === 0) {
      sections.push({ type: 'header', content: cleanLine });
      continue;
    }
    
    // Contact info
    if (line.includes('@') || line.includes('|') || line.toLowerCase().includes('linkedin')) {
      sections.push({ type: 'contact', content: cleanLine });
      continue;
    }
    
    // Section headers (ALL CAPS)
    const sectionHeaders = ['PROFESSIONAL SUMMARY', 'SUMMARY', 'CORE SKILLS', 'SKILLS', 'EXPERIENCE', 'PROFESSIONAL EXPERIENCE', 'PROJECTS', 'EDUCATION'];
    if (sectionHeaders.some(header => cleanLine.toUpperCase().includes(header))) {
      currentSection = { type: 'section', content: cleanLine, subsections: [] };
      sections.push(currentSection);
      continue;
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
    
    // Job titles (has dates or |)
    if (cleanLine.includes('|') || /\d{4}/.test(cleanLine)) {
      if (currentSection && currentSection.subsections) {
        currentSection.subsections.push({ title: cleanLine, items: [] });
        continue;
      }
    }
    
    sections.push({ type: 'text', content: cleanLine });
  }
  
  return sections;
}

function createATSDocument(sections: ResumeSection[], companyName: string, positionTitle: string): Document {
  const children: Paragraph[] = [];
  
  sections.forEach(section => {
    switch (section.type) {
      case 'header':
        children.push(
          new Paragraph({
            text: section.content,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          })
        );
        break;
        
      case 'contact':
        children.push(
          new Paragraph({
            text: section.content,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            border: {
              bottom: {
                color: '000000',
                space: 1,
                style: BorderStyle.SINGLE,
                size: 6,
              },
            },
          })
        );
        break;
        
      case 'section':
        children.push(
          new Paragraph({
            text: section.content,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
            border: {
              bottom: {
                color: '666666',
                space: 1,
                style: BorderStyle.SINGLE,
                size: 6,
              },
            },
          })
        );
        
        section.subsections?.forEach(sub => {
          if (sub.title) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: sub.title,
                    bold: true,
                  }),
                ],
                spacing: { before: 120, after: 60 },
              })
            );
          }
          
          sub.items?.forEach(item => {
            children.push(
              new Paragraph({
                text: item,
                bullet: { level: 0 },
                spacing: { after: 60 },
              })
            );
          });
        });
        break;
        
      case 'bullet':
        children.push(
          new Paragraph({
            text: section.content,
            bullet: { level: 0 },
            spacing: { after: 60 },
          })
        );
        break;
        
      case 'text':
        children.push(
          new Paragraph({
            text: section.content,
            spacing: { after: 120 },
          })
        );
        break;
    }
  });
  
  return new Document({
    sections: [{
      properties: {},
      children: children,
    }],
  });
}

function createModernDocument(sections: ResumeSection[], companyName: string, positionTitle: string): Document {
  const children: Paragraph[] = [];
  
  sections.forEach(section => {
    switch (section.type) {
      case 'header':
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: section.content,
                bold: true,
                color: 'FFFFFF',
                size: 32,
              }),
            ],
            shading: {
              type: 'clear',
              color: '1e40af',
              fill: '1e40af',
            },
          })
        );
        break;
        
      case 'contact':
        children.push(
          new Paragraph({
            text: section.content,
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
          })
        );
        break;
        
      case 'section':
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '▌ ',
                color: '1e40af',
                bold: true,
                size: 24,
              }),
              new TextRun({
                text: section.content,
                bold: true,
                size: 24,
              }),
            ],
            spacing: { before: 240, after: 120 },
          })
        );
        
        section.subsections?.forEach(sub => {
          if (sub.title) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: sub.title,
                    bold: true,
                  }),
                ],
                spacing: { before: 120, after: 60 },
              })
            );
          }
          
          sub.items?.forEach(item => {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: '● ',
                    color: '3b82f6',
                    bold: true,
                  }),
                  new TextRun({
                    text: item,
                  }),
                ],
                spacing: { after: 60 },
              })
            );
          });
        });
        break;
        
      case 'bullet':
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '● ',
                color: '3b82f6',
                bold: true,
              }),
              new TextRun({
                text: section.content,
              }),
            ],
            spacing: { after: 60 },
          })
        );
        break;
        
      case 'text':
        children.push(
          new Paragraph({
            text: section.content,
            spacing: { after: 120 },
          })
        );
        break;
    }
  });
  
  return new Document({
    sections: [{
      properties: {},
      children: children,
    }],
  });
}

function createEngineeringDocument(sections: ResumeSection[], companyName: string, positionTitle: string): Document {
  const children: Paragraph[] = [];
  
  sections.forEach(section => {
    switch (section.type) {
      case 'header':
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '~/portfolio$ ',
                color: '22c55e',
                font: 'Courier New',
              }),
              new TextRun({
                text: section.content.toLowerCase(),
                bold: true,
                font: 'Courier New',
                color: '22c55e',
                size: 28,
              }),
            ],
            spacing: { after: 100 },
            shading: {
              type: 'clear',
              color: '1e293b',
              fill: '1e293b',
            },
          })
        );
        break;
        
      case 'contact':
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '> ',
                color: '64748b',
                font: 'Courier New',
              }),
              new TextRun({
                text: section.content,
                font: 'Courier New',
                color: '86efac',
              }),
            ],
            spacing: { after: 200 },
          })
        );
        break;
        
      case 'section':
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '// ',
                color: '22c55e',
                font: 'Courier New',
              }),
              new TextRun({
                text: section.content,
                bold: true,
                font: 'Courier New',
                size: 22,
              }),
            ],
            spacing: { before: 240, after: 120 },
          })
        );
        
        section.subsections?.forEach(sub => {
          if (sub.title) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'const ',
                    color: '3b82f6',
                    font: 'Courier New',
                    bold: true,
                  }),
                  new TextRun({
                    text: sub.title,
                    font: 'Courier New',
                    bold: true,
                  }),
                ],
                spacing: { before: 120, after: 60 },
              })
            );
          }
          
          sub.items?.forEach(item => {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: '▹ ',
                    color: '22c55e',
                    font: 'Courier New',
                  }),
                  new TextRun({
                    text: item,
                  }),
                ],
                spacing: { after: 60 },
              })
            );
          });
        });
        break;
        
      case 'bullet':
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '▹ ',
                color: '22c55e',
                font: 'Courier New',
              }),
              new TextRun({
                text: section.content,
              }),
            ],
            spacing: { after: 60 },
          })
        );
        break;
        
      case 'text':
        children.push(
          new Paragraph({
            text: section.content,
            spacing: { after: 120 },
          })
        );
        break;
    }
  });
  
  return new Document({
    sections: [{
      properties: {},
      children: children,
    }],
  });
}