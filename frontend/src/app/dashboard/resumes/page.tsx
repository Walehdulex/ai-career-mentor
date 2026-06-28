'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Upload, Download, Trash2, Check } from 'lucide-react';
import { MobileBottomNav } from '../../components/layout/Header';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Resume {
  id: number; title: string; fileName: string; uploadDate: string; isDefault: boolean;
}

export default function ResumeManagement() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchResumes(); }, []);

  const token = () => localStorage.getItem('token');

  const fetchResumes = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/resumes`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) setResumes(await res.json());
    } catch {} finally { setLoading(false); }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.pdf')) { alert('Please upload a PDF file'); return; }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name.replace('.pdf', ''));
    try {
      setUploading(true);
      const res = await fetch(`${API_BASE_URL}/api/resumes/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: formData });
      if (res.ok) fetchResumes(); else alert('Upload failed');
    } catch { alert('Error uploading'); } finally { setUploading(false); }
  };

  const handleSetDefault = async (id: number) => {
    const res = await fetch(`${API_BASE_URL}/api/resumes/${id}/set-default`, { method: 'PATCH', headers: { Authorization: `Bearer ${token()}` } });
    if (res.ok) fetchResumes();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this resume?')) return;
    const res = await fetch(`${API_BASE_URL}/api/resumes/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    if (res.ok) fetchResumes();
  };

  const handleDownload = async (id: number, fileName: string) => {
    const res = await fetch(`${API_BASE_URL}/api/resumes/${id}/download`, { headers: { Authorization: `Bearer ${token()}` } });
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fileName; document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Resume Management</h1>
          <p className="text-gray-500 text-sm">Upload and manage different versions of your resume</p>
        </div>

        {/* Upload */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Upload New Resume</h2>
          <label className={`flex items-center justify-center gap-3 px-5 py-5 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${uploading ? 'border-gray-200 bg-gray-50 cursor-not-allowed' : 'border-blue-300 hover:border-blue-500 hover:bg-blue-50'}`}>
            <input type="file" accept=".pdf" onChange={handleUpload} disabled={uploading} className="hidden" />
            <Upload className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <span className="font-medium text-gray-700 text-sm">{uploading ? 'Uploading…' : 'Tap to upload PDF resume'}</span>
          </label>
          <p className="text-xs text-gray-400 mt-2">Tip: Upload different versions for different roles — "Resume - Frontend", "Resume - Backend"</p>
        </div>

        {/* List */}
        <div className="space-y-3">
          {resumes.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
              <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No resumes uploaded yet</p>
            </div>
          ) : resumes.map(resume => (
            <div key={resume.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 rounded-lg flex-shrink-0">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900 text-sm truncate">{resume.title}</h3>
                  {resume.isDefault && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" />Default
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate">{resume.fileName}</p>
                <p className="text-xs text-gray-400">{new Date(resume.uploadDate).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!resume.isDefault && (
                  <button onClick={() => handleSetDefault(resume.id)} className="px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg">Set Default</button>
                )}
                <button onClick={() => handleDownload(resume.id, resume.fileName)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"><Download className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(resume.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>

        {/* Tips */}
        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Tips</h3>
          <ul className="space-y-1.5 text-xs text-blue-800">
            {['Tailor your resume for each type of role', 'Highlight relevant projects and tech for each position', 'Keep it to 1–2 pages maximum', 'Use action verbs and quantify achievements'].map(tip => (
              <li key={tip} className="flex items-start gap-2"><Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />{tip}</li>
            ))}
          </ul>
        </div>
      </div>
      <MobileBottomNav />
    </div>
  );
}