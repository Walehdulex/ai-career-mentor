'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Briefcase,
  MapPin,
  PoundSterling,
  Star,
  Bookmark,
  SlidersHorizontal,
  Search,
  X,
  Check,
  Building2,
  Clock,
  ExternalLink,
  Loader2,
  AlertCircle,
  RefreshCw,
  ArrowUpDown,
} from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { apiClient } from '../../../../lib/api';
import { Header, MobileBottomNav } from '@/app/components/layout/Header';

interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  remoteType: string;
  salaryMin: number;
  salaryMax: number;
  experienceLevel: string;
  employmentType: string;
  postedDate: string;
  matchScore: number;
  scores: { skills: number; experience: number; location: number; salary: number; company: number };
  requiredSkills: string[];
  description: string;
  companySize: string;
  industry: string;
  application_url?: string;
}

interface Application {
  id: number;
  job_id?: number;
  jobTitle: string;
  company: string;
  status: string;
  appliedDate: string;
  nextStep: string;
}

type Tab = 'recommended' | 'saved' | 'applications';

// ── helpers ────────────────────────────────────────────────────────────────

const formatJobDate = (dateString: string) => {
  if (!dateString) return { text: 'Recently posted', isOld: false, daysAgo: 0 };
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const daysAgo = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  let text = '';
  let isOld = false;
  if (daysAgo === 0) text = 'Today';
  else if (daysAgo === 1) text = 'Yesterday';
  else if (daysAgo < 7) text = `${daysAgo} days ago`;
  else if (daysAgo < 30) text = `${Math.floor(daysAgo / 7)} weeks ago`;
  else {
    text = `${Math.floor(daysAgo / 30)} months ago`;
    if (daysAgo >= 90) isOld = true;
  }
  return { text, isOld, daysAgo };
};

const getMatchScoreColor = (score: number) => {
  if (score >= 90) return 'bg-green-100 text-green-800 border-green-200';
  if (score >= 80) return 'bg-blue-100 text-blue-800 border-blue-200';
  if (score >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  return 'bg-gray-100 text-gray-800 border-gray-200';
};

const statusOptions = [
  { value: 'applied', label: 'Applied', color: 'bg-blue-100 text-blue-800' },
  { value: 'screening', label: 'Screening', color: 'bg-purple-100 text-purple-800' },
  { value: 'interview', label: 'Interview', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'technical', label: 'Technical', color: 'bg-orange-100 text-orange-800' },
  { value: 'final', label: 'Final round', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'offer', label: 'Offer', color: 'bg-green-100 text-green-800' },
  { value: 'accepted', label: 'Accepted', color: 'bg-green-200 text-green-900' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800' },
  { value: 'withdrawn', label: 'Withdrawn', color: 'bg-gray-100 text-gray-800' },
];

const getStatusColor = (status: string) =>
  statusOptions.find((s) => s.value === status)?.color || 'bg-gray-100 text-gray-800';

const formatSalary = (min?: number, max?: number) => {
  if (min && max) return `£${min.toLocaleString()} – £${max.toLocaleString()}`;
  if (min) return `From £${min.toLocaleString()}`;
  if (max) return `Up to £${max.toLocaleString()}`;
  return null;
};

const labelClass = 'block text-xs font-medium text-gray-700 mb-1';
const fieldClass =
  'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

// ── Apply button (shared by card and modal) ────────────────────────────────

function ApplyButton({
  job,
  isApplied,
  onApply,
}: {
  job: Job;
  isApplied: boolean;
  onApply: (job: Job) => void;
}) {
  if (!job.application_url) {
    return (
      <span className="flex-1 px-4 py-2.5 rounded-lg font-medium text-sm bg-gray-100 text-gray-400 flex items-center justify-center">
        No posting link
      </span>
    );
  }
  if (isApplied) {
    return (
      <a
        href={job.application_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 px-4 py-2.5 rounded-lg font-medium text-sm bg-green-50 text-green-700 border border-green-200 flex items-center justify-center gap-2"
      >
        <Check className="w-4 h-4" /> Applied, view posting
      </a>
    );
  }
  return (
    <a
      href={job.application_url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onApply(job)}
      className="flex-1 px-4 py-2.5 rounded-lg font-medium text-sm bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 transition-colors"
    >
      Apply now <ExternalLink className="w-3.5 h-3.5" />
    </a>
  );
}

// ── Job card (defined outside the page so it isn't remounted on every render) ─

function JobCard({
  job,
  isSaved,
  isApplied,
  onSave,
  onApply,
  onView,
}: {
  job: Job;
  isSaved: boolean;
  isApplied: boolean;
  onSave: (job: Job) => void;
  onApply: (job: Job) => void;
  onView: (job: Job) => void;
}) {
  const dateInfo = formatJobDate(job.postedDate);
  const salary = formatSalary(job.salaryMin, job.salaryMax);

  return (
    <div
      className={`bg-white rounded-xl border shadow-sm p-4 sm:p-5 hover:shadow-md transition-shadow ${
        dateInfo.isOld ? 'border-orange-200' : 'border-gray-100'
      }`}
    >
      {dateInfo.isOld && (
        <div className="mb-3 flex items-center gap-2 text-orange-700 bg-orange-50 px-3 py-2 rounded-lg text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>This job may be closed. It was posted {dateInfo.text}.</span>
        </div>
      )}

      <div className="flex justify-between items-start mb-3 gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight">{job.title}</h3>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ${getMatchScoreColor(
                job.matchScore
              )}`}
            >
              {job.matchScore}% match
            </span>
            {isApplied && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200 flex items-center gap-1">
                <Check className="w-3 h-3" /> Applied
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-gray-600 text-sm">
            <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="font-medium truncate">{job.company}</span>
            {job.companySize && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-xs text-gray-500">{job.companySize}</span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={() => onSave(job)}
          aria-label={isSaved ? 'Remove from saved' : 'Save job'}
          className={`p-2 rounded-lg flex-shrink-0 transition-colors ${
            isSaved ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100 text-gray-400'
          }`}
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-3 text-sm text-gray-600">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">
            {job.location}
            {job.remoteType ? ` · ${job.remoteType}` : ''}
          </span>
        </div>
        {salary && (
          <div className="flex items-center gap-1.5">
            <PoundSterling className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{salary}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            {job.experienceLevel}
            {job.employmentType ? ` · ${job.employmentType}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
          <span className={dateInfo.isOld ? 'text-orange-600 font-medium' : ''}>{dateInfo.text}</span>
        </div>
      </div>

      {job.requiredSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {job.requiredSkills.slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100"
            >
              {skill}
            </span>
          ))}
          {job.requiredSkills.length > 4 && (
            <span className="px-2 py-0.5 bg-gray-50 text-gray-500 text-xs rounded-full border border-gray-200">
              +{job.requiredSkills.length - 4}
            </span>
          )}
        </div>
      )}

      <p className="text-gray-600 text-xs sm:text-sm mb-4 line-clamp-2">{job.description}</p>

      <div className="flex flex-col sm:flex-row gap-2">
        <ApplyButton job={job} isApplied={isApplied} onApply={onApply} />
        <button
          onClick={() => onView(job)}
          className="flex-1 sm:flex-none px-4 py-2.5 border border-gray-300 hover:bg-gray-50 rounded-lg font-medium text-sm transition-colors text-gray-700"
        >
          View details
        </button>
      </div>
    </div>
  );
}

// ── Job details modal ──────────────────────────────────────────────────────

function JobDetailsModal({
  job,
  onClose,
  onApply,
  onSave,
  isSaved,
  isApplied,
}: {
  job: Job;
  onClose: () => void;
  onApply: (job: Job) => void;
  onSave: (job: Job) => void;
  isSaved: boolean;
  isApplied: boolean;
}) {
  const salary = formatSalary(job.salaryMin, job.salaryMax);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-3xl max-h-[92vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0 pr-3">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-gray-900">{job.title}</h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getMatchScoreColor(
                    job.matchScore
                  )}`}
                >
                  {job.matchScore}% match
                </span>
                {isApplied && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Applied
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <Building2 className="w-4 h-4" />
                <span>{job.company}</span>
                {job.industry && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span>{job.industry}</span>
                  </>
                )}
              </div>
            </div>
            <button onClick={onClose} aria-label="Close" className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4 text-sm text-gray-600">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              <span>
                {job.location}
                {job.remoteType ? ` · ${job.remoteType}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <PoundSterling className="w-4 h-4" />
              <span>{salary || 'Salary not specified'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Briefcase className="w-4 h-4" />
              <span>
                {job.experienceLevel}
                {job.employmentType ? ` · ${job.employmentType}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{formatJobDate(job.postedDate).text}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {job.scores && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Match breakdown</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {Object.entries(job.scores).map(([key, value]) => (
                  <div key={key} className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <div className="text-xs text-gray-500 capitalize mb-1.5">{key}</div>
                    <div className="h-1.5 bg-gray-200 rounded-full mb-1">
                      <div
                        className={`h-full rounded-full ${
                          value >= 85 ? 'bg-green-500' : value >= 70 ? 'bg-blue-500' : 'bg-yellow-500'
                        }`}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                    <span className={`text-xs font-semibold ${value >= 85 ? 'text-green-600' : 'text-gray-700'}`}>
                      {value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {job.requiredSkills.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Required skills</h3>
              <div className="flex flex-wrap gap-2">
                {job.requiredSkills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs border border-blue-100"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{job.description}</p>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex-shrink-0 flex gap-2">
          <ApplyButton job={job} isApplied={isApplied} onApply={onApply} />
          <button
            onClick={() => onSave(job)}
            className={`px-4 py-2.5 rounded-lg font-medium text-sm border transition-colors ${
              isSaved
                ? 'bg-blue-50 text-blue-600 border-blue-200'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {isSaved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Application status modal ───────────────────────────────────────────────

function ApplicationStatusModal({
  application,
  onClose,
  onUpdate,
}: {
  application: Application;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [status, setStatus] = useState(application.status || 'applied');
  const [notes, setNotes] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      await apiClient.patch(`/api/applications/${application.id}`, {
        status,
        notes: notes || undefined,
        interview_date: interviewDate || undefined,
      });
      onUpdate();
      onClose();
    } catch {
      setError("Couldn't update this application. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex-shrink-0 flex justify-between items-start">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{application.jobTitle}</h2>
            <p className="text-sm text-gray-600">{application.company}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Update status</label>
            <div className="grid grid-cols-3 gap-2">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className={`px-2 py-2.5 rounded-lg text-xs font-medium border-2 transition-all ${
                    status === opt.value
                      ? `${opt.color} border-current`
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {['interview', 'screening', 'technical', 'final'].includes(status) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Interview date and time</label>
              <input
                type="datetime-local"
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
                className={fieldClass}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add notes..."
              className={`${fieldClass} resize-none`}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex-shrink-0 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-lg">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

function JobsContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<Tab>(
    tabParam === 'applications' || tabParam === 'saved' ? tabParam : 'recommended'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [savedJobs, setSavedJobs] = useState(new Set<number>());
  const [appliedJobs, setAppliedJobs] = useState(new Set<number>());
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filters, setFilters] = useState({ location: '', remoteType: 'all', salaryMin: '', experienceLevel: 'all' });
  const [displayedJobsCount, setDisplayedJobsCount] = useState(20);
  const [freshnessFilter, setFreshnessFilter] = useState('all');

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    setDisplayedJobsCount(20);
  }, [searchQuery, filters, sortBy, sortOrder, freshnessFilter]);

  useEffect(() => {
    if (user) {
      fetchJobs();
      fetchApplications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Silent background refresh, so the page doesn't flash or close open modals
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => fetchJobs(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const addToSet = (setter: React.Dispatch<React.SetStateAction<Set<number>>>, ids: number[]) => {
    if (ids.length === 0) return;
    setter((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const fetchJobs = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setInitialLoading(true);
    try {
      const response = await apiClient.get('/api/jobs/recommendations', {
        params: { limit: 100, min_score: 0 },
      });
      const recs: any[] = response.data?.recommendations || [];
      const jobsList: Job[] = recs.map((rec) => ({
        id: rec.job.id,
        title: rec.job.title,
        company: rec.job.company_name,
        location: rec.job.location,
        remoteType: rec.job.remote_type,
        salaryMin: rec.job.salary_min,
        salaryMax: rec.job.salary_max,
        experienceLevel: rec.job.experience_level,
        employmentType: rec.job.employment_type,
        postedDate: rec.job.posted_date,
        matchScore: rec.match_score,
        scores: rec.scores,
        requiredSkills: rec.job.required_skills || [],
        description: rec.job.description,
        companySize: rec.job.company_size,
        industry: rec.job.industry,
        application_url: rec.job.apply_url,
      }));
      setJobs(jobsList);

      // Seed saved/applied state if the backend sends those flags
      addToSet(
        setSavedJobs,
        recs.filter((r) => r.job.is_saved ?? r.is_saved).map((r) => r.job.id)
      );
      addToSet(
        setAppliedJobs,
        recs.filter((r) => r.job.has_applied ?? r.has_applied).map((r) => r.job.id)
      );
    } catch (error: any) {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('auth_token');
        router.push('/login');
        return;
      }
      if (!silent) {
        setJobs([]);
        setNotice("Couldn't load your job matches. Try refreshing in a moment.");
      }
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  };

  const fetchApplications = async () => {
    try {
      const response = await apiClient.get('/api/applications');
      const list: Application[] = Array.isArray(response.data) ? response.data : [];
      setApplications(list);
      addToSet(
        setAppliedJobs,
        list.filter((a) => a.job_id != null).map((a) => a.job_id as number)
      );
    } catch {
      setApplications([]);
    }
  };

  const toggleSaveJob = async (job: Job) => {
    const wasSaved = savedJobs.has(job.id);

    // Update the UI straight away, and undo it if the request fails
    setSavedJobs((prev) => {
      const next = new Set(prev);
      if (wasSaved) next.delete(job.id);
      else next.add(job.id);
      return next;
    });

    try {
      if (wasSaved) await apiClient.delete(`/api/jobs/${job.id}/unsave`);
      else await apiClient.post(`/api/jobs/${job.id}/save`);
    } catch {
      setSavedJobs((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.add(job.id);
        else next.delete(job.id);
        return next;
      });
      setNotice("Couldn't update your saved jobs. Please try again.");
    }
  };

  const handleApply = async (job: Job) => {
    if (appliedJobs.has(job.id) || !job.application_url) return;

    setAppliedJobs((prev) => new Set(prev).add(job.id));
    try {
      await apiClient.post('/api/applications', { job_id: job.id });
      fetchApplications();
    } catch (error: any) {
      // 400 means it's already tracked on the backend, so keep it marked as applied
      if (error.response?.status !== 400) {
        setAppliedJobs((prev) => {
          const next = new Set(prev);
          next.delete(job.id);
          return next;
        });
        setNotice("Couldn't record that application. Please try again.");
      }
    }
  };

  if (isLoading || initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">Loading jobs...</p>
        </div>
      </div>
    );
  }
  if (!user) return null;

  const filteredJobs = jobs
    .filter((job) => {
      const q = searchQuery.toLowerCase();
      if (q && !job.title.toLowerCase().includes(q) && !job.company.toLowerCase().includes(q)) return false;
      if (filters.location && !(job.location || '').toLowerCase().includes(filters.location.toLowerCase()))
        return false;
      if (filters.remoteType !== 'all' && (job.remoteType || '').toLowerCase() !== filters.remoteType) return false;
      if (
        filters.experienceLevel !== 'all' &&
        (job.experienceLevel || '').toLowerCase() !== filters.experienceLevel.toLowerCase()
      )
        return false;
      if (filters.salaryMin && job.salaryMin < parseInt(filters.salaryMin)) return false;
      if (freshnessFilter !== 'all' && job.postedDate) {
        const { daysAgo } = formatJobDate(job.postedDate);
        if (freshnessFilter === '7days' && daysAgo > 7) return false;
        if (freshnessFilter === '30days' && daysAgo > 30) return false;
        if (freshnessFilter === '90days' && daysAgo > 90) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const v =
        sortBy === 'match'
          ? b.matchScore - a.matchScore
          : sortBy === 'date'
          ? new Date(b.postedDate || 0).getTime() - new Date(a.postedDate || 0).getTime()
          : (b.salaryMax || b.salaryMin || 0) - (a.salaryMax || a.salaryMin || 0);
      return sortOrder === 'asc' ? -v : v;
    });

  const displayedJobs = filteredJobs.slice(0, displayedJobsCount);
  const oldJobsCount = filteredJobs.filter((job) => formatJobDate(job.postedDate).isOld).length;
  const savedList = jobs.filter((j) => savedJobs.has(j.id));

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'recommended', label: 'Recommended', icon: <Star className="w-4 h-4" />, count: filteredJobs.length },
    { key: 'saved', label: 'Saved', icon: <Bookmark className="w-4 h-4" />, count: savedJobs.size },
    { key: 'applications', label: 'Applied', icon: <Briefcase className="w-4 h-4" />, count: applications.length },
  ];

  const cardProps = (job: Job) => ({
    job,
    isSaved: savedJobs.has(job.id),
    isApplied: appliedJobs.has(job.id),
    onSave: toggleSaveJob,
    onApply: handleApply,
    onView: setSelectedJob,
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24 sm:pb-0">
      <Header />

      {/* Banner, same gradient as the dashboard */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold mb-1 leading-tight">Job matching</h1>
            <p className="text-blue-100 text-sm">Recommendations based on your skills and preferences</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-blue-100">
              <span>
                {filteredJobs.length} of {jobs.length} jobs
              </span>
              {oldJobsCount > 0 && (
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {oldJobsCount} may be outdated
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => fetchJobs(true)}
              disabled={refreshing}
              className="px-3 py-2 border border-white/40 text-white rounded-lg hover:bg-white/10 text-sm font-medium flex items-center gap-1.5 disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link
              href="/dashboard/jobs/preferences"
              className="px-4 py-2 bg-white text-blue-700 rounded-lg hover:bg-blue-50 text-sm font-semibold transition-colors"
            >
              Preferences
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {notice && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="flex-1">{notice}</p>
            <button onClick={() => setNotice('')} aria-label="Dismiss" className="text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-4 overflow-x-auto">
          <div className="flex min-w-max sm:min-w-0">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3.5 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
                  activeTab === tab.key
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900 border-transparent'
                }`}
              >
                {tab.icon}
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Search and filters */}
        {activeTab !== 'applications' && (
          <div className="mb-4 space-y-2">
            <div className="flex gap-2 flex-wrap">
              <div className="flex-1 min-w-[160px] relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search jobs or companies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`${fieldClass} pl-9`}
                />
              </div>
              <select
                value={freshnessFilter}
                onChange={(e) => setFreshnessFilter(e.target.value)}
                className={`${fieldClass} w-auto`}
              >
                <option value="all">All time</option>
                <option value="7days">Last 7 days</option>
                <option value="30days">Last 30 days</option>
                <option value="90days">Last 90 days</option>
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={`${fieldClass} w-auto`}>
                <option value="match">By match</option>
                <option value="date">By date</option>
                <option value="salary">By salary</option>
              </select>
              <button
                onClick={() => setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
                aria-label={sortOrder === 'desc' ? 'Sorted high to low' : 'Sorted low to high'}
                className="px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
              >
                <ArrowUpDown className="w-4 h-4" />
                {sortOrder === 'desc' ? 'High to low' : 'Low to high'}
              </button>
              <button
                onClick={() => setShowFilters((v) => !v)}
                className={`px-3 py-2.5 border rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  showFilters
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" /> Filters
              </button>
            </div>

            {showFilters && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className={labelClass}>Location</label>
                    <input
                      type="text"
                      placeholder="e.g. London"
                      value={filters.location}
                      onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Remote</label>
                    <select
                      value={filters.remoteType}
                      onChange={(e) => setFilters({ ...filters, remoteType: e.target.value })}
                      className={fieldClass}
                    >
                      <option value="all">All</option>
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="onsite">Onsite</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Min salary (£)</label>
                    <input
                      type="number"
                      placeholder="e.g. 50000"
                      value={filters.salaryMin}
                      onChange={(e) => setFilters({ ...filters, salaryMin: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Experience</label>
                    <select
                      value={filters.experienceLevel}
                      onChange={(e) => setFilters({ ...filters, experienceLevel: e.target.value })}
                      className={fieldClass}
                    >
                      <option value="all">All</option>
                      <option value="Junior">Junior</option>
                      <option value="Mid">Mid</option>
                      <option value="Senior">Senior</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() =>
                      setFilters({ location: '', remoteType: 'all', salaryMin: '', experienceLevel: 'all' })
                    }
                    className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recommended */}
        {activeTab === 'recommended' && (
          <div className="space-y-3">
            {filteredJobs.length > 0 ? (
              displayedJobs.map((job) => <JobCard key={job.id} {...cardProps(job)} />)
            ) : (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm">
                <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No jobs match your criteria</p>
              </div>
            )}
            {filteredJobs.length > displayedJobsCount && (
              <button
                onClick={() => setDisplayedJobsCount((n) => n + 20)}
                className="w-full py-3 border border-gray-200 bg-white rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Load more jobs
              </button>
            )}
          </div>
        )}

        {/* Saved */}
        {activeTab === 'saved' && (
          <div className="space-y-3">
            {savedList.length > 0 ? (
              savedList.map((job) => <JobCard key={job.id} {...cardProps(job)} />)
            ) : (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm">
                <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No saved jobs yet. Tap the bookmark icon to save one.</p>
              </div>
            )}
          </div>
        )}

        {/* Applications */}
        {activeTab === 'applications' && (
          <div className="space-y-3">
            {applications.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm">
                <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No applications yet</p>
              </div>
            ) : (
              applications.map((app) => (
                <div key={app.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{app.jobTitle}</h3>
                      <p className="text-sm text-gray-600">{app.company}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                        {statusOptions.find((s) => s.value === app.status)?.label ||
                          app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                      </span>
                      <button
                        onClick={() => setSelectedApplication(app)}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        Update
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
                    <div>
                      <span className="font-medium">Applied:</span> {app.appliedDate}
                    </div>
                    <div>
                      <span className="font-medium">Next:</span> {app.nextStep}
                    </div>
                  </div>
                </div>
              ))
            )}
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
        <ApplicationStatusModal
          application={selectedApplication}
          onClose={() => setSelectedApplication(null)}
          onUpdate={fetchApplications}
        />
      )}

      <MobileBottomNav />
    </div>
  );
}

// useSearchParams needs a Suspense boundary for production builds
export default function JobsPage() {
  return (
    <Suspense fallback={null}>
      <JobsContent />
    </Suspense>
  );
}