import React, { useState, useEffect, useMemo } from 'react';
import { apiClient, Resume, JobMatch } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import HelpSection from '@/components/HelpSection';

const CITIZENSHIP_OPTIONS = [
  'U.S. Citizen',
  'U.S. Citizen (assumed)',
  'U.S. Permanent Resident (Green Card)',
  'Canadian Citizen',
  'Canadian Citizen (assumed)',
  'Mexican Citizen',
  'Mexican Citizen (assumed)',
  'Other Citizenship / Specify'
];

const WORK_AUTHORIZATION_OPTIONS = [
  'U.S. Citizen / Green Card',
  'U.S. Citizen / Green Card (assumed)',
  'Requires TN Visa',
  'H1B or Other Visa Required',
  'Employment Authorization Document (EAD)',
  'Other / Specify'
];

type DropdownWithCustomProps = {
  id: string;
  label: string;
  value?: string | null;
  options: string[];
  onChange: (value: string | undefined) => void;
};

const DropdownWithCustom: React.FC<DropdownWithCustomProps> = ({ id, label, value, options, onChange }) => {
  const [availableOptions, setAvailableOptions] = useState<string[]>(() => {
    if (value && value.trim() && !options.includes(value)) {
      return [...options, value];
    }
    return options;
  });
  const [mode, setMode] = useState<'list' | 'custom'>(() =>
    value && value.trim() && !options.includes(value) ? 'list' : 'list'
  );
  const [customValue, setCustomValue] = useState('');

  useEffect(() => {
    if (value && value.trim() && !availableOptions.includes(value)) {
      setAvailableOptions(prev => [...prev, value]);
    }
  }, [value, availableOptions]);

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = event.target.value;
    if (selected === '__custom__') {
      setCustomValue('');
      setMode('custom');
      return;
    }

    if (!selected) {
      onChange(undefined);
      return;
    }

    onChange(selected);
  };

  const handleSaveCustom = () => {
    if (!customValue.trim()) {
      return;
    }
    const trimmed = customValue.trim();
    setAvailableOptions(prev => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    onChange(trimmed);
    setMode('list');
  };

  const handleCancelCustom = () => {
    setCustomValue('');
    setMode('list');
  };

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {mode === 'list' ? (
        <select
          id={id}
          value={value && availableOptions.includes(value) ? value : (value ? value : '')}
          onChange={handleSelectChange}
          className="w-full p-2 border border-gray-300 rounded-md"
        >
          <option value="">Select {label.toLowerCase()}</option>
          {availableOptions.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
          <option value="__custom__">Add new...</option>
        </select>
      ) : (
        <div className="flex gap-2">
          <Input
            id={`${id}-custom`}
            placeholder={`Enter ${label.toLowerCase()}`}
            value={customValue}
            onChange={event => setCustomValue(event.target.value)}
          />
          <Button type="button" onClick={handleSaveCustom}>
            Save
          </Button>
          <Button type="button" variant="ghost" onClick={handleCancelCustom}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};

const parseMaybeJson = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const startsLikeJson = (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'));

  if (startsLikeJson) {
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      console.debug('Failed to parse JSON field, falling back to raw string', error);
    }
  }

  return trimmed;
};

const formatListField = (value: unknown, fallback = 'Not provided'): string => {
  const parsed = parseMaybeJson(value);

  if (parsed === null || parsed === undefined) {
    return fallback;
  }

  if (Array.isArray(parsed)) {
    const cleaned = parsed
      .map((item) => (typeof item === 'string' ? item.trim() : item))
      .filter((item) => item && item !== '' && item !== null && item !== undefined);
    return cleaned.length ? cleaned.join(', ') : fallback;
  }

  if (typeof parsed === 'object') {
    const values = Object.values(parsed as Record<string, unknown>)
      .flatMap((item) => {
        if (Array.isArray(item)) {
          return item;
        }
        if (item && typeof item === 'object') {
          return Object.values(item as Record<string, unknown>);
        }
        return [item];
      })
      .map((item) => (typeof item === 'string' ? item.trim() : item))
      .filter((item) => item && item !== '' && item !== null && item !== undefined);

    return values.length ? values.join(', ') : fallback;
  }

  if (typeof parsed === 'string') {
    return parsed;
  }

  return String(parsed);
};

const formatBoolean = (value: boolean | null | undefined, fallback = 'Not provided'): string => {
  if (value === true) {
    return 'Yes';
  }
  if (value === false) {
    return 'No';
  }
  return fallback;
};

const formatCurrency = (value: unknown): string => {
  if (value === null || value === undefined || value === '') {
    return 'Not provided';
  }

  const numericValue = Number(value);
  if (!Number.isNaN(numericValue) && Number.isFinite(numericValue)) {
    return `$${Math.round(numericValue).toLocaleString()}`;
  }

  if (typeof value === 'string') {
    return value;
  }

  return String(value);
};

const resolveCurrentTitle = (resume: Resume): string => {
  return resume.current_title || resume.current_position || resume.title || 'Not provided';
};

const extractPrimaryIndustry = (resume: Resume): string => {
  if (resume.primary_industry) {
    return resume.primary_industry;
  }

  const parsed = parseMaybeJson(resume.industry_experience as unknown);

  if (!parsed) {
    return 'Not provided';
  }

  if (typeof parsed === 'string') {
    return parsed || 'Not provided';
  }

  if (Array.isArray(parsed)) {
    const first = parsed.find((item) => typeof item === 'string' && item.trim());
    return typeof first === 'string' ? first : 'Not provided';
  }

  if (typeof parsed === 'object') {
    const record = parsed as Record<string, unknown>;
    const direct = record.primary_industry || record.industry || record.industry_sector;
    if (typeof direct === 'string' && direct.trim()) {
      return direct;
    }

    if (Array.isArray(record.industries)) {
      const firstIndustry = record.industries.find((item) => typeof item === 'string' && item.trim());
      if (typeof firstIndustry === 'string') {
        return firstIndustry;
      }
    }
  }

  return 'Not provided';
};

const extractPrimaryFunction = (resume: Resume): string => {
  if (resume.primary_function) {
    return resume.primary_function;
  }

  const parsed = parseMaybeJson(resume.industry_experience as unknown);

  if (!parsed) {
    return 'Not provided';
  }

  if (typeof parsed === 'object' && parsed !== null) {
    const record = parsed as Record<string, unknown>;
    const direct = record.primary_function || record.function_type;
    if (typeof direct === 'string' && direct.trim()) {
      return direct;
    }

    if (Array.isArray(record.functions)) {
      const firstFunction = record.functions.find((item) => typeof item === 'string' && item.trim());
      if (typeof firstFunction === 'string') {
        return firstFunction;
      }
    }
  }

  if (typeof parsed === 'string') {
    return parsed;
  }

  return 'Not provided';
};

// Work Experience Display Component
const WorkExperienceDisplay: React.FC<{ resumeId: number; limit?: number }> = ({ resumeId, limit }) => {
  const [workExperience, setWorkExperience] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorkExperience = async () => {
      try {
        const data = await apiClient.getResumeWorkExperience(resumeId.toString());
        setWorkExperience(data);
      } catch (error) {
        console.error('Error fetching work experience:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkExperience();
  }, [resumeId]);

  if (loading) {
    return <div className="text-gray-500 text-sm">Loading work experience...</div>;
  }

  if (workExperience.length === 0) {
    return <div className="text-gray-500 text-sm">No work experience data available</div>;
  }

  const displayedExperience = limit ? workExperience.slice(0, limit) : workExperience;
  const remainingCount = limit && workExperience.length > limit ? workExperience.length - limit : 0;

  return (
    <div className="space-y-3">
      {displayedExperience.map((exp, index) => (
        <div key={index} className="border rounded-lg p-3 bg-gray-50">
          <div className="font-semibold text-sm">{exp.position_title || 'Unknown Position'}</div>
          <div className="text-sm text-gray-600">{exp.company_name || 'Unknown Company'}</div>
          <div className="text-xs text-gray-500">
            {exp.start_date && exp.end_date ? `${exp.start_date} - ${exp.end_date}` : 'Dates not available'}
            {exp.is_current_position && ' (Current)'}
          </div>
          {exp.industry && (
            <div className="text-xs text-blue-600">Industry: {exp.industry}</div>
          )}
          {exp.function_type && (
            <div className="text-xs text-green-600">Function: {exp.function_type}</div>
          )}
        </div>
      ))}
      {remainingCount > 0 && (
        <div className="text-xs text-gray-500">
          +{remainingCount} more position{remainingCount === 1 ? '' : 's'} available in Advanced Details
        </div>
      )}
    </div>
  );
};

// Education Display Component
const EducationDisplay: React.FC<{ resumeId: number; limit?: number }> = ({ resumeId, limit }) => {
  const [education, setEducation] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEducation = async () => {
      try {
        const data = await apiClient.getResumeEducation(resumeId.toString());
        setEducation(data);
      } catch (error) {
        console.error('Error fetching education:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEducation();
  }, [resumeId]);

  if (loading) {
    return <div className="text-gray-500 text-sm">Loading education...</div>;
  }

  if (education.length === 0) {
    return <div className="text-gray-500 text-sm">No education data available</div>;
  }

  const displayedEducation = limit ? education.slice(0, limit) : education;
  const remainingCount = limit && education.length > limit ? education.length - limit : 0;

  return (
    <div className="space-y-3">
      {displayedEducation.map((edu, index) => (
        <div key={index} className="border rounded-lg p-3 bg-gray-50">
          <div className="font-semibold text-sm">{edu.degree_level || 'Unknown Degree'}</div>
          <div className="text-sm text-gray-600">{edu.institution_name || 'Unknown Institution'}</div>
          {edu.field_of_study && (
            <div className="text-sm text-blue-600">Field: {edu.field_of_study}</div>
          )}
          {edu.graduation_date && (
            <div className="text-xs text-gray-500">Graduated: {edu.graduation_date}</div>
          )}
          {edu.gpa && (
            <div className="text-xs text-green-600">GPA: {edu.gpa}</div>
          )}
        </div>
      ))}
      {remainingCount > 0 && (
        <div className="text-xs text-gray-500">
          +{remainingCount} more education entr{remainingCount === 1 ? 'y' : 'ies'} available in Advanced Details
        </div>
      )}
    </div>
  );
};

// Skills Display Component (Updated to use API)
const SkillsDisplay: React.FC<{ resumeId?: number; skillsJson?: string }> = ({ resumeId, skillsJson }) => {
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        if (resumeId) {
          const data = await apiClient.getResumeSkills(resumeId.toString());
          setSkills(data);
        } else if (skillsJson) {
          const parsedSkills = JSON.parse(skillsJson);
          setSkills(Array.isArray(parsedSkills) ? parsedSkills : []);
        }
      } catch (error) {
        console.error('Error fetching skills:', error);
        setSkills([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSkills();
  }, [resumeId, skillsJson]);

  if (loading) {
    return <div className="text-gray-500 text-sm">Loading skills...</div>;
  }

  if (skills.length === 0) {
    return <div className="text-gray-500 text-sm">No skills data available</div>;
  }

  const maxSkillsToShow = 20;
  const skillsToShow = isExpanded ? skills : skills.slice(0, maxSkillsToShow);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">Skills ({skills.length} total)</span>
        {skills.length > maxSkillsToShow && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs"
          >
            {isExpanded ? 'Show Less' : 'Show All'}
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {skillsToShow.map((skill, index) => (
          <span
            key={index}
            className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
          >
            {skill.skill_name || 'Unknown Skill'}
            {skill.proficiency_level && (
              <span className="ml-1 text-blue-600">({skill.proficiency_level})</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
};

export default function ResumeManagement() {
  const [activeTab, setActiveTab] = useState<'database' | 'upload' | 'matching' | 'results'>('database');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [processingLog, setProcessingLog] = useState<string[]>([]);
  const [aiStatus, setAiStatus] = useState<{
    checked: boolean;
    success: boolean;
    message: string;
    aiResponse?: string;
    timestamp?: string;
    agent?: string;
    model?: string;
  }>({ checked: false, success: false, message: '' });
  
  // Resume Database Management
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredResumes, setFilteredResumes] = useState<Resume[]>([]);
  const [expandedResumes, setExpandedResumes] = useState<Set<number>>(new Set());
  const [showMoreFields, setShowMoreFields] = useState<Set<number>>(new Set());
  const [editingResume, setEditingResume] = useState<string | number | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Resume>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const resumesPerPage = 4;
  
  // Resume Upload and Processing
  const [resumeFiles, setResumeFiles] = useState<FileList | null>(null);
  const [resumeData, setResumeData] = useState({
    jobs_json_path: '',
    tracking_csv_path: '',
    ai_provider: 'openai',
    model: 'gpt-5-mini'
  });
  
  // Job Matches
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [reprocessSelectedIds, setReprocessSelectedIds] = useState<number[]>([]);
  const [reprocessLoading, setReprocessLoading] = useState(false);

  const reprocessOptions = useMemo(() => (
    resumes
      .filter(resume => resume.is_latest_version && resume.original_file_path)
      .map(resume => {
        const numericId = Number(resume.id);
        if (!Number.isFinite(numericId)) {
          return null;
        }
        return {
          id: numericId,
          name: resume.candidate_name?.trim() ? resume.candidate_name : resume.filename,
        };
      })
      .filter((option): option is { id: number; name: string } => option !== null)
      .sort((a, b) => a.name.localeCompare(b.name))
  ), [resumes]);

  const handleReprocessSelection = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIds = Array.from(event.target.selectedOptions).map(option => Number(option.value));
    setReprocessSelectedIds(selectedIds.filter(id => Number.isFinite(id)));
  };

  const handleSelectAllReprocess = () => {
    setReprocessSelectedIds(reprocessOptions.map(option => option.id));
  };

  const handleClearReprocessSelection = () => {
    setReprocessSelectedIds([]);
  };

  const handleResumeReprocess = async () => {
    if (reprocessSelectedIds.length === 0) {
      setError('Please select at least one resume to reprocess.');
      return;
    }

    setReprocessLoading(true);
    setError(null);
    addLogEntry(`[REPROCESS] Starting reprocess of ${reprocessSelectedIds.length} resume(s)`);

    try {
      const response = await apiClient.reprocessResumes(reprocessSelectedIds);
      addLogEntry(`[REPROCESS] Completed: ${response.successful}/${response.requested} succeeded`);

      const resumeLookup = new Map(resumes.map(resume => [Number(resume.id), resume]));
      if (Array.isArray(response.results)) {
        response.results.forEach((result: any) => {
          const resumeInfo = resumeLookup.get(result.resume_id);
          const label = resumeInfo?.candidate_name || resumeInfo?.filename || `Resume ID ${result.resume_id}`;
          if (result.status === 'success') {
            const action = result.details?.action || 'processed';
            addLogEntry(`[REPROCESS] ✅ ${label}: ${action}`);
          } else {
            addLogEntry(`[REPROCESS] ❌ ${label}: ${result.message || 'Failed'}`);
          }
        });
      }

      await loadResumes();
      setReprocessSelectedIds([]);
    } catch (err: any) {
      console.error('Reprocess failed:', err);
      const message = err?.response?.data?.detail || err?.message || 'Reprocess failed';
      addLogEntry(`[REPROCESS] ERROR: ${message}`);
      setError(message);
    } finally {
      setReprocessLoading(false);
    }
  };

  const toggleExpanded = (resumeId: number) => {
    const newExpanded = new Set(expandedResumes);
    if (newExpanded.has(resumeId)) {
      newExpanded.delete(resumeId);
    } else {
      newExpanded.add(resumeId);
    }
    setExpandedResumes(newExpanded);
  };

  const setAdvancedView = (resumeId: number, enabled: boolean) => {
    setShowMoreFields((prev) => {
      const next = new Set(prev);
      if (enabled) {
        next.add(resumeId);
      } else {
        next.delete(resumeId);
      }
      return next;
    });
  };

  const startEditing = (resume: Resume) => {
    setEditingResume(resume.id);
    setEditFormData({
      candidate_name: resume.candidate_name || '',
      first_name: resume.first_name || '',
      last_name: resume.last_name || '',
      email: resume.email || '',
      phone: resume.phone || '',
      location: resume.location || '',
      title: resume.title || '',
      current_position: resume.current_position || '',
      current_company: resume.current_company || '',
      current_salary: resume.current_salary || undefined,
      desired_salary: resume.desired_salary || undefined,
      work_authorization: resume.work_authorization || '',
      citizenship: resume.citizenship || '',
      linkedin_url: resume.linkedin_url || '',
      portfolio_url: resume.portfolio_url || '',
      github_url: resume.github_url || '',
      willing_to_relocate: resume.willing_to_relocate || undefined,
      willing_to_travel: resume.willing_to_travel || undefined,
      remote_work_preference: resume.remote_work_preference || ''
    });
  };

  const cancelEditing = () => {
    setEditingResume(null);
    setEditFormData({});
  };

  const saveContactFields = async () => {
    if (!editingResume) return;

    try {
      setLoading(true);
      const result = await apiClient.updateResumeContactFields(editingResume.toString(), editFormData);
      
      // Update the resume in the local state
      setResumes(prevResumes => 
        prevResumes.map(resume => 
          resume.id === editingResume 
            ? { ...resume, ...editFormData, updated_at: new Date().toISOString() }
            : resume
        )
      );

      setMessage(`✅ ${result.message}`);
      setEditingResume(null);
      setEditFormData({});
    } catch (err: any) {
      setError(`Failed to update resume: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Pagination helpers
  const totalPages = Math.ceil(filteredResumes.length / resumesPerPage);
  const startIndex = (currentPage - 1) * resumesPerPage;
  const endIndex = startIndex + resumesPerPage;
  const currentResumes = filteredResumes.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Reset expanded states when changing pages
      setExpandedResumes(new Set());
      setShowMoreFields(new Set());
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  // Function to format skills from JSON string or array
  const formatSkills = (skillsData: string | string[] | null): string => {
    if (!skillsData) return '';
    
    // If it's already an array, join it
    if (Array.isArray(skillsData)) {
      return skillsData.join(', ');
    }
    
    // If it's a string, try to parse it as JSON
    try {
      const skills = JSON.parse(skillsData);
      if (Array.isArray(skills)) {
        // Group skills by category for better organization
        const skillsByCategory: { [key: string]: string[] } = {};
        
        skills.forEach((skill: any) => {
          if (typeof skill === 'string') {
            skillsByCategory['General'] = skillsByCategory['General'] || [];
            skillsByCategory['General'].push(skill);
          } else {
            const skillName = skill.skill_name || skill.name || 'Unknown Skill';
            const category = skill.skill_category || skill.category || 'General';
            
            skillsByCategory[category] = skillsByCategory[category] || [];
            skillsByCategory[category].push(skillName);
          }
        });
        
        // Format grouped skills
        return Object.entries(skillsByCategory)
          .map(([category, skillList]) => {
            const uniqueSkills = [...new Set(skillList)]; // Remove duplicates
            return `**${category}:**\n${uniqueSkills.map(skill => `• ${skill}`).join('\n')}`;
          })
          .join('\n\n');
      }
      return skillsData;
    } catch (error) {
      // If parsing fails, return the raw string
      return skillsData;
    }
  };

  // Function to format work experience from JSON string
  const formatExperience = (experienceJson: string | null): string => {
    if (!experienceJson) return '';
    
    try {
      const experiences = JSON.parse(experienceJson);
      if (Array.isArray(experiences)) {
        return experiences.map((exp: any, index: number) => {
          const achievements = exp.key_achievements && exp.key_achievements.length > 0 
            ? exp.key_achievements.map((achievement: string) => `• ${achievement}`).join('\n   ')
            : 'None listed';
          
          return `${index + 1}. **${exp.position || 'Unknown Position'}** at ${exp.company || 'Unknown Company'}
   📅 Duration: ${exp.start_date || 'Unknown'} - ${exp.end_date || 'Present'}
   🏭 Industry: ${exp.industry || 'Not specified'}
   💼 Function: ${exp.function || 'Not specified'}
   👥 Team Size: ${exp.team_size_managed || 'Not specified'}
   💰 Budget: ${exp.budget_responsibility || 'Not specified'}
   🎯 Key Achievements:
   ${achievements}`;
        }).join('\n\n');
      }
      return experienceJson;
    } catch (error) {
      return experienceJson;
    }
  };

  // Function to format education from JSON string
  const formatEducation = (educationJson: string | null): string => {
    if (!educationJson) return '';
    
    try {
      const educations = JSON.parse(educationJson);
      if (Array.isArray(educations)) {
        return educations.map((edu: any, index: number) => {
          return `${index + 1}. ${edu.degree_level || 'Degree'} in ${edu.field_of_study || 'Unknown Field'}
   Institution: ${edu.institution || 'Unknown Institution'}
   Graduation: ${edu.graduation_date || 'Unknown'}
   GPA: ${edu.gpa || 'Not provided'}
   Relevant Coursework: ${edu.relevant_coursework ? edu.relevant_coursework.join(', ') : 'Not specified'}`;
        }).join('\n\n');
      }
      return educationJson;
    } catch (error) {
      return educationJson;
    }
  };

  // Function to format certifications from JSON string
  const formatCertifications = (certificationsJson: string | null): string => {
    if (!certificationsJson) return '';
    
    try {
      const certifications = JSON.parse(certificationsJson);
      if (Array.isArray(certifications)) {
        return certifications.map((cert: any, index: number) => {
          return `${index + 1}. ${cert.certification_name || 'Unknown Certification'}
   Issuing Organization: ${cert.issuing_organization || 'Unknown'}
   Issue Date: ${cert.issue_date || 'Unknown'}
   Expiry Date: ${cert.expiry_date || 'Unknown'}
   Type: ${cert.certification_type || 'Not specified'}`;
        }).join('\n\n');
      }
      return certificationsJson;
    } catch (error) {
      return certificationsJson;
    }
  };

  // Function to format key responsibilities from JSON string
  const formatKeyResponsibilities = (responsibilitiesJson: string | null): string => {
    if (!responsibilitiesJson) return '';
    
    try {
      const responsibilities = JSON.parse(responsibilitiesJson);
      if (Array.isArray(responsibilities)) {
        return responsibilities.map((resp: any, index: number) => {
          return `${index + 1}. ${resp.responsibility || 'Unknown Responsibility'}
   Category: ${resp.category || 'Not specified'}
   Years Experience: ${resp.years_experience || 'Not specified'}
   Achievements: ${resp.achievements ? resp.achievements.join(', ') : 'None listed'}`;
        }).join('\n\n');
      }
      return responsibilitiesJson;
    } catch (error) {
      return responsibilitiesJson;
    }
  };

  // Define field groups
  const getTopFields = (resume: Resume) => [
    { label: 'Email', value: resume.email, key: 'email' },
    { label: 'Phone', value: resume.phone, key: 'phone' },
    { label: 'Location', value: resume.location, key: 'location' },
    { label: 'Title', value: resume.title, key: 'title' },
    { label: 'Current Position', value: resume.current_position, key: 'current_position' },
    { label: 'Current Company', value: resume.current_company, key: 'current_company' },
    { label: 'Years Experience', value: resume.years_experience, key: 'years_experience' },
    { label: 'Work Authorization', value: resume.work_authorization, key: 'work_authorization' },
    { label: 'Citizenship', value: resume.citizenship, key: 'citizenship' },
    { label: 'Industry', value: resume.industry_experience, key: 'industry_experience' }
  ];

  const getAdditionalFields = (resume: Resume) => [
    { label: 'Seniority Level', value: resume.seniority_level, key: 'seniority_level' },
    { label: 'Career Level', value: resume.career_level, key: 'career_level' },
    { label: 'Management Experience', value: resume.management_experience !== null ? (resume.management_experience ? 'Yes' : 'No') : null, key: 'management_experience' },
    { label: 'Willing to Relocate', value: resume.willing_to_relocate !== null ? (resume.willing_to_relocate ? 'Yes' : 'No') : null, key: 'willing_to_relocate' },
    { label: 'Remote Work Preference', value: resume.remote_work_preference, key: 'remote_work_preference' },
    { label: 'Current Salary', value: resume.current_salary ? `$${resume.current_salary.toLocaleString()}` : null, key: 'current_salary' },
    { label: 'Desired Salary', value: resume.desired_salary ? `$${resume.desired_salary.toLocaleString()}` : null, key: 'desired_salary' },
    { label: 'Availability Date', value: resume.availability_date, key: 'availability_date' },
    { label: 'Willing to Travel', value: resume.willing_to_travel !== null ? (resume.willing_to_travel ? 'Yes' : 'No') : null, key: 'willing_to_travel' },
    { label: 'Skills', value: formatSkills(resume.skills || null), key: 'skills' },
    { label: 'Languages', value: resume.languages, key: 'languages' },
    { label: 'Certifications', value: resume.certifications, key: 'certifications' },
    { label: 'LinkedIn', value: resume.linkedin_url ? 'Provided' : null, key: 'linkedin_url', isLink: true },
    { label: 'Portfolio', value: resume.portfolio_url ? 'Provided' : null, key: 'portfolio_url', isLink: true },
    { label: 'GitHub', value: resume.github_url ? 'Provided' : null, key: 'github_url', isLink: true },
    
    // Enhanced fields for better job matching
    // Soft skills
    { label: 'Communication Skills', value: resume.communication_skills, key: 'communication_skills' },
    { label: 'Leadership Experience', value: resume.leadership_experience !== null ? (resume.leadership_experience ? 'Yes' : 'No') : null, key: 'leadership_experience' },
    { label: 'Teamwork Skills', value: resume.teamwork_skills, key: 'teamwork_skills' },
    { label: 'Problem Solving', value: resume.problem_solving, key: 'problem_solving' },
    { label: 'Management Style', value: resume.management_style, key: 'management_style' },
    
    // Work preferences
    { label: 'Travel Percentage', value: resume.travel_percentage, key: 'travel_percentage' },
    { label: 'Shift Preferences', value: resume.shift_preferences, key: 'shift_preferences' },
    { label: 'Relocation Willingness', value: resume.relocation_willingness, key: 'relocation_willingness' }
  ];

  const getExtendedFields = (resume: Resume) => [
    { label: 'Team Size Managed', value: resume.team_size_managed, key: 'team_size_managed' },
    { label: 'Budget Responsibility', value: resume.budget_responsibility, key: 'budget_responsibility' },
    { label: 'Awards', value: resume.awards, key: 'awards' },
    { label: 'Publications', value: resume.publications, key: 'publications' },
    { label: 'Volunteer Experience', value: resume.volunteer_experience, key: 'volunteer_experience' },
    { label: 'Interests', value: resume.interests, key: 'interests' },
    { label: 'First Name', value: resume.first_name, key: 'first_name' },
    { label: 'Middle Initial', value: resume.middle_initial, key: 'middle_initial' },
    { label: 'Last Name', value: resume.last_name, key: 'last_name' },
    { label: 'File Size', value: resume.file_size ? `${(resume.file_size / 1024).toFixed(1)} KB` : null, key: 'file_size' },
    { label: 'File Type', value: resume.file_type, key: 'file_type' },
    { label: 'Content Hash', value: resume.content_hash ? resume.content_hash.substring(0, 8) + '...' : null, key: 'content_hash' },
    { label: 'Created At', value: resume.created_at ? new Date(resume.created_at).toLocaleDateString() : null, key: 'created_at' },
    { label: 'Updated At', value: resume.updated_at ? new Date(resume.updated_at).toLocaleDateString() : null, key: 'updated_at' },
    { label: 'Version Number', value: resume.version_number, key: 'version_number' },
    
    // Enhanced industry experience fields
    { label: 'Facility Types', value: resume.facility_types, key: 'facility_types' },
    { label: 'Safety Certifications', value: resume.safety_certifications, key: 'safety_certifications' },
    { label: 'Regulatory Experience', value: resume.regulatory_experience, key: 'regulatory_experience' },
    { label: 'Environmental Conditions', value: resume.environmental_conditions, key: 'environmental_conditions' },
    { label: 'Key Responsibilities', value: resume.key_responsibilities, key: 'key_responsibilities' },
    
    // Enhanced work experience fields
    { label: 'Enhanced Experience', value: resume.enhanced_experience, key: 'enhanced_experience' },
    { label: 'Enhanced Education', value: resume.enhanced_education, key: 'enhanced_education' },
    { label: 'Enhanced Skills', value: resume.enhanced_skills, key: 'enhanced_skills' },
    { label: 'Enhanced Certifications', value: resume.enhanced_certifications, key: 'enhanced_certifications' }
  ];

  // Load resumes when component mounts
  useEffect(() => {
    loadResumes();
  }, []);

  // Filter resumes based on search term
  useEffect(() => {
    const filtered = resumes.filter((resume: Resume) =>
      resume.candidate_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resume.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (typeof resume.skills === 'string' ? resume.skills.toLowerCase() : Array.isArray(resume.skills) ? resume.skills.join(' ').toLowerCase() : '').includes(searchTerm.toLowerCase()) ||
      resume.location?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredResumes(filtered);
    // Reset to first page when search term changes
    setCurrentPage(1);
  }, [resumes, searchTerm]);

  const loadResumes = async () => {
    try {
      const resumeList = await apiClient.getResumes();
      setResumes(resumeList);
    } catch (err) {
      console.error('Error loading resumes:', err);
    }
  };

  const loadMatches = async () => {
    try {
      const matchList = await apiClient.getJobMatches();
      setMatches(matchList);
    } catch (err) {
      console.error('Error loading matches:', err);
    }
  };

  const addLogEntry = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setProcessingLog((prev: string[]) => [...prev, `[${timestamp}] ${message}`]);
  };

  const clearLog = () => {
    setProcessingLog([]);
  };

  const verifyAiConnection = async () => {
    setLoading(true);
    setError(null);
    addLogEntry('🔍 Verifying AI API connection...');
    
    try {
      const response = await fetch('/api/ai/verify');
      const result = await response.json();
      
      if (result.success) {
        setAiStatus({
          checked: true,
          success: true,
          message: 'AI connection verified successfully',
          aiResponse: result.ai_response,
          timestamp: result.timestamp,
          agent: result.agent,
          model: result.model
        });
        addLogEntry('✅ AI connection verified successfully');
        addLogEntry(`🤖 AI Response: ${result.ai_response}`);
        addLogEntry(`📅 Timestamp: ${result.timestamp}`);
        addLogEntry(`🔧 Agent: ${result.agent || 'Unknown'}`);
        addLogEntry(`🔧 Model: ${result.model || 'Unknown'}`);
      } else {
        setAiStatus({
          checked: true,
          success: false,
          message: result.message || 'AI connection failed',
          timestamp: result.timestamp
        });
        addLogEntry(`❌ AI connection failed: ${result.message}`);
        if (result.error) {
          addLogEntry(`🔍 Error details: ${result.error}`);
        }
      }
    } catch (err: any) {
      console.error('AI verification failed:', err);
      setAiStatus({
        checked: true,
        success: false,
        message: err.message || 'AI verification failed',
        timestamp: new Date().toISOString()
      });
      addLogEntry(`❌ AI verification failed: ${err.message}`);
      setError(err.message || 'AI verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeMatch = async () => {
    if (!resumeFiles || resumeFiles.length === 0) {
      setError('Please select resume files');
      return;
    }

    if (!resumeData.jobs_json_path.trim()) {
      setError('Please enter the jobs JSON path');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage('Processing resumes and matching to jobs...');
    clearLog();

    try {
      addLogEntry('Starting resume matching process...');
      addLogEntry(`Jobs JSON Path: ${resumeData.jobs_json_path}`);
      addLogEntry(`Tracking CSV Path: ${resumeData.tracking_csv_path}`);
      addLogEntry(`AI Provider: ${resumeData.ai_provider}`);
      addLogEntry(`Model: ${resumeData.model}`);
      
      const files = Array.from(resumeFiles);
      addLogEntry(`Processing ${files.length} resume file(s)...`);
      
      const result = await apiClient.matchResumes(JSON.stringify({
        ...resumeData,
        resume_files: files
      }));
      
      addLogEntry('Resume matching completed successfully!');
      setResult(result);
      setMessage('Resume matching completed successfully!');
      
      // Refresh data
      await loadResumes();
      await loadMatches();
      
    } catch (err: any) {
      console.error('Resume matching failed:', err);
      addLogEntry(`ERROR: ${err.message || 'Resume matching failed'}`);
      setError(err.message || 'Resume matching failed');
      setMessage('');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeUpload = async () => {
    if (!resumeFiles || resumeFiles.length === 0) {
      setError('Please select resume files to upload');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage('Uploading and processing resumes...');
    clearLog();
    
    addLogEntry(`Starting upload of ${resumeFiles.length} resume file(s)`);

    try {
      // Upload resumes using the new endpoint
      addLogEntry('Sending files to server for processing...');
      addLogEntry(`[DEBUG] Calling apiClient.uploadResumes with ${resumeFiles.length} files`);
      addLogEntry(`[DEBUG] File names: ${Array.from(resumeFiles as FileList).map((f: File) => f.name).join(', ')}`);
      
      const result = await apiClient.uploadResumes(Array.from(resumeFiles));
      
      addLogEntry('Server processing completed successfully');
      
      // Debug: Log the raw result
      console.log('[FRONTEND_LOG] Raw API result:', result);
      addLogEntry(`[FRONTEND_LOG] Raw result type: ${typeof result}`);
      addLogEntry(`[FRONTEND_LOG] Raw result keys: ${result ? Object.keys(result).join(', ') : 'null'}`);
      
      // Process the result to show detailed information
      if (result.uploaded_resumes && result.uploaded_resumes.length > 0) {
        // Debug: Log the full response structure
        console.log('[FRONTEND_LOG] Upload response:', result);
        addLogEntry(`[FRONTEND_LOG] Full response received with ${result.uploaded_resumes.length} resumes`);
        
        // Log performance metrics if available
        if (result.performance_metrics) {
          addLogEntry(`📊 PERFORMANCE METRICS:`);
          addLogEntry(`  Total Upload Time: ${result.performance_metrics.total_upload_time}s`);
          addLogEntry(`  Files Processed: ${result.performance_metrics.files_processed}`);
          addLogEntry(`  Average Time per File: ${result.performance_metrics.average_time_per_file}s`);
          addLogEntry(`  Concurrent Workers: ${result.performance_metrics.concurrent_workers}`);
          addLogEntry(`  Batch Count: ${result.performance_metrics.batch_count}`);
          addLogEntry(`---`);
        }
        
        result.uploaded_resumes.forEach((resume: Resume, index: number) => {
          // Debug: Log each resume object
          console.log(`[FRONTEND_LOG] Resume ${index + 1}:`, resume);
          addLogEntry(`[FRONTEND_LOG] Resume ${index + 1} keys: ${Object.keys(resume).join(', ')}`);
          
          addLogEntry(`File ${index + 1}: ${resume.filename}`);
          addLogEntry(`  Action: ${resume.action}`);
          addLogEntry(`  Candidate ID: ${resume.candidate_id}`);
          addLogEntry(`  Version: ${resume.version_number}`);
          addLogEntry(`  AI Extraction: ${resume.ai_extraction_used ? 'Yes' : 'No'}`);
          addLogEntry(`  Method: ${resume.extraction_method}`);
          addLogEntry(`  Content Length: ${resume.content_length} characters`);
          
          // Log processing time if available
          if (resume.processing_time) {
            addLogEntry(`  Processing Time: ${resume.processing_time}s`);
          }
          
          // Log AI extraction performance metrics if available
          if (resume.extracted_data && resume.extracted_data.performance_metrics) {
            const metrics = resume.extracted_data.performance_metrics;
            addLogEntry(`  🤖 AI EXTRACTION TIMING:`);
            addLogEntry(`    Total AI Time: ${metrics.total_duration}s`);
            addLogEntry(`    Config Load: ${metrics.config_duration}s`);
            addLogEntry(`    Prompt Prep: ${metrics.prompt_prep_duration}s`);
            addLogEntry(`    AI Call: ${metrics.ai_duration}s`);
            addLogEntry(`    JSON Parse: ${metrics.parse_duration}s`);
          }
          
          // Log specific field values for debugging
          addLogEntry(`[FRONTEND_LOG] Resume ${index + 1} field values:`);
          addLogEntry(`  - ai_extraction_used: ${resume.ai_extraction_used} (type: ${typeof resume.ai_extraction_used})`);
          addLogEntry(`  - extraction_method: ${resume.extraction_method} (type: ${typeof resume.extraction_method})`);
          addLogEntry(`  - content_length: ${resume.content_length} (type: ${typeof resume.content_length})`);
          addLogEntry(`  - action: ${resume.action} (type: ${typeof resume.action})`);
          addLogEntry(`  - candidate_id: ${resume.candidate_id} (type: ${typeof resume.candidate_id})`);
                 
                 if (resume.action === 'update_existing') {
                   addLogEntry(`  📝 UPDATED: Existing record refreshed with new AI data`);
                 }
                 
                 if (resume.email_missing) {
                   addLogEntry(`  ⚠️  EMAIL MISSING: No email address found`);
                 }
          
          if (resume.extracted_data) {
            const data = resume.extracted_data;
            addLogEntry(`  Extracted Fields:`);
            if (data.title) addLogEntry(`    Title: ${data.title}`);
            if (data.current_position) addLogEntry(`    Position: ${data.current_position}`);
            if (data.current_company) addLogEntry(`    Company: ${data.current_company}`);
            if (data.years_experience) addLogEntry(`    Experience: ${data.years_experience} years`);
            if (data.seniority_level) addLogEntry(`    Seniority: ${data.seniority_level}`);
            if (data.industry_experience) addLogEntry(`    Industry: ${data.industry_experience}`);
            if (data.management_experience) addLogEntry(`    Management: ${data.management_experience}`);
            if (data.willing_to_relocate) addLogEntry(`    Relocate: ${data.willing_to_relocate}`);
            if (data.citizenship) addLogEntry(`    Citizenship: ${data.citizenship}`);
            if (data.work_authorization) addLogEntry(`    Work Authorization: ${data.work_authorization}`);
            
            if (data.experience) addLogEntry(`    Work Experience: ${data.experience.length} entries`);
            if (data.education) addLogEntry(`    Education: ${data.education.length} entries`);
            if (data.skills) addLogEntry(`    Skills: ${data.skills.length} entries`);
            if (data.certifications) addLogEntry(`    Certifications: ${data.certifications.length} entries`);
          }
          addLogEntry('---');
        });
      }
      
            setMessage(result.message || `Successfully uploaded ${resumeFiles.length} resume(s)`);
            addLogEntry('Upload process completed successfully!');
            
            // Show cleanup information if available
            if (result.cleanup_result) {
              const cleanup = result.cleanup_result;
              addLogEntry(`🧹 CLEANUP: ${cleanup.message}`);
              if (cleanup.cleaned > 0) {
                addLogEntry(`  - Removed ${cleanup.cleaned} old resume version(s)`);
                addLogEntry(`  - Kept ${cleanup.kept} most recent version(s)`);
                if (cleanup.candidates_processed) {
                  addLogEntry(`  - Processed ${cleanup.candidates_processed} candidate(s)`);
                }
              } else {
                addLogEntry(`  - No cleanup needed (${cleanup.kept} resume versions total)`);
              }
            }
            
            await loadResumes();
      
    } catch (err: any) {
      console.error('Resume upload failed:', err);
      addLogEntry(`ERROR: ${err.response?.data?.detail || err.message || 'Resume upload failed'}`);
      setError(err.response?.data?.detail || err.message || 'Resume upload failed');
      setMessage('');
    } finally {
      setLoading(false);
    }
  };

  const handleManualCleanup = async () => {
    if (!confirm('This will remove all resume versions except the 3 most recent ones for each candidate. Continue?')) {
      return;
    }

    setLoading(true);
    setError(null);
    setMessage('Cleaning up old resumes...');
    clearLog();
    addLogEntry('Starting manual cleanup process...');
    
    try {
      const formData = new FormData();
      formData.append('keep_count', '3');
      
      const response = await fetch('/api/resumes/cleanup', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        const cleanup = result.cleanup_result;
        addLogEntry(`🧹 CLEANUP COMPLETED: ${cleanup.message}`);
        if (cleanup.cleaned > 0) {
          addLogEntry(`  - Removed ${cleanup.cleaned} old resume version(s)`);
          addLogEntry(`  - Kept ${cleanup.kept} most recent version(s)`);
          if (cleanup.candidates_processed) {
            addLogEntry(`  - Processed ${cleanup.candidates_processed} candidate(s)`);
          }
        } else {
          addLogEntry(`  - No cleanup needed (${cleanup.kept} resume versions total)`);
        }
        setMessage(result.message);
        await loadResumes();
      } else {
        throw new Error(result.message || 'Cleanup failed');
      }
    } catch (err: any) {
      console.error('Manual cleanup failed:', err);
      addLogEntry(`ERROR: ${err.message || 'Manual cleanup failed'}`);
      setError(err.message || 'Manual cleanup failed');
      setMessage('');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllResumes = async () => {
    const confirmMessage = `⚠️ DANGER: This will PERMANENTLY DELETE ALL RESUMES!\n\nThis includes:\n• ALL resume records from the database\n• ALL resume files from the file system\n• ALL related data (work experience, education, skills, etc.)\n• ALL job-resume matches\n\nThis action CANNOT be undone!\n\nType "DELETE ALL" to confirm:`;
    
    const userInput = prompt(confirmMessage);
    if (userInput !== "DELETE ALL") {
      addLogEntry('❌ Operation cancelled by user');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage('Deleting ALL resumes...');
    clearLog();
    addLogEntry('🚨 STARTING COMPLETE RESUME DELETION');
    addLogEntry('⚠️ This action cannot be undone!');
    
    try {
      const response = await fetch('/api/resumes/all', {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        addLogEntry(`✅ ALL RESUMES DELETED SUCCESSFULLY`);
        addLogEntry(`📊 DELETION SUMMARY:`);
        addLogEntry(`  - Database records deleted: ${result.database_records_deleted}`);
        addLogEntry(`  - Files removed: ${result.files_removed}`);
        addLogEntry(`  - Directories removed: ${result.directories_removed}`);
        
        if (result.counts_before_deletion) {
          addLogEntry(`📋 RECORDS BEFORE DELETION:`);
          Object.entries(result.counts_before_deletion).forEach(([table, count]) => {
            addLogEntry(`  - ${table}: ${count} records`);
          });
        }
        
        addLogEntry(`⚠️ ${result.warning}`);
        setMessage(result.message);
        
        // Refresh data to show empty state
        await loadResumes();
        await loadMatches();
      } else {
        throw new Error(result.message || 'Delete all resumes failed');
      }
    } catch (err: any) {
      console.error('Delete all resumes failed:', err);
      addLogEntry(`ERROR: ${err.message || 'Delete all resumes failed'}`);
      setError(err.message || 'Delete all resumes failed');
      setMessage('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Resume Management</h1>
        <p className="mt-2 text-gray-600">
          Comprehensive resume management, processing, and job matching functionality
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'database', label: 'Resume Database' },
            { id: 'upload', label: 'Upload & Process' },
            { id: 'matching', label: 'AI Matching' },
            { id: 'results', label: 'Match Results' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Resume Database Tab */}
      {activeTab === 'database' && (
        <Card>
          <CardHeader>
            <CardTitle>Resume Database</CardTitle>
            <CardDescription>
              View, search, and manage all resumes in the database
            </CardDescription>
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-600">
                {filteredResumes.length} resume(s) found
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={verifyAiConnection}
                  disabled={loading}
                >
                  🤖 Verify AI Connection
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualCleanup}
                  disabled={loading}
                >
                  🧹 Cleanup Old Resumes
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteAllResumes}
                  disabled={loading}
                >
                  🗑️ Delete ALL Resumes
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* AI Status Display */}
            {aiStatus.checked && (
              <div className={`mb-4 p-4 rounded-lg border ${
                aiStatus.success 
                  ? 'bg-green-50 border-green-200 text-green-800' 
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">
                    {aiStatus.success ? '✅' : '❌'}
                  </span>
                  <span className="font-semibold">
                    AI Connection Status: {aiStatus.success ? 'Verified' : 'Failed'}
                  </span>
                </div>
                <div className="text-sm">
                  <p><strong>Message:</strong> {aiStatus.message}</p>
                  {aiStatus.agent && (
                    <p><strong>AI Agent:</strong> {aiStatus.agent}</p>
                  )}
                  {aiStatus.model && (
                    <p><strong>Model:</strong> {aiStatus.model}</p>
                  )}
                  {aiStatus.aiResponse && (
                    <p><strong>AI Response:</strong> {aiStatus.aiResponse}</p>
                  )}
                  {aiStatus.timestamp && (
                    <p><strong>Checked:</strong> {new Date(aiStatus.timestamp).toLocaleString()}</p>
                  )}
                </div>
              </div>
            )}

            <div className="mb-4">
              <Input
                type="text"
                placeholder="Search resumes by name, skills, or location..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredResumes.length)} of {filteredResumes.length} resume(s)
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Previous
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`px-2 py-1 text-sm border rounded ${
                          currentPage === page
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
            
            <div className="space-y-6">
              {currentResumes.map((resume: Resume) => {
                const isExpanded = expandedResumes.has(typeof resume.id === 'number' ? resume.id : parseInt(resume.id.toString()));
                const showMore = showMoreFields.has(typeof resume.id === 'number' ? resume.id : parseInt(resume.id.toString()));
                
                return (
                  <div key={resume.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                          {resume.candidate_name || 'Unknown Candidate'}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                            {resume.filename}
                          </span>
                          <span>Version: {resume.version_number}</span>
                          <span>Updated: {new Date(resume.updated_at).toLocaleDateString()}</span>
                          {!resume.email && (
                            <span className="text-red-600 font-medium">⚠️ No Email</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          <span>ID: {resume.id} | Candidate ID: {resume.candidate_id}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => startEditing(resume)}
                          className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          Edit Contact Fields
                        </button>
                        <a
                          href={`http://localhost:8000/api/resumes/${resume.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-center"
                        >
                          📄 View/Download Resume
                        </a>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-800 mb-2">Contact Information</h4>
                        <div className="space-y-1 text-sm">
                          <div><span className="font-medium">Email:</span> {resume.email || 'Not provided'}</div>
                          <div><span className="font-medium">Phone:</span> {resume.phone || 'Not provided'}</div>
                          <div><span className="font-medium">Location:</span> {resume.location || 'Not provided'}</div>
                          <div><span className="font-medium">First Name:</span> {resume.first_name || 'Not provided'}</div>
                          <div><span className="font-medium">Last Name:</span> {resume.last_name || 'Not provided'}</div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-800 mb-2">Professional Information</h4>
                        <div className="space-y-1 text-sm">
                          <div><span className="font-medium">Current Title:</span> {resolveCurrentTitle(resume)}</div>
                          <div><span className="font-medium">Current Company:</span> {resume.current_company || 'Not provided'}</div>
                          <div><span className="font-medium">Years Experience:</span> {resume.years_experience ?? 'Not provided'}</div>
                          <div><span className="font-medium">Seniority Level:</span> {resume.seniority_level || 'Not provided'}</div>
                          <div><span className="font-medium">Primary Industry:</span> {extractPrimaryIndustry(resume)}</div>
                          <div><span className="font-medium">Primary Function:</span> {extractPrimaryFunction(resume)}</div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-800 mb-2">Job Matching Criteria</h4>
                        <div className="space-y-1 text-sm">
                          <div><span className="font-medium">Work Authorization:</span> 
                            <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                              resume.work_authorization === 'US Citizen' ? 'bg-green-100 text-green-800' :
                              resume.work_authorization === 'TN Visa' ? 'bg-blue-100 text-blue-800' :
                              resume.work_authorization === 'H1B' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {resume.work_authorization || 'Unknown'}
                            </span>
                          </div>
                          <div><span className="font-medium">Citizenship:</span> {resume.citizenship || 'Not provided'}</div>
                          <div><span className="font-medium">Willing to Relocate:</span> 
                            <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                              resume.willing_to_relocate === true ? 'bg-green-100 text-green-800' :
                              resume.willing_to_relocate === false ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {resume.willing_to_relocate === true ? 'Yes' : 
                               resume.willing_to_relocate === false ? 'No' : 'Unknown'}
                            </span>
                          </div>
                          <div><span className="font-medium">Willing to Travel:</span> 
                            <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                              resume.willing_to_travel === true ? 'bg-green-100 text-green-800' :
                              resume.willing_to_travel === false ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {resume.willing_to_travel === true ? 'Yes' : 
                               resume.willing_to_travel === false ? 'No' : 'Unknown'}
                            </span>
                          </div>
                          <div><span className="font-medium">Remote Work:</span> {resume.remote_work_preference || 'Not specified'}</div>
                        </div>
                      </div>
                      
                      {/* Recruiter-Critical Information */}
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-800 mb-2">Recruiter-Critical Information</h4>
                        <div className="space-y-1 text-sm">
                          <div><span className="font-medium">Alternate Email:</span> {resume.alternate_email || 'Not provided'}</div>
                          <div><span className="font-medium">Alternate Phone:</span> {resume.alternate_phone || 'Not provided'}</div>
                          <div><span className="font-medium">Visa Status:</span> {resume.visa_status || 'Not provided'}</div>
                          <div><span className="font-medium">Housing Status:</span> {resume.housing_status || 'Not provided'}</div>
                          {resume.special_notes && (
                            <div><span className="font-medium">Special Notes:</span> 
                              <div className="mt-1 p-2 bg-white rounded border text-xs">{resume.special_notes}</div>
                            </div>
                          )}
                          {resume.reason_for_leaving && (
                            <div><span className="font-medium">Reason for Leaving:</span> 
                              <div className="mt-1 p-2 bg-white rounded border text-xs">{resume.reason_for_leaving}</div>
                            </div>
                          )}
                          {resume.why_looking_for_new_position && (
                            <div><span className="font-medium">Why Looking for New Position:</span> 
                              <div className="mt-1 p-2 bg-white rounded border text-xs">{resume.why_looking_for_new_position}</div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Skills & Experience Clusters */}
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-800 mb-2">Skills & Experience Clusters</h4>
                        <div className="space-y-2 text-sm">
                          {resume.mechanical_skills && (
                            <div>
                              <span className="font-medium">Mechanical Skills:</span>
                              <div className="mt-1 p-2 bg-white rounded border text-xs">{resume.mechanical_skills}</div>
                            </div>
                          )}
                          {resume.electrical_skills && (
                            <div>
                              <span className="font-medium">Electrical Skills:</span>
                              <div className="mt-1 p-2 bg-white rounded border text-xs">{resume.electrical_skills}</div>
                            </div>
                          )}
                          {resume.software_skills && (
                            <div>
                              <span className="font-medium">Software Skills:</span>
                              <div className="mt-1 p-2 bg-white rounded border text-xs">{resume.software_skills}</div>
                            </div>
                          )}
                          {resume.other_skills && (
                            <div>
                              <span className="font-medium">Other Skills:</span>
                              <div className="mt-1 p-2 bg-white rounded border text-xs">{resume.other_skills}</div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Education & Certifications */}
                      {resume.certifications && (
                        <div className="bg-green-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-gray-800 mb-2">Education & Certifications</h4>
                          <div className="space-y-1 text-sm">
                            <div><span className="font-medium">Certifications:</span> 
                              <div className="mt-1 p-2 bg-white rounded border text-xs">{resume.certifications}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Summary */}
                    {resume.summary && (
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-800 mb-3">Professional Summary</h4>
                        <p className="text-gray-700 bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500">
                          {resume.summary}
                        </p>
                      </div>
                    )}

                    {/* Skills */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-800 mb-3">Skills</h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <SkillsDisplay resumeId={typeof resume.id === 'number' ? resume.id : parseInt(resume.id.toString())} />
                      </div>
                    </div>
                    {/* Work Experience */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-800 mb-3">Work Experience</h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <WorkExperienceDisplay resumeId={typeof resume.id === 'number' ? resume.id : parseInt(resume.id.toString())} limit={showMore ? undefined : 3} />
                      </div>
                    </div>

                    {/* Education */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-800 mb-3">Education</h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <EducationDisplay resumeId={typeof resume.id === 'number' ? resume.id : parseInt(resume.id.toString())} limit={showMore ? undefined : 1} />
                      </div>
                    </div>

                    <div className="flex justify-end mb-6">
                      <div className="inline-flex rounded-md border border-gray-200 bg-gray-100 p-1">
                        <button
                          onClick={() => setAdvancedView(typeof resume.id === 'number' ? resume.id : parseInt(resume.id.toString()), false)}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                            !showMore ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:text-blue-700'
                          }`}
                        >
                          Key Overview
                        </button>
                        <button
                          onClick={() => setAdvancedView(typeof resume.id === 'number' ? resume.id : parseInt(resume.id.toString()), true)}
                          className={`ml-1 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                            showMore ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:text-blue-700'
                          }`}
                        >
                          Advanced Details
                        </button>
                      </div>
                    </div>

                    {showMore && (
                      <>
                        {resume.enhanced_skills && (
                          <div className="mb-6">
                            <h4 className="font-semibold text-gray-800 mb-3">Enhanced Skills</h4>
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <SkillsDisplay skillsJson={typeof resume.enhanced_skills === 'string' ? resume.enhanced_skills : Array.isArray(resume.enhanced_skills) ? resume.enhanced_skills.join(', ') : ''} />
                            </div>
                          </div>
                        )}

                        {(resume.current_salary || resume.desired_salary) && (
                          <div className="bg-yellow-50 p-4 rounded-lg mb-6">
                            <h4 className="font-semibold text-gray-800 mb-2">Salary Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div><span className="font-medium">Current Salary:</span> {formatCurrency(resume.current_salary)}</div>
                              <div><span className="font-medium">Desired Salary:</span> {formatCurrency(resume.desired_salary)}</div>
                            </div>
                          </div>
                        )}

                        {resume.enhanced_certifications && (
                          <div className="mb-6">
                            <h4 className="font-semibold text-gray-800 mb-3">Certifications</h4>
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                {formatCertifications(typeof resume.enhanced_certifications === 'string' ? resume.enhanced_certifications : Array.isArray(resume.enhanced_certifications) ? resume.enhanced_certifications.join(', ') : '')}
                              </div>
                            </div>
                          </div>
                        )}

                        {resume.key_responsibilities && (
                          <div className="mb-6">
                            <h4 className="font-semibold text-gray-800 mb-3">Key Responsibilities</h4>
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                {formatKeyResponsibilities(typeof resume.key_responsibilities === 'string' ? resume.key_responsibilities : Array.isArray(resume.key_responsibilities) ? resume.key_responsibilities.join(', ') : '')}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-semibold text-gray-800 mb-2">Management & Leadership</h4>
                            <div className="space-y-1 text-sm">
                              <div><span className="font-medium">Management Experience:</span> {formatBoolean(resume.management_experience)}</div>
                              <div><span className="font-medium">Leadership Experience:</span> {formatBoolean(resume.leadership_experience)}</div>
                              <div><span className="font-medium">Team Size Managed:</span> {resume.team_size_managed ?? 'Not provided'}</div>
                              <div><span className="font-medium">Budget Responsibility:</span> {formatCurrency(resume.budget_responsibility)}</div>
                              <div><span className="font-medium">Management Style:</span> {resume.management_style || 'Not provided'}</div>
                            </div>
                          </div>

                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-semibold text-gray-800 mb-2">Soft Skills</h4>
                            <div className="space-y-1 text-sm">
                              <div><span className="font-medium">Communication Skills:</span> {resume.communication_skills || 'Not provided'}</div>
                              <div><span className="font-medium">Teamwork Skills:</span> {resume.teamwork_skills || 'Not provided'}</div>
                              <div><span className="font-medium">Problem Solving:</span> {resume.problem_solving || 'Not provided'}</div>
                              <div><span className="font-medium">Languages:</span> {formatListField(resume.languages as unknown)}</div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-semibold text-gray-800 mb-2">Industry Experience</h4>
                            <div className="space-y-1 text-sm">
                              <div><span className="font-medium">Facility Types:</span> {formatListField(resume.facility_types as unknown)}</div>
                              <div><span className="font-medium">Safety Certifications:</span> {formatListField(resume.safety_certifications as unknown)}</div>
                              <div><span className="font-medium">Regulatory Experience:</span> {formatListField(resume.regulatory_experience as unknown)}</div>
                              <div><span className="font-medium">Environmental Conditions:</span> {formatListField(resume.environmental_conditions as unknown)}</div>
                            </div>
                          </div>

                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-semibold text-gray-800 mb-2">Additional Information</h4>
                            <div className="space-y-1 text-sm">
                              <div><span className="font-medium">Availability Date:</span> {resume.availability_date || 'Not provided'}</div>
                              <div><span className="font-medium">Shift Preferences:</span> {resume.shift_preferences || 'Not provided'}</div>
                              <div><span className="font-medium">Relocation Willingness:</span> {resume.relocation_willingness || 'Not provided'}</div>
                              <div><span className="font-medium">Awards:</span> {formatListField(resume.awards as unknown)}</div>
                              <div><span className="font-medium">Publications:</span> {formatListField(resume.publications as unknown)}</div>
                              <div><span className="font-medium">Volunteer Experience:</span> {formatListField(resume.volunteer_experience as unknown)}</div>
                              <div><span className="font-medium">Interests:</span> {formatListField(resume.interests as unknown)}</div>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 mb-4">
                          <button
                            onClick={() => toggleExpanded(typeof resume.id === 'number' ? resume.id : parseInt(resume.id.toString()))}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            {isExpanded ? 'Hide Technical Details' : 'Show Technical Details'}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <h4 className="font-semibold text-gray-800 mb-3">Technical Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                              <div><span className="font-medium">File Size:</span> {resume.file_size ? `${(resume.file_size / 1024).toFixed(1)} KB` : 'Not provided'}</div>
                              <div><span className="font-medium">File Type:</span> {resume.file_type || 'Not provided'}</div>
                              <div><span className="font-medium">Content Hash:</span> {resume.content_hash ? resume.content_hash.substring(0, 8) + '...' : 'Not provided'}</div>
                              <div><span className="font-medium">Created At:</span> {resume.created_at ? new Date(resume.created_at).toLocaleDateString() : 'Not provided'}</div>
                              <div><span className="font-medium">Updated At:</span> {resume.updated_at ? new Date(resume.updated_at).toLocaleDateString() : 'Not provided'}</div>
                              <div><span className="font-medium">Version Number:</span> {resume.version_number || 'Not provided'}</div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            
            {currentResumes.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  {filteredResumes.length === 0 
                    ? "No resumes found matching your criteria." 
                    : "No resumes on this page."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Resume Modal */}
      {editingResume && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Edit Contact Fields</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Basic Contact Info */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-700">Basic Contact Information</h3>
                
                <div>
                  <Label htmlFor="candidate_name">Full Name</Label>
                  <Input
                    id="candidate_name"
                    value={editFormData.candidate_name || ''}
                    onChange={(e) => setEditFormData({...editFormData, candidate_name: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={editFormData.first_name || ''}
                    onChange={(e) => setEditFormData({...editFormData, first_name: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={editFormData.last_name || ''}
                    onChange={(e) => setEditFormData({...editFormData, last_name: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editFormData.email || ''}
                    onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={editFormData.phone || ''}
                    onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={editFormData.location || ''}
                    onChange={(e) => setEditFormData({...editFormData, location: e.target.value})}
                  />
                </div>
              </div>
              
              {/* Professional Info */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-700">Professional Information</h3>
                
                <div>
                  <Label htmlFor="title">Job Title</Label>
                  <Input
                    id="title"
                    value={editFormData.title || ''}
                    onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="current_position">Current Position</Label>
                  <Input
                    id="current_position"
                    value={editFormData.current_position || ''}
                    onChange={(e) => setEditFormData({...editFormData, current_position: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="current_company">Current Company</Label>
                  <Input
                    id="current_company"
                    value={editFormData.current_company || ''}
                    onChange={(e) => setEditFormData({...editFormData, current_company: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="current_salary">Current Salary</Label>
                  <Input
                    id="current_salary"
                    type="number"
                    value={editFormData.current_salary || ''}
                    onChange={(e) => setEditFormData({...editFormData, current_salary: parseInt(e.target.value) || undefined})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="desired_salary">Desired Salary</Label>
                  <Input
                    id="desired_salary"
                    type="number"
                    value={editFormData.desired_salary || ''}
                    onChange={(e) => setEditFormData({...editFormData, desired_salary: parseInt(e.target.value) || undefined})}
                  />
                </div>
                
                <div>
                  <DropdownWithCustom
                    id="work_authorization"
                    label="Work Authorization"
                    value={editFormData.work_authorization}
                    options={WORK_AUTHORIZATION_OPTIONS}
                    onChange={(val) => setEditFormData(prev => ({ ...prev, work_authorization: val }))}
                  />
                </div>
                
                <div>
                  <DropdownWithCustom
                    id="citizenship"
                    label="Citizenship"
                    value={editFormData.citizenship}
                    options={CITIZENSHIP_OPTIONS}
                    onChange={(val) => setEditFormData(prev => ({ ...prev, citizenship: val }))}
                  />
                </div>
              </div>
              
              {/* Online Presence */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-700">Online Presence</h3>
                
                <div>
                  <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                  <Input
                    id="linkedin_url"
                    type="url"
                    value={editFormData.linkedin_url || ''}
                    onChange={(e) => setEditFormData({...editFormData, linkedin_url: e.target.value})}
                  />
                </div>
              </div>
              
              {/* Work Preferences */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-700">Work Preferences</h3>
                
                <div>
                  <Label htmlFor="remote_work_preference">Remote Work Preference</Label>
                  <select
                    id="remote_work_preference"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={editFormData.remote_work_preference || ''}
                    onChange={(e) => setEditFormData({...editFormData, remote_work_preference: e.target.value})}
                  >
                    <option value="">Select preference</option>
                    <option value="Full Remote">Full Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="On-site">On-site</option>
                  </select>
                </div>
                
                <div>
                  <Label>Willing to Relocate</Label>
                  <div className="flex gap-4 mt-1">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="willing_to_relocate"
                        checked={editFormData.willing_to_relocate === true}
                        onChange={() => setEditFormData({...editFormData, willing_to_relocate: true})}
                        className="mr-2"
                      />
                      Yes
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="willing_to_relocate"
                        checked={editFormData.willing_to_relocate === false}
                        onChange={() => setEditFormData({...editFormData, willing_to_relocate: false})}
                        className="mr-2"
                      />
                      No
                    </label>
                  </div>
                </div>
                
                <div>
                  <Label>Willing to Travel</Label>
                  <div className="flex gap-4 mt-1">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="willing_to_travel"
                        checked={editFormData.willing_to_travel === true}
                        onChange={() => setEditFormData({...editFormData, willing_to_travel: true})}
                        className="mr-2"
                      />
                      Yes
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="willing_to_travel"
                        checked={editFormData.willing_to_travel === false}
                        onChange={() => setEditFormData({...editFormData, willing_to_travel: false})}
                        className="mr-2"
                      />
                      No
                    </label>
                  </div>
                </div>
                </div>
              </div>
              
              {/* Recruiter-Critical Fields */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-700">Recruiter-Critical Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="alternate_email">Alternate Email</Label>
                    <Input
                      id="alternate_email"
                      type="email"
                      value={editFormData.alternate_email || ''}
                      onChange={(e) => setEditFormData({...editFormData, alternate_email: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="alternate_phone">Alternate Phone</Label>
                    <Input
                      id="alternate_phone"
                      value={editFormData.alternate_phone || ''}
                      onChange={(e) => setEditFormData({...editFormData, alternate_phone: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="visa_status">Visa Status</Label>
                    <select
                      id="visa_status"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={editFormData.visa_status || ''}
                      onChange={(e) => setEditFormData({...editFormData, visa_status: e.target.value})}
                    >
                      <option value="">Select visa status</option>
                      <option value="US Citizen">US Citizen</option>
                      <option value="Green Card">Green Card</option>
                      <option value="H1B">H1B</option>
                      <option value="TN Visa">TN Visa</option>
                      <option value="F1 OPT">F1 OPT</option>
                      <option value="L1">L1</option>
                      <option value="E2">E2</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label htmlFor="housing_status">Housing Status</Label>
                    <select
                      id="housing_status"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={editFormData.housing_status || ''}
                      onChange={(e) => setEditFormData({...editFormData, housing_status: e.target.value})}
                    >
                      <option value="">Select housing status</option>
                      <option value="Homeowner">Homeowner</option>
                      <option value="Renter">Renter</option>
                      <option value="Living with Family">Living with Family</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="special_notes">Special Notes</Label>
                  <textarea
                    id="special_notes"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    rows={3}
                    value={editFormData.special_notes || ''}
                    onChange={(e) => setEditFormData({...editFormData, special_notes: e.target.value})}
                    placeholder="Any special notes about the candidate..."
                  />
                </div>
                
                <div>
                  <Label htmlFor="reason_for_leaving">Reason for Leaving Current Position</Label>
                  <textarea
                    id="reason_for_leaving"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    rows={2}
                    value={editFormData.reason_for_leaving || ''}
                    onChange={(e) => setEditFormData({...editFormData, reason_for_leaving: e.target.value})}
                    placeholder="Why are they leaving their current position?"
                  />
                </div>
                
                <div>
                  <Label htmlFor="why_looking_for_new_position">Why Looking for New Position</Label>
                  <textarea
                    id="why_looking_for_new_position"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    rows={2}
                    value={editFormData.why_looking_for_new_position || ''}
                    onChange={(e) => setEditFormData({...editFormData, why_looking_for_new_position: e.target.value})}
                    placeholder="What are they looking for in a new position?"
                  />
                </div>
              </div>
              
              
              {/* Education & Certifications */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-700">Education & Certifications</h3>
                
                <div>
                  <Label htmlFor="certifications">Certifications</Label>
                  <textarea
                    id="certifications"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    rows={4}
                    value={editFormData.certifications || ''}
                    onChange={(e) => setEditFormData({...editFormData, certifications: e.target.value.split(',').map(s => s.trim())})}
                    placeholder="Professional certifications, licenses, etc."
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={cancelEditing} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={saveContactFields} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upload & Process Tab */}
      {activeTab === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload & Process Resumes</CardTitle>
            <CardDescription>
              Upload resume files and process them for AI analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="resume-files">Resume Files</Label>
              <Input
                id="resume-files"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setResumeFiles(e.target.files)}
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Select multiple resume files (PDF, DOC, DOCX, TXT)
              </p>
            </div>
            
            <Button
              onClick={handleResumeUpload}
              disabled={loading || reprocessLoading || !resumeFiles}
              className="w-full"
            >
              {loading ? 'Uploading...' : 'Upload Resumes'}
            </Button>

            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Reprocess Existing Resumes</h3>
                  <p className="text-sm text-gray-500">
                    Rerun AI extraction on resumes already stored in the database using their original files.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllReprocess}
                    disabled={reprocessOptions.length === 0 || reprocessLoading}
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearReprocessSelection}
                    disabled={reprocessSelectedIds.length === 0 || reprocessLoading}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              <select
                multiple
                value={reprocessSelectedIds.map(String)}
                onChange={handleReprocessSelection}
                className="w-full border border-gray-300 rounded-md px-3 py-2 h-48"
                disabled={reprocessOptions.length === 0 || reprocessLoading}
              >
                {reprocessOptions.length === 0 ? (
                  <option value="">No resumes available for reprocessing</option>
                ) : (
                  reprocessOptions.map(option => (
                    <option key={option.id} value={String(option.id)}>
                      {option.name} (ID: {option.id})
                    </option>
                  ))
                )}
              </select>

              <Button
                type="button"
                onClick={handleResumeReprocess}
                disabled={reprocessLoading || loading || reprocessSelectedIds.length === 0}
                className="w-full"
              >
                {reprocessLoading ? 'Reprocessing...' : reprocessSelectedIds.length === 0 ? 'Reprocess Selected Resumes' : `Reprocess ${reprocessSelectedIds.length} Resume${reprocessSelectedIds.length === 1 ? '' : 's'}`}
              </Button>
            </div>

            {/* Processing Log */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <Label>Processing Log</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearLog}
                  disabled={loading || reprocessLoading}
                >
                  Clear Log
                </Button>
              </div>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto border">
                {processingLog.length === 0 ? (
                  <div className="text-gray-500">No processing activity yet...</div>
                ) : (
                  processingLog.map((logEntry: string, index: number) => (
                    <div key={index} className="mb-1">
                      {logEntry}
                    </div>
                  ))
                )}
                {(loading || reprocessLoading) && (
                  <div className="text-yellow-400 animate-pulse">
                    Processing...
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Matching Tab */}
      {activeTab === 'matching' && (
        <Card>
          <CardHeader>
            <CardTitle>AI Resume Matching</CardTitle>
            <CardDescription>
              Match resumes to job listings using AI analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="resume-files-matching">Resume Files</Label>
              <Input
                id="resume-files-matching"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setResumeFiles(e.target.files)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="jobs-json-path">Jobs JSON Path</Label>
              <Input
                id="jobs-json-path"
                type="text"
                value={resumeData.jobs_json_path}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setResumeData({ ...resumeData, jobs_json_path: e.target.value })}
                placeholder="path/to/jobs.json"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="tracking-csv-path">Tracking CSV Path (Optional)</Label>
              <Input
                id="tracking-csv-path"
                type="text"
                value={resumeData.tracking_csv_path}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setResumeData({ ...resumeData, tracking_csv_path: e.target.value })}
                placeholder="path/to/tracking.csv"
                className="mt-1"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ai-provider">AI Provider</Label>
                <select
                  id="ai-provider"
                  value={resumeData.ai_provider}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setResumeData({ ...resumeData, ai_provider: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="openai">OpenAI</option>
                  <option value="grok">Grok</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="model">Model</Label>
                <select
                  id="model"
                  value={resumeData.model}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setResumeData({ ...resumeData, model: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="gpt-5">GPT-5</option>
                  <option value="gpt-5-mini">GPT-5 Mini</option>
                  <option value="gpt-5-nano">GPT-5 Nano</option>
                  <option value="gpt-5-chat-latest">GPT-5 Chat Latest</option>
                </select>
              </div>
            </div>
            
            <Button
              onClick={handleResumeMatch}
              disabled={loading || !resumeFiles || !resumeData.jobs_json_path}
              className="w-full"
            >
              {loading ? 'Matching...' : 'Match Resumes to Jobs'}
            </Button>
            
            {/* Processing Log */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <Label>Processing Log</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearLog}
                  disabled={loading}
                >
                  Clear Log
                </Button>
              </div>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto border">
                {processingLog.length === 0 ? (
                  <div className="text-gray-500">No processing activity yet...</div>
                ) : (
                  processingLog.map((logEntry: string, index: number) => (
                    <div key={index} className="mb-1">
                      {logEntry}
                    </div>
                  ))
                )}
                {loading && (
                  <div className="text-yellow-400 animate-pulse">
                    Processing...
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Match Results Tab */}
      {activeTab === 'results' && (
        <Card>
          <CardHeader>
            <CardTitle>Job-Resume Match Results</CardTitle>
            <CardDescription>
              View AI-generated matches between resumes and jobs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {matches.map((match: JobMatch) => (
                <div key={match.id} className="bg-gray-50 p-4 rounded-lg border">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        Resume #{match.resume_id} → Job #{match.job_id}
                      </h3>
                      <div className="mt-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          match.hard_no 
                            ? 'bg-red-100 text-red-800' 
                            : match.rating >= 8 
                              ? 'bg-green-100 text-green-800'
                              : match.rating >= 6
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}>
                          Rating: {match.rating}/10
                        </span>
                        {match.hard_no && (
                          <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                            Hard No
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {match.reasons && (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium text-gray-700">Match Reasons:</h4>
                      <p className="text-sm text-gray-600 mt-1">{match.reasons}</p>
                    </div>
                  )}
                  
                  {match.disqualifiers && (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium text-gray-700">Disqualifiers:</h4>
                      <p className="text-sm text-gray-600 mt-1">{match.disqualifiers}</p>
                    </div>
                  )}
                  
                  <div className="mt-3 text-xs text-gray-400">
                    Created: {new Date(match.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
              
              {matches.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No matches found. Run AI matching to generate results.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Results</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <HelpSection
        title="Resume Management"
        description="Comprehensive resume management system that handles uploading, processing, and AI-powered job matching for candidate resumes. This module creates detailed resume profiles and matches them with processed job descriptions."
        features={[
          "Upload and store resumes in a structured database with AI extraction",
          "Search and filter resumes by candidate information, skills, and experience",
          "AI-powered resume-to-job matching with detailed analysis and ratings",
          "View match results with comprehensive ratings, reasoning, and disqualifiers",
          "Support for multiple file formats (PDF, DOC, DOCX, TXT) with text extraction",
          "Integration with job processing pipeline for comprehensive matching"
        ]}
        endResults={[
          "Structured resume database with AI-extracted candidate information",
          "Comprehensive job-resume matches with detailed analysis and ratings",
          "Match results showing compatibility scores, reasoning, and disqualifiers",
          "Candidate profiles ready for hiring decisions and interview planning",
          "Detailed matching data for recruitment workflow optimization"
        ]}
        workflow={[
          "Upload resume files using the 'Upload & Process' tab with AI extraction",
          "Configure AI matching parameters in the 'AI Matching' tab",
          "Run AI matching to generate comprehensive job-resume matches",
          "Review detailed results in the 'Match Results' tab with ratings and analysis",
          "Use the 'Resume Database' tab to manage and search resumes"
        ]}
      />
    </div>
  );
}
