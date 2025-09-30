import { useState } from 'react';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import HelpSection from '@/components/HelpSection';

export default function JobDescriptionDownloads() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');

  // Form data for Google Drive download
  const [driveData, setDriveData] = useState({
    folder_link: 'https://drive.google.com/drive/u/1/folders/1KXb1YDWYEy_3WgRT-MVnlI22jq8t3EMv',
    job_ids: '', // Optional - will use most recent jobidlist.txt if empty
    destination_path: '/app/data/jobs' // Updated to use organized structure
  });

  const handleDownloadFiles = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setMessage('');

    try {
      setMessage('Starting Google Drive file download... This may take several minutes.');
      
      const result = await apiClient.downloadDriveFiles({
        folder_link: driveData.folder_link,
        job_ids: driveData.job_ids ? driveData.job_ids.split(',').map(id => id.trim()).filter(id => id) : [],
        destination_path: driveData.destination_path
      });

      setResult(result);
      setMessage(`Successfully downloaded files for ${result.total_job_ids || 0} job IDs`);
      
      // Add download summary if available
      if (result.results) {
        const downloadedCount = result.results.filter((r: any) => r.Status?.includes('Downloaded')).length;
        const skippedCount = result.results.filter((r: any) => r.Status?.includes('Skipped')).length;
        setMessage(prev => prev + ` - Downloaded: ${downloadedCount}, Skipped: ${skippedCount}`);
      }
      
    } catch (err: any) {
      console.error('Download failed:', err);
      setError(err.message || 'Download failed');
      setMessage('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Job Description Downloads (MTB)</h1>
        <p className="mt-2 text-gray-600">
          Download job description files from Google Drive to your local system
        </p>
      </div>

      {/* Download Form */}
      <Card>
        <CardHeader>
          <CardTitle>Google Drive File Download</CardTitle>
          <CardDescription>
            Download job description and HR notes files from Google Drive folders. 
            Files will be organized in the /app/data/jobs directory.
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
            <Label htmlFor="job_ids">Job IDs (Optional)</Label>
            <Textarea
              id="job_ids"
              value={driveData.job_ids}
              onChange={(e) => setDriveData(prev => ({ ...prev, job_ids: e.target.value }))}
              placeholder="8475, 8476, 8477 (comma-separated) or leave empty to use jobidlist.txt"
              className="mt-1"
              rows={3}
            />
            <p className="text-sm text-gray-500 mt-1">
              Enter specific job IDs to download, or leave empty to use the most recent jobidlist.txt file
            </p>
          </div>

          <div>
            <Label htmlFor="destination_path">Destination Path</Label>
            <Input
              id="destination_path"
              value={driveData.destination_path}
              onChange={(e) => setDriveData(prev => ({ ...prev, destination_path: e.target.value }))}
              className="mt-1"
            />
            <p className="text-sm text-gray-500 mt-1">
              Local directory where files will be downloaded (default: /app/data/jobs)
            </p>
          </div>

          <Button 
            onClick={handleDownloadFiles} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Downloading Files...' : 'Download Files from Google Drive'}
          </Button>
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

      {/* Error Display */}
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

      {/* Result Display */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-green-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-green-800 font-medium text-lg mb-2">✅ Download Complete</h3>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Total Job IDs:</span> {result.total_job_ids || 0}
                </div>
                <div>
                  <span className="font-medium">Downloaded Files:</span> {result.downloaded_files || 0}
                </div>
                <div>
                  <span className="font-medium">Skipped Files:</span> {result.skipped_files || 0}
                </div>
                <div>
                  <span className="font-medium">Jobs Directory:</span> {result.jobs_directory || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Report Path:</span> {result.report_path || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Source:</span> {result.job_ids_source || 'N/A'}
                </div>
              </div>

              {/* Download Summary */}
              {result.results && result.results.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-green-800 mb-2">Download Summary:</h4>
                  <div className="bg-green-100 p-3 rounded border max-h-60 overflow-y-auto">
                    <div className="space-y-1 text-xs">
                      {result.results.map((job: any, index: number) => (
                        <div key={index} className="flex justify-between items-center py-1 border-b border-green-200 last:border-b-0">
                          <span className="font-medium">Job {job.JobID}:</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            job.Status?.includes('Downloaded') ? 'bg-green-200 text-green-800' :
                            job.Status?.includes('Skipped') ? 'bg-yellow-200 text-yellow-800' :
                            'bg-red-200 text-red-800'
                          }`}>
                            {job.Status || 'Unknown'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <div className="text-blue-800 text-sm">
                  <strong>💡 Next Steps:</strong>
                  <ul className="mt-1 ml-4 list-disc">
                    <li>Files have been downloaded to the organized directory structure</li>
                    <li>Use "AI Job Processing (JSON)" to process these files with AI</li>
                    <li>Check the download report for detailed file status</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <HelpSection
        title="Job Description Downloads (MTB) (Job Description Downloads)"
        description="Download job description and HR notes files from Google Drive to your local system. This module retrieves files based on job IDs from the Master Tracking Board processing."
        features={[
          "Connect to Google Drive folders containing job description files",
          "Download files for specific job IDs or use jobidlist.txt from MTB processing",
          "Organize files in structured directory format (/app/data/jobs/)",
          "Generate detailed download reports with success/failure status for each job",
          "Handle missing files gracefully with comprehensive error reporting"
        ]}
        endResults={[
          "Job description files (.pdf, .docx, .txt) organized in /app/data/jobs/",
          "HR notes files for jobs where available",
          "download_report.csv showing download status for each job ID",
          "Files ready for AI processing in 'AI Job Processing (JSON)' module"
        ]}
        workflow={[
          "Ensure Google Drive authentication is connected (check Dashboard)",
          "Enter the Google Drive folder link containing job files",
          "Specify job IDs to download (or leave empty to use jobidlist.txt from MTB processing)",
          "Click 'Download Files' to start the download process",
          "Review the download report and proceed to 'AI Job Processing (JSON)'"
        ]}
      />
    </div>
  );
}

