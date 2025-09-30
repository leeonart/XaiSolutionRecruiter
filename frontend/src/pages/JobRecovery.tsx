import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';

interface JobRecoveryData {
  success: boolean;
  misplaced_jobs: Record<string, Array<{
    job_id: string;
    file_path: string;
    relative_path: string;
  }>>;
  missing_from_db: string[];
  missing_from_files: string[];
  total_files: number;
  unique_job_ids: number;
  message: string;
}

interface JobSearchResult {
  success: boolean;
  job_id: string;
  found_locations: Array<{
    file_path: string;
    relative_path: string;
    filename: string;
  }>;
  count: number;
  message: string;
}

export default function JobRecovery() {
  const [recoveryData, setRecoveryData] = useState<JobRecoveryData | null>(null);
  const [searchResult, setSearchResult] = useState<JobSearchResult | null>(null);
  const [searchJobId, setSearchJobId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scanForMisplacedJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8000/api/job-recovery/scan');
      const data = await response.json();
      setRecoveryData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const searchForJob = async (jobId: string) => {
    if (!jobId.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8000/api/job-recovery/search/${jobId}`);
      const data = await response.json();
      setSearchResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    searchForJob(searchJobId);
  };

  useEffect(() => {
    scanForMisplacedJobs();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Job Recovery & Cross-Folder Search</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Scan Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">System Scan</h2>
            <button
              onClick={scanForMisplacedJobs}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {loading ? 'Scanning...' : 'Scan for Misplaced Jobs'}
            </button>
          </div>

          {recoveryData && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded">
                  <h3 className="font-semibold text-gray-700">Total Files</h3>
                  <p className="text-2xl font-bold text-blue-600">{recoveryData.total_files}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <h3 className="font-semibold text-gray-700">Unique Job IDs</h3>
                  <p className="text-2xl font-bold text-green-600">{recoveryData.unique_job_ids}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <h3 className="font-semibold text-gray-700">Misplaced Patterns</h3>
                  <p className="text-2xl font-bold text-orange-600">{Object.keys(recoveryData.misplaced_jobs).length}</p>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                {recoveryData.message}
              </div>

              {/* Misplaced Jobs */}
              {Object.keys(recoveryData.misplaced_jobs).length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Misplaced Jobs</h3>
                  <div className="space-y-2">
                    {Object.entries(recoveryData.misplaced_jobs).map(([pattern, jobs]) => (
                      <div key={pattern} className="bg-yellow-50 border border-yellow-200 rounded p-3">
                        <div className="font-semibold text-yellow-800">{pattern}</div>
                        <div className="text-sm text-yellow-700">
                          {jobs.map((job, index) => (
                            <div key={index}>
                              Job {job.job_id}: {job.relative_path}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Jobs */}
              {recoveryData.missing_from_files.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Jobs Missing from Files</h3>
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <div className="text-sm text-red-700">
                      {recoveryData.missing_from_files.join(', ')}
                    </div>
                  </div>
                </div>
              )}

              {recoveryData.missing_from_db.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Jobs Missing from Database</h3>
                  <div className="bg-orange-50 border border-orange-200 rounded p-3">
                    <div className="text-sm text-orange-700">
                      {recoveryData.missing_from_db.join(', ')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Search for Specific Job ID</h2>
          
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              value={searchJobId}
              onChange={(e) => setSearchJobId(e.target.value)}
              placeholder="Enter job ID (e.g., 8697)"
              className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              disabled={loading || !searchJobId.trim()}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {searchResult && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-semibold text-gray-700">Search Results for Job {searchResult.job_id}</h3>
                <p className="text-sm text-gray-600">{searchResult.message}</p>
              </div>

              {searchResult.found_locations.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Found Files</h3>
                  <div className="space-y-2">
                    {searchResult.found_locations.map((location, index) => (
                      <div key={index} className="bg-blue-50 border border-blue-200 rounded p-3">
                        <div className="font-semibold text-blue-800">{location.filename}</div>
                        <div className="text-sm text-blue-700">{location.relative_path}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="bg-gray-50 rounded-lg p-6 mt-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">How This Tool Works</h2>
          <div className="space-y-3 text-gray-700">
            <p><strong>System Scan:</strong> Scans all job files and identifies misplaced jobs based on folder patterns (8xxx jobs should be in 8xxx folders, etc.).</p>
            <p><strong>Job Search:</strong> Searches for specific job IDs across all folders and subfolders.</p>
            <p><strong>Cross-Folder Analysis:</strong> Identifies jobs that are in wrong parent directories (e.g., 8xxx jobs in 7xxx folders).</p>
            <p><strong>Database Comparison:</strong> Compares files with database records to find missing or orphaned jobs.</p>
          </div>
        </div>
      </div>
    </div>
  );
}




