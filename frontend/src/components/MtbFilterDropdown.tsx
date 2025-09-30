import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api';

interface MtbFilterDropdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  csvPath: string;
  columnName: string;
  disabled?: boolean;
}

export default function MtbFilterDropdown({
  label,
  value,
  onChange,
  placeholder,
  csvPath,
  columnName,
  disabled = false
}: MtbFilterDropdownProps) {
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadOptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.getMtbColumnValues(csvPath, columnName);
      if (Array.isArray(response)) {
        setOptions(response);
      } else {
        setError('Failed to load options');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  }, [csvPath, columnName]);

  // Load options only when dropdown is opened (lazy loading)
  useEffect(() => {
    if (isOpen && csvPath && columnName && !disabled && options.length === 0) {
      loadOptions();
    }
  }, [isOpen, csvPath, columnName, disabled, loadOptions]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper function to parse values safely
  // We'll use a special delimiter (|||) internally to avoid conflicts with commas in data
  const INTERNAL_DELIMITER = '|||';
  
  const parseValues = (valueString: string): string[] => {
    if (valueString === 'ALL' || !valueString.trim()) {
      return [];
    }
    
    // Use special delimiter internally to avoid comma conflicts
    return valueString.split(INTERNAL_DELIMITER).map(v => v.trim()).filter(v => v);
  };

  // Helper function to join values back to string
  const joinValues = (values: string[]): string => {
    if (values.length === 0) {
      return 'ALL';
    }
    // Use special delimiter internally
    return values.join(INTERNAL_DELIMITER);
  };

  // Helper function to display values with commas for user
  const displayValue = (valueString: string): string => {
    if (valueString === 'ALL' || !valueString.trim()) {
      return 'ALL';
    }
    return parseValues(valueString).join(', ');
  };

  const handleOptionClick = (option: string) => {
    const currentValues = parseValues(value);
    
    if (currentValues.includes(option)) {
      // Remove the option
      const newValues = currentValues.filter(v => v !== option);
      onChange(joinValues(newValues));
    } else {
      // Add the option
      currentValues.push(option);
      onChange(joinValues(currentValues));
    }
    // Keep dropdown open for multiple selections
    setSearchTerm('');
  };

  const handleClearAll = () => {
    onChange('ALL');
    setIsOpen(false);
    setSearchTerm('');
  };

  const selectedValues = parseValues(value);

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-1 relative">
        <input
          type="text"
          value={displayValue(value)}
          onChange={(e) => {
            // Convert comma-separated input back to special delimiter for storage
            const inputValue = e.target.value;
            if (inputValue === 'ALL' || !inputValue.trim()) {
              onChange('ALL');
            } else {
              // Convert commas to special delimiter for internal storage
              const values = inputValue.split(',').map(v => v.trim()).filter(v => v);
              onChange(joinValues(values));
            }
          }}
          onFocus={() => {
            setIsOpen(true);
            // If no options loaded yet, trigger loading
            if (csvPath && columnName && !disabled && options.length === 0) {
              loadOptions();
            }
          }}
          className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-10"
          placeholder={placeholder}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            // If opening and no options loaded yet, trigger loading
            if (!isOpen && csvPath && columnName && !disabled && options.length === 0) {
              loadOptions();
            }
          }}
          disabled={disabled}
          className="absolute inset-y-0 right-0 flex items-center pr-2"
        >
          {loading ? (
            <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
          ) : (
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {isOpen && !disabled && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
          
          <div className="p-1">
            <button
              onClick={handleClearAll}
              className="w-full text-left px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
            >
              Clear All (ALL)
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                setSearchTerm('');
              }}
              className="w-full text-left px-2 py-1 text-sm text-green-600 hover:bg-green-50 rounded border-t border-gray-200 mt-1"
            >
              Done
            </button>
          </div>

          <div className="max-h-48 overflow-auto">
            {filteredOptions.map((option) => {
              const isSelected = selectedValues.includes(option);
              return (
                <button
                  key={option}
                  onClick={() => handleOptionClick(option)}
                  className={`w-full text-left px-2 py-1 text-sm rounded ${
                    isSelected
                      ? 'bg-blue-100 text-blue-800'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // Handled by button click
                      className="mr-2"
                    />
                    {option}
                  </div>
                </button>
              );
            })}
          </div>

          {filteredOptions.length === 0 && searchTerm && (
            <div className="p-2 text-sm text-gray-500 text-center">
              No options found for "{searchTerm}"
            </div>
          )}
        </div>
      )}

      {selectedValues.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {selectedValues.map((val) => (
            <span
              key={val}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
            >
              {val}
              <button
                onClick={() => handleOptionClick(val)}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
