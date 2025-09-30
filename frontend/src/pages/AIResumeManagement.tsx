import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Search, Filter, Download, Edit, Eye, Trash2, User, Mail, Phone, MapPin, Briefcase, GraduationCap, Award, DollarSign, Home, Globe, FileText, Calendar, Hash, CheckCircle, AlertCircle, Play, Building, BarChart3, TrendingUp, Users, Target } from 'lucide-react';
import AdvancedSearchFilters from '@/components/AdvancedSearchFilters';
import SearchResults from '@/components/SearchResults';
import SavedSearches from '@/components/SavedSearches';

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
}

interface AIEducation {
  id: number;
  resume_id: number;
  degree?: string;
  field?: string;
  institution?: string;
  start_date?: string;
  end_date?: string;
  gpa?: string;
  honors?: string;
}

interface AIExperience {
  id: number;
  resume_id: number;
  position?: string;
  company?: string;
  industry?: string;
  start_date?: string;
  end_date?: string;
  functions?: string;
  soft_skills?: string;
  achievements?: string;
}

const AIResumeManagement: React.FC = () => {
  const [resumes, setResumes] = useState<AIResume[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResume, setSelectedResume] = useState<AIResume | null>(null);
  const [education, setEducation] = useState<AIEducation[]>([]);
  const [experience, setExperience] = useState<AIExperience[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('database');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [editingResume, setEditingResume] = useState<AIResume | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<AIResume>>({});
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

  // Load resumes on component mount
  useEffect(() => {
    loadResumes();
  }, []);

  const loadResumes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ai-resumes');
      if (!response.ok) throw new Error('Failed to load resumes');
      const data = await response.json();
      setResumes(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedFiles(Array.from(files));
    }
  };

  const startProcessing = () => {
    if (selectedFiles.length === 0) return;
    
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
    
    processFiles();
  };

  const processFiles = async () => {
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
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

        const response = await fetch('/api/resumes/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error(`Upload failed for ${file.name}`);
        
        const result = await response.json();
        
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
      setProcessingProgress(prev => ({
        ...prev,
        currentStage: 'Error occurred',
        logs: [...prev.logs, `❌ Error: ${err.message}`]
      }));
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadResumes();
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/ai-resumes/search?query=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      setResumes(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadResumeDetails = async (resume: AIResume) => {
    try {
      setSelectedResume(resume);
      
      // Load education and experience
      const [eduResponse, expResponse] = await Promise.all([
        fetch(`/api/ai-resumes/${resume.id}/education`),
        fetch(`/api/ai-resumes/${resume.id}/experience`)
      ]);
      
      if (eduResponse.ok) {
        const eduData = await eduResponse.json();
        setEducation(eduData);
      }
      
      if (expResponse.ok) {
        const expData = await expResponse.json();
        setExperience(expData);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteResume = async (resumeId: number) => {
    if (!confirm('Are you sure you want to delete this resume?')) return;
    
    try {
      const response = await fetch(`/api/ai-resumes/${resumeId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Delete failed');
      
      // Reload resumes
      await loadResumes();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const verifyAiConnection = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ai-models/openai');
      if (!response.ok) throw new Error('AI connection failed');
      const data = await response.json();
      setAiStatus(`AI Connection: Available (${data.models?.length || 0} models)`);
    } catch (err: any) {
      setAiStatus(`AI Connection Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const cleanupOldResumes = async () => {
    if (!confirm('Are you sure you want to cleanup old resumes? This will keep only the latest versions.')) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/resumes/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'keep_count=3'
      });
      
      if (!response.ok) throw new Error('Cleanup failed');
      
      await loadResumes();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteAllResumes = async () => {
    if (!confirm('Are you sure you want to delete ALL resumes? This action cannot be undone.')) return;
    
    try {
      setLoading(true);
      // This would need to be implemented in the backend
      setError('Delete all resumes functionality not yet implemented');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'bg-gray-100 text-gray-800';
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const handleEditResume = (resume: AIResume) => {
    setEditingResume(resume);
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
      candidate_concerns: resume.candidate_concerns || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingResume) return;
    
    try {
      setLoading(true);
      
      // Make API call to update resume
      const response = await fetch(`/api/ai-resumes/${editingResume.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update resume');
      }
      
      // Close the edit modal
      setEditingResume(null);
      setEditFormData({});
      
      // Reload resumes to show updated data
      await loadResumes();
      setError(null);
    } catch (error) {
      console.error('Error saving resume:', error);
      setError('Failed to save resume changes');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingResume(null);
    setEditFormData({});
  };

  const handleViewDetails = async (resumeId: number) => {
    try {
      const response = await fetch(`/api/ai-resumes/${resumeId}`);
      if (!response.ok) throw new Error('Failed to load resume details');
      const resume = await response.json();
      await loadResumeDetails(resume);
    } catch (err: any) {
      setError(err.message);
    }
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

  const handleCleanupDuplicates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ai-resumes/cleanup-duplicates', {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Failed to cleanup duplicates');
      
      const result = await response.json();
      setAiStatus(`Cleanup completed: ${result.removed} duplicates removed, ${result.kept} records kept`);
      
      // Reload resumes to show updated data
      await loadResumes();
    } catch (err: any) {
      setError('Failed to cleanup duplicates');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckMissingData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ai-resumes/check-missing-data');
      
      if (!response.ok) throw new Error('Failed to check missing data');
      
      const result = await response.json();
      
      if (result.missing_data_count === 0) {
        setAiStatus('✅ All resumes have complete education and experience data!');
      } else {
        const missingList = result.missing_data.map((item: any) => 
          `• ${item.name} (ID: ${item.id}) - Education: ${item.education_count}, Experience: ${item.experience_count}`
        ).join('\n');
        
        setAiStatus(`⚠️ Found ${result.missing_data_count} resumes with missing data:\n\n${missingList}\n\nClick "Auto-Fix Missing Data" to automatically re-process these resumes.`);
      }
    } catch (err: any) {
      setError('Failed to check missing data');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoFixMissingData = async () => {
    if (!confirm('This will automatically re-process all resumes with missing data. This may take several minutes. Continue?')) {
      return;
    }
    
    try {
      setLoading(true);
      setAiStatus('🔄 Auto-fixing missing data... This may take several minutes.');
      
      const response = await fetch('/api/ai-resumes/auto-fix-missing-data', {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Failed to auto-fix missing data');
      
      const result = await response.json();
      
      if (result.successful > 0) {
        const successList = result.details
          .filter((item: any) => item.status === 'success')
          .map((item: any) => 
            `• ${item.name}: ${item.education_count} education, ${item.experience_count} experience`
          ).join('\n');
        
        setAiStatus(`✅ Auto-fix completed!\n\nSuccessfully fixed ${result.successful} resumes:\n${successList}`);
      }
      
      if (result.failed > 0) {
        const failedList = result.details
          .filter((item: any) => item.status === 'failed')
          .map((item: any) => 
            `• ${item.name}: ${item.error}`
          ).join('\n');
        
        setAiStatus(prev => prev + `\n\n❌ Failed to fix ${result.failed} resumes:\n${failedList}`);
      }
      
      // Reload resumes to show updated data
      await loadResumes();
    } catch (err: any) {
      setError('Failed to auto-fix missing data');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceIcon = (confidence?: number) => {
    if (!confidence) return <AlertCircle className="h-4 w-4" />;
    if (confidence >= 0.8) return <CheckCircle className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI Resume Management</h1>
          <p className="text-gray-600">View, search, and manage AI-extracted resumes</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="database">Resume Database</TabsTrigger>
          <TabsTrigger value="upload">Upload & Process</TabsTrigger>
          <TabsTrigger value="matching">AI Matching</TabsTrigger>
          <TabsTrigger value="management">Database Management</TabsTrigger>
        </TabsList>

        {/* Resume Database Tab */}
        <TabsContent value="database" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Resume Database</h2>
            <div className="flex gap-2">
              <Button onClick={verifyAiConnection} variant="outline" size="sm">
                🤖 Verify AI Connection
              </Button>
              <Button onClick={handleCleanupDuplicates} variant="outline" size="sm">
                🧹 Cleanup Duplicates
              </Button>
              <Button onClick={handleCheckMissingData} variant="outline" size="sm">
                🔍 Check Missing Data
              </Button>
              <Button onClick={handleAutoFixMissingData} variant="outline" size="sm">
                🔧 Auto-Fix Missing Data
              </Button>
            </div>
          </div>

          {/* Status Messages */}
          {uploadStatus && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800">{uploadStatus}</p>
            </div>
          )}
          
          {aiStatus && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">{aiStatus}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Search & Filter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search resumes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <Button onClick={handleSearch} disabled={loading}>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {showFilters ? 'Hide' : 'Show'} Filters
                </Button>
                <Button variant="outline" onClick={() => {
                  setSearchQuery('');
                  loadResumes();
                }}>
                  Clear Filters
                </Button>
              </div>

              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label>Industry</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Industries</SelectItem>
                        <SelectItem value="mining">Mining</SelectItem>
                        <SelectItem value="construction">Construction</SelectItem>
                        <SelectItem value="chemical">Chemical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Citizenship</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select citizenship" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="us">US Citizen</SelectItem>
                        <SelectItem value="canadian">Canadian Citizen</SelectItem>
                        <SelectItem value="mexican">Mexican Citizen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Work Authorization</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select work auth" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="authorized">Authorized to work in US</SelectItem>
                        <SelectItem value="tn">TN Visa</SelectItem>
                        <SelectItem value="h1b">H1B Visa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

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
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDownloadResume(resume)}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download Resume
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditResume(resume)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          </div>
                          <Button 
                            onClick={() => handleViewDetails(resume.id)}
                            size="sm"
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
        <TabsContent value="upload" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Upload & Process</h2>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Upload Resume Files</CardTitle>
              <CardDescription>Upload resume files for AI extraction and processing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="resume-upload">Select Resume Files</Label>
                  <Input
                    id="resume-upload"
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileSelection}
                    disabled={loading}
                  />
                </div>
                
                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label>Selected Files ({selectedFiles.length})</Label>
                    <div className="max-h-32 overflow-y-auto border rounded p-2 bg-gray-50">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="text-sm text-gray-600 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {file.name} ({(file.size / 1024).toFixed(1)} KB)
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    onClick={startProcessing}
                    disabled={selectedFiles.length === 0 || loading}
                    className="flex items-center gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Start Processing
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setSelectedFiles([])}
                    disabled={selectedFiles.length === 0}
                  >
                    Clear Selection
                  </Button>
                </div>

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
        <TabsContent value="matching" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">AI Matching</h2>
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
        <TabsContent value="management" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Database Management</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Cleanup Operations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={cleanupOldResumes} variant="outline" className="w-full">
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
                <Button onClick={deleteAllResumes} variant="outline" className="w-full text-red-600">
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
        <Dialog open={!!selectedResume} onOpenChange={() => setSelectedResume(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Resume Details - {selectedResume.first_name} {selectedResume.last_name}</DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="identity" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="identity">Identity</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
                <TabsTrigger value="work">Work Auth</TabsTrigger>
                <TabsTrigger value="skills">Skills</TabsTrigger>
                <TabsTrigger value="education">Education</TabsTrigger>
                <TabsTrigger value="experience">Experience</TabsTrigger>
              </TabsList>

              <TabsContent value="identity" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>ID</Label>
                    <p className="text-sm text-gray-600">{selectedResume.id}</p>
                  </div>
                  <div>
                    <Label>Candidate ID</Label>
                    <p className="text-sm text-gray-600">{selectedResume.candidate_id}</p>
                  </div>
                  <div>
                    <Label>First Name</Label>
                    <p className="text-sm text-gray-600">{selectedResume.first_name || 'Not specified'}</p>
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <p className="text-sm text-gray-600">{selectedResume.last_name || 'Not specified'}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Primary Email</Label>
                    <p className="text-sm text-gray-600">{selectedResume.primary_email || 'Not specified'}</p>
                  </div>
                  <div>
                    <Label>Secondary Email</Label>
                    <p className="text-sm text-gray-600">{selectedResume.secondary_email || 'Not specified'}</p>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <p className="text-sm text-gray-600">{selectedResume.phone || 'Not specified'}</p>
                  </div>
                  <div>
                    <Label>Alternative Phone</Label>
                    <p className="text-sm text-gray-600">{selectedResume.alternative_phone || 'Not specified'}</p>
                  </div>
                  <div className="col-span-2">
                    <Label>Address</Label>
                    <p className="text-sm text-gray-600">{selectedResume.address || 'Not specified'}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="work" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Citizenship</Label>
                    <p className="text-sm text-gray-600">{selectedResume.citizenship || 'Not specified'}</p>
                  </div>
                  <div>
                    <Label>Work Authorization</Label>
                    <p className="text-sm text-gray-600">{selectedResume.work_authorization || 'Not specified'}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="skills" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label>Recommended Industries</Label>
                    <p className="text-sm text-gray-600">{selectedResume.recommended_industries || 'Not specified'}</p>
                  </div>
                  <div>
                    <Label>Technical Skills</Label>
                    <p className="text-sm text-gray-600">{selectedResume.technical_skills || 'Not specified'}</p>
                  </div>
                  <div>
                    <Label>Hands-on Skills</Label>
                    <p className="text-sm text-gray-600">{selectedResume.hands_on_skills || 'Not specified'}</p>
                  </div>
                  <div>
                    <Label>Certifications</Label>
                    <p className="text-sm text-gray-600">{selectedResume.certifications || 'Not specified'}</p>
                  </div>
                  <div>
                    <Label>Licenses</Label>
                    <p className="text-sm text-gray-600">{selectedResume.licenses || 'Not specified'}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="education" className="space-y-4">
                {education.length === 0 ? (
                  <p className="text-gray-600">No education records found</p>
                ) : (
                  <div className="space-y-4">
                    {education.map((edu) => (
                      <Card key={edu.id}>
                        <CardContent className="p-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Degree</Label>
                              <p className="text-sm text-gray-600">{edu.degree || 'Not specified'}</p>
                            </div>
                            <div>
                              <Label>Field</Label>
                              <p className="text-sm text-gray-600">{edu.field || 'Not specified'}</p>
                            </div>
                            <div className="col-span-2">
                              <Label>Institution</Label>
                              <p className="text-sm text-gray-600">{edu.institution || 'Not specified'}</p>
                            </div>
                            <div>
                              <Label>Duration</Label>
                              <p className="text-sm text-gray-600">
                                {edu.start_date || 'Not specified'} - {edu.end_date || 'Not specified'}
                              </p>
                            </div>
                            <div>
                              <Label>GPA</Label>
                              <p className="text-sm text-gray-600">{edu.gpa || 'Not specified'}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="experience" className="space-y-4">
                {experience.length === 0 ? (
                  <p className="text-gray-600">No work experience records found</p>
                ) : (
                  <div className="space-y-4">
                    {experience.map((exp) => (
                      <Card key={exp.id}>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold">{exp.position || 'Position not specified'}</h4>
                                <p className="text-sm text-gray-600">{exp.company || 'Company not specified'}</p>
                                <p className="text-sm text-gray-500">{exp.industry || 'Industry not specified'}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-600">
                                  {exp.start_date || 'Not specified'} - {exp.end_date || 'Not specified'}
                                </p>
                              </div>
                            </div>
                            
                            {exp.functions && (
                              <div>
                                <Label>Functions</Label>
                                <div className="text-sm text-gray-600 whitespace-pre-line">
                                  {exp.functions}
                                </div>
                              </div>
                            )}
                            
                            {exp.soft_skills && (
                              <div>
                                <Label>Soft Skills</Label>
                                <p className="text-sm text-gray-600">{exp.soft_skills}</p>
                              </div>
                            )}
                            
                            {exp.achievements && (
                              <div>
                                <Label>Achievements</Label>
                                <p className="text-sm text-gray-600">{exp.achievements}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* File Information */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="font-semibold mb-4">File Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label>Original Filename</Label>
                  <p className="text-gray-600">{selectedResume.original_filename || 'Not specified'}</p>
                </div>
                <div>
                  <Label>Version Number</Label>
                  <p className="text-gray-600">{selectedResume.version_number}</p>
                </div>
                <div>
                  <Label>Is Latest Version</Label>
                  <p className="text-gray-600">{selectedResume.is_latest_version ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <Label>Content Hash</Label>
                  <p className="text-gray-600 font-mono text-xs">
                    {selectedResume.content_hash ? `${selectedResume.content_hash.substring(0, 16)}...` : 'Not specified'}
                  </p>
                </div>
              </div>
            </div>

            {/* System Metadata */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="font-semibold mb-4">System Metadata</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label>Created</Label>
                  <p className="text-gray-600">{formatDate(selectedResume.created_at)}</p>
                </div>
                <div>
                  <Label>Updated</Label>
                  <p className="text-gray-600">{formatDate(selectedResume.updated_at)}</p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Processing Progress Modal */}
      {showProgressModal && (
        <Dialog open={showProgressModal} onOpenChange={setShowProgressModal}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>AI Resume Processing Progress</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Progress Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Current File</Label>
                  <p className="text-sm text-gray-600">{processingProgress.currentFile || 'None'}</p>
                </div>
                <div className="space-y-2">
                  <Label>Current Stage</Label>
                  <p className="text-sm text-gray-600">{processingProgress.currentStage}</p>
                </div>
                <div className="space-y-2">
                  <Label>Progress</Label>
                  <p className="text-sm text-gray-600">
                    {processingProgress.processedFiles} / {processingProgress.totalFiles} files
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Total Time</Label>
                  <p className="text-sm text-gray-600">{processingProgress.totalTime || 'Calculating...'}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <Label>Overall Progress</Label>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${processingProgress.progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600">{Math.round(processingProgress.progress)}% complete</p>
              </div>

              {/* AI Processing Details */}
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <Label className="text-xs">Extraction Model</Label>
                    <p className="text-sm font-medium">Grok - {processingProgress.extractionModel}</p>
                    <p className="text-xs text-gray-600">{processingProgress.extractionTokens.toLocaleString()} tokens</p>
                  </div>
                  <div className="text-center">
                    <Label className="text-xs">Validation Model</Label>
                    <p className="text-sm font-medium">OpenAI - {processingProgress.validationModel}</p>
                    <p className="text-xs text-gray-600">{processingProgress.validationTokens.toLocaleString()} tokens</p>
                  </div>
                </div>
                <div className="text-center border-t pt-2">
                  <Label className="text-xs">Total Tokens</Label>
                  <p className="text-sm font-medium">{(processingProgress.extractionTokens + processingProgress.validationTokens).toLocaleString()}</p>
                </div>
              </div>

              {/* Processing Logs */}
              <div className="space-y-2">
                <Label>Processing Logs</Label>
                <div className="max-h-48 overflow-y-auto border rounded p-3 bg-gray-50 font-mono text-sm">
                  {processingProgress.logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowProgressModal(false)}
                  disabled={processingProgress.currentStage === 'Processing completed'}
                >
                  Close
                </Button>
                {processingProgress.currentStage === 'Processing completed' && (
                  <Button onClick={() => {
                    setShowProgressModal(false);
                    setSelectedFiles([]);
                  }}>
                    Close
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Resume Modal */}
      {editingResume && (
        <Dialog open={!!editingResume} onOpenChange={handleCancelEdit}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Resume - {editingResume.first_name} {editingResume.last_name}</DialogTitle>
              <DialogDescription>
                Edit only the fields that are not directly extracted from the resume.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
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
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input
                      id="edit-phone"
                      value={editFormData.phone || ''}
                      onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="edit-address">Address</Label>
                    <Input
                      id="edit-address"
                      value={editFormData.address || ''}
                      onChange={(e) => setEditFormData({...editFormData, address: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Work Authorization */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Work Authorization</h3>
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>🤖 AI Determination:</strong> These fields are automatically determined from employment history but can be edited if needed.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
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
              </div>

              {/* Compensation & Preferences */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Compensation & Preferences</h3>
                <div className="grid grid-cols-2 gap-4">
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
              </div>

              {/* Job Search Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Job Search Information</h3>
                <div className="space-y-4">
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
                    />
                  </div>
                </div>
              </div>

              {/* Recruiter Notes */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Recruiter Notes</h3>
                <div className="space-y-4">
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
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AIResumeManagement;
