import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Eye, 
  Download, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  DollarSign,
  Star,
  Filter,
  Grid,
  List,
  Table,
  Share,
  Heart,
  Calendar,
  User,
  Building,
  Award
} from 'lucide-react';

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

interface SearchResultsProps {
  resumes: AIResume[];
  loading: boolean;
  totalCount: number;
  onViewResume: (resume: AIResume) => void;
  onContactResume: (resume: AIResume) => void;
  onAddToShortlist: (resume: AIResume) => void;
  onExportResults: () => void;
  onShareResults: () => void;
}

type ViewMode = 'list' | 'grid' | 'table';

const SearchResults: React.FC<SearchResultsProps> = ({
  resumes,
  loading,
  totalCount,
  onViewResume,
  onContactResume,
  onAddToShortlist,
  onExportResults,
  onShareResults
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState('relevance');
  const [selectedResumes, setSelectedResumes] = useState<number[]>([]);

  const formatSalary = (salary?: string) => {
    if (!salary) return 'Not specified';
    const num = parseInt(salary);
    if (isNaN(num)) return salary;
    return `$${num.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getJobFitColor = (score?: number) => {
    if (!score) return 'bg-gray-100 text-gray-800';
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const toggleResumeSelection = (resumeId: number) => {
    setSelectedResumes(prev => 
      prev.includes(resumeId) 
        ? prev.filter(id => id !== resumeId)
        : [...prev, resumeId]
    );
  };

  const selectAllResumes = () => {
    setSelectedResumes(resumes.map(r => r.id));
  };

  const clearSelection = () => {
    setSelectedResumes([]);
  };

  const ListView = () => (
    <div className="space-y-4">
      {resumes.map((resume) => (
        <Card key={resume.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={selectedResumes.includes(resume.id)}
                    onChange={() => toggleResumeSelection(resume.id)}
                    className="rounded"
                  />
                  <h3 className="text-lg font-semibold">
                    {resume.first_name} {resume.last_name}
                  </h3>
                  {resume.job_fit_score && (
                    <Badge className={getJobFitColor(resume.job_fit_score)}>
                      {resume.job_fit_score}% Match
                    </Badge>
                  )}
                  {resume.ai_extraction_confidence && (
                    <Badge variant="outline">
                      {Math.round(resume.ai_extraction_confidence * 100)}% Confidence
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Briefcase className="h-4 w-4" />
                    <span>{resume.years_experience || 'N/A'} years experience</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building className="h-4 w-4" />
                    <span>{resume.current_company || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{resume.address || 'Location not specified'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Technical Skills:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {resume.technical_skills?.split(',').slice(0, 5).map((skill, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {skill.trim()}
                        </Badge>
                      ))}
                      {resume.technical_skills && resume.technical_skills.split(',').length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{resume.technical_skills.split(',').length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Certifications:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {resume.certifications?.split(',').slice(0, 3).map((cert, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {cert.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    <span>Current: {formatSalary(resume.current_salary)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    <span>Expected: {formatSalary(resume.expected_salary)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Updated: {formatDate(resume.updated_at)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 ml-4">
                <Button
                  size="sm"
                  onClick={() => onViewResume(resume)}
                  className="w-full"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onContactResume(resume)}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Contact
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAddToShortlist(resume)}
                >
                  <Heart className="h-4 w-4 mr-2" />
                  Shortlist
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const GridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {resumes.map((resume) => (
        <Card key={resume.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">
                  {resume.first_name} {resume.last_name}
                </h3>
                <p className="text-sm text-gray-600">{resume.current_company}</p>
              </div>
              {resume.job_fit_score && (
                <Badge className={getJobFitColor(resume.job_fit_score)}>
                  {resume.job_fit_score}%
                </Badge>
              )}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Briefcase className="h-4 w-4 text-gray-400" />
                <span>{resume.years_experience || 'N/A'} years exp</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="truncate">{resume.address || 'Location N/A'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-gray-400" />
                <span>{formatSalary(resume.current_salary)}</span>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex flex-wrap gap-1">
                {resume.technical_skills?.split(',').slice(0, 3).map((skill, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {skill.trim()}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => onViewResume(resume)}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-1" />
                View
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAddToShortlist(resume)}
              >
                <Heart className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const TableView = () => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left p-3">
              <input
                type="checkbox"
                checked={selectedResumes.length === resumes.length}
                onChange={selectedResumes.length === resumes.length ? clearSelection : selectAllResumes}
                className="rounded"
              />
            </th>
            <th className="text-left p-3 font-medium">Name</th>
            <th className="text-left p-3 font-medium">Experience</th>
            <th className="text-left p-3 font-medium">Company</th>
            <th className="text-left p-3 font-medium">Location</th>
            <th className="text-left p-3 font-medium">Salary</th>
            <th className="text-left p-3 font-medium">Match %</th>
            <th className="text-left p-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {resumes.map((resume) => (
            <tr key={resume.id} className="border-b hover:bg-gray-50">
              <td className="p-3">
                <input
                  type="checkbox"
                  checked={selectedResumes.includes(resume.id)}
                  onChange={() => toggleResumeSelection(resume.id)}
                  className="rounded"
                />
              </td>
              <td className="p-3">
                <div>
                  <div className="font-medium">
                    {resume.first_name} {resume.last_name}
                  </div>
                  <div className="text-sm text-gray-600">{resume.primary_email}</div>
                </div>
              </td>
              <td className="p-3">{resume.years_experience || 'N/A'} years</td>
              <td className="p-3">{resume.current_company || 'N/A'}</td>
              <td className="p-3">{resume.address || 'N/A'}</td>
              <td className="p-3">{formatSalary(resume.current_salary)}</td>
              <td className="p-3">
                {resume.job_fit_score ? (
                  <Badge className={getJobFitColor(resume.job_fit_score)}>
                    {resume.job_fit_score}%
                  </Badge>
                ) : (
                  'N/A'
                )}
              </td>
              <td className="p-3">
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewResume(resume)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onContactResume(resume)}
                  >
                    <Mail className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Searching resumes...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Search Results</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {totalCount} resume{totalCount !== 1 ? 's' : ''} found
              {selectedResumes.length > 0 && ` • ${selectedResumes.length} selected`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="experience">Experience</SelectItem>
                <SelectItem value="salary">Salary</SelectItem>
                <SelectItem value="date">Date Added</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex border rounded-lg">
              <Button
                size="sm"
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                onClick={() => setViewMode('list')}
                className="rounded-r-none"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                onClick={() => setViewMode('grid')}
                className="rounded-none"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                onClick={() => setViewMode('table')}
                className="rounded-l-none"
              >
                <Table className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {selectedResumes.length > 0 && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-lg">
            <span className="text-sm font-medium">
              {selectedResumes.length} resume{selectedResumes.length !== 1 ? 's' : ''} selected
            </span>
            <Button size="sm" variant="outline" onClick={onExportResults}>
              <Download className="h-4 w-4 mr-2" />
              Export Selected
            </Button>
            <Button size="sm" variant="outline" onClick={onShareResults}>
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button size="sm" variant="outline" onClick={clearSelection}>
              Clear Selection
            </Button>
          </div>
        )}

        {resumes.length === 0 ? (
          <div className="text-center py-8">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No resumes found</h3>
            <p className="text-gray-600">Try adjusting your search criteria</p>
          </div>
        ) : (
          <>
            {viewMode === 'list' && <ListView />}
            {viewMode === 'grid' && <GridView />}
            {viewMode === 'table' && <TableView />}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SearchResults;
