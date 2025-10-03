import json
import os
from datetime import datetime
from typing import Dict, Any, List
import math

class SafeJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder that handles NaN, Infinity, and other non-JSON values"""
    def encode(self, obj):
        # Convert NaN, Infinity, -Infinity to null
        if isinstance(obj, float):
            if math.isnan(obj):
                return 'null'
            elif math.isinf(obj):
                return 'null'
        elif isinstance(obj, dict):
            return super().encode({k: self._safe_value(v) for k, v in obj.items()})
        elif isinstance(obj, list):
            return super().encode([self._safe_value(item) for item in obj])
        return super().encode(obj)
    
    def _safe_value(self, value):
        """Convert unsafe values to JSON-safe alternatives"""
        if isinstance(value, float):
            if math.isnan(value):
                return None
            elif math.isinf(value):
                return None
        elif isinstance(value, dict):
            return {k: self._safe_value(v) for k, v in value.items()}
        elif isinstance(value, list):
            return [self._safe_value(item) for item in value]
        return value

class FinalOptimizer:
    def __init__(self, input_file: str):
        """
        Initializes the FinalOptimizer with the path to the input JSON file.

        Args:
            input_file: The path to the JSON file to be optimized.
        """
        if not os.path.exists(input_file):
            raise FileNotFoundError(f"The input file was not found: {input_file}")
        self.input_file = input_file
        self.data = self._load_json()

    def _load_json(self) -> Dict[str, Any]:
        """Loads the JSON data from the input file."""
        with open(self.input_file, 'r', encoding='utf-8') as f:
            return json.load(f)

    def _transform_job(self, job: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transforms a single job record to match MasterTrackingBoard.csv field names while preserving all original data.
        Reorders fields with JobID first, then main CSV fields, then remaining AI-generated fields.
        """
        # Start with a copy of all original data
        transformed = job.copy()

        # Handle contact_info object - extract HR/HM and CM values
        if 'contact_info' in transformed and isinstance(transformed['contact_info'], dict):
            contact_info = transformed.pop('contact_info')
            # Extract HR value and set as HR/HM
            if 'hr' in contact_info and contact_info['hr']:
                transformed['HR/HM'] = contact_info['hr']
            # Extract CM value and set as CM
            if 'cm' in contact_info and contact_info['cm']:
                transformed['CM'] = contact_info['cm']

        # Rename specific fields to match CSV headers and eliminate duplicates
        field_mappings = {
            'job_id': 'JobID',
            'job_title': 'Position',
            'company': 'Company',
            'industry_segment': 'Industry/Segment',
            'salary_raw': 'Salary',
            'bonus': 'Bonus',
            'conditional_fee_raw': 'Conditional Fee',
            'hr_notes': 'HR Special Notes',
            'internal_notes': 'Internal',
            'client_rating': 'Client Rating',
            'category': 'CAT',
            'Notes': 'HR Special Notes',  # Rename Notes to HR Special Notes
            'pipeline_count': 'Pipeline #',
            'pipeline_candidates': 'Pipeline Candidates'
        }

        # Handle field renaming and duplicate elimination
        for old_key, new_key in field_mappings.items():
            if old_key in transformed:
                value = transformed.pop(old_key)
                # Only set if the new key doesn't already exist or if old key had a value
                if new_key not in transformed or (value and not transformed.get(new_key)):
                    transformed[new_key] = value

        # Flatten location fields
        if 'work_eligibility_location' in transformed:
            location = transformed.pop('work_eligibility_location')
            if isinstance(location, dict):
                transformed['City'] = location.get('city', '')
                transformed['State'] = location.get('state', '')
                transformed['Country'] = location.get('country', '')

        # Use salary_raw for Salary field instead of parsed values
        if 'salary_raw' in transformed:
            transformed['Salary'] = transformed.pop('salary_raw')
        elif 'salary' in transformed and isinstance(transformed['salary'], dict):
            # Fallback to formatted salary if salary_raw not available
            salary_obj = transformed.pop('salary')
            min_val = salary_obj.get('min', '')
            max_val = salary_obj.get('max', '')
            currency = salary_obj.get('currency', 'USD')
            period = salary_obj.get('period', 'annual')
            has_plus = salary_obj.get('has_plus', False)

            if min_val and max_val:
                salary_str = f"{min_val}-{max_val}"
                if has_plus:
                    salary_str += "+"
                if currency != 'USD':
                    salary_str += f" {currency.upper()}"
                if period != 'annual':
                    salary_str += f"/{period}"
                transformed['Salary'] = salary_str
            else:
                transformed['Salary'] = str(min_val) if min_val else ''

        # Add missing CSV fields as empty strings if not present (avoiding duplicates)
        missing_fields = [
            "Received (m/d/y)", "Visa", "HR/HM", "CM", "Pipeline #", "Pipeline Candidates"
        ]
        for field in missing_fields:
            if field not in transformed:
                transformed[field] = ""

        # Remove unwanted fields
        fields_to_remove = [
            'bonus_percent_min', 'bonus_percent_max',
            'conditional_fee_min', 'conditional_fee_max',
            'contact_info', 'hr_list', 'cm_list'  # Remove contact_info and related lists
        ]
        for field in fields_to_remove:
            if field in transformed:
                transformed.pop(field)

        # Comprehensive duplicate elimination - check for all possible duplicates
        duplicate_mappings = {
            "Internal": ["internal_notes", "internal"],
            "Client Rating": ["client_rating", "Client Rating"],
            "CAT": ["category", "Category", "cat"],
            "HR Special Notes": ["Notes", "hr_notes", "HR Notes", "hr_special_notes"],
            "Pipeline #": ["pipeline_count", "Pipeline Count", "pipeline_#"],
            "Pipeline Candidates": ["pipeline_candidates", "Pipeline Candidates"],
            "HR/HM": ["hr", "HR", "hm", "HM"],
            "CM": ["cm", "CM"],
            "Visa": ["visa", "VISA"],
            "Conditional Fee": ["conditional_fee", "Conditional Fee", "conditional_fee_raw"]
        }

        # Process duplicates: prioritize non-empty values
        for canonical_name, duplicates in duplicate_mappings.items():
            # Collect all values for this canonical field
            values = []
            if canonical_name in transformed and transformed[canonical_name]:
                values.append(transformed[canonical_name])

            # Check all duplicate field names
            for dup in duplicates:
                if dup in transformed:
                    value = transformed.pop(dup)
                    if value:  # Only keep non-empty values
                        values.append(value)

            # If we have multiple values, keep the first non-empty one
            if values:
                transformed[canonical_name] = values[0]

        # Remove validation errors and warnings as they're not needed in final output
        if 'validation' in transformed:
            transformed.pop('validation')

        # Reorder fields: JobID first, then main CSV fields, then remaining fields
        ordered_fields = [
            'JobID', 'Company', 'Position', 'Industry/Segment', 'City', 'State', 'Country',
            'Salary', 'Received (m/d/y)', 'Conditional Fee', 'Internal', 'Client Rating', 'CAT',
            'Visa', 'HR/HM', 'CM', 'Pipeline #', 'Pipeline Candidates', 'HR Special Notes'
        ]

        # Create ordered dictionary
        ordered_job = {}

        # Add ordered fields first
        for field in ordered_fields:
            if field in transformed:
                ordered_job[field] = transformed[field]

        # Add remaining fields (AI-generated and other fields)
        for key, value in transformed.items():
            if key not in ordered_job:
                ordered_job[key] = value

        return ordered_job

    def _clean_nan_values(self, obj):
        """Recursively clean NaN values from nested data structures"""
        if isinstance(obj, dict):
            return {k: self._clean_nan_values(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._clean_nan_values(item) for item in obj]
        elif isinstance(obj, float):
            if math.isnan(obj):
                return None
            elif math.isinf(obj):
                return None
        return obj

    def run_optimization(self) -> str:
        """
        Runs the optimization process on the loaded JSON data and saves back to original file.
        """
        if isinstance(self.data, list):
            # If data is a list of jobs
            optimized_jobs = [self._transform_job(job) for job in self.data]
        elif isinstance(self.data, dict) and 'jobs' in self.data:
            # If data is {"jobs": [...]}
            optimized_jobs = [self._transform_job(job) for job in self.data['jobs']]
        else:
            raise ValueError("The input JSON file must be a list of jobs or contain a 'jobs' key with a list.")

        # Clean NaN values from the optimized jobs
        cleaned_jobs = self._clean_nan_values(optimized_jobs)

        # Save the transformed data back to the original file (overwrite)
        with open(self.input_file, 'w', encoding='utf-8') as f:
            json.dump(cleaned_jobs, f, indent=2, ensure_ascii=False, cls=SafeJSONEncoder)

        print(f"Successfully optimized {len(cleaned_jobs)} jobs")
        print(f"Original file updated: {self.input_file}")

        return self.input_file

if __name__ == '__main__':
    # Example usage:
    # This allows the script to be run directly for testing or manual processing.
    import sys
    if len(sys.argv) > 1:
        input_json_file = sys.argv[1]
        try:
            optimizer = FinalOptimizer(input_json_file)
            final_file = optimizer.run_optimization()
            print(f"Optimization complete. Final JSON saved to: {final_file}")
        except (FileNotFoundError, ValueError) as e:
            print(f"Error: {e}")
    else:
        print("Usage: python final_optimizer.py <path_to_input_json>")