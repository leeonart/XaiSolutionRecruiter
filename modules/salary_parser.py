"""
Enhanced Salary Parsing Module

This module provides comprehensive salary parsing capabilities including:
- Range extraction (min/max values)
- Currency detection and conversion
- Period detection (annual/hourly)
- Qualifier handling (DOE, DOQ, +, Max)
- Multiple format support
"""

import re
from typing import Dict, Optional, Tuple, Any
from decimal import Decimal, ROUND_HALF_UP

class SalaryParser:
    """Enhanced salary parser with comprehensive format support"""
    
    # Currency conversion rates (as of 2024 - should be updated regularly)
    CURRENCY_RATES = {
        'EUR': 1.08,  # EUR to USD
        'GBP': 1.27,  # GBP to USD
        'CAD': 0.74,  # CAD to USD
        'AUD': 0.66,  # AUD to USD
        'USD': 1.0    # Base currency
    }
    
    def __init__(self):
        self.currency_patterns = {
            'EUR': re.compile(r'€|eur|euro', re.IGNORECASE),
            'GBP': re.compile(r'£|gbp|pound', re.IGNORECASE),
            'CAD': re.compile(r'cad|canadian', re.IGNORECASE),
            'AUD': re.compile(r'aud|australian', re.IGNORECASE),
            'USD': re.compile(r'\$|usd|dollar', re.IGNORECASE)
        }
        
        self.hourly_patterns = re.compile(
            r'(\bper\s*hour\b|\b/hour\b|\b/hr\b|\bp/?\s*hr\b|\bph\b|\bhourly\b|ph\b)',
            re.IGNORECASE
        )
        
        self.annual_patterns = re.compile(
            r'\b(per\s*annum|p\.?a\.?|annual|annum|yearly)\b',
            re.IGNORECASE
        )

    def parse_salary(self, salary_str: str) -> Dict[str, Any]:
        """
        Parse salary string into structured format
        
        Args:
            salary_str: Raw salary string (e.g., "$100k - 130k+", "60k Euros", "35.5/hr")
            
        Returns:
            Dict with parsed salary information:
            {
                'min': int|None,           # Minimum salary in USD
                'max': int|None,           # Maximum salary in USD
                'currency': str,           # Detected currency
                'period': str,            # 'annual' or 'hourly'
                'has_plus': bool,         # Whether salary has '+' qualifier
                'is_max': bool,           # Whether this is a maximum value
                'notes': str|None,        # DOE, DOQ, or other notes
                'raw': str,               # Original input string
                'confidence': float       # Parsing confidence (0-1)
            }
        """
        if not salary_str or not isinstance(salary_str, str):
            return self._empty_result()
        
        salary_str = salary_str.strip()
        if not salary_str or salary_str.upper() == 'ALL':
            return self._empty_result()
        
        result = {
            'min': None,
            'max': None,
            'currency': 'USD',
            'period': 'annual',
            'has_plus': False,
            'is_max': False,
            'notes': None,
            'raw': salary_str,
            'confidence': 0.0
        }
        
        # Detect currency
        currency = self._detect_currency(salary_str)
        result['currency'] = currency
        
        # Detect period
        period = self._detect_period(salary_str)
        result['period'] = period
        
        # Detect qualifiers
        result['has_plus'] = '+' in salary_str or re.search(r'\bplus\b', salary_str.lower())
        result['is_max'] = re.search(r'\bmax\b', salary_str.lower()) is not None
        
        # Detect notes
        notes = self._detect_notes(salary_str)
        result['notes'] = notes
        
        # Extract numeric values
        min_val, max_val, confidence = self._extract_numeric_values(salary_str, period)
        
        # Convert to USD if needed
        if currency != 'USD':
            conversion_rate = self.CURRENCY_RATES.get(currency, 1.0)
            if min_val is not None:
                min_val = int(min_val * conversion_rate)
            if max_val is not None:
                max_val = int(max_val * conversion_rate)
        
        result['min'] = min_val
        result['max'] = max_val
        result['confidence'] = confidence
        
        return result
    
    def _empty_result(self) -> Dict[str, Any]:
        """Return empty result structure"""
        return {
            'min': None,
            'max': None,
            'currency': 'USD',
            'period': 'annual',
            'has_plus': False,
            'is_max': False,
            'notes': None,
            'raw': '',
            'confidence': 0.0
        }
    
    def _detect_currency(self, salary_str: str) -> str:
        """Detect currency from salary string"""
        for currency, pattern in self.currency_patterns.items():
            if pattern.search(salary_str):
                return currency
        return 'USD'  # Default to USD
    
    def _detect_period(self, salary_str: str) -> str:
        """Detect if salary is hourly or annual"""
        if self.hourly_patterns.search(salary_str):
            return 'hourly'
        elif self.annual_patterns.search(salary_str):
            return 'annual'
        else:
            # Default based on context
            if 'k' in salary_str.lower() and not self.hourly_patterns.search(salary_str):
                return 'annual'  # K format usually means annual
            return 'annual'
    
    def _detect_notes(self, salary_str: str) -> Optional[str]:
        """Detect special notes like DOE, DOQ"""
        if re.search(r'\bdoe\b', salary_str.lower()):
            return 'DOE'
        elif re.search(r'\bdoq\b', salary_str.lower()):
            return 'DOQ'
        return None
    
    def _extract_numeric_values(self, salary_str: str, period: str) -> Tuple[Optional[int], Optional[int], float]:
        """
        Extract min and max numeric values from salary string
        
        Returns:
            Tuple of (min_value, max_value, confidence)
        """
        # Clean the string but preserve structure for range detection
        original_str = salary_str.lower()
        clean_str = salary_str.lower()
        
        # Remove currency symbols and common words
        clean_str = re.sub(r'[€£$]', '', clean_str)
        clean_str = re.sub(r'\b(usd|eur|gbp|cad|aud|dollar|euro|pound)\b', '', clean_str)
        clean_str = re.sub(r'\b(per\s*hour|/hour|/hr|hourly|per\s*annum|annual|yearly)\b', '', clean_str)
        clean_str = re.sub(r'\b(doe|doq|max|plus|base|commission|ot)\b', '', clean_str)
        
        # Handle K format - convert k to 000
        clean_str = re.sub(r'(\d+(?:\.\d+)?)k', r'\g<1>000', clean_str)
        
        # Special handling for ranges where first number should also be in K format
        # e.g., "95 - 105k" should become "95000 - 105000"
        range_match = re.search(r'(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)000', clean_str)
        if range_match:
            first_num = range_match.group(1)
            # If first number is small (< 1000), assume it should be in K format
            if float(first_num) < 1000:
                clean_str = re.sub(r'\b' + re.escape(first_num) + r'\b', first_num + '000', clean_str)
        
        # Extract all numbers
        numbers = re.findall(r'(\d+(?:\.\d+)?)', clean_str)
        
        if not numbers:
            return None, None, 0.0
        
        # Convert to float
        try:
            numeric_values = [float(n) for n in numbers]
        except ValueError:
            return None, None, 0.0
        
        # Determine min/max based on format
        if '-' in original_str or ' to ' in original_str:
            # Range format: "100-130k", "100 to 130k"
            if len(numeric_values) >= 2:
                min_val = int(numeric_values[0])
                max_val = int(numeric_values[1])
                confidence = 0.9
            else:
                min_val = int(numeric_values[0])
                max_val = None
                confidence = 0.7
        else:
            # Single value format
            min_val = int(numeric_values[0])
            max_val = None
            confidence = 0.8
        
        # Convert hourly to annual if needed
        if period == 'hourly':
            hours_per_year = 2080  # 40 hours/week * 52 weeks/year
            if min_val is not None:
                min_val = int(min_val * hours_per_year)
            if max_val is not None:
                max_val = int(max_val * hours_per_year)
        
        return min_val, max_val, confidence
    
    def matches_salary_requirement(self, job_salary: Dict[str, Any], 
                                 candidate_min: Optional[int], 
                                 candidate_max: Optional[int]) -> bool:
        """
        Determine if a job salary matches candidate requirements
        
        Args:
            job_salary: Parsed job salary from parse_salary()
            candidate_min: Candidate's minimum salary requirement
            candidate_max: Candidate's maximum salary requirement
            
        Returns:
            True if job matches candidate requirements
        """
        if not job_salary or not job_salary.get('min'):
            return False  # No salary info available
        
        job_min = job_salary.get('min')
        job_max = job_salary.get('max')
        job_has_plus = job_salary.get('has_plus', False)
        job_is_max = job_salary.get('is_max', False)
        
        # If candidate has no requirements, match any job
        if candidate_min is None and candidate_max is None:
            return True
        
        # If job has a maximum cap and candidate wants more
        if job_is_max and job_max and candidate_min and candidate_min > job_max:
            return False
        
        # If job has a minimum and candidate's max is below it
        if job_min and candidate_max and candidate_max < job_min:
            return False
        
        # If candidate wants a specific salary
        if candidate_min == candidate_max:
            target_salary = candidate_min
            
            # Job has range: check if target falls within range
            if job_min and job_max:
                return job_min <= target_salary <= job_max
            
            # Job has minimum only: check if target meets minimum
            if job_min and not job_max:
                return target_salary >= job_min
            
            # Job has maximum only: check if target is below maximum
            if job_max and not job_min:
                return target_salary <= job_max
        
        # If candidate has a range
        if candidate_min and candidate_max:
            # Check for overlap
            if job_min and job_max:
                # Both have ranges: check for overlap
                return not (job_max < candidate_min or job_min > candidate_max)
            elif job_min:
                # Job has minimum: check if job min is within candidate range
                return candidate_min <= job_min <= candidate_max
            elif job_max:
                # Job has maximum: check if job max is within candidate range
                return candidate_min <= job_max <= candidate_max
        
        # If candidate has only minimum requirement
        if candidate_min and not candidate_max:
            if job_min:
                return job_min >= candidate_min
            elif job_max:
                return job_max >= candidate_min
        
        # If candidate has only maximum requirement
        if candidate_max and not candidate_min:
            if job_max:
                return job_max <= candidate_max
            elif job_min:
                return job_min <= candidate_max
        
        return False
    
    def format_salary_display(self, salary_data: Dict[str, Any]) -> str:
        """
        Format parsed salary data for display
        
        Args:
            salary_data: Parsed salary data from parse_salary()
            
        Returns:
            Formatted salary string for display
        """
        if not salary_data or not salary_data.get('min'):
            return "Salary not specified"
        
        min_val = salary_data.get('min')
        max_val = salary_data.get('max')
        currency = salary_data.get('currency', 'USD')
        period = salary_data.get('period', 'annual')
        has_plus = salary_data.get('has_plus', False)
        is_max = salary_data.get('is_max', False)
        notes = salary_data.get('notes')
        
        # Format currency symbol
        currency_symbol = {
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
            'CAD': 'C$',
            'AUD': 'A$'
        }.get(currency, currency)
        
        # Format numbers
        if max_val and min_val != max_val:
            # Range format
            salary_str = f"{currency_symbol}{min_val:,}-{max_val:,}"
        else:
            # Single value format
            salary_str = f"{currency_symbol}{min_val:,}"
        
        # Add qualifiers
        if has_plus:
            salary_str += "+"
        if is_max:
            salary_str += " Max"
        if notes:
            salary_str += f" {notes}"
        
        # Add period if hourly
        if period == 'hourly':
            salary_str += "/hr"
        
        return salary_str


# Convenience functions for backward compatibility
def parse_salary_enhanced(salary_str: str) -> Dict[str, Any]:
    """Enhanced salary parsing function"""
    parser = SalaryParser()
    return parser.parse_salary(salary_str)

def matches_salary_requirement(job_salary_str: str, 
                              candidate_min: Optional[int], 
                              candidate_max: Optional[int]) -> bool:
    """Check if job salary matches candidate requirements"""
    parser = SalaryParser()
    job_salary = parser.parse_salary(job_salary_str)
    return parser.matches_salary_requirement(job_salary, candidate_min, candidate_max)
