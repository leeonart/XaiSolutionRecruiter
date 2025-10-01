import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, X } from 'lucide-react';

interface FilterItem {
  name: string;
  count: number;
}

interface FilterModalProps {
  title: string;
  items: FilterItem[];
  selectedItems: string[];
  onApply: (selected: string[]) => void;
  onCancel: () => void;
  open: boolean;
}

const FilterModal: React.FC<FilterModalProps> = ({
  title,
  items,
  selectedItems,
  onApply,
  onCancel,
  open
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tempSelected, setTempSelected] = useState<string[]>(selectedItems);

  useEffect(() => {
    setTempSelected(selectedItems);
  }, [selectedItems, open]);

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggle = (itemName: string) => {
    setTempSelected(prev =>
      prev.includes(itemName)
        ? prev.filter(i => i !== itemName)
        : [...prev, itemName]
    );
  };

  const handleSelectAll = () => {
    setTempSelected(filteredItems.map(item => item.name));
  };

  const handleDeselectAll = () => {
    setTempSelected([]);
  };

  const handleApply = () => {
    onApply(tempSelected);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{title}</span>
            <Badge variant="secondary" className="ml-2">
              {tempSelected.length} selected
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-8"
            />
            {searchTerm && (
              <X
                className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 cursor-pointer hover:text-gray-600"
                onClick={() => setSearchTerm('')}
              />
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="flex-1"
            >
              Select All ({filteredItems.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
              className="flex-1"
            >
              Deselect All
            </Button>
          </div>

          {/* Items List */}
          <ScrollArea className="h-[400px] border rounded-md p-2">
            <div className="space-y-2">
              {filteredItems.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No items found
                </div>
              ) : (
                filteredItems.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    onClick={() => handleToggle(item.name)}
                  >
                    <Checkbox
                      checked={tempSelected.includes(item.name)}
                      onCheckedChange={() => handleToggle(item.name)}
                    />
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-sm">{item.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {item.count}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Summary */}
          <div className="text-xs text-gray-500">
            Showing {filteredItems.length} of {items.length} items
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            Apply ({tempSelected.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FilterModal;

