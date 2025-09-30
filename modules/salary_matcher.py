"""
Salary Matching Utilities

This module provides utilities for matching candidate salary requirements
with job salary information using the enhanced salary parser.
"""

from typing import List, Dict, Any, Optional, Tuple
from .salary_parser import SalaryParser

class SalaryMatcher:
    """Utility class for matching candidate salary requirements with jobs"""
    
    def __init__(self):
        self.parser = SalaryParser()
    
    def find_matching_jobs(self, jobs: List[Dict[str, Any]], 
                          candidate_min: Optional[int] = None,
                          candidate_max: Optional[int] = None,
                          include_unpaid: bool = True) -> List[Dict[str, Any]]:
        """
        Find jobs that match candidate salary requirements
        
        Args:
            jobs: List of job dictionaries with salary information
            candidate_min: Candidate's minimum salary requirement
            candidate_max: Candidate's maximum salary requirement  
            include_unpaid: Whether to include jobs without salary info
            
        Returns:
            List of matching jobs with salary analysis
        """
        matching_jobs = []
        
        for job in jobs:
            salary_str = job.get('Salary', '') or job.get('salary', '')
            if not salary_str:
                if include_unpaid:
                    matching_jobs.append({
                        **job,
                        'salary_match': {
                            'status': 'no_salary_info',
                            'reason': 'Job has no salary information',
                            'confidence': 0.0
                        }
                    })
                continue
            
            # Parse job salary
            parsed_salary = self.parser.parse_salary(salary_str)
            
            # Check if job matches candidate requirements
            match_result = self.analyze_salary_match(
                parsed_salary, candidate_min, candidate_max
            )
            
            if match_result['status'] in ['match', 'potential_match']:
                matching_jobs.append({
                    **job,
                    'salary_match': match_result,
                    'parsed_salary': parsed_salary
                })
        
        return matching_jobs
    
    def analyze_salary_match(self, job_salary: Dict[str, Any],
                            candidate_min: Optional[int] = None,
                            candidate_max: Optional[int] = None) -> Dict[str, Any]:
        """
        Analyze how well a job salary matches candidate requirements
        
        Args:
            job_salary: Parsed job salary from SalaryParser
            candidate_min: Candidate's minimum salary requirement
            candidate_max: Candidate's maximum salary requirement
            
        Returns:
            Dictionary with match analysis:
            {
                'status': 'match'|'potential_match'|'no_match',
                'reason': str,
                'confidence': float,
                'salary_gap': int,  # Difference from candidate requirements
                'recommendations': List[str]
            }
        """
        if not job_salary or not job_salary.get('min'):
            return {
                'status': 'no_match',
                'reason': 'No salary information available',
                'confidence': 0.0,
                'salary_gap': 0,
                'recommendations': []
            }
        
        job_min = job_salary.get('min')
        job_max = job_salary.get('max')
        job_has_plus = job_salary.get('has_plus', False)
        job_is_max = job_salary.get('is_max', False)
        
        # If candidate has no requirements, it's a potential match
        if candidate_min is None and candidate_max is None:
            return {
                'status': 'potential_match',
                'reason': 'Candidate has no salary requirements',
                'confidence': 0.5,
                'salary_gap': 0,
                'recommendations': ['Consider discussing salary expectations']
            }
        
        # Analyze different scenarios
        if candidate_min == candidate_max:
            # Candidate wants specific salary
            target_salary = candidate_min
            
            if job_min and job_max:
                # Job has range
                if job_min <= target_salary <= job_max:
                    return {
                        'status': 'match',
                        'reason': f'Target salary ${target_salary:,} falls within job range ${job_min:,}-${job_max:,}',
                        'confidence': 0.9,
                        'salary_gap': 0,
                        'recommendations': ['Perfect salary match']
                    }
                elif target_salary < job_min:
                    gap = job_min - target_salary
                    return {
                        'status': 'potential_match',
                        'reason': f'Job minimum ${job_min:,} exceeds target by ${gap:,}',
                        'confidence': 0.7,
                        'salary_gap': gap,
                        'recommendations': ['Job pays more than expected - good opportunity']
                    }
                else:
                    gap = target_salary - job_max
                    return {
                        'status': 'no_match',
                        'reason': f'Job maximum ${job_max:,} is ${gap:,} below target',
                        'confidence': 0.3,
                        'salary_gap': -gap,
                        'recommendations': ['Consider negotiating or look for higher-paying roles']
                    }
            
            elif job_min and not job_max:
                # Job has minimum only
                if target_salary >= job_min:
                    if job_has_plus:
                        return {
                            'status': 'match',
                            'reason': f'Target salary ${target_salary:,} meets job minimum ${job_min:,}+',
                            'confidence': 0.8,
                            'salary_gap': 0,
                            'recommendations': ['Good match - job may pay more']
                        }
                    else:
                        gap = target_salary - job_min
                        return {
                            'status': 'potential_match',
                            'reason': f'Target salary ${target_salary:,} exceeds job minimum ${job_min:,}',
                            'confidence': 0.6,
                            'salary_gap': gap,
                            'recommendations': ['May need to negotiate salary']
                        }
                else:
                    gap = job_min - target_salary
                    return {
                        'status': 'potential_match',
                        'reason': f'Job minimum ${job_min:,} exceeds target by ${gap:,}',
                        'confidence': 0.7,
                        'salary_gap': gap,
                        'recommendations': ['Job pays more than expected']
                    }
            
            elif job_max and not job_min:
                # Job has maximum only
                if target_salary <= job_max:
                    return {
                        'status': 'match',
                        'reason': f'Target salary ${target_salary:,} is within job maximum ${job_max:,}',
                        'confidence': 0.7,
                        'salary_gap': 0,
                        'recommendations': ['Good match - negotiate for higher end']
                    }
                else:
                    gap = target_salary - job_max
                    return {
                        'status': 'no_match',
                        'reason': f'Target salary ${target_salary:,} exceeds job maximum ${job_max:,}',
                        'confidence': 0.2,
                        'salary_gap': -gap,
                        'recommendations': ['Job budget too low']
                    }
        
        # Candidate has salary range
        if candidate_min and candidate_max:
            if job_min and job_max:
                # Both have ranges - check for overlap
                overlap_min = max(candidate_min, job_min)
                overlap_max = min(candidate_max, job_max)
                
                if overlap_min <= overlap_max:
                    overlap_amount = overlap_max - overlap_min
                    return {
                        'status': 'match',
                        'reason': f'Salary ranges overlap by ${overlap_amount:,}',
                        'confidence': 0.8,
                        'salary_gap': 0,
                        'recommendations': ['Good salary range match']
                    }
                else:
                    if candidate_max < job_min:
                        gap = job_min - candidate_max
                        return {
                            'status': 'potential_match',
                            'reason': f'Job minimum ${job_min:,} exceeds candidate max by ${gap:,}',
                            'confidence': 0.6,
                            'salary_gap': gap,
                            'recommendations': ['Job pays more than expected']
                        }
                    else:
                        gap = candidate_min - job_max
                        return {
                            'status': 'no_match',
                            'reason': f'Candidate minimum ${candidate_min:,} exceeds job max by ${gap:,}',
                            'confidence': 0.3,
                            'salary_gap': -gap,
                            'recommendations': ['Job budget too low']
                        }
            
            elif job_min:
                # Job has minimum, candidate has range
                if candidate_min <= job_min <= candidate_max:
                    return {
                        'status': 'match',
                        'reason': f'Job minimum ${job_min:,} falls within candidate range',
                        'confidence': 0.8,
                        'salary_gap': 0,
                        'recommendations': ['Good match - negotiate for higher end']
                    }
                elif job_min > candidate_max:
                    gap = job_min - candidate_max
                    return {
                        'status': 'potential_match',
                        'reason': f'Job minimum ${job_min:,} exceeds candidate max by ${gap:,}',
                        'confidence': 0.6,
                        'salary_gap': gap,
                        'recommendations': ['Job pays more than expected']
                    }
                else:
                    gap = candidate_min - job_min
                    return {
                        'status': 'potential_match',
                        'reason': f'Job minimum ${job_min:,} is ${gap:,} below candidate minimum',
                        'confidence': 0.5,
                        'salary_gap': -gap,
                        'recommendations': ['May need to negotiate salary']
                    }
        
        # Candidate has only minimum requirement
        if candidate_min and not candidate_max:
            if job_min and job_min >= candidate_min:
                return {
                    'status': 'match',
                    'reason': f'Job minimum ${job_min:,} meets candidate requirement',
                    'confidence': 0.8,
                    'salary_gap': 0,
                    'recommendations': ['Good match']
                }
            elif job_max and job_max >= candidate_min:
                return {
                    'status': 'potential_match',
                    'reason': f'Job maximum ${job_max:,} meets candidate minimum',
                    'confidence': 0.6,
                    'salary_gap': 0,
                    'recommendations': ['Negotiate for higher end of range']
                }
            else:
                gap = candidate_min - (job_max or job_min or 0)
                return {
                    'status': 'no_match',
                    'reason': f'Job salary below candidate minimum by ${gap:,}',
                    'confidence': 0.2,
                    'salary_gap': -gap,
                    'recommendations': ['Job budget too low']
                }
        
        return {
            'status': 'no_match',
            'reason': 'Unable to determine salary compatibility',
            'confidence': 0.0,
            'salary_gap': 0,
            'recommendations': ['Contact employer for salary details']
        }
    
    def get_salary_recommendations(self, jobs: List[Dict[str, Any]], 
                                  candidate_min: Optional[int] = None,
                                  candidate_max: Optional[int] = None) -> Dict[str, Any]:
        """
        Get salary recommendations based on job market analysis
        
        Args:
            jobs: List of jobs to analyze
            candidate_min: Candidate's minimum salary requirement
            candidate_max: Candidate's maximum salary requirement
            
        Returns:
            Dictionary with salary recommendations and market analysis
        """
        if not jobs:
            return {
                'market_analysis': 'No jobs available for analysis',
                'recommendations': [],
                'salary_stats': {}
            }
        
        # Parse all salaries
        parsed_salaries = []
        for job in jobs:
            salary_str = job.get('Salary', '') or job.get('salary', '')
            if salary_str:
                parsed = self.parser.parse_salary(salary_str)
                if parsed and parsed.get('min'):
                    parsed_salaries.append(parsed)
        
        if not parsed_salaries:
            return {
                'market_analysis': 'No salary information available in job market',
                'recommendations': ['Contact employers directly for salary information'],
                'salary_stats': {}
            }
        
        # Calculate market statistics
        min_salaries = [s['min'] for s in parsed_salaries if s['min']]
        max_salaries = [s['max'] for s in parsed_salaries if s['max']]
        
        market_min = min(min_salaries) if min_salaries else None
        market_max = max(max_salaries) if max_salaries else None
        market_avg_min = sum(min_salaries) / len(min_salaries) if min_salaries else None
        
        # Generate recommendations
        recommendations = []
        
        if candidate_min:
            if market_min and candidate_min < market_min:
                recommendations.append(f"Your minimum ${candidate_min:,} is below market minimum ${market_min:,}")
            elif market_avg_min and candidate_min < market_avg_min:
                recommendations.append(f"Consider increasing minimum to ${int(market_avg_min):,} to match market average")
        
        if candidate_max:
            if market_max and candidate_max > market_max:
                recommendations.append(f"Your maximum ${candidate_max:,} exceeds market maximum ${market_max:,}")
        
        if not recommendations:
            recommendations.append("Your salary expectations align well with the market")
        
        return {
            'market_analysis': f"Analyzed {len(parsed_salaries)} jobs with salary information",
            'recommendations': recommendations,
            'salary_stats': {
                'market_min': market_min,
                'market_max': market_max,
                'market_avg_min': market_avg_min,
                'total_jobs_analyzed': len(parsed_salaries)
            }
        }


# Convenience functions
def find_matching_jobs(jobs: List[Dict[str, Any]], 
                      candidate_min: Optional[int] = None,
                      candidate_max: Optional[int] = None) -> List[Dict[str, Any]]:
    """Find jobs matching candidate salary requirements"""
    matcher = SalaryMatcher()
    return matcher.find_matching_jobs(jobs, candidate_min, candidate_max)

def analyze_salary_match(job_salary_str: str,
                        candidate_min: Optional[int] = None,
                        candidate_max: Optional[int] = None) -> Dict[str, Any]:
    """Analyze salary match between job and candidate requirements"""
    matcher = SalaryMatcher()
    job_salary = matcher.parser.parse_salary(job_salary_str)
    return matcher.analyze_salary_match(job_salary, candidate_min, candidate_max)








