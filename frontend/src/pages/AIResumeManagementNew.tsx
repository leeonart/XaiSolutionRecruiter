import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, BarChart3, TrendingUp, Users, Target, FileText, User, Building, DollarSign, Download, Edit, Eye, Play, Search, Briefcase, MapPin, AlertCircle, CheckCircle, Maximize2, Minimize2, Move, Square, Minus, X } from 'lucide-react';
import AdvancedSearchFilters from '@/components/AdvancedSearchFilters';
import SearchResults from '@/components/SearchResults';
import SavedSearches from '@/components/SavedSearches';
import { apiClient } from '@/lib/api';

interface AIResume {
  id: number;
  first_name?: string;
  last_name?: string;
  candidate_id: string;
  primary_email?: string;
  secondary_email?: string;
  phone?: string;
  alternative_phone?: string;
  address?: string;
  citizenship?: string;
  work_authorization?: string;
  years_experience?: number;
  seniority_level?: string;
  career_level?: string;
  management_experience?: boolean;
  industry_experience?: string;
  current_company?: string;
  recommended_industries?: string;
  technical_skills?: string;
  hands_on_skills?: string;
  certifications?: string;
  licenses?: string;
  current_salary?: string;
  expected_salary?: string;
  relocation?: string;
  remote_work?: string;
  homeowner_renter?: string;
  preferred_locations?: string;
  restricted_locations?: string;
  previous_positions?: string;
  reason_for_leaving?: string;
  reason_for_looking?: string;
  special_notes?: string;
  screening_comments?: string;
  candidate_concerns?: string;
  original_filename?: string;
  resume_file_path?: string;
  content_hash?: string;
  version_number: number;
  is_latest_version: boolean;
  created_at: string;
  updated_at: string;
  ai_extraction_confidence?: number;
  ai_validation_confidence?: number;
  ai_extraction_model?: string;
  ai_validation_model?: string;
  extraction_notes?: string;
  validation_notes?: string;
  job_fit_score?: number;
}

interface SavedSearch {
  id: string;
  name: string;
  filters: any;
  created_at: string;
  last_used?: string;
  use_count: number;
  is_favorite: boolean;
}

const AIResumeManagementNew: React.FC = () => {
  const [resumes, setResumes] = useState<AIResume[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedResume, setSelectedResume] = useState<AIResume | null>(null);
  const [activeTab, setActiveTab] = useState('database');
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [searchAnalytics, setSearchAnalytics] = useState<any>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Draggable modal states
  const [detailsModalPosition, setDetailsModalPosition] = useState({ x: 0, y: 0 });
  const [editModalPosition, setEditModalPosition] = useState({ x: 0, y: 0 });
  const [detailsModalSize, setDetailsModalSize] = useState({ width: 0, height: 0 });
  const [editModalSize, setEditModalSize] = useState({ width: 0, height: 0 });
  const [isDetailsMaximized, setIsDetailsMaximized] = useState(false);
  const [isEditMaximized, setIsEditMaximized] = useState(false);
  const [isDetailsMinimized, setIsDetailsMinimized] = useState(false);
  const [isEditMinimized, setIsEditMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [editFormData, setEditFormData] = useState<Partial<AIResume>>({});
  const [experienceData, setExperienceData] = useState<any[]>([]);
  const [educationData, setEducationData] = useState<any[]>([]);
  const [editExperienceData, setEditExperienceData] = useState<any[]>([]);
  const [editEducationData, setEditEducationData] = useState<any[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [processingProgress, setProcessingProgress] = useState({
    currentFile: '',
    currentStage: '',
    progress: 0,
    totalFiles: 0,
    processedFiles: 0,
    startTime: null as Date | null,
    totalTime: '',
    extractionTokens: 0,
    validationTokens: 0,
    extractionModel: '',
    validationModel: '',
    logs: [] as string[]
  });

  useEffect(() => {
    loadSavedSearches();
    loadSearchAnalytics();
    loadResumes();
  }, []);

  // Add mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  const loadSavedSearches = async () => {
    try {
      const response = await apiClient.request<any>('/api/saved-searches');
      setSavedSearches(response.saved_searches || []);
    } catch (err) {
      console.error('Failed to load saved searches:', err);
    }
  };

  const loadSearchAnalytics = async () => {
    try {
      const response = await apiClient.request<any>('/api/search-analytics');
      setSearchAnalytics(response);
    } catch (err) {
      console.error('Failed to load search analytics:', err);
    }
  };

  const loadResumes = async () => {
    try {
      setLoading(true);
      const response = await apiClient.request<any>('/api/search-resumes?limit=100');
      console.log('Load resumes response:', response);
      setResumes(response.resumes || []);
      setTotalCount(response.total_count || 0);
    } catch (err) {
      console.error('Failed to load resumes:', err);
      setError('Failed to load resumes');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (filters: any) => {
    setLoading(true);
    setError(null);

    try {
      // Build query parameters from filters
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            params.append(key, value.join(','));
          } else {
            params.append(key, value.toString());
          }
        }
      });

      const response = await apiClient.request<any>(`/api/search-resumes?${params.toString()}`);
      setResumes(response.resumes || []);
      setTotalCount(response.total_count || 0);
    } catch (err: any) {
      setError(err.message || 'Search failed');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSemanticSearch = async (query: string) => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('query', query);

      const response = await apiClient.request<any>('/api/resumes/semantic-search', { method: 'POST', data: formData });
      setResumes(response.resumes || []);
      setTotalCount(response.total_count || 0);
    } catch (err: any) {
      setError(err.message || 'Semantic search failed');
      console.error('Semantic search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSearch = async (name: string, filters: any) => {
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('filters', JSON.stringify(filters));

      await apiClient.request('/api/saved-searches', { method: 'POST', data: formData });
      
      // Reload saved searches
      await loadSavedSearches();
      
      alert(`Search "${name}" saved successfully!`);
    } catch (err: any) {
      setError(err.message || 'Failed to save search');
      console.error('Save search error:', err);
    }
  };

  const handleLoadSavedSearch = (filters: any) => {
    handleSearch(filters);
  };

  const handleDeleteSearch = async (id: string) => {
    try {
      // TODO: Implement delete endpoint
      setSavedSearches(prev => prev.filter(s => s.id !== id));
      alert('Search deleted successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to delete search');
    }
  };

  const handleUpdateSearch = async (id: string, name: string, filters: any) => {
    try {
      // TODO: Implement update endpoint
      setSavedSearches(prev => 
        prev.map(s => s.id === id ? { ...s, name } : s)
      );
      alert('Search updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update search');
    }
  };

  const handleToggleFavorite = (id: string) => {
    setSavedSearches(prev =>
      prev.map(s => s.id === id ? { ...s, is_favorite: !s.is_favorite } : s)
    );
  };

  const handleViewResume = (resume: AIResume) => {
    setSelectedResume(resume);
    // TODO: Open detailed view modal
  };

  const handleContactResume = (resume: AIResume) => {
    // TODO: Implement contact functionality
    alert(`Contact: ${resume.primary_email || 'No email available'}`);
  };

  const handleAddToShortlist = (resume: AIResume) => {
    // TODO: Implement shortlist functionality
    alert(`Added ${resume.first_name} ${resume.last_name} to shortlist`);
  };

  const handleExportResults = () => {
    // TODO: Implement export functionality
    alert('Exporting results...');
  };

  const handleShareResults = () => {
    // TODO: Implement share functionality
    alert('Sharing results...');
  };

  const handleDownloadResume = async (resume: AIResume) => {
    try {
      if (!resume.resume_file_path) {
        setError('Resume file not found');
        return;
      }
      
      // Create a download link
      const link = document.createElement('a');
      link.href = `/api/ai-resumes/${resume.id}/download`;
      link.download = resume.original_filename || `resume_${resume.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      setError('Failed to download resume');
    }
  };

  const handleEditResume = async (resume: AIResume) => {
    setSelectedResume(resume);
    setEditFormData({
      first_name: resume.first_name || '',
      last_name: resume.last_name || '',
      primary_email: resume.primary_email || '',
      phone: resume.phone || '',
      address: resume.address || '',
      citizenship: resume.citizenship || '',
      work_authorization: resume.work_authorization || '',
      current_salary: resume.current_salary || '',
      expected_salary: resume.expected_salary || '',
      relocation: resume.relocation || '',
      remote_work: resume.remote_work || '',
      previous_positions: resume.previous_positions || '',
      reason_for_leaving: resume.reason_for_leaving || '',
      reason_for_looking: resume.reason_for_looking || '',
      special_notes: resume.special_notes || '',
      screening_comments: resume.screening_comments || '',
      candidate_concerns: resume.candidate_concerns || '',
      technical_skills: resume.technical_skills || '',
      hands_on_skills: resume.hands_on_skills || '',
      recommended_industries: resume.recommended_industries || '',
      certifications: resume.certifications || '',
      licenses: resume.licenses || '',
      preferred_locations: resume.preferred_locations || '',
      restricted_locations: resume.restricted_locations || '',
      homeowner_renter: resume.homeowner_renter || '',
      secondary_email: resume.secondary_email || '',
      alternative_phone: resume.alternative_phone || ''
    });
    
    // Load experience and education data for editing
    try {
      const [expResponse, eduResponse] = await Promise.all([
        apiClient.request<any>(`/api/ai-resumes/${resume.id}/experience`),
        apiClient.request<any>(`/api/ai-resumes/${resume.id}/education`)
      ]);
      
      setEditExperienceData(expResponse || []);
      setEditEducationData(eduResponse || []);
    } catch (err) {
      console.error('Failed to load experience/education for editing:', err);
      setEditExperienceData([]);
      setEditEducationData([]);
    }
    
    setShowEditModal(true);
  };

  const handleViewDetails = async (resumeId: number) => {
    try {
      const response = await apiClient.request<any>(`/api/ai-resumes/${resumeId}`);
      if (response) {
        setSelectedResume(response);
        
        // Load experience and education data
        try {
          const [expResponse, eduResponse] = await Promise.all([
            apiClient.request<any>(`/api/ai-resumes/${resumeId}/experience`),
            apiClient.request<any>(`/api/ai-resumes/${resumeId}/education`)
          ]);
          
          setExperienceData(expResponse || []);
          setEducationData(eduResponse || []);
        } catch (err) {
          console.error('Failed to load experience/education:', err);
          setExperienceData([]);
          setEducationData([]);
        }
        
        // Open details modal
        setShowDetailsModal(true);
      }
    } catch (err: any) {
      setError('Failed to load resume details');
    }
  };

  const handleSaveEdit = () => {
    // Show confirmation dialog first
    setShowSaveConfirm(true);
  };

  const confirmSaveEdit = async () => {
    if (!selectedResume) return;
    
    try {
      setLoading(true);
      setShowSaveConfirm(false);
      
      // Make API call to update resume
      const response = await apiClient.request(`/api/ai-resumes/${selectedResume.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        data: editFormData,
      });
      
      // Update experience data if it exists
      if (editExperienceData.length > 0) {
        for (const exp of editExperienceData) {
          await apiClient.request(`/api/ai-resumes/${selectedResume.id}/experience/${exp.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            data: exp,
          });
        }
      }
      
      // Close the edit modal
      setShowEditModal(false);
      setEditFormData({});
      setEditExperienceData([]);
      setEditEducationData([]);
      
      // Reload resumes to show updated data
      await loadResumes();
      setError(null);
    } catch (error) {
      console.error('Error saving resume:', error);
      setErrorMessage('Failed to save resume changes. Please try again.');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const cancelSaveEdit = () => {
    setShowSaveConfirm(false);
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditFormData({});
    setEditExperienceData([]);
    setEditEducationData([]);
  };

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedFiles(Array.from(files));
      // Ensure we stay on the upload tab
      setActiveTab('upload');
    }
  };

  const handleClearFiles = () => {
    setSelectedFiles([]);
    // Reset the file input
    const fileInput = document.getElementById('resume-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Draggable modal handlers
  const handleMouseDown = (e: React.MouseEvent, modalType: 'details' | 'edit') => {
    if (e.target instanceof HTMLElement && e.target.closest('button')) return;
    
    setIsDragging(true);
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    setDetailsModalPosition({ x: newX, y: newY });
    setEditModalPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMaximize = (modalType: 'details' | 'edit') => {
    if (modalType === 'details') {
      setIsDetailsMaximized(!isDetailsMaximized);
    } else {
      setIsEditMaximized(!isEditMaximized);
    }
  };

  const handleMinimize = (modalType: 'details' | 'edit') => {
    if (modalType === 'details') {
      setIsDetailsMinimized(!isDetailsMinimized);
    } else {
      setIsEditMinimized(!isEditMinimized);
    }
  };

  const startProcessing = () => {
    console.log('startProcessing called with', selectedFiles.length, 'files');
    if (selectedFiles.length === 0) {
      console.log('No files selected, returning');
      return;
    }
    
    console.log('Opening inline progress display');
    setShowProgressModal(true);
    setProcessingProgress({
      currentFile: '',
      currentStage: 'Initializing...',
      progress: 0,
      totalFiles: selectedFiles.length,
      processedFiles: 0,
      startTime: new Date(),
      totalTime: '',
      extractionTokens: 0,
      validationTokens: 0,
      extractionModel: 'grok-4-fast-reasoning',
      validationModel: 'gpt-5-mini',
      logs: ['Starting AI resume processing...']
    });
    
    console.log('Starting processFiles');
    processFiles();
  };

  const processFiles = async () => {
    try {
      console.log('Starting processFiles with', selectedFiles.length, 'files');
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        console.log(`Processing file ${i + 1}: ${file.name}`);
        
        setProcessingProgress(prev => ({
          ...prev,
          currentFile: file.name,
          currentStage: 'Uploading file...',
          progress: (i / selectedFiles.length) * 100,
          logs: [...prev.logs, `Processing file ${i + 1}/${selectedFiles.length}: ${file.name}`]
        }));

        const formData = new FormData();
        formData.append('resume_files', file);
        formData.append('use_ai_extraction', 'true');

        console.log(`Uploading ${file.name} to /api/resumes/upload`);
        const response = await fetch('/api/resumes/upload', {
          method: 'POST',
          body: formData,
        });

        console.log(`Response status: ${response.status}`);
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Upload failed for ${file.name}:`, errorText);
          throw new Error(`Upload failed for ${file.name}: ${response.status}`);
        }

        const result = await response.json();
        console.log(`Upload result for ${file.name}:`, result);
        
        setProcessingProgress(prev => ({
          ...prev,
          currentStage: 'AI extraction completed',
          processedFiles: i + 1,
          progress: ((i + 1) / selectedFiles.length) * 100,
          logs: [...prev.logs, `✅ ${file.name}: ${result.uploaded_resumes?.[0]?.status || 'completed'}`]
        }));
        
        // Log detailed process information
        if (result.uploaded_resumes?.[0]?.processing_details) {
          const details = result.uploaded_resumes[0].processing_details;
          setProcessingProgress(prev => ({
            ...prev,
            extractionTokens: prev.extractionTokens + (details.extraction_tokens || 0),
            validationTokens: prev.validationTokens + (details.validation_tokens || 0),
            logs: [...prev.logs, 
              `📊 ${file.name} - Extraction: ${details.extraction_model} (${details.extraction_tokens} tokens, ${details.extraction_time?.toFixed(2)}s)`,
              `📊 ${file.name} - Validation: ${details.validation_model} (${details.validation_tokens} tokens, ${details.validation_time?.toFixed(2)}s)`,
              `📊 ${file.name} - Total: ${details.total_tokens} tokens, ${details.total_time?.toFixed(2)}s`
            ]
          }));
        }
        
        // Log changes made during validation
        if (result.uploaded_resumes?.[0]?.changes_made) {
          const changes = result.uploaded_resumes[0].changes_made;
          const changeLogs: string[] = [];
          
          if (changes.work_experience_changes?.length > 0) {
            changeLogs.push(`🔄 Work Experience: ${changes.work_experience_changes.join(', ')}`);
          }
          if (changes.education_changes?.length > 0) {
            changeLogs.push(`🎓 Education: ${changes.education_changes.join(', ')}`);
          }
          if (changes.contact_changes?.length > 0) {
            changeLogs.push(`📞 Contact: ${changes.contact_changes.join(', ')}`);
          }
          
          if (changeLogs.length > 0) {
            setProcessingProgress(prev => ({
              ...prev,
              logs: [...prev.logs, ...changeLogs]
            }));
          } else {
            setProcessingProgress(prev => ({
              ...prev,
              logs: [...prev.logs, `✅ ${file.name} - No changes made during validation`]
            }));
          }
        }

        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Final update
      const endTime = new Date();
      const startTime = processingProgress.startTime || new Date();
      const totalTimeMs = endTime.getTime() - startTime.getTime();
      const totalTimeSeconds = Math.round(totalTimeMs / 1000);
      const totalTimeMinutes = Math.floor(totalTimeSeconds / 60);
      const remainingSeconds = totalTimeSeconds % 60;
      
      const timeDisplay = totalTimeMinutes > 0 
        ? `${totalTimeMinutes}m ${remainingSeconds.toString().padStart(2, '0')}s`
        : `${totalTimeSeconds}s`;

      setProcessingProgress(prev => ({
        ...prev,
        currentStage: 'Processing completed',
        totalTime: timeDisplay,
        logs: [...prev.logs, `🎉 All files processed successfully in ${timeDisplay}`]
      }));

      // Reload resumes
      await loadResumes();
      
        } catch (err: any) {
          console.error('Error in processFiles:', err);
          setProcessingProgress(prev => ({
            ...prev,
            currentStage: 'Error occurred',
            logs: [...prev.logs, `❌ Error: ${err.message}`]
          }));
          
          // Don't close the modal on error - let user see the error
          // setShowProgressModal(false);
        }
  };

  return (
    <div className="container mx-auto py-4 sm:py-6 space-y-4 sm:space-y-6 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">AI Resume Management</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Advanced search and resume management system
          </p>
        </div>
        <Button variant="outline" className="w-full sm:w-auto">
          <Upload className="h-4 w-4 mr-2" />
          Upload Resumes
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Search Analytics Dashboard */}
      {searchAnalytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Resumes</p>
                  <p className="text-2xl font-bold">{searchAnalytics.total_resumes}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Searches Today</p>
                  <p className="text-2xl font-bold">
                    {searchAnalytics.search_performance?.total_searches_today}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Search Time</p>
                  <p className="text-2xl font-bold">
                    {searchAnalytics.search_performance?.avg_search_time}
                  </p>
                </div>
                <Target className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Success Rate</p>
                  <p className="text-2xl font-bold">
                    {searchAnalytics.search_performance?.success_rate}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-1">
          <TabsTrigger value="database" className="text-xs sm:text-sm">Database</TabsTrigger>
          <TabsTrigger value="search" className="text-xs sm:text-sm">Search</TabsTrigger>
          <TabsTrigger value="saved" className="text-xs sm:text-sm">Saved</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs sm:text-sm">Analytics</TabsTrigger>
          <TabsTrigger value="upload" className="text-xs sm:text-sm">Upload</TabsTrigger>
          <TabsTrigger value="matching" className="text-xs sm:text-sm">Matching</TabsTrigger>
          <TabsTrigger value="management" className="text-xs sm:text-sm">Manage</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4 sm:space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl font-semibold">Advanced Search</h2>
          </div>
          
          <AdvancedSearchFilters
            onSearch={handleSearch}
            onSaveSearch={handleSaveSearch}
            savedSearches={savedSearches}
            onLoadSavedSearch={handleLoadSavedSearch}
          />

          <SearchResults
            resumes={resumes}
            loading={loading}
            totalCount={totalCount}
            onViewResume={handleViewResume}
            onContactResume={handleContactResume}
            onAddToShortlist={handleAddToShortlist}
            onExportResults={handleExportResults}
            onShareResults={handleShareResults}
          />
        </TabsContent>

        <TabsContent value="saved">
          <SavedSearches
            savedSearches={savedSearches}
            onLoadSearch={handleLoadSavedSearch}
            onSaveSearch={handleSaveSearch}
            onDeleteSearch={handleDeleteSearch}
            onUpdateSearch={handleUpdateSearch}
            onToggleFavorite={handleToggleFavorite}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {searchAnalytics && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Popular Skills</CardTitle>
                  <CardDescription>Most searched skills in resumes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {searchAnalytics.popular_skills?.map((skill: any, index: number) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{skill.skill}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-48 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${(skill.count / 50) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 w-8">{skill.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Searches</CardTitle>
                  <CardDescription>Latest search queries</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {searchAnalytics.recent_searches?.map((search: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="font-medium">{search.query}</span>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>{search.count} results</span>
                          <span>{search.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Resume Database Tab */}
        <TabsContent value="database" className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl sm:text-2xl font-semibold">Resume Database</h2>
            <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
              <Button onClick={() => setError('AI Connection verification not yet implemented')} variant="outline" size="sm" className="text-xs">
                🤖 Verify AI
              </Button>
              <Button onClick={() => setError('Cleanup duplicates not yet implemented')} variant="outline" size="sm" className="text-xs">
                🧹 Cleanup
              </Button>
              <Button onClick={() => setError('Check missing data not yet implemented')} variant="outline" size="sm" className="text-xs">
                🔍 Check Data
              </Button>
              <Button onClick={() => setError('Auto-fix missing data not yet implemented')} variant="outline" size="sm" className="text-xs">
                🔧 Auto-Fix
              </Button>
            </div>
          </div>

          {/* Resume List */}
          <Card>
            <CardHeader>
              <CardTitle>Resume Database</CardTitle>
              <CardDescription>
                {resumes.length} resume(s) found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading resumes...</p>
                </div>
              ) : resumes.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No resumes found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {resumes.map((resume) => (
                    <Card key={resume.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4 sm:p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                          {/* Candidate Overview */}
                          <div className="space-y-3">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                              <User className="h-5 w-5" />
                              Candidate Overview
                            </h3>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Name:</span>
                                <span>{resume.first_name} {resume.last_name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Email:</span>
                                <span>{resume.primary_email}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Phone:</span>
                                <span>{resume.phone}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Location:</span>
                                <span>{resume.address}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Work Auth:</span>
                                <span>{resume.work_authorization || 'Not specified'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Industry & Skills */}
                          <div className="space-y-3">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                              <Building className="h-5 w-5" />
                              Industry & Skills
                            </h3>
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="font-medium">Industries:</span>
                                <p className="text-gray-600">{resume.recommended_industries || 'Not specified'}</p>
                              </div>
                              <div>
                                <span className="font-medium">Technical Skills:</span>
                                <p className="text-gray-600">{resume.technical_skills || 'Not specified'}</p>
                              </div>
                              <div>
                                <span className="font-medium">Hands-on Skills:</span>
                                <p className="text-gray-600">{resume.hands_on_skills || 'Not specified'}</p>
                              </div>
                            </div>
                          </div>

                          {/* Compensation & Preferences */}
                          <div className="space-y-3">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                              <DollarSign className="h-5 w-5" />
                              Compensation & Preferences
                            </h3>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Current Salary:</span>
                                <span>{resume.current_salary || 'Not specified'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Expected Salary:</span>
                                <span>{resume.expected_salary || 'Not specified'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Relocation:</span>
                                <span>{resume.relocation || 'Not specified'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Remote Work:</span>
                                <span>{resume.remote_work || 'Not specified'}</span>
                              </div>
                              <div>
                                <span className="font-medium">Previous Positions:</span>
                                <p className="text-gray-600">{resume.previous_positions || 'Not specified'}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDownloadResume(resume)}
                              className="w-full sm:w-auto"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditResume(resume)}
                              className="w-full sm:w-auto"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          </div>
                          <Button 
                            onClick={() => handleViewDetails(resume.id)}
                            size="sm"
                            className="w-full sm:w-auto"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upload & Process Tab */}
        <TabsContent value="upload" className="space-y-4 sm:space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl font-semibold">Upload & Process</h2>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Upload Resume Files</CardTitle>
              <CardDescription>Upload resume files for AI extraction and processing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div>
                  <Label htmlFor="resume-upload">Select Resume Files</Label>
                  <Input
                    id="resume-upload"
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileSelection}
                    disabled={loading}
                    className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label>Selected Files ({selectedFiles.length})</Label>
                    <div className="max-h-32 overflow-y-auto border rounded p-3 bg-gray-50">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="text-sm text-gray-600 flex items-center gap-2 mb-1">
                          <FileText className="h-4 w-4" />
                          <span className="font-medium">{file.name}</span>
                          <span className="text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    onClick={startProcessing}
                    disabled={loading || selectedFiles.length === 0}
                    className="flex items-center gap-2 w-full sm:w-auto"
                  >
                    <Play className="h-4 w-4" />
                    Start Processing ({selectedFiles.length} files)
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleClearFiles}
                    disabled={loading || selectedFiles.length === 0}
                    className="w-full sm:w-auto"
                  >
                    Clear Selection
                  </Button>
                </div>

                {/* Inline Processing Progress */}
                {showProgressModal && (
                  <Card className="mt-6 border-l-4 border-l-blue-500">
                    <CardHeader className="bg-blue-50 pb-3">
                      <CardTitle className="text-xl font-semibold text-blue-900 flex items-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        AI Resume Processing Progress
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-6">
                        {/* Progress Overview */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Current File</Label>
                            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                              {processingProgress.currentFile || 'None'}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Current Stage</Label>
                            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                              {processingProgress.currentStage}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Progress</Label>
                            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                              {processingProgress.processedFiles} / {processingProgress.totalFiles} files
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Total Time</Label>
                            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                              {processingProgress.totalTime || 'Calculating...'}
                            </p>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Overall Progress</Label>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                              style={{ width: `${processingProgress.progress}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>0%</span>
                            <span className="font-medium">{Math.round(processingProgress.progress)}% complete</span>
                            <span>100%</span>
                          </div>
                        </div>

                        {/* AI Processing Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
                          <div className="text-center">
                            <Label className="text-xs font-medium text-blue-700">Extraction Model</Label>
                            <p className="text-sm font-semibold text-blue-900">Grok - {processingProgress.extractionModel}</p>
                            <p className="text-xs text-blue-600">{processingProgress.extractionTokens.toLocaleString()} tokens</p>
                          </div>
                          <div className="text-center">
                            <Label className="text-xs font-medium text-blue-700">Validation Model</Label>
                            <p className="text-sm font-semibold text-blue-900">OpenAI - {processingProgress.validationModel}</p>
                            <p className="text-xs text-blue-600">{processingProgress.validationTokens.toLocaleString()} tokens</p>
                          </div>
                        </div>

                        {/* Processing Logs */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Processing Logs</Label>
                          <div className="max-h-64 overflow-y-auto border rounded-lg p-4 bg-gray-50 font-mono text-sm">
                            {processingProgress.logs.length === 0 ? (
                              <p className="text-gray-500 italic">Waiting for processing to begin...</p>
                            ) : (
                              processingProgress.logs.map((log, index) => (
                                <div key={index} className="mb-1 text-gray-700">
                                  {log}
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-2 pt-4 border-t">
                          <Button 
                            variant="outline" 
                            onClick={() => setShowProgressModal(false)}
                            disabled={processingProgress.currentStage !== 'Processing completed' && processingProgress.currentStage !== 'Error occurred'}
                          >
                            Close
                          </Button>
                          {processingProgress.currentStage === 'Processing completed' && (
                            <Button onClick={() => {
                              setShowProgressModal(false);
                              setSelectedFiles([]);
                              // Reset file input
                              const fileInput = document.getElementById('resume-upload') as HTMLInputElement;
                              if (fileInput) {
                                fileInput.value = '';
                              }
                            }}>
                              Close & Clear Files
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="text-sm text-gray-600">
                  <p>• Supported formats: PDF, DOC, DOCX, TXT</p>
                  <p>• AI will extract and validate all resume data</p>
                  <p>• Processing may take a few moments per file</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Matching Tab */}
        <TabsContent value="matching" className="space-y-4 sm:space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl font-semibold">AI Matching</h2>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Resume-to-Job Matching</CardTitle>
              <CardDescription>Match resumes to job listings using AI</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">AI matching functionality will be implemented here.</p>
                <Button disabled>
                  <Search className="h-4 w-4 mr-2" />
                  Start AI Matching
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database Management Tab */}
        <TabsContent value="management" className="space-y-4 sm:space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl font-semibold">Database Management</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Cleanup Operations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={() => {}} variant="outline" className="w-full">
                  🧹 Cleanup Old Resumes
                </Button>
                <p className="text-sm text-gray-600">Keep only the latest versions of resumes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Danger Zone</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={() => {}} variant="outline" className="w-full text-red-600">
                  🗑️ Delete ALL Resumes
                </Button>
                <p className="text-sm text-gray-600">Permanently delete all resume data</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Resume Details Modal */}
      {selectedResume && (
        <Dialog open={showDetailsModal} onOpenChange={() => {
          // Prevent accidental closure - only allow manual close via buttons
          console.log('Details modal close attempt blocked - use Close button');
        }}>
          <div 
            className={`fixed inset-0 z-50 flex items-center justify-center ${isDetailsMinimized ? 'pointer-events-none' : ''}`}
            style={{
              transform: `translate(${detailsModalPosition.x}px, ${detailsModalPosition.y}px)`,
              width: isDetailsMaximized ? '100vw' : 'auto',
              height: isDetailsMaximized ? '100vh' : 'auto',
              maxWidth: isDetailsMaximized ? 'none' : '95vw',
              maxHeight: isDetailsMaximized ? 'none' : '80vh'
            }}
          >
            <div className="fixed inset-0 bg-black/50" />
            <div className="relative z-50 w-full h-full">
              <DialogContent
                className={`${isDetailsMaximized ? 'w-full h-full max-w-none max-h-none' : 'max-w-[95vw] sm:max-w-4xl max-h-[80vh]'} overflow-hidden bg-white border-0 !shadow-none mx-2 sm:mx-4 flex flex-col ${isDetailsMinimized ? 'hidden' : ''}`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Custom Title Bar */}
                <div 
                  className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-green-600 to-green-700 text-white cursor-move select-none"
                  onMouseDown={(e) => handleMouseDown(e, 'details')}
                >
                  <div className="flex items-center gap-2">
                    <Move className="h-4 w-4 text-green-200" />
                    <DialogTitle className="text-lg font-semibold text-white flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Resume Details - {selectedResume.first_name} {selectedResume.last_name}
                    </DialogTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMinimize('details')}
                      className="h-6 w-6 p-0 text-white hover:bg-green-700"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMaximize('details')}
                      className="h-6 w-6 p-0 text-white hover:bg-green-700"
                    >
                      {isDetailsMaximized ? <Square className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDetailsModal(false)}
                      className="h-6 w-6 p-0 text-white hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Action Buttons at Top */}
                <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                  <DialogDescription className="text-gray-600">
                    Complete resume information and extracted data
                  </DialogDescription>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => {
                        setShowDetailsModal(false);
                        handleEditResume(selectedResume);
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Resume
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowDetailsModal(false)}
                    >
                      Close
                    </Button>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto flex-1 p-6 min-h-0">
            
            <div className="space-y-4">
              {/* CRITICAL RECRUITER INFO - Highest Priority */}
              <Card className="border-2 border-red-200 bg-red-50">
                <CardHeader className="bg-red-100">
                  <CardTitle className="text-red-800 flex items-center gap-2">
                    <User className="h-5 w-5" />
                    🎯 CRITICAL RECRUITER INFO
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white p-3 rounded border">
                      <Label className="text-red-700 font-semibold">Full Name</Label>
                      <p className="text-lg font-bold text-gray-900">{selectedResume.first_name} {selectedResume.last_name}</p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <Label className="text-red-700 font-semibold">Contact</Label>
                      <p className="text-sm text-gray-900">{selectedResume.primary_email}</p>
                      <p className="text-sm text-gray-900">{selectedResume.phone}</p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <Label className="text-red-700 font-semibold">Work Auth</Label>
                      <p className="text-sm font-medium text-green-700">{selectedResume.work_authorization}</p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <Label className="text-red-700 font-semibold">Location</Label>
                      <p className="text-sm text-gray-900">{selectedResume.address}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* LAST 3 JOBS - High Priority */}
              <Card className="border-2 border-orange-200 bg-orange-50">
                <CardHeader className="bg-orange-100">
                  <CardTitle className="text-orange-800 flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    💼 LAST 3 JOBS
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {experienceData.length > 0 ? (
                      experienceData.slice(0, 3).map((job, index) => (
                        <div key={job.id} className="bg-white p-4 rounded border">
                          <div className="grid grid-cols-5 gap-4">
                            <div>
                              <Label className="text-orange-700 font-semibold">Company</Label>
                              <p className="text-sm text-gray-900 mt-1">{job.company || 'Not specified'}</p>
                            </div>
                            <div>
                              <Label className="text-orange-700 font-semibold">Position</Label>
                              <p className="text-sm text-gray-900 mt-1">{job.position || 'Not specified'}</p>
                            </div>
                            <div>
                              <Label className="text-orange-700 font-semibold">Industry</Label>
                              <p className="text-sm text-gray-900 mt-1">{job.industry || 'Not specified'}</p>
                            </div>
                            <div>
                              <Label className="text-orange-700 font-semibold">Location</Label>
                              <p className="text-sm text-gray-900 mt-1">{job.location || 'Not specified'}</p>
                            </div>
                            <div>
                              <Label className="text-orange-700 font-semibold">Dates</Label>
                              <p className="text-sm text-gray-900 mt-1">{job.start_date || 'Not specified'} - {job.end_date || 'Present'}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-white p-4 rounded border text-center">
                        <p className="text-gray-500">No job experience data available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* SKILLS & EXPERIENCE */}
              <Card className="border-2 border-green-200 bg-green-50">
                <CardHeader className="bg-green-100">
                  <CardTitle className="text-green-800 flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    🔧 SKILLS & EXPERIENCE
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="bg-white p-3 rounded border">
                      <Label className="text-green-700 font-semibold">Technical Skills</Label>
                      <p className="text-sm text-gray-900 mt-1">{selectedResume.technical_skills}</p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <Label className="text-green-700 font-semibold">Hands-on Skills</Label>
                      <p className="text-sm text-gray-900 mt-1">{selectedResume.hands_on_skills}</p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <Label className="text-green-700 font-semibold">Recommended Industries</Label>
                      <p className="text-sm text-gray-900 mt-1">{selectedResume.recommended_industries}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* EDUCATION - High Priority */}
              <Card className="border-2 border-blue-200 bg-blue-50">
                <CardHeader className="bg-blue-100">
                  <CardTitle className="text-blue-800 flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    🎓 EDUCATION
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {educationData.length > 0 ? (
                      educationData.map((edu, index) => (
                        <div key={edu.id} className="bg-white p-3 rounded border">
                          <div className="grid grid-cols-4 gap-4">
                            <div>
                              <Label className="text-blue-700 font-semibold">Degree</Label>
                              <p className="text-sm text-gray-900 mt-1">{edu.degree || 'Not specified'}</p>
                            </div>
                            <div>
                              <Label className="text-blue-700 font-semibold">Field</Label>
                              <p className="text-sm text-gray-900 mt-1">{edu.field || 'Not specified'}</p>
                            </div>
                            <div>
                              <Label className="text-blue-700 font-semibold">Institution</Label>
                              <p className="text-sm text-gray-900 mt-1">{edu.institution || 'Not specified'}</p>
                            </div>
                            <div>
                              <Label className="text-blue-700 font-semibold">Dates</Label>
                              <p className="text-sm text-gray-900 mt-1">{edu.start_date || 'Not specified'} - {edu.end_date || 'Not specified'}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-white p-3 rounded border text-center">
                        <p className="text-gray-500">No education data available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* COMPENSATION & PREFERENCES */}
              <Card className="border-2 border-yellow-200 bg-yellow-50">
                <CardHeader className="bg-yellow-100">
                  <CardTitle className="text-yellow-800 flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    💰 COMPENSATION & PREFERENCES
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white p-3 rounded border">
                      <Label className="text-yellow-700 font-semibold">Current Salary</Label>
                      <p className="text-sm text-gray-900">{selectedResume.current_salary || 'Not specified'}</p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <Label className="text-yellow-700 font-semibold">Expected Salary</Label>
                      <p className="text-sm text-gray-900">{selectedResume.expected_salary || 'Not specified'}</p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <Label className="text-yellow-700 font-semibold">Relocation</Label>
                      <p className="text-sm text-gray-900">{selectedResume.relocation || 'Not specified'}</p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <Label className="text-yellow-700 font-semibold">Remote Work</Label>
                      <p className="text-sm text-gray-900">{selectedResume.remote_work || 'Not specified'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* RECRUITER NOTES */}
              <Card className="border-2 border-purple-200 bg-purple-50">
                <CardHeader className="bg-purple-100">
                  <CardTitle className="text-purple-800 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    📝 RECRUITER NOTES
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white p-3 rounded border">
                      <Label className="text-purple-700 font-semibold">Special Notes</Label>
                      <p className="text-sm text-gray-900 mt-1">{selectedResume.special_notes || 'No special notes'}</p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <Label className="text-purple-700 font-semibold">Screening Comments</Label>
                      <p className="text-sm text-gray-900 mt-1">{selectedResume.screening_comments || 'No screening comments'}</p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <Label className="text-purple-700 font-semibold">Candidate Concerns</Label>
                      <p className="text-sm text-gray-900 mt-1">{selectedResume.candidate_concerns || 'No concerns noted'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
                  </div>
                </div>
              </DialogContent>
            </div>
          </div>
        </Dialog>
      )}

      {/* Edit Resume Modal */}
      {selectedResume && (
        <Dialog open={showEditModal} onOpenChange={() => {
          // Prevent accidental closure - only allow manual close via buttons
          console.log('Edit modal close attempt blocked - use Close button');
        }}>
          <div 
            className={`fixed inset-0 z-50 flex items-center justify-center ${isEditMinimized ? 'pointer-events-none' : ''}`}
            style={{
              transform: `translate(${editModalPosition.x}px, ${editModalPosition.y}px)`,
              width: isEditMaximized ? '100vw' : 'auto',
              height: isEditMaximized ? '100vh' : 'auto',
              maxWidth: isEditMaximized ? 'none' : '95vw',
              maxHeight: isEditMaximized ? 'none' : '90vh'
            }}
          >
            <div className="fixed inset-0 bg-black/50" />
            <div className="relative z-50 w-full h-full">
              <DialogContent
                className={`${isEditMaximized ? 'w-full h-full max-w-none max-h-none' : 'max-w-[95vw] sm:max-w-4xl max-h-[90vh]'} overflow-hidden bg-white border-0 !shadow-none mx-2 sm:mx-4 flex flex-col ${isEditMinimized ? 'hidden' : ''}`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Custom Title Bar */}
                <div 
                  className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white cursor-move select-none"
                  onMouseDown={(e) => handleMouseDown(e, 'edit')}
                >
                  <div className="flex items-center gap-2">
                    <Move className="h-4 w-4 text-blue-200" />
                    <DialogTitle className="text-lg font-semibold text-white flex items-center gap-2">
                      <Edit className="h-5 w-5" />
                      Edit Resume - {selectedResume.first_name} {selectedResume.last_name}
                    </DialogTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMinimize('edit')}
                      className="h-6 w-6 p-0 text-white hover:bg-blue-700"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMaximize('edit')}
                      className="h-6 w-6 p-0 text-white hover:bg-blue-700"
                    >
                      {isEditMaximized ? <Square className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowEditModal(false)}
                      className="h-6 w-6 p-0 text-white hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Action Buttons at Top */}
                <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                  <DialogDescription className="text-gray-600">
                    Update resume information, preferences, and recruiter notes
                  </DialogDescription>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={handleCancelEdit}
                      className="px-4 py-2 border-gray-300 hover:bg-gray-50"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSaveEdit} 
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto flex-1 p-6 min-h-0">
                  <div className="space-y-8 px-2">
              {/* Basic Information */}
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="bg-blue-50 pb-3">
                  <CardTitle className="text-xl font-semibold text-blue-900 flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <Label htmlFor="edit-first-name">First Name</Label>
                    <Input
                      id="edit-first-name"
                      value={editFormData.first_name || ''}
                      onChange={(e) => setEditFormData({...editFormData, first_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-last-name">Last Name</Label>
                    <Input
                      id="edit-last-name"
                      value={editFormData.last_name || ''}
                      onChange={(e) => setEditFormData({...editFormData, last_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-email">Primary Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editFormData.primary_email || ''}
                      onChange={(e) => setEditFormData({...editFormData, primary_email: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-secondary-email">Secondary Email</Label>
                    <Input
                      id="edit-secondary-email"
                      type="email"
                      value={editFormData.secondary_email || ''}
                      onChange={(e) => setEditFormData({...editFormData, secondary_email: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input
                      id="edit-phone"
                      value={editFormData.phone || ''}
                      onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-alternative-phone">Alternative Phone</Label>
                    <Input
                      id="edit-alternative-phone"
                      value={editFormData.alternative_phone || ''}
                      onChange={(e) => setEditFormData({...editFormData, alternative_phone: e.target.value})}
                    />
                  </div>
                    <div className="col-span-2">
                      <Label htmlFor="edit-address">Address</Label>
                      <Input
                        id="edit-address"
                        value={editFormData.address || ''}
                        onChange={(e) => setEditFormData({...editFormData, address: e.target.value})}
                        className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Work Authorization */}
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="bg-green-50 pb-3">
                  <CardTitle className="text-xl font-semibold text-green-900 flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Work Authorization
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <Label htmlFor="edit-citizenship">Citizenship</Label>
                    <Select 
                      value={editFormData.citizenship || ''} 
                      onValueChange={(value) => setEditFormData({...editFormData, citizenship: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select citizenship" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US Citizen">US Citizen</SelectItem>
                        <SelectItem value="Canadian Citizen">Canadian Citizen</SelectItem>
                        <SelectItem value="Mexican Citizen">Mexican Citizen</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-work-auth">Work Authorization</Label>
                    <Select 
                      value={editFormData.work_authorization || ''} 
                      onValueChange={(value) => setEditFormData({...editFormData, work_authorization: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select work authorization" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Authorized to work in US">Authorized to work in US</SelectItem>
                        <SelectItem value="Green Card">Green Card</SelectItem>
                        <SelectItem value="H1B">H1B</SelectItem>
                        <SelectItem value="L1">L1</SelectItem>
                        <SelectItem value="TN Visa">TN Visa</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  </div>
                </CardContent>
              </Card>

              {/* Compensation & Preferences */}
              <Card className="border-l-4 border-l-yellow-500">
                <CardHeader className="bg-yellow-50 pb-3">
                  <CardTitle className="text-xl font-semibold text-yellow-900 flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Compensation & Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <Label htmlFor="edit-current-salary">Current Salary</Label>
                    <Input
                      id="edit-current-salary"
                      value={editFormData.current_salary || ''}
                      onChange={(e) => setEditFormData({...editFormData, current_salary: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-expected-salary">Expected Salary</Label>
                    <Input
                      id="edit-expected-salary"
                      value={editFormData.expected_salary || ''}
                      onChange={(e) => setEditFormData({...editFormData, expected_salary: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-relocation">Relocation</Label>
                    <Select 
                      value={editFormData.relocation || ''} 
                      onValueChange={(value) => setEditFormData({...editFormData, relocation: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select relocation preference" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                        <SelectItem value="Maybe">Maybe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-remote">Remote Work</Label>
                    <Select 
                      value={editFormData.remote_work || ''} 
                      onValueChange={(value) => setEditFormData({...editFormData, remote_work: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select remote work preference" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  </div>
                </CardContent>
              </Card>

              {/* Skills & Experience */}
              <Card className="border-l-4 border-l-purple-500">
                <CardHeader className="bg-purple-50 pb-3">
                  <CardTitle className="text-xl font-semibold text-purple-900 flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Skills & Experience
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                  <div>
                    <Label htmlFor="edit-technical-skills">Technical Skills</Label>
                    <Textarea
                      id="edit-technical-skills"
                      value={editFormData.technical_skills || ''}
                      onChange={(e) => setEditFormData({...editFormData, technical_skills: e.target.value})}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-hands-on-skills">Hands-on Skills</Label>
                    <Textarea
                      id="edit-hands-on-skills"
                      value={editFormData.hands_on_skills || ''}
                      onChange={(e) => setEditFormData({...editFormData, hands_on_skills: e.target.value})}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-recommended-industries">Recommended Industries</Label>
                    <Textarea
                      id="edit-recommended-industries"
                      value={editFormData.recommended_industries || ''}
                      onChange={(e) => setEditFormData({...editFormData, recommended_industries: e.target.value})}
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-certifications">Certifications</Label>
                    <Textarea
                      id="edit-certifications"
                      value={editFormData.certifications || ''}
                      onChange={(e) => setEditFormData({...editFormData, certifications: e.target.value})}
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-licenses">Licenses</Label>
                    <Textarea
                      id="edit-licenses"
                      value={editFormData.licenses || ''}
                      onChange={(e) => setEditFormData({...editFormData, licenses: e.target.value})}
                      rows={2}
                      className="focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  </div>
                </CardContent>
              </Card>

              {/* Work Experience */}
              <Card className="border-l-4 border-l-indigo-500">
                <CardHeader className="bg-indigo-50 pb-3">
                  <CardTitle className="text-xl font-semibold text-indigo-900 flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Work Experience
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                  {editExperienceData.map((exp, index) => (
                    <div key={exp.id} className="border-2 border-indigo-200 rounded-lg p-6 bg-gradient-to-r from-indigo-50 to-white">
                      <h4 className="font-semibold mb-4 text-indigo-800 flex items-center gap-2">
                        <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-sm font-medium">
                          #{index + 1}
                        </span>
                        Experience {index + 1}
                      </h4>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor={`edit-exp-${index}-position`}>Position</Label>
                          <Input
                            id={`edit-exp-${index}-position`}
                            value={exp.position || ''}
                            onChange={(e) => {
                              const updated = [...editExperienceData];
                              updated[index] = { ...updated[index], position: e.target.value };
                              setEditExperienceData(updated);
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`edit-exp-${index}-company`}>Company</Label>
                          <Input
                            id={`edit-exp-${index}-company`}
                            value={exp.company || ''}
                            onChange={(e) => {
                              const updated = [...editExperienceData];
                              updated[index] = { ...updated[index], company: e.target.value };
                              setEditExperienceData(updated);
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`edit-exp-${index}-industry`}>Industry</Label>
                          <Input
                            id={`edit-exp-${index}-industry`}
                            value={exp.industry || ''}
                            onChange={(e) => {
                              const updated = [...editExperienceData];
                              updated[index] = { ...updated[index], industry: e.target.value };
                              setEditExperienceData(updated);
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`edit-exp-${index}-location`}>Location</Label>
                          <Input
                            id={`edit-exp-${index}-location`}
                            value={exp.location || ''}
                            onChange={(e) => {
                              const updated = [...editExperienceData];
                              updated[index] = { ...updated[index], location: e.target.value };
                              setEditExperienceData(updated);
                            }}
                            placeholder="City, State or City, Country"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`edit-exp-${index}-start-date`}>Start Date</Label>
                          <Input
                            id={`edit-exp-${index}-start-date`}
                            value={exp.start_date || ''}
                            onChange={(e) => {
                              const updated = [...editExperienceData];
                              updated[index] = { ...updated[index], start_date: e.target.value };
                              setEditExperienceData(updated);
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`edit-exp-${index}-end-date`}>End Date</Label>
                          <Input
                            id={`edit-exp-${index}-end-date`}
                            value={exp.end_date || ''}
                            onChange={(e) => {
                              const updated = [...editExperienceData];
                              updated[index] = { ...updated[index], end_date: e.target.value };
                              setEditExperienceData(updated);
                            }}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label htmlFor={`edit-exp-${index}-functions`}>Functions</Label>
                          <Textarea
                            id={`edit-exp-${index}-functions`}
                            value={exp.functions || ''}
                            onChange={(e) => {
                              const updated = [...editExperienceData];
                              updated[index] = { ...updated[index], functions: e.target.value };
                              setEditExperienceData(updated);
                            }}
                            rows={2}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`edit-exp-${index}-soft-skills`}>Soft Skills</Label>
                          <Input
                            id={`edit-exp-${index}-soft-skills`}
                            value={exp.soft_skills || ''}
                            onChange={(e) => {
                              const updated = [...editExperienceData];
                              updated[index] = { ...updated[index], soft_skills: e.target.value };
                              setEditExperienceData(updated);
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`edit-exp-${index}-achievements`}>Achievements</Label>
                          <Input
                            id={`edit-exp-${index}-achievements`}
                            value={exp.achievements || ''}
                            onChange={(e) => {
                              const updated = [...editExperienceData];
                              updated[index] = { ...updated[index], achievements: e.target.value };
                              setEditExperienceData(updated);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                </CardContent>
              </Card>

              {/* Job Search Information */}
              <Card className="border-l-4 border-l-orange-500">
                <CardHeader className="bg-orange-50 pb-3">
                  <CardTitle className="text-xl font-semibold text-orange-900 flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Job Search Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                  <div>
                    <Label htmlFor="edit-position">Previous Positions</Label>
                    <Input
                      id="edit-position"
                      value={editFormData.previous_positions || ''}
                      onChange={(e) => setEditFormData({...editFormData, previous_positions: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-reason-leaving">Reason for Leaving</Label>
                    <Textarea
                      id="edit-reason-leaving"
                      value={editFormData.reason_for_leaving || ''}
                      onChange={(e) => setEditFormData({...editFormData, reason_for_leaving: e.target.value})}
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-reason-looking">Reason for Looking</Label>
                    <Textarea
                      id="edit-reason-looking"
                      value={editFormData.reason_for_looking || ''}
                      onChange={(e) => setEditFormData({...editFormData, reason_for_looking: e.target.value})}
                      rows={2}
                      className="focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  </div>
                </CardContent>
              </Card>

              {/* Location Preferences */}
              <Card className="border-l-4 border-l-teal-500">
                <CardHeader className="bg-teal-50 pb-3">
                  <CardTitle className="text-xl font-semibold text-teal-900 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Location Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                  <div>
                    <Label htmlFor="edit-preferred-locations">Preferred Locations</Label>
                    <Textarea
                      id="edit-preferred-locations"
                      value={editFormData.preferred_locations || ''}
                      onChange={(e) => setEditFormData({...editFormData, preferred_locations: e.target.value})}
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-restricted-locations">Restricted Locations</Label>
                    <Textarea
                      id="edit-restricted-locations"
                      value={editFormData.restricted_locations || ''}
                      onChange={(e) => setEditFormData({...editFormData, restricted_locations: e.target.value})}
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-homeowner-renter">Homeowner/Renter</Label>
                    <Select 
                      value={editFormData.homeowner_renter || ''} 
                      onValueChange={(value) => setEditFormData({...editFormData, homeowner_renter: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select homeowner/renter status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Homeowner">Homeowner</SelectItem>
                        <SelectItem value="Renter">Renter</SelectItem>
                        <SelectItem value="Not specified">Not specified</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recruiter Notes */}
              <Card className="border-l-4 border-l-pink-500">
                <CardHeader className="bg-pink-50 pb-3">
                  <CardTitle className="text-xl font-semibold text-pink-900 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Recruiter Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                  <div>
                    <Label htmlFor="edit-special-notes">Special Notes</Label>
                    <Textarea
                      id="edit-special-notes"
                      value={editFormData.special_notes || ''}
                      onChange={(e) => setEditFormData({...editFormData, special_notes: e.target.value})}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-screening-comments">Screening Comments</Label>
                    <Textarea
                      id="edit-screening-comments"
                      value={editFormData.screening_comments || ''}
                      onChange={(e) => setEditFormData({...editFormData, screening_comments: e.target.value})}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-candidate-concerns">Candidate Concerns</Label>
                    <Textarea
                      id="edit-candidate-concerns"
                      value={editFormData.candidate_concerns || ''}
                      onChange={(e) => setEditFormData({...editFormData, candidate_concerns: e.target.value})}
                      rows={3}
                      className="focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    />
                  </div>
                  </div>
                </CardContent>
              </Card>
                  </div>
                </div>
              </DialogContent>
            </div>
          </div>
        </Dialog>
      )}

      {/* Save Confirmation Dialog */}
      <Dialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Confirm Save Changes
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to save these changes? This will update the resume in the database.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={cancelSaveEdit}>
              Cancel
            </Button>
            <Button onClick={confirmSaveEdit} className="bg-blue-600 hover:bg-blue-700">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Error Modal */}
      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Save Error
            </DialogTitle>
            <DialogDescription>
              {errorMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button onClick={() => setShowErrorModal(false)} className="bg-red-600 hover:bg-red-700">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default AIResumeManagementNew;
