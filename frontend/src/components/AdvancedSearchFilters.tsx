import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { X, Plus, Search, Filter, Save, History, Star, ChevronDown } from 'lucide-react';
// import FilterModal from './FilterModal';

interface SearchFilters {
  // Basic Search
  name?: string;
  email?: string;
  phone?: string;
  
  // Professional Profile
  yearsExperienceMin?: number;
  yearsExperienceMax?: number;
  
  // Skills & Qualifications
  technicalSkills?: string[];
  skillCategories?: string[];  // New: Category-based skill search
  certifications?: string[];
  certificationCategories?: string[];  // New: Category-based certification search
  licenses?: string[];
  educationLevel?: string;
  educationDegrees?: string[];  // New: Multiple education degrees
  educationFields?: string[];   // New: Multiple education fields
  skillsMatchMode?: 'AND' | 'OR';  // New: How to match multiple skills
  certificationsMatchMode?: 'AND' | 'OR';  // New: How to match multiple certs
  
  // Location & Mobility
  currentLocation?: string;
  preferredLocations?: string[];
  restrictedLocations?: string[];
  relocationWilling?: boolean;
  remoteWorkPreference?: string;
  locationsMatchMode?: 'AND' | 'OR';  // New: How to match multiple locations
  
  // Compensation
  currentSalaryMin?: number;
  currentSalaryMax?: number;
  expectedSalaryMin?: number;
  expectedSalaryMax?: number;
  
  // Work Authorization
  citizenship?: string;
  workAuthorization?: string;
  securityClearance?: string;
  
  // Industry & Company
  industryExperience?: string;
  industryCategories?: string[];  // New: Category-based industry search
  currentCompany?: string;
  
  // AI Search
  semanticQuery?: string;
  jobFitScore?: number;
}

interface FilterItem {
  name: string;
  count: number;
}

interface AdvancedSearchFiltersProps {
  onSearch: (filters: SearchFilters) => void;
  onSaveSearch?: (name: string, filters: SearchFilters) => void;
  savedSearches?: Array<{ id: string; name: string; filters: SearchFilters }>;
  onLoadSavedSearch?: (filters: SearchFilters) => void;
}

const AdvancedSearchFilters: React.FC<AdvancedSearchFiltersProps> = ({
  onSearch,
  onSaveSearch,
  savedSearches = [],
  onLoadSavedSearch
}) => {
  const [filters, setFilters] = useState<SearchFilters>({
    skillsMatchMode: 'AND',
    certificationsMatchMode: 'AND',
    locationsMatchMode: 'OR'
  });
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedCertifications, setSelectedCertifications] = useState<string[]>([]);
  const [selectedPreferredLocations, setSelectedPreferredLocations] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [newCertification, setNewCertification] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [saveSearchName, setSaveSearchName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Dynamic suggestions from API
  const [allSkills, setAllSkills] = useState<FilterItem[]>([]);
  const [allCertifications, setAllCertifications] = useState<FilterItem[]>([]);
  const [allLocations, setAllLocations] = useState<FilterItem[]>([]);
  const [skillCategories, setSkillCategories] = useState<{[key: string]: FilterItem[]}>({});
  const [certificationCategories, setCertificationCategories] = useState<{[key: string]: FilterItem[]}>({});
  const [industryCategories, setIndustryCategories] = useState<{[key: string]: FilterItem[]}>({});
  const [educationDegrees, setEducationDegrees] = useState<FilterItem[]>([]);
  const [educationFields, setEducationFields] = useState<FilterItem[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  // Modal states
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [showCertsModal, setShowCertsModal] = useState(false);
  const [showLocationsModal, setShowLocationsModal] = useState(false);
  

  // Fetch dynamic suggestions on mount
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const response = await fetch('/api/resume-suggestions');
        const data = await response.json();
        // Extract individual skills and certifications from categories
        const allSkillsList: FilterItem[] = [];
        const allCertsList: FilterItem[] = [];
        
        // Flatten skill categories into individual skills
        Object.values(data.skill_categories || {}).forEach((categorySkills: any) => {
          if (Array.isArray(categorySkills)) {
            allSkillsList.push(...categorySkills);
          }
        });
        
        // Flatten certification categories into individual certifications
        Object.values(data.certification_categories || {}).forEach((categoryCerts: any) => {
          if (Array.isArray(categoryCerts)) {
            allCertsList.push(...categoryCerts);
          }
        });
        
                setAllSkills(allSkillsList);
                setAllCertifications(allCertsList);
                setAllLocations(data.locations || []);
                setSkillCategories(data.skill_categories || {});
                setCertificationCategories(data.certification_categories || {});
                setIndustryCategories(data.industry_categories || {});
                setEducationDegrees(data.education_degrees || []);
                setEducationFields(data.education_fields || []);
      } catch (error) {
        console.error('Failed to load suggestions:', error);
      } finally {
        setLoadingSuggestions(false);
      }
    };
    fetchSuggestions();
  }, []);

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const addSkill = () => {
    if (newSkill && !selectedSkills.includes(newSkill)) {
      setSelectedSkills(prev => [...prev, newSkill]);
      setFilters(prev => ({ ...prev, technicalSkills: [...(prev.technicalSkills || []), newSkill] }));
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setSelectedSkills(prev => prev.filter(s => s !== skill));
    setFilters(prev => ({ 
      ...prev, 
      technicalSkills: prev.technicalSkills?.filter(s => s !== skill) 
    }));
  };

  const addCertification = () => {
    if (newCertification && !selectedCertifications.includes(newCertification)) {
      setSelectedCertifications(prev => [...prev, newCertification]);
      setFilters(prev => ({ ...prev, certifications: [...(prev.certifications || []), newCertification] }));
      setNewCertification('');
    }
  };

  const removeCertification = (cert: string) => {
    setSelectedCertifications(prev => prev.filter(c => c !== cert));
    setFilters(prev => ({ 
      ...prev, 
      certifications: prev.certifications?.filter(c => c !== cert) 
    }));
  };

  const addPreferredLocation = () => {
    if (newLocation && !selectedPreferredLocations.includes(newLocation)) {
      setSelectedPreferredLocations(prev => [...prev, newLocation]);
      setFilters(prev => ({ ...prev, preferredLocations: [...(prev.preferredLocations || []), newLocation] }));
      setNewLocation('');
    }
  };

  const removePreferredLocation = (location: string) => {
    setSelectedPreferredLocations(prev => prev.filter(l => l !== location));
    setFilters(prev => ({ 
      ...prev, 
      preferredLocations: prev.preferredLocations?.filter(l => l !== location) 
    }));
  };

  const handleSearch = () => {
    console.log('Search button clicked, current filters:', filters);
    console.log('Selected skills:', selectedSkills);
    onSearch(filters);
  };

  const clearFilters = () => {
    setFilters({});
    setSelectedSkills([]);
    setSelectedCertifications([]);
    setSelectedPreferredLocations([]);
  };

  const saveSearch = () => {
    if (saveSearchName && onSaveSearch) {
      onSaveSearch(saveSearchName, filters);
      setSaveSearchName('');
      setShowSaveDialog(false);
    }
  };

  const loadSavedSearch = (savedFilters: SearchFilters) => {
    setFilters(savedFilters);
    setSelectedSkills(savedFilters.technicalSkills || []);
    setSelectedCertifications(savedFilters.certifications || []);
    setSelectedPreferredLocations(savedFilters.preferredLocations || []);
    if (onLoadSavedSearch) {
      onLoadSavedSearch(savedFilters);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Advanced Search
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaveDialog(true)}
              disabled={Object.keys(filters).length === 0}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Search
            </Button>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="advanced" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="advanced">Advanced Search</TabsTrigger>
            <TabsTrigger value="ai">AI Search</TabsTrigger>
          </TabsList>

          <TabsContent value="advanced" className="space-y-6">
            {/* Basic Search Filters - Top Priority */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Basic Search</h3>
              
              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Search by name..."
                    value={filters.name || ''}
                    onChange={(e) => handleFilterChange('name', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    placeholder="Search by email..."
                    value={filters.email || ''}
                    onChange={(e) => handleFilterChange('email', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="Search by phone..."
                    value={filters.phone || ''}
                    onChange={(e) => handleFilterChange('phone', e.target.value)}
                  />
                </div>
              </div>

              {/* Professional Profile */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Years of Experience</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Min:</span>
                      <Input
                        type="number"
                        value={filters.yearsExperienceMin || 0}
                        onChange={(e) => handleFilterChange('yearsExperienceMin', parseInt(e.target.value) || 0)}
                        min={0}
                        max={20}
                        className="w-20"
                      />
                      <span>{filters.yearsExperienceMin || 0} years</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Max:</span>
                      <Input
                        type="number"
                        value={filters.yearsExperienceMax || 20}
                        onChange={(e) => handleFilterChange('yearsExperienceMax', parseInt(e.target.value) || 20)}
                        min={0}
                        max={20}
                        className="w-20"
                      />
                      <span>{filters.yearsExperienceMax || 20} years</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Education Degrees</Label>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto border rounded p-2">
                      {educationDegrees.slice(0, 10).map(degree => (
                        <Badge
                          key={degree.name}
                          variant={filters.educationDegrees?.includes(degree.name) ? "default" : "outline"}
                          className="cursor-pointer text-xs"
                          onClick={() => {
                            const currentDegrees = filters.educationDegrees || [];
                            if (currentDegrees.includes(degree.name)) {
                              setFilters(prev => ({ 
                                ...prev, 
                                educationDegrees: currentDegrees.filter(d => d !== degree.name) 
                              }));
                            } else {
                              setFilters(prev => ({ 
                                ...prev, 
                                educationDegrees: [...currentDegrees, degree.name] 
                              }));
                            }
                          }}
                        >
                          {degree.name} ({degree.count})
                        </Badge>
                      ))}
                    </div>
                    {filters.educationDegrees && filters.educationDegrees.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {filters.educationDegrees.map(degree => (
                          <Badge key={degree} variant="secondary" className="flex items-center gap-1 text-xs">
                            {degree}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => {
                              setFilters(prev => ({ 
                                ...prev, 
                                educationDegrees: (prev.educationDegrees || []).filter(d => d !== degree) 
                              }));
                            }} />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Education Fields */}
              <div>
                <Label>Education Fields</Label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto border rounded p-2">
                    {educationFields.slice(0, 10).map(field => (
                      <Badge
                        key={field.name}
                        variant={filters.educationFields?.includes(field.name) ? "default" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() => {
                          const currentFields = filters.educationFields || [];
                          if (currentFields.includes(field.name)) {
                            setFilters(prev => ({ 
                              ...prev, 
                              educationFields: currentFields.filter(f => f !== field.name) 
                            }));
                          } else {
                            setFilters(prev => ({ 
                              ...prev, 
                              educationFields: [...currentFields, field.name] 
                            }));
                          }
                        }}
                      >
                        {field.name} ({field.count})
                      </Badge>
                    ))}
                  </div>
                  {filters.educationFields && filters.educationFields.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {filters.educationFields.map(field => (
                        <Badge key={field} variant="secondary" className="flex items-center gap-1 text-xs">
                          {field}
                          <X className="h-3 w-3 cursor-pointer" onClick={() => {
                            setFilters(prev => ({ 
                              ...prev, 
                              educationFields: (prev.educationFields || []).filter(f => f !== field) 
                            }));
                          }} />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Location & Work Authorization */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currentLocation">Current Location</Label>
                  <Input
                    id="currentLocation"
                    placeholder="e.g., California, Texas..."
                    value={filters.currentLocation || ''}
                    onChange={(e) => handleFilterChange('currentLocation', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="citizenship">Citizenship</Label>
                  <Input
                    id="citizenship"
                    placeholder="e.g., US Citizen, Canadian..."
                    value={filters.citizenship || ''}
                    onChange={(e) => handleFilterChange('citizenship', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Category-Based Search - Grouped by Categories */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Category-Based Search</h3>
              
              {/* Technical Skills Categories */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base font-medium">Technical Skills Categories</Label>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-gray-500">Match:</span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={filters.skillsMatchMode === 'AND' ? 'default' : 'outline'}
                        onClick={() => handleFilterChange('skillsMatchMode', 'AND')}
                        className="h-7 px-2 text-xs"
                      >
                        AND
                      </Button>
                      <Button
                        size="sm"
                        variant={filters.skillsMatchMode === 'OR' ? 'default' : 'outline'}
                        onClick={() => handleFilterChange('skillsMatchMode', 'OR')}
                        className="h-7 px-2 text-xs"
                      >
                        OR
                      </Button>
                    </div>
                  </div>
                </div>
                {!loadingSuggestions && Object.keys(skillCategories).length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(skillCategories).map(([categoryName, skills]) => (
                      <div key={categoryName} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={filters.skillCategories?.includes(categoryName) || false}
                              onChange={(e) => {
                                const currentCategories = filters.skillCategories || [];
                                if (e.target.checked) {
                                  setFilters(prev => ({ 
                                    ...prev, 
                                    skillCategories: [...currentCategories, categoryName] 
                                  }));
                                } else {
                                  setFilters(prev => ({ 
                                    ...prev, 
                                    skillCategories: currentCategories.filter(c => c !== categoryName) 
                                  }));
                                }
                              }}
                              className="rounded"
                            />
                            <Label className="text-sm font-medium">{categoryName}</Label>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {skills.length} skills
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {skills.slice(0, 3).map(skill => (
                            <Badge
                              key={skill.name}
                              variant="outline"
                              className="cursor-pointer text-xs"
                              onClick={() => {
                                if (!selectedSkills.includes(skill.name)) {
                                  setSelectedSkills(prev => [...prev, skill.name]);
                                  setFilters(prev => ({ ...prev, technicalSkills: [...(prev.technicalSkills || []), skill.name] }));
                                }
                              }}
                            >
                              {skill.name} ({skill.count})
                            </Badge>
                          ))}
                          {skills.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{skills.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedSkills.map(skill => (
                    <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                      {skill}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeSkill(skill)} />
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Certification Categories */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base font-medium">Certification Categories</Label>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-gray-500">Match:</span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={filters.certificationsMatchMode === 'AND' ? 'default' : 'outline'}
                        onClick={() => handleFilterChange('certificationsMatchMode', 'AND')}
                        className="h-7 px-2 text-xs"
                      >
                        AND
                      </Button>
                      <Button
                        size="sm"
                        variant={filters.certificationsMatchMode === 'OR' ? 'default' : 'outline'}
                        onClick={() => handleFilterChange('certificationsMatchMode', 'OR')}
                        className="h-7 px-2 text-xs"
                      >
                        OR
                      </Button>
                    </div>
                  </div>
                </div>
                {!loadingSuggestions && Object.keys(certificationCategories).length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(certificationCategories).map(([categoryName, certs]) => (
                      <div key={categoryName} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={filters.certificationCategories?.includes(categoryName) || false}
                              onChange={(e) => {
                                const currentCategories = filters.certificationCategories || [];
                                if (e.target.checked) {
                                  setFilters(prev => ({ 
                                    ...prev, 
                                    certificationCategories: [...currentCategories, categoryName] 
                                  }));
                                } else {
                                  setFilters(prev => ({ 
                                    ...prev, 
                                    certificationCategories: currentCategories.filter(c => c !== categoryName) 
                                  }));
                                }
                              }}
                              className="rounded"
                            />
                            <Label className="text-sm font-medium">{categoryName}</Label>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {certs.length} certs
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {certs.slice(0, 3).map(cert => (
                            <Badge
                              key={cert.name}
                              variant="outline"
                              className="cursor-pointer text-xs"
                              onClick={() => {
                                if (!selectedCertifications.includes(cert.name)) {
                                  setSelectedCertifications(prev => [...prev, cert.name]);
                                  setFilters(prev => ({ ...prev, certifications: [...(prev.certifications || []), cert.name] }));
                                }
                              }}
                            >
                              {cert.name} ({cert.count})
                            </Badge>
                          ))}
                          {certs.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{certs.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedCertifications.map(cert => (
                    <Badge key={cert} variant="secondary" className="flex items-center gap-1">
                      {cert}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeCertification(cert)} />
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Industry Experience */}
              <div>
                <Label htmlFor="industryExperience">Industry Experience</Label>
                <Input
                  id="industryExperience"
                  placeholder="e.g., Cement, Mining, Construction..."
                  value={filters.industryExperience || ''}
                  onChange={(e) => handleFilterChange('industryExperience', e.target.value)}
                />
              </div>
            </div>

          </TabsContent>

          <TabsContent value="ai" className="space-y-4">
            <div>
              <Label htmlFor="semanticQuery">Natural Language Search</Label>
              <Textarea
                id="semanticQuery"
                placeholder="Describe what you're looking for... (e.g., 'Find electrical engineers with 5+ years in manufacturing who are willing to relocate to Texas')"
                value={filters.semanticQuery || ''}
                onChange={(e) => handleFilterChange('semanticQuery', e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Work Authorization</Label>
                <Select value={filters.workAuthorization || ''} onValueChange={(value) => handleFilterChange('workAuthorization', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select work authorization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us_citizen">US Citizen</SelectItem>
                    <SelectItem value="green_card">Green Card</SelectItem>
                    <SelectItem value="h1b">H1B Visa</SelectItem>
                    <SelectItem value="tn">TN Visa</SelectItem>
                    <SelectItem value="opt">OPT</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Industry Experience</Label>
                <Select value={filters.industryExperience || ''} onValueChange={(value) => handleFilterChange('industryExperience', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mining">Mining</SelectItem>
                    <SelectItem value="cement">Cement Manufacturing</SelectItem>
                    <SelectItem value="aggregates">Aggregates</SelectItem>
                    <SelectItem value="construction">Construction</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="chemical">Chemical</SelectItem>
                    <SelectItem value="industrial">Industrial</SelectItem>
                    <SelectItem value="materials">Construction Materials</SelectItem>
                    <SelectItem value="equipment">Equipment Manufacturing</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="minerals">Industrial Minerals</SelectItem>
                    <SelectItem value="energy">Energy</SelectItem>
                    <SelectItem value="environmental">Environmental Engineering</SelectItem>
                    <SelectItem value="consulting">Consulting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Job Fit Score (Minimum)</Label>
              <div className="px-3">
                <Input
                  type="number"
                  value={filters.jobFitScore || 0}
                  onChange={(e) => handleFilterChange('jobFitScore', parseInt(e.target.value) || 0)}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <div className="text-sm text-gray-600 mt-1">
                  {filters.jobFitScore || 0}% match
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center mt-6 pt-4 border-t">
          <div className="flex gap-2">
            {savedSearches.length > 0 && (
              <div className="flex items-center gap-2">
                <History className="h-4 w-4" />
                <Select onValueChange={(value) => {
                  const saved = savedSearches.find(s => s.id === value);
                  if (saved) loadSavedSearch(saved.filters);
                }}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Load saved search" />
                  </SelectTrigger>
                  <SelectContent>
                    {savedSearches.map(search => (
                      <SelectItem key={search.id} value={search.id}>
                        {search.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <Button onClick={handleSearch} className="px-8">
            <Search className="h-4 w-4 mr-2" />
            Search Resumes
          </Button>
        </div>
      </CardContent>

      {/* Save Search Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Save Search</h3>
            <Input
              placeholder="Enter search name..."
              value={saveSearchName}
              onChange={(e) => setSaveSearchName(e.target.value)}
              className="mb-4"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </Button>
              <Button onClick={saveSearch} disabled={!saveSearchName}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Modals - Temporarily disabled for debugging */}
      {/* <FilterModal
        title="Select Skills"
        items={allSkills}
        selectedItems={selectedSkills}
        open={showSkillsModal}
        onApply={(selected) => {
          setSelectedSkills(selected);
          setFilters(prev => ({ ...prev, technicalSkills: selected }));
          setShowSkillsModal(false);
        }}
        onCancel={() => setShowSkillsModal(false)}
      /> */}
    </Card>
  );
};

export default AdvancedSearchFilters;
