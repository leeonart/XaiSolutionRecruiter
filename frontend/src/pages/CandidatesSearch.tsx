import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  Download, 
  Mail, 
  Phone, 
  MapPin, 
  DollarSign,
  User,
  Building,
  Calendar,
  Eye,
  Heart,
  ChevronDown,
  ChevronUp,
  Users,
  TrendingUp,
  Award,
  Globe,
  Shield,
  Briefcase,
  GraduationCap,
  Star
} from 'lucide-react';

interface Candidate {
  id: number;
  first_name?: string;
  last_name?: string;
  email_address?: string;
  cell_phone?: string;
  city_state?: string;
  current_salary?: number;
  desired_salary?: number;
  candidate_status?: string;
  recruiter?: string;
  degree?: string;
  last_pos_with_interview?: string;
  date_entered?: string;
  last_modified?: string;
  relocate?: string;
  visa_info?: string;
  notes?: string;
  social_linkedin?: string;
  placed_start_date?: string;
  first_resume_received_date?: string;
  burn_notice?: string;
  communication_status?: string;
  linkedin_old_database?: string;
  ethics_section?: string;
  salary_note?: string;
  placed_by?: string;
  resume_yn?: string;
  whose_exc_cand?: string;
  exclusive_expires_date?: string;
}

interface SearchFilters {
  search: string;
  status: string;
  recruiter: string;
  minSalary: string;
  maxSalary: string;
  relocate: string;
  sortBy: string;
  searchField: string; // New field for specific field search
  fieldSearchValue: string; // New field for the search value
}

const CandidatesSearch: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedCandidates, setExpandedCandidates] = useState<Set<number>>(new Set());
  const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    search: '',
    status: '',
    recruiter: '',
    minSalary: '',
    maxSalary: '',
    relocate: '',
    sortBy: 'last_name',
    searchField: '',
    fieldSearchValue: ''
  });
  const [recruiters, setRecruiters] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const hasInitialSearchRun = useRef(false);

  // Debug: Track component lifecycle
  useEffect(() => {
    console.log('CandidatesSearch component mounted');
    return () => {
      console.log('CandidatesSearch component unmounting');
    };
  }, []);

  // Load recruiters list
  useEffect(() => {
    const loadRecruiters = async () => {
      try {
        const response = await fetch('/api/candidates/recruiters');
        if (response.ok) {
          const data = await response.json();
          setRecruiters(data);
        }
      } catch (error) {
        console.error('Error loading recruiters:', error);
      }
    };
    loadRecruiters();
  }, []);

  // Search candidates
  const searchCandidates = async (searchFilters?: SearchFilters) => {
    setLoading(true);
    try {
      const currentFilters = searchFilters || filters;
      const queryParams = new URLSearchParams();
      if (currentFilters.search) queryParams.append('search', currentFilters.search);
      if (currentFilters.status) queryParams.append('status', currentFilters.status);
      if (currentFilters.recruiter) queryParams.append('recruiter', currentFilters.recruiter);
      if (currentFilters.minSalary) queryParams.append('min_salary', currentFilters.minSalary);
      if (currentFilters.maxSalary) queryParams.append('max_salary', currentFilters.maxSalary);
      if (currentFilters.relocate) queryParams.append('relocate', currentFilters.relocate);
      if (currentFilters.sortBy) queryParams.append('sort_by', currentFilters.sortBy);

      const response = await fetch(`/api/candidates/search?${queryParams}`);
      if (response.ok) {
        const data = await response.json();
        const candidatesData = data.candidates || [];
        const totalCountData = data.total || 0;
        
        setCandidates(candidatesData);
        setTotalCount(totalCountData);
        hasInitialSearchRun.current = true;
        
        // Save to localStorage to persist across component remounts
        localStorage.setItem('candidates-search-results', JSON.stringify(candidatesData));
        localStorage.setItem('candidates-search-total', totalCountData.toString());
      } else {
        console.error('Error searching candidates:', response.statusText);
      }
    } catch (error) {
      console.error('Error searching candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  // Field-specific search
  const searchByField = async () => {
    if (!filters.searchField || !filters.fieldSearchValue.trim()) {
      alert('Please select a field and enter a search value');
      return;
    }
    
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('field', filters.searchField);
      queryParams.append('value', filters.fieldSearchValue.trim());
      if (filters.sortBy) queryParams.append('sort_by', filters.sortBy);

      const response = await fetch(`/api/candidates/field-search?${queryParams}`);
      if (response.ok) {
        const data = await response.json();
        const candidatesData = data.candidates || [];
        const totalCountData = data.total || 0;
        
        setCandidates(candidatesData);
        setTotalCount(totalCountData);
        hasInitialSearchRun.current = true;
        
        // Save to localStorage to persist across component remounts
        localStorage.setItem('candidates-search-results', JSON.stringify(candidatesData));
        localStorage.setItem('candidates-search-total', totalCountData.toString());
      } else {
        console.error('Error searching candidates by field:', response.statusText);
      }
    } catch (error) {
      console.error('Error searching candidates by field:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load saved search results from localStorage on mount
  useEffect(() => {
    const savedCandidates = localStorage.getItem('candidates-search-results');
    const savedTotalCount = localStorage.getItem('candidates-search-total');
    
    if (savedCandidates && savedTotalCount) {
      console.log('Loading saved search results from localStorage');
      try {
        setCandidates(JSON.parse(savedCandidates));
        setTotalCount(parseInt(savedTotalCount, 10));
        hasInitialSearchRun.current = true;
      } catch (error) {
        console.error('Error loading saved search results:', error);
      }
    }
  }, []);

  // Initial search on component mount - only run once
  useEffect(() => {
    console.log('Initial search useEffect running, hasInitialSearchRun.current:', hasInitialSearchRun.current);
    if (!hasInitialSearchRun.current) {
      console.log('Running initial search...');
      searchCandidates();
    } else {
      console.log('Skipping initial search - already run');
    }
  }, []); // Empty dependency array - only run once on mount

  const handleFilterChange = useCallback((key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    // No auto-search - user must click search button or press Enter
  }, []);

  const handleSearch = useCallback(() => {
    searchCandidates();
  }, []);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  const toggleExpanded = (candidateId: number) => {
    setExpandedCandidates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(candidateId)) {
        newSet.delete(candidateId);
      } else {
        newSet.add(candidateId);
      }
      return newSet;
    });
  };

  const toggleSelection = (candidateId: number) => {
    setSelectedCandidates(prev => 
      prev.includes(candidateId) 
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const selectAllCandidates = () => {
    setSelectedCandidates(candidates.map(c => c.id));
  };

  const clearSelection = () => {
    setSelectedCandidates([]);
  };

  const formatSalary = (salary?: number) => {
    if (!salary) return 'Not specified';
    return `$${salary.toLocaleString()}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatPhoneNumber = (phone?: string) => {
    if (!phone) return 'Not provided';
    
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Handle different phone number formats
    if (digits.length === 10) {
      // US format: (999) 999-9999
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      // US format with country code: +1 (999) 999-9999
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    } else if (digits.length > 11) {
      // International format: +[country code] [formatted number]
      // Try to identify common country codes and format accordingly
      let formatted = '';
      
      // Check for common country codes
      if (digits.startsWith('44')) {
        // UK: +44 20 1234 5678
        formatted = `+44 ${digits.slice(2, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
      } else if (digits.startsWith('33')) {
        // France: +33 1 23 45 67 89
        formatted = `+33 ${digits.slice(2, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)} ${digits.slice(9)}`;
      } else if (digits.startsWith('49')) {
        // Germany: +49 30 12345678
        formatted = `+49 ${digits.slice(2, 4)} ${digits.slice(4)}`;
      } else if (digits.startsWith('52')) {
        // Mexico: +52 442 470 358
        const areaCode = digits.slice(2, 5);
        const firstPart = digits.slice(5, 8);
        const secondPart = digits.slice(8);
        formatted = `+52 ${areaCode} ${firstPart} ${secondPart}`;
      } else if (digits.startsWith('233')) {
        // Ghana: +233 24 968 1757
        formatted = `+233 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
      } else if (digits.startsWith('20')) {
        // Egypt: +20 10 6200 0200
        formatted = `+20 ${digits.slice(2, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
      } else {
        // Generic international format: +[country code] [remaining digits grouped]
        const countryCode = digits.slice(0, digits.length - 10);
        const remainingDigits = digits.slice(countryCode.length);
        if (remainingDigits.length >= 10) {
          // Try to format remaining digits
          const areaCode = remainingDigits.slice(0, 3);
          const firstPart = remainingDigits.slice(3, 6);
          const secondPart = remainingDigits.slice(6);
          formatted = `+${countryCode} (${areaCode}) ${firstPart}-${secondPart}`;
        } else {
          // Just group remaining digits
          formatted = `+${countryCode} ${remainingDigits}`;
        }
      }
      
      return formatted;
    } else if (digits.length < 10) {
      // Too short, return as-is
      return phone;
    }
    
    // Default fallback
    return phone;
  };

  const getPhoneTelLink = (phone?: string) => {
    if (!phone) return '';
    
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Handle different formats
    if (digits.length === 10) {
      // US format: add +1
      return `tel:+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      // Already has country code
      return `tel:+${digits}`;
    } else if (digits.length > 10) {
      // International format
      return `tel:+${digits}`;
    } else if (digits.length < 10) {
      // Too short, return empty
      return '';
    }
    
    // Default fallback
    return `tel:+${digits}`;
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'C': return 'bg-blue-100 text-blue-800';
      case 'P': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'C': return 'Active';
      case 'P': return 'Placed';
      default: return status || 'Unknown';
    }
  };

  const exportSelected = () => {
    const selectedData = candidates.filter(c => selectedCandidates.includes(c.id));
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Location', 'Status', 'Recruiter', 'Current Salary', 'Desired Salary'].join(','),
      ...selectedData.map(c => [
        `"${c.first_name || ''} ${c.last_name || ''}"`,
        `"${c.email_address || ''}"`,
        `"${formatPhoneNumber(c.cell_phone)}"`,
        `"${c.city_state || ''}"`,
        `"${getStatusText(c.candidate_status)}"`,
        `"${c.recruiter || ''}"`,
        c.current_salary || '',
        c.desired_salary || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `candidates_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div key="candidates-search-container" className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Candidates Database</h1>
          <p className="text-gray-600 mt-1">Search and manage candidate information</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          {selectedCandidates.length > 0 && (
            <Button onClick={exportSelected} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export ({selectedCandidates.length})
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Candidates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Search */}
          <div className="flex gap-4">
            <Input
              placeholder="Search by name, email, or position..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {/* Field-Specific Search */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Search Specific Field Only</h4>
            <div className="flex gap-4">
              <Select value={filters.searchField} onValueChange={(value) => handleFilterChange('searchField', value)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select field..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first_name">First Name</SelectItem>
                  <SelectItem value="last_name">Last Name</SelectItem>
                  <SelectItem value="email_address">Email Address</SelectItem>
                  <SelectItem value="cell_phone">Phone Number</SelectItem>
                  <SelectItem value="city_state">Location</SelectItem>
                  <SelectItem value="last_pos_with_interview">Position</SelectItem>
                  <SelectItem value="degree">Degree</SelectItem>
                  <SelectItem value="notes">Notes</SelectItem>
                  <SelectItem value="social_linkedin">LinkedIn</SelectItem>
                  <SelectItem value="recruiter">Recruiter</SelectItem>
                  <SelectItem value="candidate_status">Status</SelectItem>
                  <SelectItem value="relocate">Relocation</SelectItem>
                  <SelectItem value="visa_info">Visa Status</SelectItem>
                  <SelectItem value="current_salary">Current Salary</SelectItem>
                  <SelectItem value="desired_salary">Desired Salary</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Enter search value..."
                value={filters.fieldSearchValue}
                onChange={(e) => handleFilterChange('fieldSearchValue', e.target.value)}
                className="flex-1"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    searchByField();
                  }
                }}
              />
              <Button 
                onClick={searchByField} 
                disabled={loading || !filters.searchField || !filters.fieldSearchValue.trim()}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                Field Search
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Search only in the selected field. This will ignore the general search and filters above.
            </p>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    <SelectItem value="C">Active</SelectItem>
                    <SelectItem value="P">Placed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recruiter</label>
                <Select value={filters.recruiter} onValueChange={(value) => handleFilterChange('recruiter', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Recruiters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Recruiters</SelectItem>
                    {recruiters.map(recruiter => (
                      <SelectItem key={recruiter} value={recruiter}>{recruiter}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Salary</label>
                <Input
                  type="number"
                  placeholder="Min salary"
                  value={filters.minSalary}
                  onChange={(e) => handleFilterChange('minSalary', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Salary</label>
                <Input
                  type="number"
                  placeholder="Max salary"
                  value={filters.maxSalary}
                  onChange={(e) => handleFilterChange('maxSalary', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Sort Options */}
          <div className="flex items-center gap-4 pt-4 border-t">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last_name">Name</SelectItem>
                <SelectItem value="current_salary">Current Salary</SelectItem>
                <SelectItem value="desired_salary">Desired Salary</SelectItem>
                <SelectItem value="date_entered">Date Entered</SelectItem>
                <SelectItem value="recruiter">Recruiter</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="font-medium">{totalCount.toLocaleString()} candidates found</span>
              </div>
              {selectedCandidates.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {selectedCandidates.length} selected
                  </span>
                  <Button size="sm" variant="outline" onClick={clearSelection}>
                    Clear Selection
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={selectAllCandidates}
                disabled={candidates.length === 0}
              >
                Select All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Searching candidates...</p>
          </CardContent>
        </Card>
      ) : candidates.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No candidates found</h3>
            <p className="text-gray-600">Try adjusting your search criteria</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {candidates.map((candidate) => {
            const isExpanded = expandedCandidates.has(candidate.id);
            
            return (
              <Card key={candidate.id} className="hover:shadow-lg transition-all duration-200">
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedCandidates.includes(candidate.id)}
                        onChange={() => toggleSelection(candidate.id)}
                        className="rounded"
                      />
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {candidate.first_name} {candidate.last_name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {candidate.last_pos_with_interview || 'Position not specified'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(candidate.candidate_status)}>
                        {getStatusText(candidate.candidate_status)}
                      </Badge>
                      {candidate.recruiter && (
                        <Badge variant="outline">
                          {candidate.recruiter}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Main Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
                    {/* Contact Info */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Contact
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-blue-600" />
                          <span className="truncate">{candidate.email_address || 'No email'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-blue-600" />
                          {candidate.cell_phone && getPhoneTelLink(candidate.cell_phone) ? (
                            <a 
                              href={getPhoneTelLink(candidate.cell_phone)} 
                              className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                              title="Click to call"
                            >
                              {formatPhoneNumber(candidate.cell_phone)}
                            </a>
                          ) : (
                            <span className="text-gray-500">No phone</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-blue-600" />
                          <span>{candidate.city_state || 'Location not specified'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Professional Info */}
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Professional
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Building className="h-3 w-3 text-green-600" />
                          <span className="truncate">{candidate.last_pos_with_interview || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-3 w-3 text-green-600" />
                          <span className="truncate">{candidate.degree || 'Education not specified'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-green-600" />
                          <span>Entered: {formatDate(candidate.date_entered)}</span>
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
                        <div>
                          <span className="text-yellow-600">Current:</span>
                          <span className="ml-2">{formatSalary(candidate.current_salary)}</span>
                        </div>
                        <div>
                          <span className="text-yellow-600">Desired:</span>
                          <span className="ml-2">{formatSalary(candidate.desired_salary)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-yellow-600" />
                          <span>Updated: {formatDate(candidate.last_modified)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status & Preferences */}
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Status & Preferences
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Star className="h-3 w-3 text-purple-600" />
                          <span>Status: {getStatusText(candidate.candidate_status)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Globe className="h-3 w-3 text-purple-600" />
                          <span>Relocate: {candidate.relocate || 'Not specified'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Award className="h-3 w-3 text-purple-600" />
                          <span>Visa: {candidate.visa_info || 'Not specified'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded View */}
                  {isExpanded && (
                    <div className="border-t pt-4">
                      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                        {/* Additional Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Personal Details */}
                          <div className="bg-white p-3 rounded border">
                            <h4 className="font-semibold text-gray-900 mb-2">Personal Details</h4>
                            <div className="space-y-1 text-sm">
                              <div>
                                <span className="font-medium">Phone:</span> 
                                {candidate.cell_phone && getPhoneTelLink(candidate.cell_phone) ? (
                                  <a 
                                    href={getPhoneTelLink(candidate.cell_phone)} 
                                    className="ml-2 text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                    title="Click to call"
                                  >
                                    {formatPhoneNumber(candidate.cell_phone)}
                                  </a>
                                ) : (
                                  <span className="ml-2 text-gray-500">Not provided</span>
                                )}
                              </div>
                              <div><span className="font-medium">Location:</span> {candidate.city_state || 'Not provided'}</div>
                              <div><span className="font-medium">Relocation:</span> {candidate.relocate || 'Not specified'}</div>
                              <div><span className="font-medium">Visa Status:</span> {candidate.visa_info || 'Not specified'}</div>
                              <div><span className="font-medium">Degree:</span> {candidate.degree || 'Not specified'}</div>
                            </div>
                          </div>

                          {/* Professional Details */}
                          <div className="bg-white p-3 rounded border">
                            <h4 className="font-semibold text-gray-900 mb-2">Professional Details</h4>
                            <div className="space-y-1 text-sm">
                              <div><span className="font-medium">Position:</span> {candidate.last_pos_with_interview || 'Not specified'}</div>
                              <div><span className="font-medium">Recruiter:</span> {candidate.recruiter || 'Not assigned'}</div>
                              <div><span className="font-medium">Status:</span> {getStatusText(candidate.candidate_status)}</div>
                              <div><span className="font-medium">Date Entered:</span> {formatDate(candidate.date_entered)}</div>
                              <div><span className="font-medium">Last Modified:</span> {formatDate(candidate.last_modified)}</div>
                            </div>
                          </div>
                        </div>

                        {/* Compensation Details */}
                        <div className="bg-white p-3 rounded border">
                          <h4 className="font-semibold text-gray-900 mb-2">Compensation Details</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Current Salary:</span> {formatSalary(candidate.current_salary)}
                            </div>
                            <div>
                              <span className="font-medium">Desired Salary:</span> {formatSalary(candidate.desired_salary)}
                            </div>
                          </div>
                        </div>

                        {/* Contact & Social */}
                        <div className="bg-white p-3 rounded border">
                          <h4 className="font-semibold text-gray-900 mb-2">Contact & Social</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Email:</span> {candidate.email_address || 'Not provided'}
                            </div>
                            <div>
                              <span className="font-medium">LinkedIn:</span> {candidate.social_linkedin ? (
                                <a href={candidate.social_linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                  View Profile
                                </a>
                              ) : 'Not provided'}
                            </div>
                          </div>
                        </div>

                        {/* Additional Database Fields */}
                        <div className="bg-white p-3 rounded border">
                          <h4 className="font-semibold text-gray-900 mb-2">Additional Information</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Resume Available:</span> {candidate.resume_yn || 'Unknown'}
                            </div>
                            <div>
                              <span className="font-medium">First Resume Date:</span> {formatDate(candidate.first_resume_received_date)}
                            </div>
                            <div>
                              <span className="font-medium">Placed Start Date:</span> {formatDate(candidate.placed_start_date)}
                            </div>
                            <div>
                              <span className="font-medium">Placed By:</span> {candidate.placed_by || 'Not specified'}
                            </div>
                            <div>
                              <span className="font-medium">Communication Status:</span> {candidate.communication_status || 'Not specified'}
                            </div>
                            <div>
                              <span className="font-medium">Burn Notice:</span> {candidate.burn_notice || 'None'}
                            </div>
                            {candidate.salary_note && (
                              <div className="md:col-span-2">
                                <span className="font-medium">Salary Note:</span> {candidate.salary_note}
                              </div>
                            )}
                            {candidate.ethics_section && (
                              <div className="md:col-span-2">
                                <span className="font-medium">Ethics Section:</span> {candidate.ethics_section}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Notes */}
                        {candidate.notes && (
                          <div className="bg-white p-3 rounded border">
                            <h4 className="font-semibold text-gray-900 mb-2">Notes</h4>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {candidate.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`mailto:${candidate.email_address}`, '_blank')}
                        disabled={!candidate.email_address}
                        className="flex items-center gap-2"
                      >
                        <Mail className="h-4 w-4" />
                        Email
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(candidate.social_linkedin, '_blank')}
                        disabled={!candidate.social_linkedin}
                        className="flex items-center gap-2"
                      >
                        <Globe className="h-4 w-4" />
                        LinkedIn
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Heart className="h-4 w-4" />
                        Add to Shortlist
                      </Button>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleExpanded(candidate.id)}
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
      )}
    </div>
  );
};

export default CandidatesSearch;
