import { useState, useEffect } from 'react';
import { apiClient, Job } from '@/lib/api';
import HelpSection from '@/components/HelpSection';

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterProcessingStatus, setFilterProcessingStatus] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at' | 'job_id' | 'company'>('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobDetails, setShowJobDetails] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const jobsData = await apiClient.getJobs();
      setJobs(jobsData);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.job_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCompany = !filterCompany || job.company?.toLowerCase().includes(filterCompany.toLowerCase());
    const matchesState = !filterState || job.state?.toLowerCase().includes(filterState.toLowerCase());
    const matchesProcessingStatus = !filterProcessingStatus || 
      (filterProcessingStatus === 'processed' && job.ai_processed) ||
      (filterProcessingStatus === 'unprocessed' && !job.ai_processed);
    
    return matchesSearch && matchesCompany && matchesState && matchesProcessingStatus;
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    let aValue: any = a[sortBy];
    let bValue: any = b[sortBy];
    
    if (sortBy === 'created_at' || sortBy === 'updated_at') {
      aValue = new Date(aValue as string).getTime();
      bValue = new Date(bValue as string).getTime();
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const uniqueCompanies = [...new Set(jobs.map(job => job.company).filter(Boolean))].sort();
  const uniqueStates = [...new Set(jobs.map(job => job.state).filter(Boolean))].sort();

  const getProcessingStatusBadge = (job: Job) => {
    if (job.ai_processed) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          ✅ AI Processed
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          ⏳ Needs Processing
        </span>
      );
    }
  };

  const getJobDisplayValue = (value: any, fallback: string = 'Not Available') => {
    if (!value || value === 'Unknown' || value === '') {
      return fallback;
    }
    return value;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatSalary = (job: Job) => {
    if (job.salary_min && job.salary_max) {
      return `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}`;
    } else if (job.salary_min) {
      return `$${job.salary_min.toLocaleString()}+`;
    }
    return 'Not Specified';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading jobs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Job Database</h1>
          <p className="mt-2 text-gray-600">
            View and manage processed job descriptions ({filteredJobs.length} of {jobs.length} jobs)
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => window.location.href = '/job-processing'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Process Jobs
          </button>
          <button
            onClick={fetchJobs}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-blue-600">{jobs.length}</div>
          <div className="text-sm text-gray-600">Total Jobs</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-green-600">
            {jobs.filter(job => job.ai_processed).length}
          </div>
          <div className="text-sm text-gray-600">AI Processed</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-yellow-600">
            {jobs.filter(job => !job.ai_processed).length}
          </div>
          <div className="text-sm text-gray-600">Needs Processing</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-purple-600">{uniqueCompanies.length}</div>
          <div className="text-sm text-gray-600">Companies</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Search & Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Job ID, position, or company..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Companies</option>
              {uniqueCompanies.map(company => (
                <option key={company} value={company}>{company}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All States</option>
              {uniqueStates.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Processing Status</label>
            <select
              value={filterProcessingStatus}
              onChange={(e) => setFilterProcessingStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Jobs</option>
              <option value="processed">AI Processed</option>
              <option value="unprocessed">Needs Processing</option>
            </select>
          </div>
        </div>
        
        {/* Sort Options */}
        <div className="mt-4 flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="updated_at">Last Updated</option>
              <option value="created_at">Date Created</option>
              <option value="job_id">Job ID</option>
              <option value="company">Company</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Jobs List */}
      <div className="space-y-4">
        {sortedJobs.map((job) => (
          <div key={job.id} className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {getJobDisplayValue(job.position, 'Position Not Available')}
                  </h3>
                  {getProcessingStatusBadge(job)}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Company:</span> {getJobDisplayValue(job.company)}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Job ID:</span> {job.job_id}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Location:</span> {getJobDisplayValue(job.city)}, {getJobDisplayValue(job.state)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Salary:</span> {formatSalary(job)}
                    </p>
                    {job.bonus_percent && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Bonus:</span> {job.bonus_percent}%
                      </p>
                    )}
                    {job.visa && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Visa:</span> {job.visa}
                      </p>
                    )}
                  </div>
                </div>

                {job.description && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
                    <p className="text-sm text-gray-600 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {job.description}
                    </p>
                  </div>
                )}

                {job.skills && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Skills</h4>
                    <p className="text-sm text-gray-600 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{job.skills}</p>
                  </div>
                )}
              </div>
              
              <div className="ml-6 flex flex-col items-end space-y-2">
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    Created: {formatDate(job.created_at)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Updated: {formatDate(job.updated_at)}
                  </p>
                </div>
                
                <button
                  onClick={() => {
                    setSelectedJob(job);
                    setShowJobDetails(true);
                  }}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {sortedJobs.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg mb-2">No jobs found</p>
            <p className="text-gray-400">
              {jobs.length === 0 
                ? "No jobs in database. Process some jobs first."
                : "No jobs match your current filters. Try adjusting your search criteria."
              }
            </p>
            {jobs.length === 0 && (
              <button
                onClick={() => window.location.href = '/job-processing'}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Process Jobs Now
              </button>
            )}
          </div>
        )}
      </div>

      {/* Job Details Modal */}
      {showJobDetails && selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {getJobDisplayValue(selectedJob.position, 'Job Details')}
                  </h2>
                  <p className="text-gray-600">{getJobDisplayValue(selectedJob.company)} - {selectedJob.job_id}</p>
                </div>
                <div className="flex items-center space-x-3">
                  {getProcessingStatusBadge(selectedJob)}
                  <button
                    onClick={() => setShowJobDetails(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Job ID:</span>
                      <span className="text-gray-600">{selectedJob.job_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Company:</span>
                      <span className="text-gray-600">{getJobDisplayValue(selectedJob.company)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Position:</span>
                      <span className="text-gray-600">{getJobDisplayValue(selectedJob.position)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Location:</span>
                      <span className="text-gray-600">
                        {getJobDisplayValue(selectedJob.city)}, {getJobDisplayValue(selectedJob.state)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Salary:</span>
                      <span className="text-gray-600">{formatSalary(selectedJob)}</span>
                    </div>
                    {selectedJob.bonus_percent && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700">Bonus:</span>
                        <span className="text-gray-600">{selectedJob.bonus_percent}%</span>
                      </div>
                    )}
                    {selectedJob.visa && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700">Visa:</span>
                        <span className="text-gray-600">{selectedJob.visa}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Processing Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Processing Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">AI Processed:</span>
                      <span className={selectedJob.ai_processed ? 'text-green-600' : 'text-yellow-600'}>
                        {selectedJob.ai_processed ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Processing Status:</span>
                      <span className="text-gray-600">{getJobDisplayValue(selectedJob.processing_status)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Created:</span>
                      <span className="text-gray-600">{formatDate(selectedJob.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Updated:</span>
                      <span className="text-gray-600">{formatDate(selectedJob.updated_at)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedJob.description && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedJob.description}</p>
                  </div>
                </div>
              )}

              {/* Skills */}
              {selectedJob.skills && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Skills</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700">{selectedJob.skills}</p>
                  </div>
                </div>
              )}

              {/* Requirements */}
              {selectedJob.requirements && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Requirements</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedJob.requirements}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 flex justify-end space-x-3">
                {!selectedJob.ai_processed && (
                  <button
                    onClick={() => {
                      setShowJobDetails(false);
                      window.location.href = '/job-processing';
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Process This Job
                  </button>
                )}
                <button
                  onClick={() => setShowJobDetails(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <HelpSection
        title="Job Database"
        description="View, search, and manage all job records in the database. This module provides comprehensive job information with AI-extracted data and processing status for all jobs in the system."
        features={[
          "View all job records with complete AI-extracted structured data (50+ fields)",
          "Search and filter jobs by company, position, state, processing status, and more",
          "See detailed processing status (AI processed vs. MTB-only vs. needs processing)",
          "Comprehensive job information including salary, location, education requirements, skills, and responsibilities",
          "Statistics dashboard showing processing progress and data completeness",
          "Quick access to process unprocessed jobs directly from the interface"
        ]}
        endResults={[
          "Comprehensive view of all job records with AI-extracted structured data",
          "Searchable and filterable database of job information",
          "Detailed job profiles with education, experience, skills, and requirements",
          "Processing status visibility for quality control and workflow management",
          "Direct access to job processing for incomplete records"
        ]}
        workflow={[
          "Jobs are automatically added to the database after MTB processing",
          "Use search and filters to find specific jobs by multiple criteria",
          "View comprehensive job details by clicking 'View Details'",
          "Process unprocessed jobs using the 'Process Jobs' button",
          "Monitor processing progress with the statistics cards",
          "All processed jobs are ready for resume matching"
        ]}
      />
    </div>
  );
}