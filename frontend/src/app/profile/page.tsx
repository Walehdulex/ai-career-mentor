'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { Header, MobileBottomNav } from '../components/layout/Header';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const industries = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Manufacturing',
  'Retail',
  'Consulting',
  'Marketing',
  'Government',
  'Non-profit',
  'Other',
];

const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';

const ProfileContent: React.FC = () => {
  const { user, userProfile, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    current_role: '',
    industry: '',
    years_of_experience: 0,
    career_goals: '',
    location: '',
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const loadFromProfile = () => {
    if (userProfile) {
      setFormData({
        current_role: userProfile.current_role || '',
        industry: userProfile.industry || '',
        years_of_experience: userProfile.years_of_experience || 0,
        career_goals: userProfile.career_goals || '',
        location: userProfile.location || '',
      });
    }
  };

  useEffect(() => {
    loadFromProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'years_of_experience' ? parseInt(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      await updateProfile(formData);
      setIsEditing(false);
      setSuccessMessage('Profile updated');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);
      setErrorMessage("Couldn't save your changes. Check your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    loadFromProfile();
    setErrorMessage('');
    setIsEditing(false);
  };

  const inputClass = `block w-full px-3 py-2.5 border rounded-lg text-sm text-gray-900 transition-colors ${
    isEditing
      ? 'bg-white border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
      : 'bg-gray-50 border-gray-200 cursor-default'
  }`;

  const readOnlyClass =
    'block w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700 cursor-default';

  const initial = (user?.full_name || '?').charAt(0).toUpperCase();
  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString() : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 sm:pb-0">
      <Header />

      {/* Banner — same gradient as the dashboard */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-xl font-bold shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold leading-tight truncate">
              {user?.full_name || 'Your profile'}
            </h1>
            <p className="text-blue-100 text-sm truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Personal information */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Career profile</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                The more you add, the better your job matches and career advice get.
              </p>
            </div>
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Edit profile
              </button>
            )}
          </div>

          {successMessage && (
            <div className="mx-5 sm:mx-6 mt-4 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {successMessage}
            </div>
          )}
          {errorMessage && (
            <div className="mx-5 sm:mx-6 mt-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
            {/* Read-only basics */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Full name</label>
                <input type="text" value={user?.full_name || ''} disabled className={readOnlyClass} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" value={user?.email || ''} disabled className={readOnlyClass} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="current_role" className={labelClass}>Current role</label>
                <input
                  type="text"
                  name="current_role"
                  id="current_role"
                  value={formData.current_role}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="e.g. Software Engineer"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="industry" className={labelClass}>Industry</label>
                <select
                  name="industry"
                  id="industry"
                  value={formData.industry}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={inputClass}
                >
                  <option value="">Select an industry</option>
                  {industries.map((industry) => (
                    <option key={industry} value={industry}>
                      {industry}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="years_of_experience" className={labelClass}>Years of experience</label>
                <input
                  type="number"
                  name="years_of_experience"
                  id="years_of_experience"
                  min="0"
                  max="50"
                  value={formData.years_of_experience}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="location" className={labelClass}>Location</label>
                <input
                  type="text"
                  name="location"
                  id="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="e.g. London, UK"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="career_goals" className={labelClass}>Career goals</label>
              <textarea
                name="career_goals"
                id="career_goals"
                rows={4}
                value={formData.career_goals}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="What role do you want next, and what would you like to learn?"
                className={`${inputClass} resize-none`}
              />
            </div>

            {isEditing && (
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            )}
          </form>
        </section>

        {/* Account */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 sm:px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Account</h2>
          </div>
          <div className="p-5 sm:p-6 divide-y divide-gray-100">
            <div className="flex items-center justify-between pb-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Status</h3>
                <p className="text-sm text-gray-500">Your account is active</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
            </div>
            <div className="pt-4">
              <h3 className="text-sm font-medium text-gray-900">Member since</h3>
              <p className="text-sm text-gray-500">{memberSince || 'Not available'}</p>
            </div>
          </div>
        </section>
      </main>

      <MobileBottomNav />
    </div>
  );
};

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}