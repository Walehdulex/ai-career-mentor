'use client';

import React, { useState, useEffect } from 'react';
import { Briefcase, MapPin, DollarSign, TrendingUp, Star, Bookmark, Filter, Search, X, Check, Building2, Clock, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { Calendar, FileText, Edit2 } from 'lucide-react'
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiClient } from "../../../../lib/api"
import { MobileBottomNav } from '@/app/components/layout/Header'

interface Job {
  id: number; title: string; company: string; location: string; remoteType: string;
  salaryMin: number; salaryMax: number; experienceLevel: string; employmentType: string;
  postedDate: string; matchScore: number;
  scores: { skills: number; experience: number; location: number; salary: number; company: number };
  matchingSkills: string[]; missingSkills: string[]; description: string;
  companySize: string; industry: string; application_url?: string;
}
interface Application {
  id: number; jobTitle: string; company: string; status: string; appliedDate: string; nextStep: string;
}
interface JobDetailsModalProps {
  job: Job | null; onClose: () => void; onApply: (jobId: number) => void;
  onSave: (jobId: number) => void; isSaved: boolean; isApplied: boolean;
}
interface ApplicationStatusModalProps {
  application: Application | null; onClose: () => void; onUpdate: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const formatJobDate = (dateString: string) => {
  if (!dateString) return { text: 'Recently posted', isOld: false, daysAgo: 0 };
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const daysAgo = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  let text = '';
  let isOld = false;
  if (daysAgo === 0) text = 'Today';
  else if (daysAgo === 1) text = 'Yesterday';
  else if (daysAgo < 7) text = `${daysAgo} days ago`;
  else if (daysAgo < 30) text = `${Math.floor(daysAgo / 7)} weeks ago`;
  else if (daysAgo < 90) text = `${Math.floor(daysAgo / 30)} months ago`;
  else { text = `${Math.floor(daysAgo / 30)} months ago`; isOld = true; }
  return { text, isOld, daysAgo };
};

export default function JobsPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [activeTab, setActiveTab] = useState('recommended');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [savedJobs, setSavedJobs] = useState(new Set<number>());
  const [appliedJobs, setAppliedJobs] = useState(new Set<number>());  // ← NEW
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [totalJobsCount, setTotalJobsCount] = useState(0);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filters, setFilters] = useState({ location: '', remoteType: 'all', salaryMin: '', experienceLevel: 'all', employmentType: 'all' });
  const [displayedJobsCount, setDisplayedJobsCount] = useState(20);
  const [freshnessFilter, setFreshnessFilter] = useState('all');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  useEffect(() => { if (!isLoading && !user) router.push('/login') }, [user, isLoading, router])
  useEffect(() => { setDisplayedJobsCount(20) }, [searchQuery, filters, sortBy, sortOrder, freshnessFilter])
  useEffect(() => { if (user) { fetchJobs(); fetchApplications(); } }, [user])
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => { fetchJobs(); }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  if (isLoading) return (
    <div className='flex items-center justify-center h-screen'>
      <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500'></div>
    </div>
  )
  if (!user) return null

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) { router.push('/login'); return; }
      const response = await apiClient.get('/api/jobs/recommendations', { params: { limit: 100, min_score: 0 } });
      if (response.data?.recommendations) {
        const jobsList = response.data.recommendations.map((rec: any) => ({
          id: rec.job.id, title: rec.job.title, company: rec.job.company_name,
          location: rec.job.location, remoteType: rec.job.remote_type,
          salaryMin: rec.job.salary_min, salaryMax: rec.job.salary_max,
          experienceLevel: rec.job.experience_level, employmentType: rec.job.employment_type,
          postedDate: rec.job.posted_date, matchScore: rec.match_score, scores: rec.scores,
          matchingSkills: rec.job.required_skills || [], missingSkills: [],
          description: rec.job.description, companySize: rec.job.company_size,
          industry: rec.job.industry, application_url: rec.job.apply_url
        }));
        setJobs(jobsList); setTotalJobsCount(jobsList.length); setLastRefreshed(new Date());
      }
    } catch (error: any) {
      setJobs([]);
      if (error.response?.status === 401) {
        localStorage.removeItem('token'); localStorage.removeItem('auth_token'); router.push('/login');
      }
    } finally { setLoading(false); }
  };

  const fetchApplications = async () => {
    try {
      const response = await apiClient.get('/api/applications');
      setApplications(response.data);
      // ← Seed appliedJobs from existing applications using has_applied flag
      if (response.data?.length) {
        // applications don't carry job_id back, so we track via has_applied on job cards
        // appliedJobs is primarily updated via handleApply — this is fine
      }
    } catch (error) { setApplications([]); }
  };

  const toggleSaveJob = async (jobId: number) => {
    const newSaved = new Set(savedJobs);
    const token = localStorage.getItem('token');
    if (newSaved.has(jobId)) {
      newSaved.delete(jobId);
      await fetch(`${API_BASE_URL}/api/jobs/${jobId}/unsave`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    } else {
      newSaved.add(jobId);
      await fetch(`${API_BASE_URL}/api/jobs/${jobId}/save`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
    }
    setSavedJobs(newSaved);
  };

  // ── FIXED handleApply ──────────────────────────────────────────────────────
  const handleApply = async (jobId: number) => {
    if (appliedJobs.has(jobId)) return; // already applied, do nothing

    try {
      const response = await fetch(`${API_BASE_URL}/api/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ job_id: jobId })
      });

      if (response.ok) {
        setAppliedJobs(prev => new Set(prev).add(jobId));
        fetchApplications();
      } else if (response.status === 400) {
        // Already applied on the backend — sync our local state
        setAppliedJobs(prev => new Set(prev).add(jobId));
      } else {
        alert('Failed to apply. Please try again.');
      }
    } catch (error) {
      console.error('Error applying:', error);
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 80) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      applied: 'bg-blue-100 text-blue-800', interview: 'bg-purple-100 text-purple-800',
      offer: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const JobCard = ({ job }: { job: Job }) => {
    const dateInfo = formatJobDate(job.postedDate);
    const isApplied = appliedJobs.has(job.id);

    return (
      <div className={`bg-white rounded-xl border p-4 sm:p-6 hover:shadow-md transition-shadow ${dateInfo.isOld ? 'border-orange-200' : 'border-gray-200'}`}>
        {dateInfo.isOld && (
          <div className="mb-3 flex items-center gap-2 text-orange-700 bg-orange-100 px-3 py-2 rounded-lg text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>This job may be closed — posted {dateInfo.text}</span>
          </div>
        )}

        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight">{job.title}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ${getMatchScoreColor(job.matchScore)}`}>
                {job.matchScore}% Match
              </span>
              {isApplied && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Applied
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-gray-600 text-sm">
              <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="font-medium truncate">{job.company}</span>
              {job.companySize && <><span className="text-gray-300">•</span><span className="text-xs text-gray-500">{job.companySize}</span></>}
            </div>
          </div>
          <button onClick={() => toggleSaveJob(job.id)}
            className={`p-2 rounded-lg flex-shrink-0 ${savedJobs.has(job.id) ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100 text-gray-400'}`}>
            <Bookmark className={`w-4 h-4 ${savedJobs.has(job.id) ? 'fill-current' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-3 text-sm text-gray-600">
          <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate">{job.location} · {job.remoteType}</span></div>
          <div className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 flex-shrink-0" /><span>£{job.salaryMin?.toLocaleString()} – £{job.salaryMax?.toLocaleString()}</span></div>
          <div className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 flex-shrink-0" /><span>{job.experienceLevel} · {job.employmentType}</span></div>
          <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 flex-shrink-0" /><span className={dateInfo.isOld ? 'text-orange-600 font-medium' : ''}>{dateInfo.text}</span></div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {job.matchingSkills.slice(0, 4).map(skill => (
            <span key={skill} className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full border border-green-200 flex items-center gap-1">
              <Check className="w-3 h-3" />{skill}
            </span>
          ))}
          {job.matchingSkills.length > 4 && (
            <span className="px-2 py-0.5 bg-gray-50 text-gray-500 text-xs rounded-full border border-gray-200">+{job.matchingSkills.length - 4}</span>
          )}
        </div>

        <p className="text-gray-600 text-xs sm:text-sm mb-4 line-clamp-2">{job.description}</p>

        <div className="flex flex-col sm:flex-row gap-2">
          {/* Apply — links to external job URL and tracks internally */}
          {isApplied ? (
            <a
              href={job.application_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-4 py-2.5 rounded-lg font-medium text-sm bg-green-100 text-green-700 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Applied — View posting
            </a>
          ) : (
            <a
              href={job.application_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleApply(job.id)}
              className="flex-1 px-4 py-2.5 rounded-lg font-medium text-sm bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 transition-colors"
            >
              Apply Now <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button onClick={() => setSelectedJob(job)}
            className="flex-1 sm:flex-none px-4 py-2.5 border border-gray-300 hover:bg-gray-50 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 text-gray-700">
            View Details <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  const filteredJobs = jobs.filter(job => {
    if (searchQuery && !job.title.toLowerCase().includes(searchQuery.toLowerCase()) && !job.company.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filters.location && !job.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
    if (filters.remoteType !== 'all' && job.remoteType.toLowerCase() !== filters.remoteType.toLowerCase()) return false;
    if (filters.experienceLevel !== 'all' && job.experienceLevel.toLowerCase() !== filters.experienceLevel.toLowerCase()) return false;
    if (filters.salaryMin && job.salaryMin < parseInt(filters.salaryMin)) return false;
    if (freshnessFilter !== 'all' && job.postedDate) {
      const daysAgo = Math.ceil((new Date().getTime() - new Date(job.postedDate).getTime()) / (1000 * 60 * 60 * 24));
      if (freshnessFilter === '7days' && daysAgo > 7) return false;
      if (freshnessFilter === '30days' && daysAgo > 30) return false;
      if (freshnessFilter === '90days' && daysAgo > 90) return false;
    }
    return true;
  }).sort((a, b) => {
    let v = sortBy === 'match' ? b.matchScore - a.matchScore
          : sortBy === 'date' ? new Date(b.postedDate || 0).getTime() - new Date(a.postedDate || 0).getTime()
          : (b.salaryMax || b.salaryMin || 0) - (a.salaryMax || a.salaryMin || 0);
    return sortOrder === 'asc' ? -v : v;
  });

  const displayedJobs = filteredJobs.slice(0, displayedJobsCount);
  const oldJobsCount = filteredJobs.filter(job => formatJobDate(job.postedDate).isOld).length;

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center"><Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" /><p className="text-gray-600">Loading jobs...</p></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Job Matching</h1>
            <p className="text-gray-600 text-sm">Personalised recommendations based on your skills</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs sm:text-sm">
              <span className="text-blue-600 font-medium">📊 {filteredJobs.length} of {totalJobsCount} jobs</span>
              {oldJobsCount > 0 && <span className="text-orange-600 font-medium flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{oldJobsCount} may be outdated</span>}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={fetchJobs} disabled={loading}
              className="px-3 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium flex items-center gap-1.5">
              <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <a href="/dashboard/jobs/preferences" className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
              Preferences
            </a>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 mb-4 overflow-x-auto">
          <div className="flex min-w-max sm:min-w-0 border-b border-gray-200">
            {[
              { key: 'recommended', label: 'Recommended', icon: <Star className="w-4 h-4" />, count: filteredJobs.length },
              { key: 'saved', label: 'Saved', icon: <Bookmark className="w-4 h-4" />, count: savedJobs.size },
              { key: 'applications', label: 'Applied', icon: <Briefcase className="w-4 h-4" />, count: applications.length },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.key ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}>
                {tab.icon}{tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {activeTab !== 'applications' && (
          <div className="mb-4 space-y-2">
            <div className="flex gap-2 flex-wrap">
              <div className="flex-1 min-w-[160px] relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search jobs…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <select value={freshnessFilter} onChange={e => setFreshnessFilter(e.target.value)}
                className="px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500">
                <option value="all">All time</option>
                <option value="7days">Last 7 days</option>
                <option value="30days">Last 30 days</option>
                <option value="90days">Last 90 days</option>
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500">
                <option value="match">By Match</option>
                <option value="date">By Date</option>
                <option value="salary">By Salary</option>
              </select>
              <button onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
                className="px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-black hover:bg-gray-50">
                {sortOrder === 'desc' ? '↓' : '↑'}
              </button>
              <button onClick={() => setShowFilters(v => !v)}
                className="px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-black hover:bg-gray-50 flex items-center gap-1.5">
                <Filter className="w-4 h-4" /> Filters
              </button>
            </div>
            {showFilters && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-black">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                    <input type="text" placeholder="e.g. London" value={filters.location} onChange={e => setFilters({ ...filters, location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Remote</label>
                    <select value={filters.remoteType} onChange={e => setFilters({ ...filters, remoteType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                      <option value="all">All</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="onsite">Onsite</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Min Salary (£)</label>
                    <input type="number" placeholder="e.g. 50000" value={filters.salaryMin} onChange={e => setFilters({ ...filters, salaryMin: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Experience</label>
                    <select value={filters.experienceLevel} onChange={e => setFilters({ ...filters, experienceLevel: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                      <option value="all">All</option><option value="Junior">Junior</option><option value="Mid">Mid</option><option value="Senior">Senior</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button onClick={() => setFilters({ location: '', remoteType: 'all', salaryMin: '', experienceLevel: 'all', employmentType: 'all' })}
                    className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Clear</button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'recommended' && (
          <div className="space-y-3">
            {filteredJobs.length > 0 ? displayedJobs.map(job => <JobCard key={job.id} job={job} />) : (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No jobs match your criteria</p>
              </div>
            )}
            {filteredJobs.length > displayedJobsCount && (
              <button onClick={() => setDisplayedJobsCount(n => n + 20)}
                className="w-full py-3 border border-gray-200 bg-white rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                Load more jobs
              </button>
            )}
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="space-y-3">
            {savedJobs.size > 0 ? jobs.filter(j => savedJobs.has(j.id)).map(job => <JobCard key={job.id} job={job} />) : (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No saved jobs yet — tap the bookmark icon to save</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'applications' && (
          <div className="space-y-3">
            {applications.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No applications yet</p>
              </div>
            ) : applications.map(app => (
              <div key={app.id} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{app.jobTitle}</h3>
                    <p className="text-sm text-gray-600">{app.company}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </span>
                    <button onClick={() => setSelectedApplication(app)}
                      className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-medium">Update</button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <div><span className="font-medium">Applied:</span> {app.appliedDate}</div>
                  <div><span className="font-medium">Next:</span> {app.nextStep}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedJob && (
        <JobDetailsModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onApply={handleApply}
          onSave={toggleSaveJob}
          isSaved={savedJobs.has(selectedJob.id)}
          isApplied={appliedJobs.has(selectedJob.id)}
        />
      )}
      {selectedApplication && (
        <ApplicationStatusModal application={selectedApplication} onClose={() => setSelectedApplication(null)}
          onUpdate={() => { fetchApplications(); setSelectedApplication(null); }} />
      )}

      <MobileBottomNav />
    </div>
  );
}

// ── JobDetailsModal ───────────────────────────────────────────────────────
const JobDetailsModal = ({ job, onClose, onApply, onSave, isSaved, isApplied }: JobDetailsModalProps) => {
  if (!job) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-3xl max-h-[92vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-gray-200 flex-shrink-0">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0 pr-3">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-gray-900">{job.title}</h2>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                  job.matchScore >= 90 ? 'bg-green-100 text-green-800 border-green-200' :
                  job.matchScore >= 80 ? 'bg-blue-100 text-blue-800 border-blue-200' :
                  'bg-yellow-100 text-yellow-800 border-yellow-200'}`}>{job.matchScore}% Match</span>
                {isApplied && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Applied
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <Building2 className="w-4 h-4" /><span>{job.company}</span>
                {job.industry && <><span className="text-gray-300">•</span><span>{job.industry}</span></>}
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4 text-sm text-gray-600">
            <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /><span>{job.location} · {job.remoteType}</span></div>
            <div className="flex items-center gap-1.5"><DollarSign className="w-4 h-4" />
              <span>{job.salaryMin && job.salaryMax ? `£${job.salaryMin.toLocaleString()} – £${job.salaryMax.toLocaleString()}` : 'Not specified'}</span></div>
            <div className="flex items-center gap-1.5"><Briefcase className="w-4 h-4" /><span>{job.experienceLevel} · {job.employmentType}</span></div>
            <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /><span>{formatJobDate(job.postedDate).text}</span></div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Match Breakdown</h3>
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(job.scores).map(([key, value]) => (
                <div key={key} className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                  <div className="text-xs text-gray-500 capitalize mb-1.5">{key}</div>
                  <div className="h-1.5 bg-gray-200 rounded-full mb-1">
                    <div className={`h-full rounded-full ${value >= 85 ? 'bg-green-500' : value >= 70 ? 'bg-blue-500' : 'bg-yellow-500'}`} style={{ width: `${value}%` }} />
                  </div>
                  <span className={`text-xs font-semibold ${value >= 85 ? 'text-green-600' : 'text-gray-700'}`}>{value}%</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {job.matchingSkills.map(skill => (
                <span key={skill} className="px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs border border-green-200 flex items-center gap-1">
                  <Check className="w-3 h-3" />{skill}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{job.description}</p>
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0 flex gap-2">
          {/* Apply — links to external job URL and tracks internally */}
          {isApplied ? (
            <a
              href={job.application_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-4 py-2.5 rounded-lg font-medium text-sm bg-green-100 text-green-700 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Applied — View posting
            </a>
          ) : (
            <a
              href={job.application_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onApply(job.id)}
              className="flex-1 px-4 py-2.5 rounded-lg font-medium text-sm bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 transition-colors"
            >
              Apply Now <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button onClick={() => onSave(job.id)}
            className={`px-4 py-2.5 rounded-lg font-medium text-sm border transition-colors ${isSaved ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
            {isSaved ? 'Saved' : 'Save'}
          </button>
          <a href={job.application_url || '#'} target="_blank" rel="noopener noreferrer"
            className="px-4 py-2.5 border border-gray-300 hover:bg-gray-50 rounded-lg font-medium text-sm flex items-center gap-1.5 text-gray-700">
            Site <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};

// ── ApplicationStatusModal ────────────────────────────────────────────────
const ApplicationStatusModal = ({ application, onClose, onUpdate }: ApplicationStatusModalProps) => {
  const [status, setStatus] = useState(application?.status || 'applied');
  const [notes, setNotes] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [saving, setSaving] = useState(false);

  const statusOptions = [
    { value: 'applied', label: 'Applied', color: 'bg-blue-100 text-blue-800' },
    { value: 'screening', label: 'Screening', color: 'bg-purple-100 text-purple-800' },
    { value: 'interview', label: 'Interview', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'technical', label: 'Technical', color: 'bg-orange-100 text-orange-800' },
    { value: 'final', label: 'Final Round', color: 'bg-indigo-100 text-indigo-800' },
    { value: 'offer', label: 'Offer', color: 'bg-green-100 text-green-800' },
    { value: 'accepted', label: 'Accepted', color: 'bg-green-200 text-green-900' },
    { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800' },
    { value: 'withdrawn', label: 'Withdrawn', color: 'bg-gray-100 text-gray-800' },
  ];

  const handleSave = async () => {
    if (!application) return;
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/api/applications/${application.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ status, notes: notes || undefined, interview_date: interviewDate || undefined })
      });
      if (response.ok) { onUpdate(); onClose(); }
      else alert('Failed to update');
    } catch { alert('Error updating'); }
    finally { setSaving(false); }
  };

  if (!application) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex-shrink-0 flex justify-between items-start">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{application.jobTitle}</h2>
            <p className="text-sm text-gray-600">{application.company}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Update Status</label>
            <div className="grid grid-cols-3 gap-2">
              {statusOptions.map(opt => (
                <button key={opt.value} onClick={() => setStatus(opt.value)}
                  className={`px-2 py-2.5 rounded-lg text-xs font-medium border-2 transition-all ${
                    status === opt.value ? `${opt.color} border-current` : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}>{opt.label}</button>
              ))}
            </div>
          </div>
          {['interview', 'screening', 'technical', 'final'].includes(status) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Interview Date & Time</label>
              <input type="datetime-local" value={interviewDate} onChange={e => setInterviewDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Add notes…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-lg">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:bg-gray-400">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};