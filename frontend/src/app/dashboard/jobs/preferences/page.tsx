'use client';

import React, { useState, useEffect } from 'react';
import { Save, Plus, X, MapPin, DollarSign, Briefcase, Building2, Users, Globe } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const COMMON_SKILLS = [
  'React', 'Node.js', 'Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C#',
  'Angular', 'Vue.js', 'Django', 'Flask', 'Spring Boot', 'Express',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Jenkins',
  'Git', 'CI/CD', 'Agile', 'Scrum', 'REST APIs', 'GraphQL',
  'Machine Learning', 'AI', 'Data Science', 'TensorFlow', 'PyTorch'
];

const EXPERIENCE_LEVELS = ['Junior', 'Mid', 'Senior', 'Lead', 'Executive'];
const COMPANY_SIZES = ['Startup', 'Small', 'Medium', 'Large', 'Enterprise'];
const INDUSTRIES = ['Technology', 'FinTech', 'Healthcare', 'E-commerce', 'Data Analytics', 'Enterprise Software', 'SaaS', 'AI/ML'];

export default function JobPreferencesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  // Profile data
  const [skills, setSkills] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState('Mid');
  const [customSkill, setCustomSkill] = useState('');
  
  // Preferences data
  const [desiredRoles, setDesiredRoles] = useState<string[]>([]);
  const [newRole, setNewRole] = useState('');
  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);
  const [newLocation, setNewLocation] = useState('');
  const [remotePreference, setRemotePreference] = useState('flexible');
  const [minSalary, setMinSalary] = useState('');
  const [maxSalary, setMaxSalary] = useState('');
  const [companySizes, setCompanySizes] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [willingToRelocate, setWillingToRelocate] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      
      // Load profile
      const profileRes = await fetch(`${API_BASE_URL}/api/profile`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (profileRes.ok) {
        const profile = await profileRes.json();
        if (profile.technical_skills) {
          try {
            const skillsArray = JSON.parse(profile.technical_skills);
            setSkills(skillsArray);
          } catch {
            setSkills([]);
          }
        }
        setExperienceLevel(profile.experience_level || 'Mid');
      }
      
      // Load preferences
      const prefRes = await fetch(`${API_BASE_URL}/api/job-preferences`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (prefRes.ok) {
        const prefs = await prefRes.json();
        setDesiredRoles(prefs.desired_roles || []);
        
        if (prefs.preferred_locations) {
          try {
            const locsArray = JSON.parse(prefs.preferred_locations);
            setPreferredLocations(locsArray);
          } catch {
            setPreferredLocations([]);
          }
        }
        
        setRemotePreference(prefs.remote_preference || 'flexible');
        setMinSalary(prefs.minimum_salary?.toString() || '');
        setMaxSalary(prefs.maximum_salary?.toString() || '');
        setWillingToRelocate(prefs.willing_to_relocate || false);
        
        if (prefs.company_sizes) {
          try {
            const sizesArray = JSON.parse(prefs.company_sizes);
            setCompanySizes(sizesArray);
          } catch {
            setCompanySizes([]);
          }
        }
        
        if (prefs.industries) {
          try {
            const indArray = JSON.parse(prefs.industries);
            setIndustries(indArray);
          } catch {
            setIndustries([]);
          }
        }
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage('');
      
      // Update profile with skills and experience
      await fetch(`${API_BASE_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          technical_skills: JSON.stringify(skills),
          experience_level: experienceLevel
        })
      });
      
      // Update job preferences
      await fetch(`${API_BASE_URL}/api/job-preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          desired_roles: desiredRoles,
          preferred_locations: JSON.stringify(preferredLocations),
          remote_preference: remotePreference,
          minimum_salary: minSalary ? parseInt(minSalary) : null,
          maximum_salary: maxSalary ? parseInt(maxSalary) : null,
          company_sizes: JSON.stringify(companySizes),
          industries: JSON.stringify(industries),
          willing_to_relocate: willingToRelocate
        })
      });
      
      setMessage('Preferences saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      setMessage('Error saving preferences');
    } finally {
      setSaving(false);
    }
  };

  const addSkill = (skill: string) => {
    if (skill && !skills.includes(skill)) {
      setSkills([...skills, skill]);
      setCustomSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const addRole = () => {
    if (newRole && !desiredRoles.includes(newRole)) {
      setDesiredRoles([...desiredRoles, newRole]);
      setNewRole('');
    }
  };

  const removeRole = (role: string) => {
    setDesiredRoles(desiredRoles.filter(r => r !== role));
  };

  const addLocation = () => {
    if (newLocation && !preferredLocations.includes(newLocation)) {
      setPreferredLocations([...preferredLocations, newLocation]);
      setNewLocation('');
    }
  };

  const removeLocation = (location: string) => {
    setPreferredLocations(preferredLocations.filter(l => l !== location));
  };

  const toggleCompanySize = (size: string) => {
    if (companySizes.includes(size)) {
      setCompanySizes(companySizes.filter(s => s !== size));
    } else {
      setCompanySizes([...companySizes, size]);
    }
  };

  const toggleIndustry = (industry: string) => {
    if (industries.includes(industry)) {
      setIndustries(industries.filter(i => i !== industry));
    } else {
      setIndustries([...industries, industry]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading preferences...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-black">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Job Preferences</h1>
          <p className="text-gray-600">Set up your profile to get better job matches</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}

        <div className="space-y-6">
          {/* Skills Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Your Skills
            </h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select or add your technical skills
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addSkill(customSkill)}
                  placeholder="Type a skill and press Enter"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                />
                <button
                  onClick={() => addSkill(customSkill)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {COMMON_SKILLS.map(skill => (
                  <button
                    key={skill}
                    onClick={() => addSkill(skill)}
                    disabled={skills.includes(skill)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      skills.includes(skill)
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
              
              <div className="flex flex-wrap gap-2">
                {skills.map(skill => (
                  <span
                    key={skill}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-1"
                  >
                    {skill}
                    <button onClick={() => removeSkill(skill)}>
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Experience Level
              </label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
              >
                {EXPERIENCE_LEVELS.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Desired Roles */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Desired Job Roles
            </h2>
            
            <div className="flex gap-2 mb-3 text-black">
              <input
                type="text"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addRole()}
                placeholder="e.g. Full Stack Developer, Software Engineer"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
              />
              <button
                onClick={addRole}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {desiredRoles.map(role => (
                <span
                  key={role}
                  className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-1"
                >
                  {role}
                  <button onClick={() => removeRole(role)}>
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Location Preferences */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Location Preferences
            </h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Remote Work Preference
              </label>
              <select
                value={remotePreference}
                onChange={(e) => setRemotePreference(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
              >
                <option value="remote_only">Remote Only</option>
                <option value="flexible">Flexible (Remote, Hybrid, or Onsite)</option>
                <option value="onsite">Onsite Only</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 ">
                Preferred Locations
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addLocation()}
                  placeholder="e.g. London, Manchester, Birmingham"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                />
                <button
                  onClick={addLocation}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4 text-black">
                {preferredLocations.map(location => (
                  <span
                    key={location}
                    className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm flex items-center gap-1"
                  >
                    {location}
                    <button onClick={() => removeLocation(location)}>
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="relocate"
                checked={willingToRelocate}
                onChange={(e) => setWillingToRelocate(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="relocate" className="text-sm text-gray-700">
                Willing to relocate
              </label>
            </div>
          </div>

          {/* Salary Expectations */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Salary Expectations (GBP)
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Minimum Salary
                </label>
                <input
                  type="number"
                  value={minSalary}
                  onChange={(e) => setMinSalary(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Maximum Salary
                </label>
                <input
                  type="number"
                  value={maxSalary}
                  onChange={(e) => setMaxSalary(e.target.value)}
                  placeholder="e.g. 80000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                />
              </div>
            </div>
          </div>

          {/* Company Preferences */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Company Preferences
            </h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Company Sizes
              </label>
              <div className="flex flex-wrap gap-2">
                {COMPANY_SIZES.map(size => (
                  <button
                    key={size}
                    onClick={() => toggleCompanySize(size)}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      companySizes.includes(size)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Industries
              </label>
              <div className="flex flex-wrap gap-2">
                {INDUSTRIES.map(industry => (
                  <button
                    key={industry}
                    onClick={() => toggleIndustry(industry)}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      industries.includes(industry)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {industry}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2 font-medium"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}