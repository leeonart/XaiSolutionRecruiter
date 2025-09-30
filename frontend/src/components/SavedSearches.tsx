import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Save, 
  History, 
  Star, 
  Trash2, 
  Edit, 
  Play, 
  Calendar,
  User,
  Filter,
  Search
} from 'lucide-react';

interface SavedSearch {
  id: string;
  name: string;
  filters: any;
  created_at: string;
  last_used?: string;
  use_count: number;
  is_favorite: boolean;
}

interface SavedSearchesProps {
  savedSearches: SavedSearch[];
  onLoadSearch: (filters: any) => void;
  onSaveSearch: (name: string, filters: any) => void;
  onDeleteSearch: (id: string) => void;
  onUpdateSearch: (id: string, name: string, filters: any) => void;
  onToggleFavorite: (id: string) => void;
}

const SavedSearches: React.FC<SavedSearchesProps> = ({
  savedSearches,
  onLoadSearch,
  onSaveSearch,
  onDeleteSearch,
  onUpdateSearch,
  onToggleFavorite
}) => {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingSearch, setEditingSearch] = useState<SavedSearch | null>(null);
  const [searchName, setSearchName] = useState('');
  const [currentFilters, setCurrentFilters] = useState<any>({});

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getFilterSummary = (filters: any) => {
    const summary = [];
    
    if (filters.name) summary.push(`Name: ${filters.name}`);
    if (filters.yearsExperienceMin || filters.yearsExperienceMax) {
      const min = filters.yearsExperienceMin || 0;
      const max = filters.yearsExperienceMax || '∞';
      summary.push(`Experience: ${min}-${max} years`);
    }
    if (filters.technicalSkills?.length) {
      summary.push(`Skills: ${filters.technicalSkills.length} selected`);
    }
    if (filters.currentLocation) summary.push(`Location: ${filters.currentLocation}`);
    if (filters.currentSalaryMin || filters.currentSalaryMax) {
      const min = filters.currentSalaryMin ? `$${filters.currentSalaryMin.toLocaleString()}` : '$0';
      const max = filters.currentSalaryMax ? `$${filters.currentSalaryMax.toLocaleString()}` : '∞';
      summary.push(`Salary: ${min}-${max}`);
    }
    if (filters.workAuthorization) summary.push(`Work Auth: ${filters.workAuthorization}`);
    if (filters.semanticQuery) summary.push(`AI Query: "${filters.semanticQuery.substring(0, 30)}..."`);
    
    return summary.slice(0, 3); // Show max 3 filters
  };

  const handleSaveSearch = () => {
    if (searchName.trim()) {
      onSaveSearch(searchName.trim(), currentFilters);
      setSearchName('');
      setShowSaveDialog(false);
    }
  };

  const handleEditSearch = (search: SavedSearch) => {
    setEditingSearch(search);
    setSearchName(search.name);
    setShowEditDialog(true);
  };

  const handleUpdateSearch = () => {
    if (editingSearch && searchName.trim()) {
      onUpdateSearch(editingSearch.id, searchName.trim(), editingSearch.filters);
      setShowEditDialog(false);
      setEditingSearch(null);
      setSearchName('');
    }
  };

  const handleLoadSearch = (search: SavedSearch) => {
    onLoadSearch(search.filters);
  };

  const favorites = savedSearches.filter(s => s.is_favorite);
  const recent = savedSearches.filter(s => !s.is_favorite).sort((a, b) => 
    new Date(b.last_used || b.created_at).getTime() - new Date(a.last_used || a.created_at).getTime()
  ).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Save Current Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Save Current Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter search name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSaveSearch()}
            />
            <Button onClick={handleSaveSearch} disabled={!searchName.trim()}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Favorites */}
      {favorites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Favorite Searches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {favorites.map((search) => (
                <div key={search.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{search.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        Used {search.use_count} times
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      {getFilterSummary(search.filters).join(' • ')}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Created {formatDate(search.created_at)}
                      {search.last_used && ` • Last used ${formatDate(search.last_used)}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleLoadSearch(search)}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Run
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditSearch(search)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onToggleFavorite(search.id)}
                    >
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDeleteSearch(search.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Searches */}
      {recent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Searches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recent.map((search) => (
                <div key={search.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{search.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        Used {search.use_count} times
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      {getFilterSummary(search.filters).join(' • ')}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Created {formatDate(search.created_at)}
                      {search.last_used && ` • Last used ${formatDate(search.last_used)}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleLoadSearch(search)}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Run
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditSearch(search)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onToggleFavorite(search.id)}
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDeleteSearch(search.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {savedSearches.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No saved searches</h3>
            <p className="text-gray-600 mb-4">
              Save your search criteria to quickly find candidates later
            </p>
            <Button onClick={() => setShowSaveDialog(true)}>
              <Save className="h-4 w-4 mr-2" />
              Save Your First Search
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Saved Search</DialogTitle>
            <DialogDescription>
              Update the name of your saved search
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Enter search name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateSearch} disabled={!searchName.trim()}>
                Update
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SavedSearches;
