import React, { useState, useEffect } from 'react';

interface MTBSyncData {
  success: boolean;
  sync_timestamp: string;
  duration_seconds: number;
  jobs_found: number;
  jobs_added: number;
  jobs_updated: number;
  jobs_marked_inactive: number;
  category_changes: number;
  message: string;
}

interface MTBStatus {
  success: boolean;
  statistics: {
    total_jobs: number;
    active_jobs: number;
    inactive_jobs: number;
    by_category: Record<string, {
      total: number;
      active: number;
      inactive: number;
    }>;
    last_sync: string | null;
  };
  message: string;
}

interface JobStatusUpdate {
  job_id: string;
  old_category?: string;
  new_category: string;
  change_reason: string;
  changed_by: string;
}

interface Job {
  job_id: string;
  company: string;
  position: string;
  current_category: string;
  city: string;
  state: string;
  country: string;
  industry_segment: string;
  client_rating: string;
  pipeline_candidates: string;
  hr_notes: string;
  placement_date: string | null;
  candidate_name: string;
  starting_salary: string;
  is_active: boolean;
  last_mtb_seen: string | null;
}

interface JobsByCategoryResponse {
  success: boolean;
  category: string;
  job_count: number;
  jobs: Job[];
}

const CATEGORY_INFO = {
  'AA': { name: 'Top Priority', description: 'HR very urgently needs filled', color: 'bg-red-100 text-red-800' },
  'A': { name: 'Standard JO', description: 'Work on all of these', color: 'bg-orange-100 text-orange-800' },
  'B': { name: 'Lower Priority', description: 'Submit candidates based on work done on A or AA JOs', color: 'bg-yellow-100 text-yellow-800' },
  'C': { name: 'On Hold', description: 'JO on hold temporarily for cause', color: 'bg-blue-100 text-blue-800' },
  'D': { name: 'Filled/On Hold', description: 'Filled by our people or client said JO is on hold', color: 'bg-purple-100 text-purple-800' },
  'P': { name: 'Candidate Placed', description: 'Candidate placed by TNA/HIR/NSC', color: 'bg-green-100 text-green-800' },
  'X': { name: 'Closed', description: 'Client closed JO', color: 'bg-gray-100 text-gray-800' }
};

export default function MTBManagement() {
  const [syncData, setSyncData] = useState<MTBSyncData | null>(null);
  const [statusData, setStatusData] = useState<MTBStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryJobs, setCategoryJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [editingPlacement, setEditingPlacement] = useState<string | null>(null);
  const [placementForm, setPlacementForm] = useState({
    placement_date: '',
    candidate_name: '',
    starting_salary: ''
  });


  const runMTBSync = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/mtb-sync/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      setSyncData(data);
      
      // Refresh status after sync
      await fetchMTBStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMTBStatus = async () => {
    try {
      const response = await fetch('/api/mtb-sync/status');
      const data = await response.json();
      setStatusData(data);
    } catch (err: any) {
      console.error('Error fetching MTB status:', err);
      setError(`Failed to fetch MTB status: ${err.message}`);
    }
  };

  const fetchJobsByCategory = async (category: string) => {
    setLoadingJobs(true);
    setError(null);
    try {
      const response = await fetch(`/api/mtb-jobs-by-category/${encodeURIComponent(category)}`);
      const data: JobsByCategoryResponse = await response.json();

      if (data.success) {
        setCategoryJobs(data.jobs);
        setSelectedCategory(category);
      } else {
        setError(`Failed to fetch jobs for category ${category}`);
      }
    } catch (err: any) {
      setError(`Failed to fetch jobs: ${err.message}`);
    } finally {
      setLoadingJobs(false);
    }
  };

  const startEditingPlacement = (job: Job) => {
    setEditingPlacement(job.job_id);
    setPlacementForm({
      placement_date: job.placement_date ? new Date(job.placement_date).toISOString().split('T')[0] : '',
      candidate_name: job.candidate_name || '',
      starting_salary: job.starting_salary || ''
    });
  };

  const cancelEditingPlacement = () => {
    setEditingPlacement(null);
    setPlacementForm({
      placement_date: '',
      candidate_name: '',
      starting_salary: ''
    });
  };

  const savePlacement = async (jobId: string) => {
    try {
      const placementData = {
        placement_date: placementForm.placement_date ? new Date(placementForm.placement_date).toISOString() : null,
        candidate_name: placementForm.candidate_name || null,
        starting_salary: placementForm.starting_salary || null
      };

      const response = await fetch(`/api/job/${jobId}/placement`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(placementData),
      });

      const result = await response.json();
      if (result.success) {
        // Refresh the job list
        if (selectedCategory) {
          await fetchJobsByCategory(selectedCategory);
        }
        setEditingPlacement(null);
        setPlacementForm({
          placement_date: '',
          candidate_name: '',
          starting_salary: ''
        });
      } else {
        setError(`Failed to update placement: ${result.message}`);
      }
    } catch (err: any) {
      setError(`Failed to update placement: ${err.message}`);
    }
  };

  const removePlacement = async (jobId: string) => {
    try {
      const response = await fetch(`/api/job/${jobId}/placement`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        // Refresh the job list
        if (selectedCategory) {
          await fetchJobsByCategory(selectedCategory);
        }
      } else {
        setError(`Failed to remove placement: ${result.message}`);
      }
    } catch (err: any) {
      setError(`Failed to remove placement: ${err.message}`);
    }
  };

  const updateJobStatus = async () => {
    if (!selectedJobId || !newCategory) return;
    
    setLoading(true);
    setError(null);
    try {
      const updateData: JobStatusUpdate = {
        job_id: selectedJobId,
        new_category: newCategory,
        change_reason: changeReason || 'Manual update',
        changed_by: 'user'
      };

      const response = await fetch('/api/job-status/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Clear form
        setSelectedJobId('');
        setNewCategory('');
        setChangeReason('');
        
        // Refresh status
        await fetchMTBStatus();
      } else {
        setError(data.message || 'Failed to update job status');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMTBStatus();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">MTB Management & Synchronization</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* MTB Sync Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">MTB Synchronization</h2>
            <button
              onClick={runMTBSync}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded disabled:opacity-50"
            >
              {loading ? 'Syncing...' : 'Run MTB Sync'}
            </button>
          </div>

          {syncData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gray-50 p-4 rounded">
                  <h3 className="font-semibold text-gray-700">Jobs Found</h3>
                  <p className="text-2xl font-bold text-blue-600">{syncData.jobs_found}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <h3 className="font-semibold text-gray-700">Jobs Added</h3>
                  <p className="text-2xl font-bold text-green-600">{syncData.jobs_added}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <h3 className="font-semibold text-gray-700">Jobs Updated</h3>
                  <p className="text-2xl font-bold text-yellow-600">{syncData.jobs_updated}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <h3 className="font-semibold text-gray-700">Marked Inactive</h3>
                  <p className="text-2xl font-bold text-red-600">{syncData.jobs_marked_inactive}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <h3 className="font-semibold text-gray-700">Category Changes</h3>
                  <p className="text-2xl font-bold text-purple-600">{syncData.category_changes}</p>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <p><strong>Sync Time:</strong> {new Date(syncData.sync_timestamp).toLocaleString()}</p>
                <p><strong>Duration:</strong> {syncData.duration_seconds.toFixed(2)} seconds</p>
                <p><strong>Message:</strong> {syncData.message}</p>
              </div>
            </div>
          )}
        </div>

        {/* Status Overview */}
        {statusData && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Current Status</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-semibold text-gray-700">Total Jobs</h3>
                <p className="text-2xl font-bold text-gray-600">{statusData.statistics.total_jobs}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-semibold text-gray-700">Active Jobs</h3>
                <p className="text-2xl font-bold text-green-600">{statusData.statistics.active_jobs}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-semibold text-gray-700">Inactive Jobs</h3>
                <p className="text-2xl font-bold text-red-600">{statusData.statistics.inactive_jobs}</p>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-800">Jobs by Category</h3>
              <p className="text-sm text-gray-600">Click on a category to view the job list</p>
              {Object.entries(statusData.statistics.by_category).map(([category, stats]) => {
                const categoryInfo = CATEGORY_INFO[category as keyof typeof CATEGORY_INFO] || 
                  { name: category, description: 'Unknown category', color: 'bg-gray-100 text-gray-800' };
                
                return (
                  <div 
                    key={category} 
                    className={`flex items-center justify-between p-3 rounded cursor-pointer transition-colors ${
                      selectedCategory === category 
                        ? 'bg-blue-50 border-2 border-blue-200' 
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => fetchJobsByCategory(category)}
                  >
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${categoryInfo.color}`}>
                        {category}
                      </span>
                      <div>
                        <div className="font-medium">{categoryInfo.name}</div>
                        <div className="text-sm text-gray-600">{categoryInfo.description}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{stats.total} total</div>
                      <div className="text-sm text-green-600">{stats.active} active</div>
                      <div className="text-sm text-red-600">{stats.inactive} inactive</div>
                      {selectedCategory === category && (
                        <div className="text-xs text-blue-600 mt-1">▼ Clicked</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Job List by Category */}
        {selectedCategory && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Jobs in Category: {selectedCategory}
                {CATEGORY_INFO[selectedCategory as keyof typeof CATEGORY_INFO] && (
                  <span className="ml-2 text-sm font-normal text-gray-600">
                    ({CATEGORY_INFO[selectedCategory as keyof typeof CATEGORY_INFO].name})
                  </span>
                )}
              </h2>
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setCategoryJobs([]);
                }}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                ✕ Close
              </button>
            </div>

            {loadingJobs ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Loading jobs...</div>
              </div>
            ) : categoryJobs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                        Job ID
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                        Company
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                        Position
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                        Location
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                        Industry
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                        Rating
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                        Pipeline
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                        Notes
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                        Placed
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                        Candidate
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                        Salary
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                        Status
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {categoryJobs.map((job) => (
                      <tr key={job.job_id} className="hover:bg-gray-50">
                        <td className="px-2 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                          {job.job_id}
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-900 max-w-20 truncate" title={job.company || '-'}>
                          {job.company || '-'}
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-900 max-w-24 truncate" title={job.position || '-'}>
                          {job.position || '-'}
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-900 max-w-20 truncate" title={[job.city, job.state, job.country].filter(Boolean).join(', ') || '-'}>
                          {[job.city, job.state].filter(Boolean).join(', ') || '-'}
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-900 max-w-20 truncate" title={job.industry_segment || '-'}>
                          {job.industry_segment || '-'}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">
                          {job.client_rating || '-'}
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-900 max-w-20 truncate" title={job.pipeline_candidates || '-'}>
                          {job.pipeline_candidates || '-'}
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-900 max-w-24 truncate" title={job.hr_notes || '-'}>
                          {job.hr_notes || '-'}
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-900">
                          {job.placement_date ? new Date(job.placement_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-900 max-w-20 truncate" title={job.candidate_name || '-'}>
                          {job.candidate_name || '-'}
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-900 max-w-16 truncate" title={job.starting_salary || '-'}>
                          {job.starting_salary || '-'}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap">
                          <span className={`inline-flex px-1 py-0.5 text-xs font-semibold rounded-full ${
                            job.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {job.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap">
                          {editingPlacement === job.job_id ? (
                            <div className="flex space-x-1">
                              <button
                                onClick={() => savePlacement(job.job_id)}
                                className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEditingPlacement}
                                className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex space-x-1">
                              <button
                                onClick={() => startEditingPlacement(job)}
                                className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                              >
                                Edit P
                              </button>
                              {job.current_category === 'P' && (
                                <button
                                  onClick={() => removePlacement(job.job_id)}
                                  className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                <div className="mt-4 text-sm text-gray-600">
                  Showing {categoryJobs.length} jobs in category {selectedCategory}
                </div>
                
                {/* Placement Editing Form */}
                {editingPlacement && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Edit Placement Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Placement Date
                        </label>
                        <input
                          type="date"
                          value={placementForm.placement_date}
                          onChange={(e) => setPlacementForm({...placementForm, placement_date: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Candidate Name
                        </label>
                        <input
                          type="text"
                          value={placementForm.candidate_name}
                          onChange={(e) => setPlacementForm({...placementForm, candidate_name: e.target.value})}
                          placeholder="Enter candidate name"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Starting Salary
                        </label>
                        <input
                          type="text"
                          value={placementForm.starting_salary}
                          onChange={(e) => setPlacementForm({...placementForm, starting_salary: e.target.value})}
                          placeholder="Enter starting salary"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex space-x-2">
                      <button
                        onClick={() => savePlacement(editingPlacement)}
                        className="bg-green-500 text-white px-4 py-2 rounded-md text-sm hover:bg-green-600"
                      >
                        Save Placement
                      </button>
                      <button
                        onClick={cancelEditingPlacement}
                        className="bg-gray-500 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-500">No jobs found in this category</div>
              </div>
            )}
          </div>
        )}

        {/* Manual Job Status Update */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Manual Job Status Update</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Job ID</label>
              <input
                type="text"
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                placeholder="Enter job ID"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select category</option>
                {Object.entries(CATEGORY_INFO).map(([code, info]) => (
                  <option key={code} value={code}>
                    {code} - {info.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Change Reason</label>
            <input
              type="text"
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="Reason for status change"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <button
            onClick={updateJobStatus}
            disabled={loading || !selectedJobId || !newCategory}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Job Status'}
          </button>
        </div>

        {/* Category Legend */}
        <div className="bg-gray-50 rounded-lg p-6 mt-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Category Legend</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(CATEGORY_INFO).map(([code, info]) => (
              <div key={code} className="flex items-start space-x-3">
                <span className={`px-2 py-1 rounded text-sm font-medium ${info.color}`}>
                  {code}
                </span>
                <div>
                  <div className="font-medium">{info.name}</div>
                  <div className="text-sm text-gray-600">{info.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

