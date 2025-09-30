import React, { useState, useEffect } from 'react';

interface SalaryInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

interface ParsedSalary {
  min: number | null;
  max: number | null;
  currency: string;
  period: string;
  has_plus: boolean;
  is_max: boolean;
  notes: string | null;
  confidence: number;
}

const SalaryInput: React.FC<SalaryInputProps> = ({
  label,
  value,
  onChange,
  placeholder = "ALL or 100000",
  disabled = false,
  className = ""
}) => {
  const [parsedSalary, setParsedSalary] = useState<ParsedSalary | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Simple client-side salary parsing (basic version)
  const parseSalary = (salaryStr: string): ParsedSalary | null => {
    if (!salaryStr || salaryStr.toUpperCase() === 'ALL') {
      return null;
    }

    const cleanStr = salaryStr.toLowerCase().trim();
    
    // Detect currency
    let currency = 'USD';
    if (cleanStr.includes('€') || cleanStr.includes('eur')) currency = 'EUR';
    else if (cleanStr.includes('£') || cleanStr.includes('gbp')) currency = 'GBP';
    
    // Detect period
    let period = 'annual';
    if (cleanStr.includes('/hr') || cleanStr.includes('per hour') || cleanStr.includes('hourly')) {
      period = 'hourly';
    }
    
    // Detect qualifiers
    const has_plus = cleanStr.includes('+') || cleanStr.includes('plus');
    const is_max = cleanStr.includes('max');
    const has_doe = cleanStr.includes('doe');
    
    // Extract numbers
    const numbers = cleanStr.match(/(\d+(?:\.\d+)?)/g);
    if (!numbers) return null;
    
    const numericValues = numbers.map(n => parseFloat(n));
    
    let min: number | null = null;
    let max: number | null = null;
    
    if (cleanStr.includes('-') || cleanStr.includes(' to ')) {
      // Range format
      min = numericValues[0];
      max = numericValues[1] || null;
    } else {
      // Single value
      min = numericValues[0];
      max = null;
    }
    
    // Convert K format
    if (cleanStr.includes('k')) {
      if (min !== null) min = min * 1000;
      if (max !== null) max = max * 1000;
    }
    
    // Convert hourly to annual
    if (period === 'hourly') {
      if (min !== null) min = min * 2080;
      if (max !== null) max = max * 2080;
    }
    
    return {
      min,
      max,
      currency,
      period: 'annual', // Always convert to annual for comparison
      has_plus,
      is_max,
      notes: has_doe ? 'DOE' : null,
      confidence: 0.8
    };
  };

  useEffect(() => {
    if (value && value.toUpperCase() !== 'ALL') {
      const parsed = parseSalary(value);
      setParsedSalary(parsed);
    } else {
      setParsedSalary(null);
    }
  }, [value]);

  const formatDisplayValue = (parsed: ParsedSalary): string => {
    if (!parsed) return '';
    
    const { min, max, currency, has_plus, is_max, notes } = parsed;
    
    let result = '';
    if (min !== null && max !== null && min !== max) {
      result = `${currency === 'USD' ? '$' : currency}${min.toLocaleString()}-${max.toLocaleString()}`;
    } else if (min !== null) {
      result = `${currency === 'USD' ? '$' : currency}${min.toLocaleString()}`;
    }
    
    if (has_plus) result += '+';
    if (is_max) result += ' Max';
    if (notes) result += ` ${notes}`;
    
    return result;
  };

  const getValidationMessage = (): string => {
    if (!value || value.toUpperCase() === 'ALL') return '';
    
    if (parsedSalary) {
      if (parsedSalary.confidence < 0.5) {
        return '⚠️ Low confidence parsing - please check format';
      }
      return `✅ Parsed as: ${formatDisplayValue(parsedSalary)}`;
    }
    
    return '❌ Unable to parse salary format';
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="ml-2 text-blue-500 hover:text-blue-700 text-xs"
          disabled={disabled}
        >
          {showHelp ? 'Hide Help' : 'Show Help'}
        </button>
      </label>
      
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 ${
          parsedSalary && parsedSalary.confidence < 0.5 ? 'border-yellow-300 bg-yellow-50' : ''
        } ${disabled ? 'bg-gray-100' : ''}`}
        placeholder={placeholder}
        disabled={disabled}
      />
      
      {/* Validation message */}
      {value && value.toUpperCase() !== 'ALL' && (
        <p className={`mt-1 text-xs ${
          parsedSalary && parsedSalary.confidence >= 0.5 ? 'text-green-600' : 'text-red-600'
        }`}>
          {getValidationMessage()}
        </p>
      )}
      
      {/* Help section */}
      {showHelp && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-xs">
          <h4 className="font-semibold text-blue-800 mb-2">Supported Salary Formats:</h4>
          <div className="space-y-1 text-blue-700">
            <div><strong>Single values:</strong> 100000, 100k, $120k</div>
            <div><strong>Ranges:</strong> 100k-150k, $100k - $130k</div>
            <div><strong>Hourly rates:</strong> 35.5/hr, $40 per hour</div>
            <div><strong>With qualifiers:</strong> 120k+, 135k Max, 100k DOE</div>
            <div><strong>Currencies:</strong> 60k Euros, £80k, C$100k</div>
            <div><strong>Special:</strong> Use "ALL" to include all salaries</div>
          </div>
          <div className="mt-2 text-blue-600">
            <strong>Note:</strong> All values are converted to annual USD for comparison
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryInput;








