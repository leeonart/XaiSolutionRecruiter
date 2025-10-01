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
  Award,
  ChevronDown,
  ChevronUp,
  Shield,
  Globe,
  Home,
  FileText,
  Target,
  CheckCircle,
  AlertCircle,
  Info
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
  // Education and Experience data from related tables
  education?: Array<{
    degree?: string;
    field?: string;
    institution?: string;
    start_date?: string;
    end_date?: string;
    gpa?: string;
    honors?: string;
  }>;
  experience?: Array<{
    position?: string;
    company?: string;
    industry?: string;
    location?: string;
    start_date?: string;
    end_date?: string;
    functions?: string;
    soft_skills?: string;
    achievements?: string;
  }>;
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
  const [expandedResumes, setExpandedResumes] = useState<Set<number>>(new Set());

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

  const toggleExpanded = (resumeId: number) => {
    setExpandedResumes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(resumeId)) {
        newSet.delete(resumeId);
      } else {
        newSet.add(resumeId);
      }
      return newSet;
    });
  };

  const getFieldValue = (value?: string, fallback: string = 'Not specified') => {
    return value && value.trim() !== '' ? value : fallback;
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'text-gray-500';
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceIcon = (confidence?: number) => {
    if (!confidence) return <AlertCircle className="h-4 w-4" />;
    if (confidence >= 0.8) return <CheckCircle className="h-4 w-4" />;
    if (confidence >= 0.6) return <Info className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  const ListView = () => (
    <div className="space-y-6">
      {resumes.map((resume) => {
        const isExpanded = expandedResumes.has(resume.id);
        
        return (
          <Card key={resume.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              {/* Header Section */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedResumes.includes(resume.id)}
                    onChange={() => toggleResumeSelection(resume.id)}
                    className="rounded"
                  />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {resume.first_name} {resume.last_name}
                    </h3>
                    <p className="text-sm text-gray-600">ID: {resume.candidate_id}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {resume.job_fit_score && (
                    <Badge className={getJobFitColor(resume.job_fit_score)}>
                      {resume.job_fit_score}% Match
                    </Badge>
                  )}
                  {resume.ai_extraction_confidence && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      {getConfidenceIcon(resume.ai_extraction_confidence)}
                      <span className={getConfidenceColor(resume.ai_extraction_confidence)}>
                        {Math.round(resume.ai_extraction_confidence * 100)}%
                      </span>
                    </Badge>
                  )}
                </div>
              </div>

              {/* Essential Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                {/* Contact Information */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Contact Info
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3 text-blue-600" />
                      <span className="truncate">{getFieldValue(resume.primary_email)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-blue-600" />
                      <span>{getFieldValue(resume.phone)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-blue-600" />
                      <span className="truncate">{getFieldValue(resume.address)}</span>
                    </div>
                  </div>
                </div>

                {/* Professional Profile */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Professional
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Star className="h-3 w-3 text-green-600" />
                      <span>{resume.years_experience || 'N/A'} years experience</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building className="h-3 w-3 text-green-600" />
                      <span className="truncate">{getFieldValue(resume.current_company)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="h-3 w-3 text-green-600" />
                      <span className="truncate">{getFieldValue(resume.recommended_industries)}</span>
                    </div>
                  </div>
                </div>

                {/* Work Authorization */}
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Authorization
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Globe className="h-3 w-3 text-purple-600" />
                      <span>{getFieldValue(resume.citizenship)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-purple-600" />
                      <span>{getFieldValue(resume.work_authorization)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Home className="h-3 w-3 text-purple-600" />
                      <span>{getFieldValue(resume.relocation)}</span>
                    </div>
                  </div>
                </div>

                {/* Compensation */}
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Compensation
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-600">Current:</span>
                      <span>{formatSalary(resume.current_salary)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-600">Expected:</span>
                      <span>{formatSalary(resume.expected_salary)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-yellow-600" />
                      <span>Updated: {formatDate(resume.updated_at)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Skills and Certifications */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Technical Skills
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {resume.technical_skills?.split(',').slice(0, 8).map((skill, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {skill.trim()}
                      </Badge>
                    ))}
                    {resume.technical_skills && resume.technical_skills.split(',').length > 8 && (
                      <Badge variant="outline" className="text-xs">
                        +{resume.technical_skills.split(',').length - 8} more
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Certifications
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {resume.certifications?.split(',').slice(0, 5).map((cert, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {cert.trim()}
                      </Badge>
                    ))}
                    {resume.certifications && resume.certifications.split(',').length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{resume.certifications.split(',').length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded View */}
              {isExpanded && (
                <div className="border-t pt-6 space-y-6">
                  {/* Education Section */}
                  {resume.education && resume.education.length > 0 && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        Education
                      </h4>
                      <div className="space-y-3">
                        {resume.education.map((edu, index) => (
                          <div key={index} className="bg-white p-3 rounded border">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{getFieldValue(edu.degree)} in {getFieldValue(edu.field)}</p>
                                <p className="text-sm text-gray-600">{getFieldValue(edu.institution)}</p>
                                {edu.gpa && <p className="text-sm text-gray-500">GPA: {edu.gpa}</p>}
                              </div>
                              <div className="text-sm text-gray-500">
                                {edu.start_date} - {edu.end_date || 'Present'}
                              </div>
                            </div>
                            {edu.honors && (
                              <p className="text-sm text-blue-600 mt-1">{edu.honors}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Experience Section */}
                  {resume.experience && resume.experience.length > 0 && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Work Experience
                      </h4>
                      <div className="space-y-3">
                        {resume.experience.map((exp, index) => (
                          <div key={index} className="bg-white p-3 rounded border">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-medium">{getFieldValue(exp.position)}</p>
                                <p className="text-sm text-gray-600">{getFieldValue(exp.company)}</p>
                                <p className="text-sm text-gray-500">{getFieldValue(exp.industry)} • {getFieldValue(exp.location)}</p>
                              </div>
                              <div className="text-sm text-gray-500">
                                {exp.start_date} - {exp.end_date || 'Present'}
                              </div>
                            </div>
                            {exp.functions && (
                              <p className="text-sm text-gray-700 mb-2">{exp.functions}</p>
                            )}
                            {exp.achievements && (
                              <p className="text-sm text-green-600">{exp.achievements}</p>
                            )}
                            {exp.soft_skills && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {exp.soft_skills.split(',').map((skill, skillIndex) => (
                                  <Badge key={skillIndex} variant="outline" className="text-xs">
                                    {skill.trim()}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Additional Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Work Preferences */}
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-purple-900 mb-3">Work Preferences</h4>
                      <div className="space-y-2 text-sm">
                        <div><span className="font-medium">Remote Work:</span> {getFieldValue(resume.remote_work)}</div>
                        <div><span className="font-medium">Preferred Locations:</span> {getFieldValue(resume.preferred_locations)}</div>
                        <div><span className="font-medium">Restricted Locations:</span> {getFieldValue(resume.restricted_locations)}</div>
                        <div><span className="font-medium">Homeowner/Renter:</span> {getFieldValue(resume.homeowner_renter)}</div>
                      </div>
                    </div>

                    {/* Job Search Info */}
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-orange-900 mb-3">Job Search Info</h4>
                      <div className="space-y-2 text-sm">
                        <div><span className="font-medium">Reason for Looking:</span> {getFieldValue(resume.reason_for_looking)}</div>
                        <div><span className="font-medium">Reason for Leaving:</span> {getFieldValue(resume.reason_for_leaving)}</div>
                        <div><span className="font-medium">Previous Positions:</span> {getFieldValue(resume.previous_positions)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Recruiter Notes */}
                  {(resume.special_notes || resume.screening_comments || resume.candidate_concerns) && (
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-red-900 mb-3">Recruiter Notes</h4>
                      <div className="space-y-2 text-sm">
                        {resume.special_notes && (
                          <div><span className="font-medium">Special Notes:</span> {resume.special_notes}</div>
                        )}
                        {resume.screening_comments && (
                          <div><span className="font-medium">Screening Comments:</span> {resume.screening_comments}</div>
                        )}
                        {resume.candidate_concerns && (
                          <div><span className="font-medium">Candidate Concerns:</span> {resume.candidate_concerns}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* AI Processing Info */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">AI Processing Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Extraction Model:</span> {getFieldValue(resume.ai_extraction_model)}
                      </div>
                      <div>
                        <span className="font-medium">Validation Model:</span> {getFieldValue(resume.ai_validation_model)}
                      </div>
                      <div>
                        <span className="font-medium">Validation Confidence:</span> 
                        <span className={getConfidenceColor(resume.ai_validation_confidence)}>
                          {resume.ai_validation_confidence ? `${Math.round(resume.ai_validation_confidence * 100)}%` : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Version:</span> {resume.version_number}
                      </div>
                    </div>
                    {resume.extraction_notes && (
                      <div className="mt-2 text-sm">
                        <span className="font-medium">Extraction Notes:</span> {resume.extraction_notes}
                      </div>
                    )}
                    {resume.validation_notes && (
                      <div className="mt-2 text-sm">
                        <span className="font-medium">Validation Notes:</span> {resume.validation_notes}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => onViewResume(resume)}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View Full
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onContactResume(resume)}
                    className="flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Contact
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAddToShortlist(resume)}
                    className="flex items-center gap-2"
                  >
                    <Heart className="h-4 w-4" />
                    Shortlist
                  </Button>
                </div>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleExpanded(resume.id)}
                  className="flex items-center gap-2"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      View More
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
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
