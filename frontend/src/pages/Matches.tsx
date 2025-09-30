import { useState, useEffect } from 'react';
import { apiClient, JobMatch, Job, Resume } from '@/lib/api';
import HelpSection from '@/components/HelpSection';

export default function Matches() {
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRating, setFilterRating] = useState('');
  const [filterHardNo, setFilterHardNo] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [matchesData, jobsData, resumesData] = await Promise.all([
        apiClient.getJobMatches(),
        apiClient.getJobs(),
        apiClient.getResumes()
      ]);
      setMatches(matchesData);
      setJobs(jobsData);
      setResumes(resumesData);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredMatches = matches.filter(match => {
    const matchesRating = !filterRating || match.rating >= parseFloat(filterRating);
    const matchesHardNo = filterHardNo === '' || 
                         (filterHardNo === 'true' && match.hard_no) ||
                         (filterHardNo === 'false' && !match.hard_no);
    
    return matchesRating && matchesHardNo;
  });

  const getJob = (jobId: number) => jobs.find(job => Number(job.id) === Number(jobId));
  const getResume = (resumeId: number) => resumes.find(resume => Number(resume.id) === Number(resumeId));

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-600 bg-green-100';
    if (rating >= 6) return 'text-yellow-600 bg-yellow-100';
    if (rating >= 4) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading matches...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Job Matches</h1>
        <p className="mt-2 text-gray-600">
          View AI-powered job-resume matches ({filteredMatches.length} of {matches.length} matches)
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Minimum Rating</label>
            <select
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Ratings</option>
              <option value="8">8+ (Excellent)</option>
              <option value="6">6+ (Good)</option>
              <option value="4">4+ (Fair)</option>
              <option value="0">All</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Hard No</label>
            <select
              value={filterHardNo}
              onChange={(e) => setFilterHardNo(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Matches</option>
              <option value="false">No Hard No</option>
              <option value="true">Hard No Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Matches List */}
      <div className="space-y-4">
        {filteredMatches.map((match) => {
          const job = getJob(parseInt(match.job_id));
          const resume = getResume(parseInt(match.resume_id));
          
          if (!job || !resume) return null;

          return (
            <div key={match.id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <h3 className="text-lg font-semibold text-gray-900">{job.position}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRatingColor(match.rating)}`}>
                      {match.rating}/10
                    </span>
                    {match.hard_no && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Hard No
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{job.company}</p>
                  <p className="text-sm text-gray-500">{job.city}, {job.state}</p>
                  
                  <div className="mt-2">
                    <h4 className="text-sm font-medium text-gray-700">Candidate</h4>
                    <p className="text-sm text-gray-600">
                      {resume.candidate_name || resume.filename}
                    </p>
                    {resume.email && (
                      <p className="text-sm text-gray-500">{resume.email}</p>
                    )}
                    {resume.location && (
                      <p className="text-sm text-gray-500">{resume.location}</p>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {job.job_id}
                  </span>
                </div>
              </div>
              
              {match.reasons && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700">Match Reasons</h4>
                  <p className="text-sm text-gray-600 mt-1">{match.reasons}</p>
                </div>
              )}
              
              {match.disqualifiers && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700">Disqualifiers</h4>
                  <p className="text-sm text-red-600 mt-1">{match.disqualifiers}</p>
                </div>
              )}
              
              <div className="mt-4 flex justify-between items-center text-xs text-gray-500">
                <span>Matched: {new Date(match.created_at).toLocaleDateString()}</span>
                <span>Job: {job.job_id} | Resume: #{resume.id}</span>
              </div>
            </div>
          );
        })}
        
        {filteredMatches.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">No matches found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Help Section */}
      <HelpSection
        title="Job-Resume Matches"
        description="View and analyze job-resume matching results. This module displays AI-generated matches between processed jobs and resumes with comprehensive ratings, detailed analysis, and decision-making support."
        features={[
          "View all job-resume matches with AI-generated compatibility ratings",
          "Filter matches by rating, job, candidate, and match quality",
          "Browse detailed matching analysis with comprehensive reasoning",
          "View disqualifiers, match reasons, and compatibility factors",
          "Access comprehensive matching data for informed hiring decisions"
        ]}
        endResults={[
          "Comprehensive view of all job-resume matches with compatibility ratings",
          "Detailed analysis showing match strengths, weaknesses, and reasoning",
          "Filtered results for efficient candidate evaluation and selection",
          "Decision-making data including disqualifiers and compatibility factors",
          "Ready-to-use match information for interview scheduling and hiring decisions"
        ]}
        workflow={[
          "Matches are generated after running AI resume matching in Resume Management",
          "Use filters to find specific matches by rating, job, or candidate criteria",
          "Click on match cards to view detailed analysis and reasoning",
          "Review AI reasoning, disqualifiers, and compatibility factors for each match",
          "Use comprehensive match data to make informed hiring and interview decisions"
        ]}
      />
    </div>
  );
}