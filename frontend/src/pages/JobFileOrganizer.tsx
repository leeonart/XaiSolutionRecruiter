import { useState } from 'react';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import HelpSection from '@/components/HelpSection';

interface JobFile {
  jobId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  lastModified: string;
  source: 'local' | 'downloaded';
  positionName?: string;
}

interface DriveConfig {
  folder_link: string;
  job_ids: string;
}

export default function JobFileOrganizer() {
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [jobFiles, setJobFiles] = useState<JobFile[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());

  // Form data for Google Drive download
  const [driveData, setDriveData] = useState<DriveConfig>({
    folder_link: 'https://drive.google.com/drive/u/1/folders/1KXb1YDWYEy_3WgRT-MVnlI22jq8t3EMv',
    job_ids: ''
  });

  // Scan local jobs folder
  const handleScanLocalJobs = async () => {
    setScanning(true);
    setError(null);
    setMessage('');

    try {
      setMessage('Scanning local jobs folder...');
      
      const result = await apiClient.scanLocalJobs();
      setJobFiles(result.files || []);
      setMessage(`Found ${result.files?.length || 0} job files in local folder`);
      
    } catch (err: any) {
      console.error('Scan failed:', err);
      setError(err.message || 'Failed to scan local jobs folder');
      setMessage('');
    } finally {
      setScanning(false);
    }
  };

  // Process job files: check local, download missing, copy to destination
  const handleProcessJobFiles = async () => {
    if (!driveData.job_ids.trim()) {
      setError('Please enter job IDs to process');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setMessage('');

    try {
      setMessage('Processing job files: checking local, downloading missing, and preparing for download...');
      
      const jobIds = driveData.job_ids.split(',').map((id: string) => id.trim()).filter((id: string) => id);
      
      const result = await apiClient.processJobFiles({
        folder_link: driveData.folder_link,
        job_ids: jobIds
      });

      console.log('API Response:', result);
      setResult(result);
      setMessage(`Successfully processed ${result.total_job_ids || 0} job IDs`);
      
      // Refresh the local files list
      await handleScanLocalJobs();
      
    } catch (err: any) {
      console.error('Processing failed:', err);
      setError(err.message || 'Processing failed');
      setMessage('');
    } finally {
      setLoading(false);
    }
  };

  // Manual cleanup function
  const handleManualCleanup = async () => {
    setLoading(true);
    setError(null);
    setMessage('');

    try {
      setMessage('Cleaning up job files directories and zip files...');
      
      const result = await apiClient.cleanupJobFiles();
      
      setMessage(result.message);
      
      // Refresh the local files list
      await handleScanLocalJobs();
      
    } catch (err: any) {
      console.error('Cleanup failed:', err);
      setError(err.message || 'Cleanup failed');
      setMessage('');
    } finally {
      setLoading(false);
    }
  };

  // Handle job selection
  const handleJobSelection = (jobId: string) => {
    const newSelectedJobs = new Set(selectedJobs);
    if (newSelectedJobs.has(jobId)) {
      newSelectedJobs.delete(jobId);
    } else {
      newSelectedJobs.add(jobId);
    }
    setSelectedJobs(newSelectedJobs);
  };

  // Add selected jobs to the job IDs text box
  const handleAddSelectedJobs = () => {
    if (selectedJobs.size === 0) {
      setError('Please select at least one job');
      return;
    }

    const selectedJobIds = Array.from(selectedJobs);
    const currentJobIds = driveData.job_ids ? driveData.job_ids.split(',').map(id => id.trim()).filter(id => id) : [];
    
    // Merge with existing job IDs, avoiding duplicates
    const allJobIds = [...new Set([...currentJobIds, ...selectedJobIds])];
    
    setDriveData(prev => ({
      ...prev,
      job_ids: allJobIds.join(', ')
    }));
    
    // Clear selection
    setSelectedJobs(new Set());
    setMessage(`Added ${selectedJobIds.length} job ID(s) to processing list`);
  };

  // Download files as zip
  const handleDownloadFiles = async () => {
    if (!result?.export_dir) {
      setError('No files available for download');
      return;
    }

    setDownloading(true);
    setError(null);

    try {
      const blob = await apiClient.downloadJobFiles(result.export_dir);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `job_files_${result.export_dir}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setMessage('Files downloaded successfully!');
      
    } catch (err: any) {
      console.error('Download failed:', err);
      setError(err.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Job Description Download (ZIP)</h1>
        <p className="mt-2 text-gray-600">
          Manage job description files - scan local folder, download missing files from Google Drive for specific job IDs, and organize files
        </p>
      </div>

      {/* Local Jobs Scanner */}
      <Card>
        <CardHeader>
          <CardTitle>Local Jobs Folder Scanner</CardTitle>
          <CardDescription>
            Scan the /app/data/jobs folder to see what job files are currently available locally
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleScanLocalJobs} 
            disabled={scanning}
            className="w-full"
          >
            {scanning ? 'Scanning...' : 'Scan Local Jobs Folder'}
          </Button>
          
          {/* Display scanned files */}
          {jobFiles.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-lg mb-2">Available Job Files ({jobFiles.length} files)</h4>
              
              {/* Job ID Summary */}
              {(() => {
                const uniqueJobIds = [...new Set(jobFiles.map(file => file.jobId))].sort();
                return (
                  <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800">
                      <strong>📋 Available Job IDs:</strong> {uniqueJobIds.join(', ')}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      ({uniqueJobIds.length} unique job IDs found)
                    </p>
                  </div>
                );
              })()}
              
              <div className="max-h-64 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                <div className="space-y-2">
                  {jobFiles.map((file, index) => (
                    <div key={index} className={`flex items-center justify-between text-sm bg-white p-2 rounded border cursor-pointer hover:bg-gray-50 ${
                      selectedJobs.has(file.jobId) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                    }`} onClick={() => handleJobSelection(file.jobId)}>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedJobs.has(file.jobId)}
                          onChange={() => handleJobSelection(file.jobId)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="flex flex-col">
                          <span className="font-medium text-blue-600">{file.jobId}</span>
                          <span className="text-gray-700 text-xs">{file.positionName || 'Unknown Position'}</span>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${
                          file.source === 'local' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {file.source === 'local' ? 'Local' : 'Downloaded'}
                        </span>
                      </div>
                      <div className="text-gray-500 text-xs">
                        {(file.fileSize / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Selection Actions */}
              {jobFiles.length > 0 && (
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {selectedJobs.size > 0 ? `${selectedJobs.size} job(s) selected` : 'Select jobs to add to processing list'}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setSelectedJobs(new Set())}
                      variant="outline"
                      size="sm"
                      disabled={selectedJobs.size === 0}
                    >
                      Clear Selection
                    </Button>
                    <Button
                      onClick={handleAddSelectedJobs}
                      size="sm"
                      disabled={selectedJobs.size === 0}
                    >
                      Add Selected ({selectedJobs.size})
                    </Button>
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">
                💡 These files are available for processing. Use the Job File Processing section below to organize specific job IDs.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job File Processing */}
      <Card>
        <CardHeader>
          <CardTitle>Job File Processing</CardTitle>
          <CardDescription>
            Process job files: check local directory, download missing files from Google Drive, and copy to your destination
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="folder_link">Google Drive Folder Link</Label>
            <Input
              id="folder_link"
              value={driveData.folder_link}
              onChange={(e) => setDriveData(prev => ({ ...prev, folder_link: e.target.value }))}
              placeholder="https://drive.google.com/drive/u/1/folders/..."
              className="mt-1"
            />
            <p className="text-sm text-gray-500 mt-1">
              Paste the Google Drive folder link containing job description files
            </p>
          </div>

          <div>
            <Label htmlFor="job_ids">Job IDs (Required)</Label>
            <Textarea
              id="job_ids"
              value={driveData.job_ids}
              onChange={(e) => setDriveData(prev => ({ ...prev, job_ids: e.target.value }))}
              placeholder="7430, 7431, 7432 (comma-separated)"
              className="mt-1"
              rows={3}
            />
            <p className="text-sm text-gray-500 mt-1">
              Enter comma-separated job IDs. The system will check local files first, download missing ones from Google Drive, then prepare files for download.
            </p>
            
            {/* Download Instructions - Show after processing */}
            {result && result.export_dir && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h4 className="text-sm font-medium text-green-800">Files Ready for Download!</h4>
                </div>
                <p className="text-sm text-green-700 mb-3">
                  Your job files have been processed and are ready to download as a ZIP file.
                </p>
                <div className="space-y-2">
                  <Button 
                    onClick={handleDownloadFiles} 
                    disabled={downloading}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {downloading ? 'Creating ZIP File...' : '📥 Download Files as ZIP'}
                  </Button>
                  <p className="text-xs text-green-600 text-center">
                    💡 Files will be automatically cleaned up after download completes
                  </p>
                </div>
              </div>
            )}
          </div>

          <Button 
            onClick={handleProcessJobFiles} 
            disabled={loading || !driveData.job_ids.trim()}
            className="w-full"
          >
            {loading ? 'Processing Job Files...' : 'Process Job Files (Check Local → Download Missing → Prepare Download)'}
          </Button>
        </CardContent>
      </Card>

      {/* Manual Cleanup */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Cleanup</CardTitle>
          <CardDescription>
            Manually clean up all job files export directories and zip files from previous operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleManualCleanup} 
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            {loading ? 'Cleaning Up...' : '🧹 Clean Up Job Files'}
          </Button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            This will remove all job_files_export_* directories and job_files_*.zip files
          </p>
        </CardContent>
      </Card>

      {/* Status Messages */}
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

      {/* Error Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !result.export_dir && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="text-blue-800 text-sm">
            <strong>💡 Processing Complete:</strong>
            <ul className="mt-1 ml-4 list-disc">
              <li>Job files have been processed and organized</li>
              <li>Missing files were downloaded from Google Drive to /app/data/jobs</li>
              <li>Files are available in the container's data directory</li>
              <li>Use "AI Job Processing (JSON)" to process these files with AI</li>
            </ul>
            {result.destination_path && (
              <div className="mt-2">
                <strong>📁 Container Directory:</strong>
                <div className="mt-1 p-2 bg-white border rounded font-mono text-xs break-all">
                  {result.destination_path}
                </div>
              </div>
            )}
            {result.instructions && (
              <div className="mt-2">
                <strong>📋 Instructions:</strong>
                <div className="mt-1 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                  {result.instructions}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Help Section */}
      <HelpSection
        title="Job Description Download (ZIP) (Job File Organizer)"
        description="Select and manage specific job files from your local storage. This module helps you choose which jobs to process and download missing files from Google Drive in ZIP format."
        features={[
          "Scan and view all available job files in local storage with file details",
          "Select multiple jobs using checkboxes for batch processing",
          "Download missing job files from Google Drive automatically",
          "Add selected job IDs directly to processing lists",
          "Export selected job files as downloadable ZIP archives"
        ]}
        endResults={[
          "Selected job files organized and ready for AI processing",
          "Downloadable ZIP files containing job description and HR notes files",
          "Updated job ID lists ready for 'AI Job Processing (JSON)' module",
          "Clean file organization with automatic cleanup of temporary files"
        ]}
        workflow={[
          "Click 'Scan Local Jobs Folder' to see available files with details",
          "Select specific jobs using checkboxes or click entire rows",
          "Click 'Add Selected' to add job IDs to the processing text box",
          "Use 'Process Job Files' to download missing files from Google Drive",
          "Download files as ZIP archives or proceed to AI processing"
        ]}
      />
    </div>
  );
}