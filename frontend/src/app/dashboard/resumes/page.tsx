'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Upload, Download, Trash2, Eye, Plus, Check } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Resume {
  id: number;
  title: string;
  fileName: string;
  uploadDate: string;
  isDefault: boolean;
}

export default function ResumeManagement() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/resumes`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setResumes(data);
      }
    } catch (error) {
      console.error('Error fetching resumes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.pdf')) {
      alert('Please upload a PDF file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name.replace('.pdf', ''));

    try {
      setUploading(true);
      const response = await fetch(`${API_BASE_URL}/api/resumes/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        fetchResumes();
      } else {
        alert('Failed to upload resume');
      }
    } catch (error) {
      console.error('Error uploading resume:', error);
      alert('Error uploading resume');
    } finally {
      setUploading(false);
    }
  };

  const handleSetDefault = async (resumeId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/resumes/${resumeId}/set-default`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchResumes();
      }
    } catch (error) {
      console.error('Error setting default resume:', error);
    }
  };

  const handleDelete = async (resumeId: number) => {
    if (!confirm('Are you sure you want to delete this resume?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/resumes/${resumeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchResumes();
      }
    } catch (error) {
      console.error('Error deleting resume:', error);
    }
  };

  const handleDownload = async (resumeId: number, fileName: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/resumes/${resumeId}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading resume:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading resumes...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Resume Management</h1>
          <p className="text-gray-600">Upload and manage different versions of your resume</p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload New Resume</h2>
          <div className="flex items-center gap-4">
            <label className="flex-1">
              <input
                type="file"
                accept=".pdf"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
              <div className={`flex items-center justify-center gap-3 px-6 py-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                uploading 
                  ? 'border-gray-300 bg-gray-50 cursor-not-allowed' 
                  : 'border-blue-300 hover:border-blue-500 hover:bg-blue-50'
              }`}>
                <Upload className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-700">
                  {uploading ? 'Uploading...' : 'Click to upload PDF resume'}
                </span>
              </div>
            </label>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Tip: Upload multiple versions tailored for different types of roles (e.g., "Resume - Frontend", "Resume - Backend")
          </p>
        </div>

        {/* Resumes List */}
        <div className="space-y-4">
          {resumes.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No resumes uploaded yet</p>
              <p className="text-gray-500 text-sm">Upload your first resume to get started</p>
            </div>
          ) : (
            resumes.map(resume => (
              <div
                key={resume.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">{resume.title}</h3>
                        {resume.isDefault && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{resume.fileName}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Uploaded {new Date(resume.uploadDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!resume.isDefault && (
                      <button
                        onClick={() => handleSetDefault(resume.id)}
                        className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Set as default"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => handleDownload(resume.id, resume.fileName)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(resume.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Tips Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Resume Tips</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Tailor your resume for each type of role (Frontend, Backend, Full Stack, etc.)</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Highlight relevant projects and technologies for each position</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Keep your resume to 1-2 pages maximum</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Use action verbs and quantify your achievements when possible</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>As a recent grad, include relevant coursework and academic projects</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}