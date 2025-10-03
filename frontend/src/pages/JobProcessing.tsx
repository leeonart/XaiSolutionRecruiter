import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/contexts/SettingsContext';
import { apiClient } from '@/lib/api';
import { downloadFile } from '@/lib/download';
import HelpSection from '@/components/HelpSection';

interface ProcessingSession {
  session_id: string;
  session_name: string;
  status: 'running' | 'completed' | 'failed';
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  progress_percentage: number;
  ai_calls_made: number;
  cache_hits: number;
  cache_misses: number;
  cache_hit_rate: string;
  estimated_time_remaining: string;
  current_job: string | null;
  processing_speed: string;
  start_time: number;
  ai_agent?: string;
  current_model?: string;
}

interface JobProgress {
  status: string;
  current_job: number;
  total_jobs: number;
  current_job_id: string | null;
  current_step: string;
  ai_commands: string[];
  start_time: string;
  completed_jobs: string[];
  failed_jobs: string[];
}

interface ProcessingResult {
  status: string;
  jobs_total: number;
  jobs_completed: number;
  ai_processed_count: number;
  session_id: string;
  ai_agent: string;
  data: any[];
  notes_only_data?: any[];
  output_file: string;
  final_optimized_file: string;
  missing_jobs?: string[];
  skipped_jobs?: string[];
  statistics: {
    cache_hits: number;
    cache_misses: number;
    cache_hit_rate: string;
    ai_calls_made: number;
    ai_calls_saved: number;
    tokens_uploaded: number;
    tokens_generated: number;
    tokens_from_cache: number;
    processing_time: number;
    money_saved: string;
  };
}

export default function JobProcessing() {
  const { currentAiAgent, currentModel } = useSettings();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [activeSessions, setActiveSessions] = useState<ProcessingSession[]>([]);
  const [currentProgress, setCurrentProgress] = useState<JobProgress | null>(null);
  const [showProcessingScreen, setShowProcessingScreen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [hasActiveProcessing, setHasActiveProcessing] = useState(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Form data for job processing
  const [jobProcessData, setJobProcessData] = useState({
    job_ids: '',
    folder_path: '/app/data/jobs',
    csv_path: '/app/data/MTB/MasterTrackingBoard.csv',
    ai_agent: currentAiAgent,
    model: currentModel || 'gpt-4o-mini'
  });

  // Update AI agent when settings change
  useEffect(() => {
    setJobProcessData(prev => ({ 
      ...prev, 
      ai_agent: currentAiAgent,
      model: currentModel || 'gpt-4o-mini'
    }));
  }, [currentAiAgent, currentModel]);

  // Auto-detect active processing sessions when component mounts
  useEffect(() => {
    const checkForActiveProcessing = async () => {
      try {
        await fetchProcessingStatus();
        // If we found active sessions or progress, show the processing screen
        if (activeSessions.length > 0 || currentProgress) {
          setShowProcessingScreen(true);
          setAutoRefresh(true);
          setHasActiveProcessing(true);
          setMessage('Active processing session detected. Monitoring in progress...');
        }
      } catch (err) {
        console.log('Error checking for active processing:', err);
      }
    };

    // Check immediately when component mounts
    checkForActiveProcessing();
  }, []);

  // Auto-refresh processing status when enabled or when we have active processing
  useEffect(() => {
    if ((autoRefresh || hasActiveProcessing) && !loading && !result) {
      // Only auto-refresh if we don't have a completed result
      fetchProcessingStatus();
      progressIntervalRef.current = setInterval(fetchProcessingStatus, 3000);
    } else if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [autoRefresh, hasActiveProcessing, loading, result]);

  const fetchProcessingStatus = async () => {
    try {
      const response = await fetch('/api/job-processing-progress');
      const data = await response.json();
      
      // Extract sessions and progress data
      const sessions: ProcessingSession[] = [];
      let progress: JobProgress | null = null;
      
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          if (key.startsWith('job_processing_') && 'current_job' in value) {
            // This is a progress object
            progress = value as JobProgress;
          } else if (typeof (value as any).session_id === 'string') {
            // This is a session object
            sessions.push(value as ProcessingSession);
          }
        }
      });
      
      setActiveSessions(sessions);
      setCurrentProgress(progress);
      
      // Check if we have any active processing
      const hasActive = sessions.some(s => s.status === 'running') || progress;
      setHasActiveProcessing(hasActive);
      
      // If we detect active processing and the screen isn't shown, show it
      if (hasActive && !showProcessingScreen) {
        setShowProcessingScreen(true);
        setAutoRefresh(true);
        setMessage('Active processing session detected. Monitoring in progress...');
      }
      
      // Check if any session completed
      const completedSession = sessions.find(s => s.status === 'completed');
      if (completedSession && !result) {
        // Fetch the completed result
        try {
          const resultResponse = await fetch('/api/job-processing-progress');
          const resultData = await resultResponse.json();
          if (resultData.status === 'completed') {
            setResult(resultData);
            // Keep processing screen visible to show results and download options
            setShowProcessingScreen(true);
            setAutoRefresh(false); // Stop auto-refresh but keep screen visible
            setHasActiveProcessing(false);
            setMessage('✅ Processing completed successfully!');
          }
        } catch (err) {
          console.log('Error fetching completed result:', err);
        }
      }
    } catch (err) {
      console.log('Error fetching processing status:', err);
    }
  };

  const handleProcessJobs = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setMessage('');
    setActiveSessions([]);
    setCurrentProgress(null);
    setShowProcessingScreen(true);
    setAutoRefresh(true);

    const processJobIds = jobProcessData.job_ids 
      ? jobProcessData.job_ids.split(',').map(id => id.trim()).filter(id => id)
      : undefined;

    try {
      setMessage('Starting job processing... This may take several minutes.');
      
      const result = await apiClient.processJobs({
        ...jobProcessData,
        job_ids: processJobIds
      });

      setResult(result);
      setShowProcessingScreen(false);
      setAutoRefresh(false);
      
      if (result.optimization_status === 'completed') {
        setMessage(`✅ Successfully processed ${result.jobs_completed || 0} jobs using ${result.ai_agent || 'AI agent'} with final optimization completed`);
      } else {
        setMessage(`✅ Successfully processed ${result.jobs_completed || 0} jobs using ${result.ai_agent || 'AI agent'} (optimization skipped)`);
      }
      
    } catch (err: any) {
      console.error('Job processing failed:', err);
      setError(err.message || 'Job processing failed');
      setShowProcessingScreen(false);
      setAutoRefresh(false);
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

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString();
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Job Processing</h1>
            <p className="mt-2 text-gray-600">
              Process job descriptions with AI and track real-time progress with detailed statistics
            </p>
          </div>
          {hasActiveProcessing && (
            <div className="flex items-center space-x-2 px-4 py-2 bg-green-100 border border-green-300 rounded-lg">
              <div className="animate-pulse w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-green-800 font-medium text-sm">Processing Active</span>
            </div>
          )}
        </div>
      </div>

      {/* Processing Form */}
      <Card>
        <CardHeader>
          <CardTitle>Job Processing Configuration</CardTitle>
          <CardDescription>
            Configure and start AI-powered job processing with real-time monitoring
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
              placeholder="/app/data/jobs"
            />
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
          </div>

          {/* AI Agent Display */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Agent & Model
            </label>
            <div className="p-3 bg-gray-100 border border-gray-300 rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">
                  Using: {getAgentDisplayName(currentAiAgent)} ({currentModel || 'default model'})
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
            <Button
              onClick={handleProcessJobs}
              disabled={loading}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Starting Processing...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Start Job Processing</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Processing Screen */}
      {showProcessingScreen && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span>🔄 Live Processing Monitor</span>
                {hasActiveProcessing && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                    ACTIVE
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={autoRefresh ? "bg-green-100" : ""}
                >
                  {autoRefresh ? "🔄 Auto-refresh ON" : "⏸️ Auto-refresh OFF"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchProcessingStatus}
                >
                  🔄 Refresh Now
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowProcessingScreen(false);
                    setAutoRefresh(false);
                  }}
                >
                  ✖️ Close Monitor
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              {hasActiveProcessing 
                ? "Monitoring active processing sessions in real-time with detailed statistics and progress tracking"
                : "Real-time monitoring of job processing with detailed statistics and progress tracking"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Progress */}
            {currentProgress && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-blue-900 mb-3">📊 Current Processing Progress</h3>
                
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-700">
                      Job {currentProgress.current_job} of {currentProgress.total_jobs}
                    </span>
                    <span className="text-sm text-blue-600">
                      {Math.round((currentProgress.current_job / currentProgress.total_jobs) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${(currentProgress.current_job / currentProgress.total_jobs) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Current Job Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-blue-800">Current Job ID:</span>
                    <span className="ml-2 text-blue-700">{currentProgress.current_job_id || 'Processing...'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">Status:</span>
                    <span className="ml-2 text-blue-700">{currentProgress.status}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium text-blue-800">Current Step:</span>
                    <span className="ml-2 text-blue-700">{currentProgress.current_step}</span>
                  </div>
                </div>

                {/* AI Commands Log */}
                {currentProgress.ai_commands && currentProgress.ai_commands.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-blue-800 mb-2">🤖 Latest AI Commands:</h4>
                    <div className="bg-blue-100 rounded p-3 max-h-32 overflow-y-auto">
                      {currentProgress.ai_commands.slice(-3).map((command, index) => (
                        <div key={index} className="text-sm text-blue-700 mb-1">
                          • {command}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Active Sessions */}
            {activeSessions.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-green-900 mb-3">📋 Active Processing Sessions</h3>
                <div className="space-y-3">
                  {activeSessions.map((session) => (
                    <div key={session.session_id} className="bg-white rounded-lg p-4 border border-green-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-green-800">{session.session_name}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          session.status === 'running' ? 'bg-yellow-100 text-yellow-800' :
                          session.status === 'completed' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {session.status.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-600">Total Jobs:</span>
                          <span className="ml-1 text-gray-800">{session.total_jobs}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Completed:</span>
                          <span className="ml-1 text-green-600">{session.completed_jobs}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Failed:</span>
                          <span className="ml-1 text-red-600">{session.failed_jobs}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Progress:</span>
                          <span className="ml-1 text-blue-600">{session.progress_percentage}%</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">AI Agent:</span>
                          <span className="ml-1 text-gray-800">{getAgentDisplayName(session.ai_agent || 'Unknown')}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Model:</span>
                          <span className="ml-1 text-gray-800">{session.current_model || 'Default'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Speed:</span>
                          <span className="ml-1 text-gray-800">{session.processing_speed}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Started:</span>
                          <span className="ml-1 text-gray-800">{formatTime(session.start_time)}</span>
                        </div>
                      </div>

                      {/* Cache Statistics */}
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <h5 className="font-medium text-green-700 mb-2">💰 Cache Performance</h5>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-600">Cache Hits:</span>
                            <span className="ml-1 text-green-600">{session.cache_hits}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Cache Misses:</span>
                            <span className="ml-1 text-orange-600">{session.cache_misses}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Hit Rate:</span>
                            <span className="ml-1 text-blue-600">{session.cache_hit_rate}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">AI Calls Made:</span>
                            <span className="ml-1 text-gray-800">{session.ai_calls_made}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Est. Time Left:</span>
                            <span className="ml-1 text-gray-800">{session.estimated_time_remaining}</span>
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar for Session */}
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${session.progress_percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Active Processing */}
            {activeSessions.length === 0 && !currentProgress && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <div className="text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-lg font-medium">No Active Processing</p>
                  <p className="text-sm">Start a new job processing session to see real-time progress here.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
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
          
          <div className="mt-3 flex justify-end">
            <Button
              variant="outline"
              onClick={() => setError(null)}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Clear Error
            </Button>
          </div>
        </div>
      )}

      {/* Completion Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <svg className="w-6 h-6 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Processing Complete!
            </CardTitle>
            <CardDescription>
              Job processing completed successfully with detailed statistics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-green-900 mb-3">📊 Processing Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Total Jobs:</span>
                  <span className="ml-1 text-gray-800">{result.jobs_total}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Successfully Processed:</span>
                  <span className="ml-1 text-green-600">{result.jobs_completed}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">AI Agent:</span>
                  <span className="ml-1 text-gray-800">{getAgentDisplayName(result.ai_agent)}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Session ID:</span>
                  <span className="ml-1 text-gray-800">{result.session_id}</span>
                </div>
              </div>
            </div>

            {/* Detailed Statistics */}
            {result.statistics && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-blue-900 mb-3">💰 AI Performance & Cost Analysis</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Cache Hits:</span>
                    <span className="ml-1 text-green-600">{result.statistics.cache_hits}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Cache Misses:</span>
                    <span className="ml-1 text-orange-600">{result.statistics.cache_misses}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Cache Hit Rate:</span>
                    <span className="ml-1 text-blue-600">{result.statistics.cache_hit_rate}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">AI Calls Made:</span>
                    <span className="ml-1 text-gray-800">{result.statistics.ai_calls_made}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">AI Calls Saved:</span>
                    <span className="ml-1 text-green-600">{result.statistics.ai_calls_saved}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Processing Time:</span>
                    <span className="ml-1 text-gray-800">{formatDuration(result.statistics.processing_time)}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Tokens Uploaded:</span>
                    <span className="ml-1 text-gray-800">{result.statistics.tokens_uploaded.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Tokens Generated:</span>
                    <span className="ml-1 text-gray-800">{result.statistics.tokens_generated.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Tokens from Cache:</span>
                    <span className="ml-1 text-green-600">{result.statistics.tokens_from_cache.toLocaleString()}</span>
                  </div>
                  <div className="col-span-3 text-center">
                    <span className="font-bold text-green-600 text-lg">
                      💰 Total Money Saved: {result.statistics.money_saved}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Output Files */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3">📁 Generated Files</h3>
              <div className="space-y-3">
                {result.output_file && (
                  <div className="flex items-center justify-between p-3 bg-white rounded border">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">AI Processed Jobs</p>
                      <p className="text-sm text-gray-600">{result.output_file.split('/').pop()}</p>
                    </div>
                    <Button
                      onClick={async () => {
                        const downloadResult = await downloadFile(result.output_file, 'ai-processed-jobs.json');
                        if (downloadResult.success) {
                          setMessage(`Downloading ${downloadResult.filename}...`);
                        } else {
                          setError('Failed to download file');
                        }
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download
                    </Button>
                  </div>
                )}
                
                {result.final_optimized_file && result.final_optimized_file !== result.output_file && (
                  <div className="flex items-center justify-between p-3 bg-white rounded border">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Final Optimized Jobs</p>
                      <p className="text-sm text-gray-600">{result.final_optimized_file.split('/').pop()}</p>
                    </div>
                    <Button
                      onClick={async () => {
                        const downloadResult = await downloadFile(result.final_optimized_file, 'final-optimized-jobs.json');
                        if (downloadResult.success) {
                          setMessage(`Downloading ${downloadResult.filename}...`);
                        } else {
                          setError('Failed to download file');
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Successful Job IDs */}
            {result.data && result.data.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-green-900 mb-3">✅ Successfully Processed Jobs</h3>
                <div className="bg-white rounded border p-3 max-h-48 overflow-y-auto">
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-2 text-sm">
                    {result.data.map((job: any, index: number) => (
                      <div key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded text-center font-medium">
                        {job.JobID || `Job ${index + 1}`}
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-green-700 mt-2">
                  {result.data.length} jobs fully processed and ready for resume matching
                  {result.notes_only_data && result.notes_only_data.length > 0 && (
                    <span className="text-yellow-600 ml-2">
                      ({result.notes_only_data.length} jobs with notes only)
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Notes-Only Jobs */}
            {result.notes_only_data && result.notes_only_data.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-blue-900 mb-3">📝 Notes-Only Jobs</h3>
                <div className="bg-white rounded border p-3">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-sm">
                    {result.notes_only_data.map((job, index) => (
                      <div key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-center font-medium">
                        {job.jobid || job.JobID || `Job ${index + 1}`}
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-blue-700 mt-2">
                  These jobs have notes data but no job description files. They were not fully processed by AI.
                </p>
              </div>
            )}

            {/* Missing/Skipped Jobs */}
            {(result.missing_jobs && result.missing_jobs.length > 0) || (result.skipped_jobs && result.skipped_jobs.length > 0) ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-yellow-900 mb-3">⚠️ Missing/Skipped Jobs</h3>
                
                {result.missing_jobs && result.missing_jobs.length > 0 && (
                  <div className="mb-3">
                    <h4 className="font-medium text-yellow-800 mb-2">Missing Job Files:</h4>
                    <div className="bg-white rounded border p-3">
                      <div className="grid grid-cols-4 md:grid-cols-6 gap-2 text-sm">
                        {result.missing_jobs.map((jobId, index) => (
                          <div key={index} className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-center font-medium">
                            {jobId}
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-yellow-700 mt-2">
                      These job IDs were not processed because no corresponding job description files were found in the jobs folder.
                    </p>
                  </div>
                )}
                
                {result.skipped_jobs && result.skipped_jobs.length > 0 && (
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-2">Skipped Jobs:</h4>
                    <div className="bg-white rounded border p-3">
                      <div className="grid grid-cols-4 md:grid-cols-6 gap-2 text-sm">
                        {result.skipped_jobs.map((jobId, index) => (
                          <div key={index} className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-center font-medium">
                            {jobId}
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-yellow-700 mt-2">
                      These job IDs were skipped during processing (possibly due to errors or filtering).
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            {/* Start New Processing Button */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="text-center">
                <Button
                  onClick={() => {
                    setResult(null);
                    setShowProcessingScreen(false);
                    setActiveSessions([]);
                    setCurrentProgress(null);
                    setHasActiveProcessing(false);
                    setAutoRefresh(false);
                    setMessage('');
                    setError(null);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Start New Processing
                </Button>
                <p className="text-sm text-gray-600 mt-2">
                  Click to start processing a new batch of jobs
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <HelpSection
        title="AI Job Processing with Real-time Monitoring"
        description="Process job descriptions with AI and monitor progress in real-time with detailed statistics, cache performance, and cost analysis."
        features={[
          "Real-time processing monitoring with live progress updates",
          "Detailed AI agent and model usage statistics",
          "Cache performance tracking and cost savings analysis",
          "Session management with multiple concurrent processing support",
          "Comprehensive job processing statistics and completion reports",
          "Automatic file generation with optimized JSON output"
        ]}
        endResults={[
          "Optimized JSON files with comprehensive job data",
          "Detailed processing statistics and performance metrics",
          "Cost analysis showing money saved through caching",
          "List of successfully processed job IDs",
          "Ready-to-use data for resume matching"
        ]}
        workflow={[
          "Configure job processing parameters (job IDs, paths, AI agent)",
          "Start processing to begin real-time monitoring",
          "Watch live progress with detailed statistics and cache performance",
          "Monitor multiple sessions and track completion status",
          "Download generated files and review processing statistics",
          "Use processed data for resume matching and analysis"
        ]}
      />
    </div>
  );
}