'use client';

import React, { useState, useEffect } from 'react';
import { Briefcase, MapPin, DollarSign, TrendingUp, Star, Bookmark, Filter, Search, X, Check, Building2, Clock, ExternalLink, Loader2 } from 'lucide-react';

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
  scores: {
    skills: number;
    experience: number;
    location: number;
    salary: number;
    company: number;
  };
  matchingSkills: string[];
  missingSkills: string[];
  description: string;
  companySize: string;
  industry: string;
}

interface Application {
  id: number;
  jobTitle: string;
  company: string;
  status: string;
  appliedDate: string;
  nextStep: string;
}

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function JobsPage() {
  const [activeTab, setActiveTab] = useState('recommended');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [savedJobs, setSavedJobs] = useState(new Set<number>());
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    location: '',
    remoteType: 'all',
    salaryMin: '',
    experienceLevel: 'all',
    employmentType: 'all'
  });

  useEffect(() => {
    fetchJobs();
    fetchApplications();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      // Connect to FastAPI backend
      const response = await fetch(`${API_BASE_URL}/api/jobs/recommendations?min_score=0`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setJobs(data.recommendations.map((rec: any) => ({
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
          matchingSkills: rec.job.required_skills || [],
          missingSkills: [],
          description: rec.job.description,
          companySize: rec.job.company_size,
          industry: rec.job.industry
        })));
      } else {
        // Fallback to mock data for development
        setJobs(getMockJobs());
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      // Use mock data on error
      setJobs(getMockJobs());
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/applications`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setApplications(data);
      } else {
        setApplications(getMockApplications());
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      setApplications(getMockApplications());
    }
  };

  const getMockJobs = (): Job[] => [
    {
      id: 1,
      title: 'Senior Full Stack Developer',
      company: 'TechCorp Ltd',
      location: 'London, UK',
      remoteType: 'Hybrid',
      salaryMin: 70000,
      salaryMax: 95000,
      experienceLevel: 'Senior',
      employmentType: 'Full-time',
      postedDate: '2 days ago',
      matchScore: 94,
      scores: {
        skills: 95,
        experience: 92,
        location: 98,
        salary: 90,
        company: 94
      },
      matchingSkills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
      missingSkills: ['Kubernetes'],
      description: 'Join our growing team to build scalable web applications using modern technologies...',
      companySize: 'Medium',
      industry: 'Technology'
    },
    {
      id: 2,
      title: 'Frontend Developer',
      company: 'StartupXYZ',
      location: 'Manchester, UK',
      remoteType: 'Remote',
      salaryMin: 55000,
      salaryMax: 75000,
      experienceLevel: 'Mid',
      employmentType: 'Full-time',
      postedDate: '1 day ago',
      matchScore: 87,
      scores: {
        skills: 88,
        experience: 85,
        location: 95,
        salary: 82,
        company: 85
      },
      matchingSkills: ['React', 'TypeScript', 'CSS'],
      missingSkills: ['Vue.js', 'GraphQL'],
      description: 'Looking for a creative frontend developer to join our innovative fintech startup...',
      companySize: 'Startup',
      industry: 'FinTech'
    },
    {
      id: 3,
      title: 'Backend Engineer',
      company: 'Enterprise Solutions',
      location: 'Birmingham, UK',
      remoteType: 'Onsite',
      salaryMin: 60000,
      salaryMax: 80000,
      experienceLevel: 'Mid',
      employmentType: 'Full-time',
      postedDate: '3 days ago',
      matchScore: 79,
      scores: {
        skills: 82,
        experience: 88,
        location: 70,
        salary: 78,
        company: 77
      },
      matchingSkills: ['Node.js', 'PostgreSQL', 'REST APIs'],
      missingSkills: ['Java', 'Spring Boot'],
      description: 'Build robust backend systems for enterprise clients in a collaborative environment...',
      companySize: 'Large',
      industry: 'Enterprise Software'
    }
  ];

  const getMockApplications = (): Application[] => [
    { 
      id: 1, 
      jobTitle: 'Senior Full Stack Developer', 
      company: 'TechCorp Ltd', 
      status: 'interview', 
      appliedDate: '2024-09-28', 
      nextStep: 'Technical interview on Oct 5' 
    },
    { 
      id: 2, 
      jobTitle: 'React Developer', 
      company: 'WebCo', 
      status: 'applied', 
      appliedDate: '2024-09-25', 
      nextStep: 'Awaiting response' 
    }
  ];

  const toggleSaveJob = async (jobId: number) => {
    const newSaved = new Set(savedJobs);
    if (newSaved.has(jobId)) {
      newSaved.delete(jobId);
      // API call to unsave
      await fetch(`${API_BASE_URL}/api/jobs/${jobId}/unsave`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
    } else {
      newSaved.add(jobId);
      // API call to save
      await fetch(`${API_BASE_URL}/api/jobs/${jobId}/save`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
    }
    setSavedJobs(newSaved);
  };

  const handleApply = async (jobId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ job_id: jobId })
      });

      if (response.ok) {
        alert('Application submitted successfully!');
        fetchApplications();
      }
    } catch (error) {
      console.error('Error applying to job:', error);
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
      applied: 'bg-blue-100 text-blue-800',
      interview: 'bg-purple-100 text-purple-800',
      offer: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const JobCard = ({ job }: { job: Job }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-semibold text-gray-900">{job.title}</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getMatchScoreColor(job.matchScore)}`}>
              {job.matchScore}% Match
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-600 mb-3">
            <Building2 className="w-4 h-4" />
            <span className="font-medium">{job.company}</span>
            <span className="text-gray-400">•</span>
            <span className="text-sm">{job.companySize}</span>
          </div>
        </div>
        <button 
          onClick={() => toggleSaveJob(job.id)}
          className={`p-2 rounded-lg transition-colors ${
            savedJobs.has(job.id) 
              ? 'bg-blue-50 text-blue-600' 
              : 'hover:bg-gray-100 text-gray-400'
          }`}
        >
          <Bookmark className={`w-5 h-5 ${savedJobs.has(job.id) ? 'fill-current' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4" />
          <span>{job.location} ({job.remoteType})</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <DollarSign className="w-4 h-4" />
          <span>£{job.salaryMin.toLocaleString()} - £{job.salaryMax.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Briefcase className="w-4 h-4" />
          <span>{job.experienceLevel} • {job.employmentType}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          <span>Posted {job.postedDate}</span>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">Match Breakdown:</span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {Object.entries(job.scores).map(([key, value]) => (
            <div key={key} className="text-center">
              <div className="text-xs text-gray-500 capitalize mb-1">{key}</div>
              <div className={`text-sm font-semibold ${value >= 85 ? 'text-green-600' : 'text-gray-700'}`}>
                {value}%
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <div className="flex flex-wrap gap-2 mb-2">
          {job.matchingSkills.map(skill => (
            <span key={skill} className="px-3 py-1 bg-green-50 text-green-700 text-sm rounded-full border border-green-200">
              <Check className="w-3 h-3 inline mr-1" />
              {skill}
            </span>
          ))}
          {job.missingSkills.map(skill => (
            <span key={skill} className="px-3 py-1 bg-gray-50 text-gray-600 text-sm rounded-full border border-gray-200">
              {skill}
            </span>
          ))}
        </div>
      </div>

      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{job.description}</p>

      <div className="flex gap-3">
        <button 
          onClick={() => handleApply(job.id)}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Apply Now
        </button>
        <button className="px-4 py-2 border border-gray-300 hover:bg-gray-50 rounded-lg font-medium transition-colors flex items-center gap-2">
          View Details
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const filteredJobs = jobs.filter(job => {
    if (searchQuery && !job.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !job.company.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filters.location && !job.location.toLowerCase().includes(filters.location.toLowerCase())) {
      return false;
    }
    if (filters.remoteType !== 'all' && job.remoteType.toLowerCase() !== filters.remoteType.toLowerCase()) {
      return false;
    }
    if (filters.experienceLevel !== 'all' && job.experienceLevel !== filters.experienceLevel) {
      return false;
    }
    if (filters.salaryMin && job.salaryMin < parseInt(filters.salaryMin)) {
      return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Job Matching Dashboard</h1>
          <p className="text-gray-600">Personalized job recommendations based on your skills and preferences</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('recommended')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === 'recommended'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Star className="w-5 h-5 inline mr-2" />
              Recommended ({filteredJobs.length})
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === 'saved'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Bookmark className="w-5 h-5 inline mr-2" />
              Saved Jobs ({savedJobs.size})
            </button>
            <button
              onClick={() => setActiveTab('applications')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === 'applications'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Briefcase className="w-5 h-5 inline mr-2" />
              Applications ({applications.length})
            </button>
          </div>
        </div>

        {activeTab !== 'applications' && (
          <div className="mb-6">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search jobs by title or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2"
              >
                <Filter className="w-5 h-5" />
                Filters
              </button>
            </div>

            {showFilters && (
              <div className="mt-4 bg-white rounded-lg border border-gray-200 p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <input
                      type="text"
                      placeholder="e.g. London"
                      value={filters.location}
                      onChange={(e) => setFilters({...filters, location: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Remote Type</label>
                    <select
                      value={filters.remoteType}
                      onChange={(e) => setFilters({...filters, remoteType: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All</option>
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="onsite">Onsite</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Min Salary (£)</label>
                    <input
                      type="number"
                      placeholder="e.g. 50000"
                      value={filters.salaryMin}
                      onChange={(e) => setFilters({...filters, salaryMin: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Experience Level</label>
                    <select
                      value={filters.experienceLevel}
                      onChange={(e) => setFilters({...filters, experienceLevel: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Levels</option>
                      <option value="Junior">Junior</option>
                      <option value="Mid">Mid</option>
                      <option value="Senior">Senior</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-3">
                  <button
                    onClick={() => setFilters({
                      location: '',
                      remoteType: 'all',
                      salaryMin: '',
                      experienceLevel: 'all',
                      employmentType: 'all'
                    })}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'recommended' && (
          <div className="space-y-4">
            {filteredJobs.length > 0 ? (
              filteredJobs.map(job => <JobCard key={job.id} job={job} />)
            ) : (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No jobs found matching your criteria</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="space-y-4">
            {savedJobs.size > 0 ? (
              jobs.filter(job => savedJobs.has(job.id)).map(job => <JobCard key={job.id} job={job} />)
            ) : (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <Bookmark className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No saved jobs yet</p>
                <p className="text-gray-500 text-sm mt-2">Click the bookmark icon on jobs to save them</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'applications' && (
          <div className="space-y-4">
            {applications.map(app => (
              <div key={app.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{app.jobTitle}</h3>
                    <p className="text-gray-600">{app.company}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(app.status)}`}>
                    {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Applied:</span>
                    <span className="ml-2 text-gray-900">{app.appliedDate}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Next Step:</span>
                    <span className="ml-2 text-gray-900">{app.nextStep}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}