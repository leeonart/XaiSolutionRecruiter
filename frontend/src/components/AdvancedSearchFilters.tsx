import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { X, Plus, Search, Filter, Save, History, Star } from 'lucide-react';

interface SearchFilters {
  // Basic Search
  name?: string;
  email?: string;
  phone?: string;
  
  // Professional Profile
  yearsExperienceMin?: number;
  yearsExperienceMax?: number;
  seniorityLevel?: string;
  careerLevel?: string;
  managementExperience?: boolean;
  
  // Skills & Qualifications
  technicalSkills?: string[];
  certifications?: string[];
  licenses?: string[];
  educationLevel?: string;
  
  // Location & Mobility
  currentLocation?: string;
  preferredLocations?: string[];
  restrictedLocations?: string[];
  relocationWilling?: boolean;
  remoteWorkPreference?: string;
  
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
  currentCompany?: string;
  
  // AI Search
  semanticQuery?: string;
  jobFitScore?: number;
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
  const [filters, setFilters] = useState<SearchFilters>({});
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedCertifications, setSelectedCertifications] = useState<string[]>([]);
  const [selectedPreferredLocations, setSelectedPreferredLocations] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [newCertification, setNewCertification] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [saveSearchName, setSaveSearchName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const commonSkills = [
    'Python', 'JavaScript', 'Java', 'C++', 'SQL', 'React', 'Angular', 'Node.js',
    'AWS', 'Azure', 'Docker', 'Kubernetes', 'Git', 'Linux', 'Windows',
    'Project Management', 'Agile', 'Scrum', 'Leadership', 'Communication'
  ];

  const commonCertifications = [
    'PMP', 'PMP', 'CISSP', 'AWS Certified', 'Microsoft Certified', 'Google Certified',
    'Six Sigma', 'ITIL', 'Cisco CCNA', 'CompTIA A+', 'CEH', 'CISA'
  ];

  const commonLocations = [
    'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ',
    'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA', 'Dallas, TX', 'San Jose, CA',
    'Austin, TX', 'Jacksonville, FL', 'Fort Worth, TX', 'Columbus, OH', 'Charlotte, NC'
  ];

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
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="professional">Professional</TabsTrigger>
            <TabsTrigger value="location">Location</TabsTrigger>
            <TabsTrigger value="ai">AI Search</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Technical Skills</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Add skill..."
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                  />
                  <Button size="sm" onClick={addSkill}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedSkills.map(skill => (
                    <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                      {skill}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeSkill(skill)} />
                    </Badge>
                  ))}
                </div>
                <div className="mt-2">
                  <Label className="text-sm text-gray-600">Common Skills:</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {commonSkills.map(skill => (
                      <Badge
                        key={skill}
                        variant="outline"
                        className="cursor-pointer text-xs"
                        onClick={() => {
                          if (!selectedSkills.includes(skill)) {
                            addSkill();
                            setNewSkill(skill);
                            addSkill();
                          }
                        }}
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <Label>Certifications</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Add certification..."
                    value={newCertification}
                    onChange={(e) => setNewCertification(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCertification()}
                  />
                  <Button size="sm" onClick={addCertification}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedCertifications.map(cert => (
                    <Badge key={cert} variant="secondary" className="flex items-center gap-1">
                      {cert}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeCertification(cert)} />
                    </Badge>
                  ))}
                </div>
                <div className="mt-2">
                  <Label className="text-sm text-gray-600">Common Certifications:</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {commonCertifications.map(cert => (
                      <Badge
                        key={cert}
                        variant="outline"
                        className="cursor-pointer text-xs"
                        onClick={() => {
                          if (!selectedCertifications.includes(cert)) {
                            setNewCertification(cert);
                            addCertification();
                          }
                        }}
                      >
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="professional" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Years of Experience</Label>
                <div className="px-3">
                  <Slider
                    value={[filters.yearsExperienceMin || 0, filters.yearsExperienceMax || 20]}
                    onValueChange={([min, max]) => {
                      handleFilterChange('yearsExperienceMin', min);
                      handleFilterChange('yearsExperienceMax', max);
                    }}
                    max={30}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-600 mt-1">
                    <span>{filters.yearsExperienceMin || 0} years</span>
                    <span>{filters.yearsExperienceMax || 20} years</span>
                  </div>
                </div>
              </div>

              <div>
                <Label>Seniority Level</Label>
                <Select value={filters.seniorityLevel || ''} onValueChange={(value) => handleFilterChange('seniorityLevel', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select seniority level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">Entry Level</SelectItem>
                    <SelectItem value="mid">Mid Level</SelectItem>
                    <SelectItem value="senior">Senior Level</SelectItem>
                    <SelectItem value="executive">Executive Level</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Career Level</Label>
                <Select value={filters.careerLevel || ''} onValueChange={(value) => handleFilterChange('careerLevel', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select career level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual Contributor</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="director">Director</SelectItem>
                    <SelectItem value="vp">VP+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Education Level</Label>
                <Select value={filters.educationLevel || ''} onValueChange={(value) => handleFilterChange('educationLevel', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select education level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high_school">High School</SelectItem>
                    <SelectItem value="associate">Associate Degree</SelectItem>
                    <SelectItem value="bachelor">Bachelor's Degree</SelectItem>
                    <SelectItem value="master">Master's Degree</SelectItem>
                    <SelectItem value="phd">PhD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Current Salary Range</Label>
                <div className="px-3">
                  <Slider
                    value={[filters.currentSalaryMin || 40000, filters.currentSalaryMax || 150000]}
                    onValueChange={([min, max]) => {
                      handleFilterChange('currentSalaryMin', min);
                      handleFilterChange('currentSalaryMax', max);
                    }}
                    max={300000}
                    step={5000}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-600 mt-1">
                    <span>${(filters.currentSalaryMin || 40000).toLocaleString()}</span>
                    <span>${(filters.currentSalaryMax || 150000).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div>
                <Label>Expected Salary Range</Label>
                <div className="px-3">
                  <Slider
                    value={[filters.expectedSalaryMin || 50000, filters.expectedSalaryMax || 200000]}
                    onValueChange={([min, max]) => {
                      handleFilterChange('expectedSalaryMin', min);
                      handleFilterChange('expectedSalaryMax', max);
                    }}
                    max={400000}
                    step={5000}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-600 mt-1">
                    <span>${(filters.expectedSalaryMin || 50000).toLocaleString()}</span>
                    <span>${(filters.expectedSalaryMax || 200000).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="management"
                  checked={filters.managementExperience || false}
                  onCheckedChange={(checked) => handleFilterChange('managementExperience', checked)}
                />
                <Label htmlFor="management">Has Management Experience</Label>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="location" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="currentLocation">Current Location</Label>
                <Input
                  id="currentLocation"
                  placeholder="City, State or Country..."
                  value={filters.currentLocation || ''}
                  onChange={(e) => handleFilterChange('currentLocation', e.target.value)}
                />
              </div>

              <div>
                <Label>Remote Work Preference</Label>
                <Select value={filters.remoteWorkPreference || ''} onValueChange={(value) => handleFilterChange('remoteWorkPreference', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remote">Remote Only</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="onsite">On-site Only</SelectItem>
                    <SelectItem value="flexible">Flexible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Preferred Locations</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Add preferred location..."
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addPreferredLocation()}
                />
                <Button size="sm" onClick={addPreferredLocation}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedPreferredLocations.map(location => (
                  <Badge key={location} variant="secondary" className="flex items-center gap-1">
                    {location}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removePreferredLocation(location)} />
                  </Badge>
                ))}
              </div>
              <div className="mt-2">
                <Label className="text-sm text-gray-600">Common Locations:</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {commonLocations.map(location => (
                    <Badge
                      key={location}
                      variant="outline"
                      className="cursor-pointer text-xs"
                      onClick={() => {
                        if (!selectedPreferredLocations.includes(location)) {
                          setNewLocation(location);
                          addPreferredLocation();
                        }
                      }}
                    >
                      {location}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="relocation"
                  checked={filters.relocationWilling || false}
                  onCheckedChange={(checked) => handleFilterChange('relocationWilling', checked)}
                />
                <Label htmlFor="relocation">Willing to Relocate</Label>
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
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="construction">Construction</SelectItem>
                    <SelectItem value="mining">Mining</SelectItem>
                    <SelectItem value="cement">Cement</SelectItem>
                    <SelectItem value="chemical">Chemical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Job Fit Score (Minimum)</Label>
              <div className="px-3">
                <Slider
                  value={[filters.jobFitScore || 0]}
                  onValueChange={([value]) => handleFilterChange('jobFitScore', value)}
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
    </Card>
  );
};

export default AdvancedSearchFilters;
