'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Plus, Trash2, Mail, TrendingUp, Check, X } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface JobAlert {
  id: number;
  email: string;
  is_active: boolean;
  min_match_score: number;
  last_sent: string | null;
  created_at: string;
}

export default function JobAlertsPage() {
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [minMatchScore, setMinMatchScore] = useState(80);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/job-alerts`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAlerts(data);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(
        `${API_BASE_URL}/api/job-alerts?email=${encodeURIComponent(email)}&min_match_score=${minMatchScore}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.ok) {
        setShowForm(false);
        setEmail('');
        setMinMatchScore(80);
        fetchAlerts();
      } else {
        alert('Failed to create alert');
      }
    } catch (error) {
      console.error('Error creating alert:', error);
      alert('Error creating alert');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (alertId: number) => {
    if (!confirm('Are you sure you want to delete this job alert?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/job-alerts/${alertId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchAlerts();
      }
    } catch (error) {
      console.error('Error deleting alert:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading alerts...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-black">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Job Alerts</h1>
          <p className="text-gray-600">Get notified when new jobs match your preferences</p>
        </div>

        {/* How It Works */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            How Job Alerts Work
          </h2>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>New jobs are automatically fetched from Adzuna daily at 9 AM</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Jobs are matched against your profile and preferences</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>You'll receive an email with top matches above your minimum score</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Never miss a great opportunity - alerts come straight to your inbox</span>
            </li>
          </ul>
        </div>

        {/* Create Alert Button */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="mb-6 w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create New Job Alert
          </button>
        )}

        {/* Create Alert Form */}
        {showForm && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Create Job Alert</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAlert} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Job alerts will be sent to this email address
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <TrendingUp className="w-4 h-4 inline mr-1" />
                  Minimum Match Score: {minMatchScore}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={minMatchScore}
                  onChange={(e) => setMinMatchScore(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>50% (More jobs)</span>
                  <span>95% (Best matches only)</span>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Only jobs with a match score above {minMatchScore}% will be sent to you
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                >
                  {saving ? 'Creating...' : 'Create Alert'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Alerts List */}
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No job alerts set up yet</p>
              <p className="text-gray-500 text-sm">
                Create an alert to get notified when new jobs match your profile
              </p>
            </div>
          ) : (
            alerts.map(alert => (
              <div
                key={alert.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <Bell className={`w-6 h-6 ${alert.is_active ? 'text-blue-600' : 'text-gray-400'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">{alert.email}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          alert.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {alert.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Minimum match score: <span className="font-medium">{alert.min_match_score}%</span>
                      </p>
                      <div className="text-xs text-gray-500">
                        <p>Created: {new Date(alert.created_at).toLocaleDateString()}</p>
                        {alert.last_sent && (
                          <p>Last sent: {new Date(alert.last_sent).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(alert.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete alert"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Info Section
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-900 mb-3">📧 Email Setup Required</h3>
          <p className="text-sm text-yellow-800 mb-3">
            To receive job alerts, your backend needs email configuration. Make sure these environment variables are set:
          </p>
          <div className="bg-yellow-100 rounded p-3 font-mono text-xs text-yellow-900">
            SMTP_HOST=smtp.gmail.com<br />
            SMTP_PORT=587<br />
            SMTP_USER=your-email@gmail.com<br />
            SMTP_PASSWORD=your-app-password
          </div>
          <p className="text-xs text-yellow-700 mt-3">
            For Gmail, you need to create an App Password in your Google Account security settings.
          </p>
        </div> */}

        {/* Tips Section */}
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-3">💡 Pro Tips</h3>
          <ul className="space-y-2 text-sm text-green-800">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Set your match score to 70-80% to get a good balance of opportunities</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Make sure your profile and preferences are complete for better matches</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Check your spam folder if you don't see alerts in your inbox</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Jobs are fetched daily at 9 AM - be one of the first to apply!</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}