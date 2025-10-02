import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import MtbFilterDropdown from '@/components/MtbFilterDropdown';
import SalaryInput from '@/components/SalaryInput';
import HelpSection from '@/components/HelpSection';
import { useGoogleDriveRequirement } from '@/hooks/useGoogleDriveRequirement.tsx';

export default function Processing() {
  const { requireAuth, GoogleDriveGuard } = useGoogleDriveRequirement();
  const [activeTab, setActiveTab] = useState<'mtb' | 'jobs'>('mtb');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // MTB Processing - User enters Google Drive URL on entry
  const [mtbData, setMtbData] = useState({
    csv_path: 'https://docs.google.com/spreadsheets/d/1AhE4-fNSU-lBE7zOj9Cc2rYfcn2DSxTD9u6Ru7iVsQ8', // Default Google Sheets URL
    category: 'ALL',
    state: 'ALL',
    client_rating: 'ALL',
    company: 'ALL',
    position: 'ALL',
    city: 'ALL',
    country: 'ALL',
    industry_segment: 'ALL',
    bonus: 'ALL',
    received_date: 'ALL',
    conditional_fee: 'ALL',
    internal: 'ALL',
    visa: 'ALL',
    hr_hm: 'ALL',
    cm: 'ALL',
    pipeline_number: 'ALL',
    pipeline_candidates: 'ALL',
    notes: 'ALL',
    salary_min: 'ALL',
    salary_max: 'ALL',
    include_exc_jobs: false,
    include_period_jobs: false,
    extract_ids: true
  });

  // Job Processing
  const [jobData, setJobData] = useState({
    job_ids: '',
    folder_path: '',
    csv_path: '',
    ai_agent: 'grok'
  });


  // Set default values on page load (no auto-processing)
  useEffect(() => {
    if (activeTab === 'mtb') {
      console.log('Processing page loaded - default values set');
      // Just set default values, don't auto-process
    }
  }, [activeTab]);

  const handleMTBProcess = async () => {
    // Check if Google Drive authentication is required
    const canProceed = await requireAuth('Master Tracking Board Processing');
    if (!canProceed) return;

    setLoading(true);
    setError(null);
    setStatusMessage('Starting MTB processing...');
    try {
      setStatusMessage('Processing Master Tracking Board...');
      
      // Convert internal delimiter format back to comma-separated for backend
      const processedMtbData = {
        ...mtbData,
        category: mtbData.category.includes('|||') ? mtbData.category.split('|||').join(', ') : mtbData.category,
        state: mtbData.state.includes('|||') ? mtbData.state.split('|||').join(', ') : mtbData.state,
        client_rating: mtbData.client_rating.includes('|||') ? mtbData.client_rating.split('|||').join(', ') : mtbData.client_rating,
        company: mtbData.company.includes('|||') ? mtbData.company.split('|||').join(', ') : mtbData.company,
        position: mtbData.position.includes('|||') ? mtbData.position.split('|||').join(', ') : mtbData.position,
        city: mtbData.city.includes('|||') ? mtbData.city.split('|||').join(', ') : mtbData.city,
        country: mtbData.country.includes('|||') ? mtbData.country.split('|||').join(', ') : mtbData.country,
        industry_segment: mtbData.industry_segment.includes('|||') ? mtbData.industry_segment.split('|||').join(', ') : mtbData.industry_segment,
        bonus: mtbData.bonus.includes('|||') ? mtbData.bonus.split('|||').join(', ') : mtbData.bonus,
        received_date: mtbData.received_date.includes('|||') ? mtbData.received_date.split('|||').join(', ') : mtbData.received_date,
        conditional_fee: mtbData.conditional_fee.includes('|||') ? mtbData.conditional_fee.split('|||').join(', ') : mtbData.conditional_fee,
        internal: mtbData.internal.includes('|||') ? mtbData.internal.split('|||').join(', ') : mtbData.internal,
        visa: mtbData.visa.includes('|||') ? mtbData.visa.split('|||').join(', ') : mtbData.visa,
        hr_hm: mtbData.hr_hm.includes('|||') ? mtbData.hr_hm.split('|||').join(', ') : mtbData.hr_hm,
        cm: mtbData.cm.includes('|||') ? mtbData.cm.split('|||').join(', ') : mtbData.cm,
        pipeline_number: mtbData.pipeline_number.includes('|||') ? mtbData.pipeline_number.split('|||').join(', ') : mtbData.pipeline_number,
        pipeline_candidates: mtbData.pipeline_candidates.includes('|||') ? mtbData.pipeline_candidates.split('|||').join(', ') : mtbData.pipeline_candidates,
        notes: mtbData.notes.includes('|||') ? mtbData.notes.split('|||').join(', ') : mtbData.notes
      };
      
      const result = await apiClient.processMTB(processedMtbData);
      setStatusMessage('Processing completed successfully!');
      setResult(result);
      
      // Auto-populate Job Processing with results from MTB
      if (result.job_ids && result.job_ids.length > 0) {
        setJobData(prev => ({
          ...prev,
          job_ids: result.job_ids.join(', '),
          folder_path: '/app/data/jobs',
          csv_path: '/app/data/MTB/MasterTrackingBoard.csv'
        }));
        console.log('Auto-populated Job Processing with MTB results:', result.job_ids);
      }
    } catch (err: any) {
      setStatusMessage('Processing failed!');
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJobProcess = async () => {
    // Check if Google Drive authentication is required
    const canProceed = await requireAuth('Job Processing');
    if (!canProceed) return;

    setLoading(true);
    setError(null);
    try {
      const jobIds = jobData.job_ids.split(',').map(id => id.trim()).filter(id => id);
      const result = await apiClient.processJobs({
        ...jobData,
        job_ids: jobIds
      });
      setResult(result);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Prepare MTB (Google Sheets)</h1>
        <p className="mt-2 text-gray-600">
          Process Master Tracking Board CSV files and extract job IDs
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'mtb', label: 'Master Tracking Board' },
            { id: 'jobs', label: 'AI Job Processing (JSON)' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* MTB Processing */}
      {activeTab === 'mtb' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Process Master Tracking Board</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">CSV Path</label>
              <input
                type="text"
                value={mtbData.csv_path}
                onChange={(e) => setMtbData({ ...mtbData, csv_path: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Enter Google Drive URL (e.g., https://docs.google.com/spreadsheets/d/...)"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <MtbFilterDropdown
                label="Category (comma-separated or ALL)"
                value={mtbData.category}
                onChange={(value) => setMtbData({ ...mtbData, category: value })}
                placeholder="ALL or A,B,C,D"
                csvPath={mtbData.csv_path}
                columnName="CAT"
                disabled={loading}
              />
              <MtbFilterDropdown
                label="State (comma-separated or ALL)"
                value={mtbData.state}
                onChange={(value) => setMtbData({ ...mtbData, state: value })}
                placeholder="ALL or CA,NY,TX,OH"
                csvPath={mtbData.csv_path}
                columnName="State"
                disabled={loading}
              />
              <MtbFilterDropdown
                label="Client Rating (comma-separated or ALL)"
                value={mtbData.client_rating}
                onChange={(value) => setMtbData({ ...mtbData, client_rating: value })}
                placeholder="ALL or *,**,***,****"
                csvPath={mtbData.csv_path}
                columnName="Client Rating"
                disabled={loading}
              />
              <MtbFilterDropdown
                label="Company (comma-separated or ALL)"
                value={mtbData.company}
                onChange={(value) => setMtbData({ ...mtbData, company: value })}
                placeholder="ALL or Eagle,Buzzi,Titan"
                csvPath={mtbData.csv_path}
                columnName="Company"
                disabled={loading}
              />
              <MtbFilterDropdown
                label="Position (comma-separated or ALL)"
                value={mtbData.position}
                onChange={(value) => setMtbData({ ...mtbData, position: value })}
                placeholder="ALL or Plant Manager,Maintenance Engineer"
                csvPath={mtbData.csv_path}
                columnName="Position"
                disabled={loading}
              />
              <MtbFilterDropdown
                label="City (comma-separated or ALL)"
                value={mtbData.city}
                onChange={(value) => setMtbData({ ...mtbData, city: value })}
                placeholder="ALL or Fairborn,Laramie,Stockertown"
                csvPath={mtbData.csv_path}
                columnName="City"
                disabled={loading}
              />
              <MtbFilterDropdown
                label="Country (comma-separated or ALL)"
                value={mtbData.country}
                onChange={(value) => setMtbData({ ...mtbData, country: value })}
                placeholder="ALL or USA,Canada,Mexico"
                csvPath={mtbData.csv_path}
                columnName="Country"
                disabled={loading}
              />
              <MtbFilterDropdown
                label="Industry/Segment (comma-separated or ALL)"
                value={mtbData.industry_segment}
                onChange={(value) => setMtbData({ ...mtbData, industry_segment: value })}
                placeholder="ALL or Cement,Agg,Manufacturing"
                csvPath={mtbData.csv_path}
                columnName="Industry/Segment"
                disabled={loading}
              />
              <MtbFilterDropdown
                label="Bonus (comma-separated or ALL)"
                value={mtbData.bonus}
                onChange={(value) => setMtbData({ ...mtbData, bonus: value })}
                placeholder="ALL or 1-4%,5-10%,None"
                csvPath={mtbData.csv_path}
                columnName="Bonus"
                disabled={loading}
              />
              <MtbFilterDropdown
                label="Received Date (comma-separated or ALL)"
                value={mtbData.received_date}
                onChange={(value) => setMtbData({ ...mtbData, received_date: value })}
                placeholder="ALL or 2024,2023,2025"
                csvPath={mtbData.csv_path}
                columnName="Received (m/d/y)"
                disabled={loading}
              />
              <MtbFilterDropdown
                label="Conditional Fee (comma-separated or ALL)"
                value={mtbData.conditional_fee}
                onChange={(value) => setMtbData({ ...mtbData, conditional_fee: value })}
                placeholder="ALL or 0.25,25%,0.20"
                csvPath={mtbData.csv_path}
                columnName="Conditional Fee"
                disabled={loading}
              />
              <MtbFilterDropdown
                label="Internal (comma-separated or ALL)"
                value={mtbData.internal}
                onChange={(value) => setMtbData({ ...mtbData, internal: value })}
                placeholder="ALL or TNA,Internal,External"
                csvPath={mtbData.csv_path}
                columnName="Internal"
                disabled={loading}
              />
              <MtbFilterDropdown
                label="Visa (comma-separated or ALL)"
                value={mtbData.visa}
                onChange={(value) => setMtbData({ ...mtbData, visa: value })}
                placeholder="ALL or None,Required,Preferred"
                csvPath={mtbData.csv_path}
                columnName="Visa"
                disabled={loading}
              />
              <MtbFilterDropdown
                label="HR/HM (comma-separated or ALL)"
                value={mtbData.hr_hm}
                onChange={(value) => setMtbData({ ...mtbData, hr_hm: value })}
                placeholder="ALL or Sierra Santia,Vanessa Biechy"
                csvPath={mtbData.csv_path}
                columnName="HR/HM"
                disabled={loading}
              />
              <MtbFilterDropdown
                label="CM (comma-separated or ALL)"
                value={mtbData.cm}
                onChange={(value) => setMtbData({ ...mtbData, cm: value })}
                placeholder="ALL or Tom,John,Mary"
                csvPath={mtbData.csv_path}
                columnName="CM"
                disabled={loading}
              />
              <MtbFilterDropdown
                label="Pipeline # (comma-separated or ALL)"
                value={mtbData.pipeline_number}
                onChange={(value) => setMtbData({ ...mtbData, pipeline_number: value })}
                placeholder="ALL or 1,2,3"
                csvPath={mtbData.csv_path}
                columnName="Pipeline #"
                disabled={loading}
              />
              <MtbFilterDropdown
                label="Pipeline Candidates (comma-separated or ALL)"
                value={mtbData.pipeline_candidates}
                onChange={(value) => setMtbData({ ...mtbData, pipeline_candidates: value })}
                placeholder="ALL or Kelly McCreight,Dustin Wehlage"
                csvPath={mtbData.csv_path}
                columnName="Pipeline Candidates"
                disabled={loading}
              />
              <MtbFilterDropdown
                label="Notes (comma-separated or ALL)"
                value={mtbData.notes}
                onChange={(value) => setMtbData({ ...mtbData, notes: value })}
                placeholder="ALL or keywords from notes"
                csvPath={mtbData.csv_path}
                columnName="Notes"
                disabled={loading}
              />
              <SalaryInput
                label="Salary Min (number or ALL)"
                value={mtbData.salary_min}
                onChange={(value) => setMtbData({ ...mtbData, salary_min: value })}
                placeholder="ALL or 100000 (for $100k+)"
                disabled={loading}
              />
              <SalaryInput
                label="Salary Max (number or ALL)"
                value={mtbData.salary_max}
                onChange={(value) => setMtbData({ ...mtbData, salary_max: value })}
                placeholder="ALL or 200000 (for up to $200k)"
                disabled={loading}
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="include_exc_jobs"
                  checked={mtbData.include_exc_jobs}
                  onChange={(e) => setMtbData({ ...mtbData, include_exc_jobs: e.target.checked })}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="include_exc_jobs" className="ml-2 text-sm text-gray-700">
                  Include jobs with 'exc' in CM column
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="include_period_jobs"
                  checked={mtbData.include_period_jobs}
                  onChange={(e) => setMtbData({ ...mtbData, include_period_jobs: e.target.checked })}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="include_period_jobs" className="ml-2 text-sm text-gray-700">
                  Include duplicate job IDs (.1, .2, .3, etc.)
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="extract_ids"
                  checked={mtbData.extract_ids}
                  onChange={(e) => setMtbData({ ...mtbData, extract_ids: e.target.checked })}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="extract_ids" className="ml-2 text-sm text-gray-700">
                  Extract Job IDs
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <button
                onClick={handleMTBProcess}
                disabled={loading || !mtbData.csv_path}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Process MTB'}
              </button>
              {statusMessage && (
                <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  {statusMessage}
                </div>
              )}
              {result && result.job_ids && (
                <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                  ✅ Successfully extracted {result.job_ids.length} job IDs. 
                  Switch to "AI Job Processing (JSON)" tab to see auto-populated data.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Job Processing (JSON) */}
      {activeTab === 'jobs' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Process Job Descriptions</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Job IDs (comma-separated)</label>
              <input
                type="text"
                value={jobData.job_ids}
                onChange={(e) => setJobData({ ...jobData, job_ids: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Will be auto-populated after MTB processing or enter manually: 12345, 67890, 11111"
              />
              {jobData.job_ids && (
                <p className="mt-1 text-sm text-green-600">
                  ✓ Job IDs populated from MTB processing
                </p>
              )}
              {!jobData.job_ids && (
                <p className="mt-1 text-sm text-gray-500">
                  💡 Run MTB processing first to auto-populate job IDs
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Folder Path</label>
              <input
                type="text"
                value={jobData.folder_path}
                onChange={(e) => setJobData({ ...jobData, folder_path: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="/app/data/jobs (will be set after MTB processing)"
              />
              {jobData.folder_path && (
                <p className="mt-1 text-sm text-green-600">
                  ✓ Using organized data structure: {jobData.folder_path}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">CSV Path</label>
              <input
                type="text"
                value={jobData.csv_path}
                onChange={(e) => setJobData({ ...jobData, csv_path: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="/app/data/MTB/MasterTrackingBoard.csv (will be set after MTB processing)"
              />
              {jobData.csv_path && (
                <p className="mt-1 text-sm text-green-600">
                  ✓ Using organized MTB data: {jobData.csv_path}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">AI Agent</label>
              <select
                value={jobData.ai_agent}
                onChange={(e) => setJobData({ ...jobData, ai_agent: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="grok">Grok</option>
                <option value="gemini">Gemini</option>
                <option value="deepseek">Deepseek</option>
                <option value="openai">OpenAI</option>
                <option value="qwen">Qwen</option>
                <option value="zai">Z.ai</option>
              </select>
            </div>
            <button
              onClick={handleJobProcess}
              disabled={loading || !jobData.job_ids}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Process Jobs'}
            </button>
            {jobData.job_ids && (
              <p className="text-sm text-gray-600">
                Ready to process {jobData.job_ids.split(',').length} job IDs
              </p>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Results</h3>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Help Section */}
      <HelpSection
        title="Prepare MTB (Google Sheets) (MTB Processing)"
        description="Import and filter Master Tracking Board data from Google Sheets to extract job IDs for processing. This creates the foundation for all downstream job processing workflows."
        features={[
          "Import Master Tracking Board CSV directly from Google Sheets URLs",
          "Filter jobs by category, state, client rating, company, position, city, and industry",
          "Extract job IDs automatically from filtered data with validation",
          "Generate jobidlist.txt file for use in subsequent processing steps",
          "Preview filtered data and job counts before final processing"
        ]}
        endResults={[
          "jobidlist.txt file containing all filtered job IDs",
          "Download report showing which jobs were included/excluded",
          "Filtered job data ready for Google Drive file downloads",
          "Job IDs ready for AI processing and analysis"
        ]}
        workflow={[
          "Enter your Google Sheets URL (default provided for testing)",
          "Set filters to target specific job criteria (optional - defaults to ALL)",
          "Click 'Process MTB' to import and filter the data",
          "Review the job count and download the jobidlist.txt file",
          "Use the extracted job IDs in 'Job Description Downloads (MTB)' module"
        ]}
      />
    </div>
  );
}
