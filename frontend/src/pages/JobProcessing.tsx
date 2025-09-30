import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSettings } from '@/contexts/SettingsContext';
import { apiClient } from '@/lib/api';
import { downloadFile } from '@/lib/download';
import HelpSection from '@/components/HelpSection';

export default function JobProcessing() {
  const { currentAiAgent } = useSettings();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [message, setMessage] = useState<string>('');
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    currentJob: string;
    status: string;
  } | null>(null);

  // Form data for job processing
  const [jobProcessData, setJobProcessData] = useState({
    job_ids: '', // Empty by default to use jobidlist.txt
    folder_path: '/app/data/jobs', // Single source of truth folder
    csv_path: '/app/data/MTB/MasterTrackingBoard.csv',
    ai_agent: currentAiAgent
  });

  // Update AI agent when settings change
  useEffect(() => {
    setJobProcessData(prev => ({ ...prev, ai_agent: currentAiAgent }));
  }, [currentAiAgent]);

  const handleProcessJobs = async () => {
    setLoading(true);
    setError(null);
    setErrorDetails(null);
    setDebugInfo(null);
    setResult(null);
    setMessage('');
    setProgress(null);

    // Use job IDs from input if provided, otherwise let backend use jobidlist.txt
    const processJobIds = jobProcessData.job_ids 
      ? jobProcessData.job_ids.split(',').map(id => id.trim()).filter(id => id)
      : undefined;

    try {
      setMessage('Starting job processing... This may take several minutes.');
      setProgress({
        current: 0,
        total: processJobIds?.length || 0,
        currentJob: 'Initializing...',
        status: 'Starting'
      });
      
      // Start polling for progress updates
      const progressInterval = setInterval(async () => {
        try {
          const progressResponse = await fetch('/api/job-processing-progress');
          const progressData = await progressResponse.json();
          
          if (progressData && Object.keys(progressData).length > 0) {
            const latestSession = Object.values(progressData)[0] as any;
            if (latestSession) {
              setProgress({
                current: latestSession.current_job || 0,
                total: latestSession.total_jobs || 0,
                currentJob: latestSession.current_job_id || 'Processing...',
                status: latestSession.current_step || 'Processing...'
              });
              
              // Update message with AI commands
              if (latestSession.ai_commands && latestSession.ai_commands.length > 0) {
                const latestCommand = latestSession.ai_commands[latestSession.ai_commands.length - 1];
                setMessage(`Latest AI Command: ${latestCommand}`);
              }
            }
          }
        } catch (err) {
          console.log('Progress polling error:', err);
        }
      }, 2000); // Poll every 2 seconds
      
      const result = await apiClient.processJobs({
        ...jobProcessData,
        job_ids: processJobIds
      });

      // Clear the progress polling
      clearInterval(progressInterval);

      setResult(result);
      setProgress(null);
      
      if (result.optimization_status === 'completed') {
        setMessage(`Successfully processed ${result.job_count || 0} jobs using ${result.ai_agent || 'AI agent'} with final optimization completed`);
      } else {
        setMessage(`Successfully processed ${result.job_count || 0} jobs using ${result.ai_agent || 'AI agent'} (optimization skipped)`);
      }
      
      // Add processing summary if available
      if (result.processing_summary) {
        const summary = result.processing_summary;
        setMessage(prev => prev + ` - AI processed: ${summary.ai_processed}, MTB only: ${summary.mtb_only}`);
        
        // Add token statistics if available
        if (result.token_statistics) {
          const tokens = result.token_statistics;
          setMessage(prev => prev + ` - Cache hits: ${tokens.cache_hits}, Cache hit rate: ${tokens.cache_hit_rate}, Money saved: ${tokens.money_saved || '$0.00'}`);
        }
      }
      
    } catch (err: any) {
      console.error('Job processing failed:', err);
      
      // Enhanced error reporting
      const errorMessage = err.message || 'Job processing failed';
      setError(errorMessage);
      
      // Capture detailed error information
      setErrorDetails({
        message: errorMessage,
        status: err.status || 'Unknown',
        statusText: err.statusText || 'Unknown',
        url: err.url || 'Unknown',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
      
      // Capture debug information
      setDebugInfo({
        jobIds: processJobIds,
        aiAgent: currentAiAgent,
        folderPath: jobProcessData.folder_path,
        csvPath: jobProcessData.csv_path,
        networkStatus: navigator.onLine ? 'Online' : 'Offline',
        lastProgressUpdate: progress
      });
      
      setMessage('');
      setProgress(null);
    } finally {
      setLoading(false);
    }
  };

  const getAgentDisplayName = (agent: string) => {
    const displayNames: { [key: string]: string } = {
      'grok': 'Grok (xAI)',
      'gemini': 'Gemini (Google)',
      'deepseek': 'DeepSeek',
      'openai': 'OpenAI GPT',
      'qwen': 'Qwen (Alibaba)',
      'zai': 'ZAI'
    };
    return displayNames[agent] || agent.toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI Job Processing (JSON)</h1>
        <p className="mt-2 text-gray-600">
          Use AI to analyze and structure job descriptions from your job files
        </p>
      </div>

      {/* Processing Form */}
      <Card>
        <CardHeader>
          <CardTitle>AI Job Processing (JSON)</CardTitle>
        <CardDescription>
          Process job descriptions using AI to extract structured information. 
          Requires files from "Job Description Downloads (MTB)" operation.
        </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Job IDs Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job IDs (optional)
            </label>
            <input
              type="text"
              value={jobProcessData.job_ids}
              onChange={(e) => setJobProcessData({ ...jobProcessData, job_ids: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Leave empty to use jobidlist.txt from MTB processing"
            />
            <p className="text-xs text-gray-500 mt-1">
              If left empty, will automatically use the most recent jobidlist.txt file
            </p>
          </div>

          {/* Folder Path */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Folder Path
            </label>
            <input
              type="text"
              value={jobProcessData.folder_path}
              onChange={(e) => setJobProcessData({ ...jobProcessData, folder_path: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="/app/data/jobs (single source of truth)"
            />
            <p className="text-xs text-gray-500 mt-1">
              Single source of truth for all job descriptions and HR notes
            </p>
          </div>

          {/* CSV Path */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CSV Path (Master Tracking Board)
            </label>
            <input
              type="text"
              value={jobProcessData.csv_path}
              onChange={(e) => setJobProcessData({ ...jobProcessData, csv_path: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="/app/data/MTB/MasterTrackingBoard.csv"
            />
            <p className="text-xs text-gray-500 mt-1">
              URL to Master Tracking Board CSV file (uses local file by default)
            </p>
          </div>

          {/* AI Agent Display */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Agent
            </label>
            <div className="p-3 bg-gray-100 border border-gray-300 rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">
                  Using: {getAgentDisplayName(currentAiAgent)}
                </span>
                <a 
                  href="/settings" 
                  className="text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  Change in Settings
                </a>
              </div>
            </div>
          </div>

          {/* Process Button */}
          <div className="flex justify-center">
            <button
              onClick={handleProcessJobs}
              disabled={loading}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Processing Jobs...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Process Jobs</span>
                </>
              )}
            </button>
          </div>

          {/* Progress Display */}
          {progress && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-blue-900">Processing Progress</h3>
                <span className="text-sm text-blue-700">
                  {progress.current}/{progress.total} jobs
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                ></div>
              </div>
              
              {/* Current Job */}
              <div className="text-sm text-blue-800">
                <p><strong>Current Job:</strong> {progress.currentJob}</p>
                <p><strong>Status:</strong> {progress.status}</p>
              </div>
            </div>
          )}

          {/* Message Display */}
          {message && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-blue-800">{message}</span>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-800 font-medium text-lg">❌ Error: {error}</span>
              </div>
              
              {/* Error Details */}
              {errorDetails && (
                <div className="mb-3">
                  <details className="text-sm">
                    <summary className="cursor-pointer text-red-700 font-medium mb-2">
                      📋 Error Details (Click to expand)
                    </summary>
                    <div className="bg-red-100 p-3 rounded border">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><strong>Status:</strong> {errorDetails.status}</div>
                        <div><strong>Status Text:</strong> {errorDetails.statusText}</div>
                        <div><strong>URL:</strong> {errorDetails.url}</div>
                        <div><strong>Timestamp:</strong> {errorDetails.timestamp}</div>
                      </div>
                    </div>
                  </details>
                </div>
              )}
              
              {/* Debug Information */}
              {debugInfo && (
                <div className="mb-3">
                  <details className="text-sm">
                    <summary className="cursor-pointer text-red-700 font-medium mb-2">
                      🔍 Debug Information (Click to expand)
                    </summary>
                    <div className="bg-red-100 p-3 rounded border">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><strong>Job IDs:</strong> {debugInfo.jobIds?.length || 0} jobs</div>
                        <div><strong>AI Agent:</strong> {debugInfo.aiAgent}</div>
                        <div><strong>Folder Path:</strong> {debugInfo.folderPath}</div>
                        <div><strong>CSV Path:</strong> {debugInfo.csvPath}</div>
                        <div><strong>Network:</strong> {debugInfo.networkStatus}</div>
                        <div><strong>Last Progress:</strong> {debugInfo.lastProgressUpdate ? `${debugInfo.lastProgressUpdate.current}/${debugInfo.lastProgressUpdate.total}` : 'None'}</div>
                      </div>
                    </div>
                  </details>
                </div>
              )}
              
              {/* Troubleshooting Tips */}
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <div className="text-yellow-800 text-sm">
                  <strong>💡 Troubleshooting Tips:</strong>
                  <ul className="mt-1 ml-4 list-disc">
                    <li>Check if job description files exist in the specified folder</li>
                    <li>Verify the MasterTrackingBoard.csv file is accessible</li>
                    <li>Ensure the AI agent is properly configured in Settings</li>
                    <li>Check backend logs for more detailed error information</li>
                    <li>Try refreshing the page and running again</li>
                  </ul>
                </div>
              </div>
              
              {/* Clear Error Button */}
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => {
                    setError(null);
                    setErrorDetails(null);
                    setDebugInfo(null);
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  Clear Error
                </button>
              </div>
            </div>
          )}

          {/* Result Display */}
          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-green-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h3 className="font-medium text-green-900 mb-2">Processing Complete!</h3>
                  <div className="text-sm text-green-800 space-y-1">
                    <p><strong>Jobs Processed:</strong> {result.job_count || 0}</p>
                    <p><strong>AI Agent:</strong> {getAgentDisplayName(result.ai_agent || 'Unknown')}</p>
                    <p><strong>AI Output File:</strong> {result.output_file || 'Generated successfully'}</p>
                    {result.final_optimized_file && (
                      <p><strong>Final Optimized File:</strong> {result.final_optimized_file}</p>
                    )}
                    <p><strong>Optimization Status:</strong> 
                      <span className={`ml-1 px-2 py-1 rounded text-xs ${
                        result.optimization_status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {result.optimization_status === 'completed' ? '✅ Completed' : '⚠️ Skipped'}
                      </span>
                    </p>
                    
          {/* Processing Summary */}
          {result.processing_summary && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Processing Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium">Total Jobs:</span> {result.processing_summary.total_jobs}
                </div>
                <div>
                  <span className="font-medium">Jobs with Files:</span> {result.processing_summary.jobs_with_files}
                </div>
                <div>
                  <span className="font-medium">AI Processed:</span> {result.processing_summary.ai_processed}
                </div>
                <div>
                  <span className="font-medium">MTB Only:</span> {result.processing_summary.mtb_only}
                </div>
              </div>
              {result.processing_summary.mtb_only > 0 && (
                <div className="mt-2 text-sm text-orange-600">
                  <p><strong>Note:</strong> {result.processing_summary.mtb_only} job(s) were processed using MasterTrackingBoard.csv data only because no job description files were found. These jobs include explanatory notes about why AI processing was skipped.</p>
                </div>
              )}
            </div>
          )}

          {/* Token Statistics */}
          {result.token_statistics && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">💰 Token Statistics & Optimization</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium">Cache Hits:</span> {result.token_statistics.cache_hits || 0}
                </div>
                <div>
                  <span className="font-medium">Cache Misses:</span> {result.token_statistics.cache_misses || 0}
                </div>
                <div>
                  <span className="font-medium">Tokens Uploaded:</span> {(result.token_statistics.tokens_uploaded || 0).toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">Tokens from Cache:</span> {(result.token_statistics.tokens_from_cache || 0).toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">Tokens Generated:</span> {(result.token_statistics.tokens_generated || 0).toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">AI Calls Made:</span> {result.token_statistics.ai_calls_made || 0}
                </div>
                <div>
                  <span className="font-medium">AI Calls Saved:</span> {result.token_statistics.ai_calls_saved || 0}
                </div>
                <div>
                  <span className="font-medium">Processing Time:</span> {(result.token_statistics.processing_time || 0).toFixed(2)}s
                </div>
                <div>
                  <span className="font-medium">Cache Hit Rate:</span> {result.token_statistics.cache_hit_rate || '0%'}
                </div>
                <div className="col-span-2">
                  <span className="font-medium text-green-600">💰 Money Saved:</span> <span className="font-bold text-green-600">{result.token_statistics.money_saved || '$0.00'}</span>
                </div>
              </div>
              <div className="mt-2 text-sm text-green-600">
                <p><strong>💡 Optimization Benefits:</strong> Saved {result.token_statistics.ai_calls_saved || 0} AI calls and {result.token_statistics.money_saved || '$0.00'} through intelligent caching!</p>
              </div>
            </div>
          )}
                    
                    <p><strong>Session ID:</strong> {result.session_id || 'N/A'}</p>
                  </div>
                  
                  {/* Download Links */}
                  <div className="mt-4 p-3 bg-green-100 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-3">📥 Download Generated Files</h4>
                    <div className="space-y-2">
                      {result.output_file && (
                        <div className="flex items-center justify-between p-2 bg-white rounded border">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">AI Processed Jobs</p>
                            <p className="text-xs text-gray-600">{result.output_file.split('/').pop()}</p>
                          </div>
                          <button
                            onClick={async () => {
                              const downloadResult = await downloadFile(result.output_file, 'ai-processed-jobs.json');
                              if (downloadResult.success) {
                                setMessage(`Downloading ${downloadResult.filename}...`);
                              } else {
                                setError('Failed to download file');
                              }
                            }}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors flex items-center space-x-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Download</span>
                          </button>
                        </div>
                      )}
                      
                      {result.final_optimized_file && result.final_optimized_file !== result.output_file && (
                        <div className="flex items-center justify-between p-2 bg-white rounded border">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">Final Optimized Jobs</p>
                            <p className="text-xs text-gray-600">{result.final_optimized_file.split('/').pop()}</p>
                          </div>
                          <button
                            onClick={async () => {
                              const downloadResult = await downloadFile(result.final_optimized_file, 'final-optimized-jobs.json');
                              if (downloadResult.success) {
                                setMessage(`Downloading ${downloadResult.filename}...`);
                              } else {
                                setError('Failed to download file');
                              }
                            }}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center space-x-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Download</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Output Information */}
      <Card>
        <CardHeader>
          <CardTitle>Output Information</CardTitle>
          <CardDescription>
            Understanding the job processing output
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Output File Locations</h4>
              <div className="bg-gray-100 p-3 rounded-md space-y-2">
                <div>
                  <code className="text-sm text-gray-700">
                    AI Output: /app/data/output/jobs_YYYYMMDD_optimized.json
                  </code>
                </div>
                <div>
                  <code className="text-sm text-gray-700">
                    Final Optimized: /app/data/output/jobs_YYYYMMDD_final_optimized.json
                  </code>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Where YYYYMMDD is the current date. The final optimized file is ready for resume matching.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">File Format</h4>
              <div className="bg-gray-100 p-3 rounded-md">
                <code className="text-sm text-gray-700">JSON</code>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Structured data format for easy integration
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Processing Steps</h4>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">1</div>
                <div className="ml-3">
                  <h5 className="text-sm font-medium text-gray-900">AI Job Processing (JSON)</h5>
                  <p className="text-xs text-gray-600">Extract structured data from job descriptions using AI</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-medium">2</div>
                <div className="ml-3">
                  <h5 className="text-sm font-medium text-gray-900">Final Optimization</h5>
                  <p className="text-xs text-gray-600">Field corrections, standardization, and formatting for resume matching</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">What's Included</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <strong>JobID:</strong> Unique identifier (standardized field name)</li>
              <li>• <strong>Company:</strong> Company name extracted from documents</li>
              <li>• <strong>Position:</strong> Job title and role</li>
              <li>• <strong>Industry/Segment:</strong> Business sector and specialization</li>
              <li>• <strong>Location:</strong> City, State, Country (separate fields)</li>
              <li>• <strong>Salary:</strong> Compensation details (formatted)</li>
              <li>• <strong>Requirements:</strong> Skills, qualifications, and experience</li>
              <li>• <strong>Contact Info:</strong> HR/HM and CM details</li>
              <li>• <strong>Pipeline Data:</strong> Candidate tracking information</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">💡 Pro Tip</h4>
            <p className="text-sm text-blue-800">
              The final optimized JSON file is specifically formatted for resume matching with standardized field names, 
              proper data types, and optimized structure. It's ready to use with the AI Resume Matching feature!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <HelpSection
        title="AI Job Processing (JSON)"
        description="Process job description and HR notes files with AI to extract comprehensive structured data and create optimized JSON output. This is the core AI analysis module that transforms raw job files into detailed structured data for matching and analysis."
        features={[
          "Process job files using advanced AI agents (OpenAI, Grok, Gemini, etc.)",
          "Extract comprehensive structured data from PDF, DOCX, and TXT files",
          "Generate standardized JSON output with 50+ structured fields including education, experience, skills, and requirements",
          "Real-time progress tracking with detailed status updates and job-by-job monitoring",
          "Automatic field correction, data standardization, and validation",
          "Integration with Master Tracking Board data for comprehensive job profiles"
        ]}
        endResults={[
          "Optimized JSON file with comprehensive job data (jobs_YYYYMMDD_final_optimized.json)",
          "Database records updated with AI-extracted structured data",
          "Job records with 50+ fields including education requirements, experience, skills, responsibilities",
          "Processing session data with token usage statistics and performance metrics",
          "Jobs ready for matching in 'Job-Resume Matches' module"
        ]}
        workflow={[
          "Ensure job files are available in /app/data/jobs/ (from previous download steps)",
          "Configure AI agent settings in the Settings page (defaults to OpenAI)",
          "Enter specific job IDs or leave empty to use jobidlist.txt from MTB processing",
          "Click 'Process Jobs' to start AI analysis with real-time progress tracking",
          "Monitor progress and download the final optimized JSON file",
          "View processed jobs in 'Job Database' and use for resume matching"
        ]}
      />
    </div>
  );
}
