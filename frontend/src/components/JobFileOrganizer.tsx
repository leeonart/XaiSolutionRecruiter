import React, { useState } from 'react';
import { apiClient } from '@/lib/api';
import FolderSelector from '@/components/FolderSelector';

interface JobFileOrganizerProps {
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

export default function JobFileOrganizer({ onSuccess, onError }: JobFileOrganizerProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    job_ids: '',
    source_folder: '',
    destination_folder: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const jobIds = formData.job_ids.split(',').map(id => id.trim()).filter(id => id);
      
      if (jobIds.length === 0) {
        throw new Error('Please enter at least one job ID');
      }
      
      if (!formData.source_folder.trim()) {
        throw new Error('Please enter a source folder path');
      }

      const result = await apiClient.copyLocalFiles({
        job_ids: jobIds,
        source_folder: formData.source_folder,
        destination_folder: formData.destination_folder
      });
      
      setResult(result);
      onSuccess?.(result);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'An error occurred';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const openDirectory = (path: string) => {
    const fileUrl = `file:///${path.replace(/\\/g, '/')}`;
    window.open(fileUrl, '_blank');
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Job Description Download (ZIP)</h3>
        <div className="ml-2 group relative">
          <svg 
            className="w-4 h-4 text-gray-400 cursor-help" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-900 text-white text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
            <div className="text-center">
              <strong>Job Description Download (ZIP)</strong>
              <div className="mt-2 text-left space-y-1">
                <p>• Searches a source folder for files containing specific job IDs</p>
                <p>• Copies matching files to a destination folder</p>
                <p>• Creates log files showing copied and missing files</p>
                <p>• Default destination: Downloads/JobDescriptionDownloads</p>
                <p>• Perfect for organizing job description files by ID</p>
              </div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Job IDs (comma-separated)
          </label>
          <input
            type="text"
            value={formData.job_ids}
            onChange={(e) => setFormData({ ...formData, job_ids: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            placeholder="12345, 67890, 11111"
            required
          />
        </div>

        <FolderSelector
          value={formData.source_folder}
          onChange={(value) => setFormData({ ...formData, source_folder: value })}
          label="Source Folder"
          placeholder="C:\path\to\source\folder"
          helpText="Enter the full path to the folder containing job files"
        />

        <FolderSelector
          value={formData.destination_folder}
          onChange={(value) => setFormData({ ...formData, destination_folder: value })}
          label="Destination Folder"
          placeholder="Leave empty for default: Downloads/JobDescriptionDownloads"
          helpText="Leave empty to use default: Downloads/JobDescriptionDownloads (will be created automatically)"
          allowDefault={true}
          onSetDefault={() => setFormData({ ...formData, destination_folder: '' })}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Organizing Files...' : 'Organize Job Files'}
        </button>
      </form>

      {/* Results */}
      {result && (
        <div className="mt-4">
          {result.open_directory && result.destination_path && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-green-800">Files organized successfully!</h4>
                  <p className="text-sm text-green-600 mt-1">
                    Destination: {result.destination_path}
                  </p>
                  {result.copied_files && result.copied_files.length > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      {result.copied_files.length} files copied
                    </p>
                  )}
                  {result.missing_files && result.missing_files.length > 0 && (
                    <p className="text-xs text-yellow-600 mt-1">
                      {result.missing_files.length} job IDs had no matching files
                    </p>
                  )}
                </div>
                <button
                  onClick={() => openDirectory(result.destination_path)}
                  className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                >
                  📁 Open
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}





