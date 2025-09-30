import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { useSettings } from '@/contexts/SettingsContext';
import HelpSection from '@/components/HelpSection';

export default function Operations() {
  const { currentAiAgent } = useSettings();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Form data for different operations
  const [mtbData, setMtbData] = useState({
    csv_path: 'https://docs.google.com/spreadsheets/d/1AhE4-fNSU-lBE7zOj9Cc2rYfcn2DSxTD9u6Ru7iVsQ8',
    category: 'ALL',
    state: 'ALL',
    client_rating: 'ALL',
    extract_ids: true
  });

  const [combineData, setCombineData] = useState({
    folder_path: '/app/data/JobDescription_YYYYMMDD',
    output_path: '/app/output/combined_text.txt',
    file_types: 'pdf,docx'
  });

  const [pipelineData, setPipelineData] = useState({
    csv_path: 'https://docs.google.com/spreadsheets/d/1AhE4-fNSU-lBE7zOj9Cc2rYfcn2DSxTD9u6Ru7iVsQ8',
    folder_path: '/app/data/JobDescription_YYYYMMDD',
    output_path: '/app/output/jobs_YYYYMMDD_final_optimized.json',
    ai_agent: currentAiAgent,
    category: 'ALL',
    state: 'ALL',
    client_rating: 'ALL'
  });

  // Update AI agent in form data when settings change
  useEffect(() => {
    setPipelineData(prev => ({ ...prev, ai_agent: currentAiAgent }));
  }, [currentAiAgent]);

  const handleOperation = async (operation: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let result;
      
      switch (operation) {
        case 'mtb':
          result = await apiClient.processMTB(mtbData);
          break;
          
        case 'copy_local':
          // This operation has been moved to the dashboard
          result = { message: "Job Description Download (ZIP) has been moved to the main dashboard. Please use the dashboard to organize job files." };
          break;
          
        case 'copy_drive':
          // This operation has been moved to its own dedicated page
          result = { message: "Google Drive file download has been moved to its own dedicated page. Please use the 'Job Description Downloads' menu item." };
          break;
          
        case 'process_jobs':
          // This operation has been moved to its own dedicated page
          result = { message: "AI Job Processing (JSON) has been moved to its own dedicated page. Please use the 'AI Job Processing (JSON)' menu item." };
          break;
          
        case 'combine_texts':
          result = await apiClient.combineTexts('', '');
          break;
          
        case 'select_ai':
          // This operation is now handled in Settings page
          result = { message: "AI Agent selection has been moved to Settings page" };
          break;
          
        case 'optimize_json':
          result = await apiClient.optimizeJSON({}); // Empty object for now
          break;
          
        case 'pipeline_mtb_copy_ai_combine':
          result = await apiClient.runPipeline('mtb_copy_ai_combine', pipelineData);
          break;
          
        case 'pipeline_full':
          result = await apiClient.runPipeline('full_pipeline', pipelineData);
          break;
          
        default:
          throw new Error('Unknown operation');
      }
      
      setResult(result);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  const operations = [
    {
      id: 'mtb',
      title: '1) Prepare MTB (Google Sheets)',
      description: 'Extract job IDs from Master Tracking Board CSV',
      component: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">CSV Path</label>
            <input
              type="text"
              value={mtbData.csv_path}
              onChange={(e) => setMtbData({ ...mtbData, csv_path: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="https://docs.google.com/spreadsheets/d/1AhE4-fNSU-lBE7zOj9Cc2rYfcn2DSxTD9u6Ru7iVsQ8"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Category (comma-separated or ALL)</label>
              <input
                type="text"
                value={mtbData.category}
                onChange={(e) => setMtbData({ ...mtbData, category: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="ALL or IT,Healthcare,Finance"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">State (comma-separated or ALL)</label>
              <input
                type="text"
                value={mtbData.state}
                onChange={(e) => setMtbData({ ...mtbData, state: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="ALL or CA,NY,TX"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Client Rating (comma-separated or ALL)</label>
              <input
                type="text"
                value={mtbData.client_rating}
                onChange={(e) => setMtbData({ ...mtbData, client_rating: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="ALL or A,B,C"
              />
            </div>
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
      )
    },
    {
      id: 'copy_local',
      title: '2) Job Description Download (ZIP) (Moved)',
      description: 'Job file organization has been moved to the main dashboard',
      component: (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-blue-800">Job Description Download (ZIP) Moved</h3>
                <p className="text-sm text-blue-600 mt-1">
                  The Job Description Download (ZIP) has been moved to the main dashboard for easier access and better user experience.
                </p>
              </div>
            </div>
          </div>
          <div className="text-center">
            <p className="text-gray-600 mb-4">Access the Job Description Download (ZIP) from the main dashboard</p>
            <a 
              href="/dashboard" 
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
              </svg>
              Go to Dashboard
            </a>
          </div>
        </div>
      )
    },
    {
      id: 'copy_drive',
      title: '3) Job Description Downloads (MTB) (Moved)',
      description: 'Google Drive file download has been moved to its own dedicated page',
      component: (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-blue-800">Job Description Downloads (MTB) Moved</h3>
                <p className="text-sm text-blue-600 mt-1">
                  Google Drive file download has been moved to its own dedicated page for better organization and user experience.
                </p>
              </div>
            </div>
          </div>
          <div className="text-center">
            <p className="text-gray-600 mb-4">Access the dedicated Job Description Downloads page from the main menu</p>
            <a 
              href="/job-description-downloads" 
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Go to Job Description Downloads
            </a>
          </div>
        </div>
      )
    },
    {
      id: 'process_jobs',
      title: '4) AI Job Processing (JSON) (Moved)',
      description: 'AI job processing has been moved to its own dedicated page',
      component: (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-blue-800">AI Job Processing (JSON) Moved</h3>
                <p className="text-sm text-blue-600 mt-1">
                  AI Job Processing (JSON) has been moved to its own dedicated page for better organization and user experience.
                </p>
              </div>
            </div>
          </div>
          <div className="text-center">
            <p className="text-gray-600 mb-4">Access the dedicated AI Job Processing (JSON) page from the main menu</p>
            <a 
              href="/job-processing" 
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Go to AI Job Processing (JSON)
            </a>
          </div>
        </div>
      )
    },
    {
      id: 'combine_texts',
      title: '5) Combine Texts (PDF/DOCX)',
      description: 'Extract and combine text from PDF and DOCX files',
      component: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Folder Path</label>
            <input
              type="text"
              value={combineData.folder_path}
              onChange={(e) => setCombineData({ ...combineData, folder_path: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="path/to/files/folder"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Output Path</label>
            <input
              type="text"
              value={combineData.output_path}
              onChange={(e) => setCombineData({ ...combineData, output_path: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="/app/output/combined_text.txt"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">File Types</label>
            <input
              type="text"
              value={combineData.file_types}
              onChange={(e) => setCombineData({ ...combineData, file_types: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="pdf,docx"
            />
          </div>
        </div>
      )
    },
    {
      id: 'pipeline_mtb_copy_ai_combine',
      title: '6) Run MTB > Copy > AI Agent > Combine',
      description: 'Complete pipeline: MTB processing, file copy, AI processing, text combination',
      component: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">CSV Path (MTB)</label>
            <input
              type="text"
              value={pipelineData.csv_path}
              onChange={(e) => setPipelineData({ ...pipelineData, csv_path: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="https://docs.google.com/spreadsheets/d/1AhE4-fNSU-lBE7zOj9Cc2rYfcn2DSxTD9u6Ru7iVsQ8"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Folder Path</label>
            <input
              type="text"
              value={pipelineData.folder_path}
              onChange={(e) => setPipelineData({ ...pipelineData, folder_path: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="/app/data/JobDescription_YYYYMMDD"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Output Path</label>
            <input
              type="text"
              value={pipelineData.output_path}
              onChange={(e) => setPipelineData({ ...pipelineData, output_path: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="/app/data/JobDescription_YYYYMMDD"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">AI Agent</label>
              <div className="mt-1 p-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-600">
                Using: {currentAiAgent.toUpperCase()} (configured in Settings)
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Category (comma-separated or ALL)</label>
              <input
                type="text"
                value={pipelineData.category}
                onChange={(e) => setPipelineData({ ...pipelineData, category: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="ALL or IT,Healthcare,Finance"
              />
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'pipeline_full',
      title: '7) Full Pipeline (MTB > Drive Copy > AI Agent > Final Optimize)',
      description: 'Complete pipeline with Google Drive integration and final optimization',
      component: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">CSV Path (MTB)</label>
            <input
              type="text"
              value={pipelineData.csv_path}
              onChange={(e) => setPipelineData({ ...pipelineData, csv_path: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="https://docs.google.com/spreadsheets/d/1AhE4-fNSU-lBE7zOj9Cc2rYfcn2DSxTD9u6Ru7iVsQ8"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Folder Path</label>
            <input
              type="text"
              value={pipelineData.folder_path}
              onChange={(e) => setPipelineData({ ...pipelineData, folder_path: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="/app/data/JobDescription_YYYYMMDD"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Output Path</label>
            <input
              type="text"
              value={pipelineData.output_path}
              onChange={(e) => setPipelineData({ ...pipelineData, output_path: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="/app/output/jobs_YYYYMMDD_final_optimized.json"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">AI Agent</label>
              <div className="mt-1 p-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-600">
                Using: {currentAiAgent.toUpperCase()} (configured in Settings)
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">State (comma-separated or ALL)</label>
              <input
                type="text"
                value={pipelineData.state}
                onChange={(e) => setPipelineData({ ...pipelineData, state: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="ALL or CA,NY,TX"
              />
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'select_ai',
      title: '8) AI Agent Settings',
      description: 'Configure AI agent settings (moved to Settings page)',
      component: (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-blue-800">AI Agent Configuration Moved</h3>
                <p className="text-sm text-blue-600 mt-1">
                  AI Agent selection and testing has been moved to the Settings page for better organization.
                </p>
              </div>
            </div>
          </div>
          <div className="text-center">
            <p className="text-gray-600 mb-4">Current AI Agent: <span className="font-semibold text-blue-600">{currentAiAgent.toUpperCase()}</span></p>
            <p className="text-sm text-gray-500">
              To change your AI agent or test different models, please visit the Settings page.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'optimize_json',
      title: '9) Create Optimized & Complete JSON (AI + Field Corrections)',
      description: 'Optimize JSON output with field corrections',
      component: (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <p className="text-yellow-800">
              <strong>Note:</strong> This operation requires a JSON file input. 
              Use the MTB Processing page for file uploads or provide the JSON content directly.
            </p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Operations</h1>
        <p className="mt-2 text-gray-600">
          Complete functionality from your original Python application
        </p>
      </div>

      {/* Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {operations.map((operation) => (
          <div key={operation.id} className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">{operation.title}</h3>
            <p className="text-sm text-gray-600 mb-4">{operation.description}</p>
            
            {operation.component}
            
            <div className="mt-6">
              <button
                onClick={() => handleOperation(operation.id)}
                disabled={loading}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Processing...' : `Run ${operation.title.split(')')[0]})`}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Results */}
      {result && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Results</h3>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
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
        title="Advanced Tools (Operations)"
        description="Advanced utility functions and operations for power users. These tools provide specialized functionality for text processing, pipeline automation, and system management."
        features={[
          "Text combining and file processing utilities",
          "Automated pipeline execution for complex workflows",
          "AI agent testing and configuration tools",
          "Cache management and system optimization",
          "Advanced data processing and transformation",
          "System monitoring and maintenance functions"
        ]}
        workflow={[
          "Select the specific operation you want to perform",
          "Configure parameters and settings for the operation",
          "Review the operation description and requirements",
          "Click 'Run [Operation]' to execute the function",
          "Monitor results and download any generated outputs",
          "Use these tools for advanced workflows and system maintenance"
        ]}
      />
    </div>
  );
}
