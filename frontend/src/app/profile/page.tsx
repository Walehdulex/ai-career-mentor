'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { Header } from '../components/layout/Header';
import { useAuth } from '../contexts/AuthContext';

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

  useEffect(() => {
    if (userProfile) {
      setFormData({
        current_role: userProfile.current_role || '',
        industry: userProfile.industry || '',
        years_of_experience: userProfile.years_of_experience || 0,
        career_goals: userProfile.career_goals || '',
        location: userProfile.location || '',
      });
    }
  }, [userProfile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'years_of_experience' ? parseInt(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage('');

    try {
      await updateProfile(formData);
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (userProfile) {
      setFormData({
        current_role: userProfile.current_role || '',
        industry: userProfile.industry || '',
        years_of_experience: userProfile.years_of_experience || 0,
        career_goals: userProfile.career_goals || '',
        location: userProfile.location || '',
      });
    }
    setIsEditing(false);
  };

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
    'Other'
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="px-4 sm:px-0">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Profile Settings</h3>
              <p className="mt-1 text-sm text-gray-600">
                Update your career information to get more personalized recommendations.
              </p>
            </div>
          </div>

          {/* Main Content */}
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="bg-white shadow-sm rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-medium text-gray-900">Personal Information</h4>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>

              {successMessage && (
                <div className="mx-6 mt-4 rounded-md bg-green-50 p-4">
                  <div className="text-sm text-green-700">{successMessage}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Basic Info (Read-only) */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={user?.full_name || ''}
                      disabled
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 sm:text-sm"
                    />
                  </div>
                </div>

                {/* Career Info */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="current_role" className="block text-sm font-medium text-gray-700">
                      Current Role
                    </label>
                    <input
                      type="text"
                      name="current_role"
                      id="current_role"
                      value={formData.current_role}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      placeholder="e.g., Software Engineer, Marketing Manager"
                      className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm ${
                        isEditing
                          ? 'focus:ring-blue-500 focus:border-blue-500'
                          : 'bg-gray-50 text-gray-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label htmlFor="industry" className="block text-sm font-medium text-gray-700">
                      Industry
                    </label>
                    <select
                      name="industry"
                      id="industry"
                      value={formData.industry}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm ${
                        isEditing
                          ? 'focus:ring-blue-500 focus:border-blue-500'
                          : 'bg-gray-50 text-gray-500'
                      }`}
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

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="years_of_experience" className="block text-sm font-medium text-gray-700">
                      Years of Experience
                    </label>
                    <input
                      type="number"
                      name="years_of_experience"
                      id="years_of_experience"
                      min="0"
                      max="50"
                      value={formData.years_of_experience}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm ${
                        isEditing
                          ? 'focus:ring-blue-500 focus:border-blue-500'
                          : 'bg-gray-50 text-gray-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                      Location
                    </label>
                    <input
                      type="text"
                      name="location"
                      id="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      placeholder="e.g., San Francisco, CA"
                      className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm ${
                        isEditing
                          ? 'focus:ring-blue-500 focus:border-blue-500'
                          : 'bg-gray-50 text-gray-500'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="career_goals" className="block text-sm font-medium text-gray-700">
                    Career Goals
                  </label>
                  <textarea
                    name="career_goals"
                    id="career_goals"
                    rows={4}
                    value={formData.career_goals}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Describe your career aspirations and goals..."
                    className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm ${
                      isEditing
                        ? 'focus:ring-blue-500 focus:border-blue-500'
                        : 'bg-gray-50 text-gray-500'
                    }`}
                  />
                </div>

                {isEditing && (
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* Account Settings */}
            <div className="mt-6 bg-white shadow-sm rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h4 className="text-lg font-medium text-gray-900">Account Settings</h4>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-sm font-medium text-gray-900">Account Status</h5>
                      <p className="text-sm text-gray-500">Your account is active</p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-sm font-medium text-gray-900">Member Since</h5>
                      <p className="text-sm text-gray-500">
                        {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
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