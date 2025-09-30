import json
import os
import re
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple


class JsonOptimizer:
    """
    Normalize and merge AI-extracted job data with Master Tracking Board (MTB) CSV data.

    Key responsibilities:
    - Field mapping to snake_case JSON keys
    - Salary parsing (currency, period, ranges, +, DOE/DOQ, K/k)
    - Percentage normalization for Bonus/Conditional Fee
    - Date normalization from m/d/y 0:00 => YYYY-MM-DD 00:00:00
    - Location consolidation (US/international, placeholders like "Open (NE)")
    - Contact consolidation (HR/HM, CM)
    - Validation for required fields and basic sanity checks
    """

    def __init__(self, input_file: str = None):
        self.input_file = input_file

    # ------------------------
    # Helpers: normalization
    # ------------------------
    @staticmethod
    def _clean_str(v: Any) -> str:
        return str(v).strip() if v is not None else ""

    @staticmethod
    def normalize_mtb_date(value: Any) -> Optional[str]:
        """
        Convert dates like 'm/d/y 0:00' into 'YYYY-MM-DD 00:00:00'.
        Accepts 2-digit or 4-digit years. Missing time becomes 00:00:00.
        """
        if value is None:
            return None
        s = str(value).strip()
        if not s:
            return None

        # Extract numbers m/d/y [h:mm]
        m = re.search(
            r'(?P<m>\d{1,2})/(?P<d>\d{1,2})/(?P<y>\d{2,4})(?:\s+(?P<h>\d{1,2}):(?P<mi>\d{2}))?',
            s
        )
        if not m:
            return None
        mm = int(m.group('m'))
        dd = int(m.group('d'))
        yy = int(m.group('y'))
        hh = int(m.group('h')) if m.group('h') else 0
        mi = int(m.group('mi')) if m.group('mi') else 0

        # Promote 2-digit year to 2000s (heuristic)
        if yy < 100:
            yy += 2000

        try:
            dt = datetime(yy, mm, dd, hh, mi, 0)
            return dt.strftime("%Y-%m-%d %H:%M:%S")
        except ValueError:
            return None

    @staticmethod
    def _parse_percentage_component(s: str) -> Optional[float]:
        """
        Parse a single percentage component that might be like '25', '25%', '0.25', '25%%', ' 25 % '.
        Returns decimal fraction (e.g., 0.25) or None.

        Updated rule:
        - If '%' is present → interpret as percent (divide by 100)
        - If it's a fraction like '1/4' → return the fraction as decimal (0.25)
        - If it's a plain number:
            * If contains a decimal point → treat as decimal fraction (e.g., 0.25 → 0.25)
            * Else (integer-like) → treat as percent (e.g., 1 → 0.01, 25 → 0.25)
        This fixes cases like '1-4%' where the left bound lacks '%' and should be 1% not 1.0.
        """
        if not s:
            return None
        s = s.strip()
        s = s.replace("%%", "%")
        s = s.replace("percent", "%").replace("pct", "%")
        s = re.sub(r'\s+', '', s)
        # Remove leading '+' for values like '+25%'
        s = s.lstrip('+')

        has_percent = '%' in s
        has_fraction = '/' in s
        has_decimal_point = '.' in s

        # If it includes a percent sign anywhere, strip '%' and divide by 100
        if has_percent:
            try:
                return float(s.replace('%', '')) / 100.0
            except ValueError:
                return None

        # If it includes a slash like '1/4', attempt fraction
        if has_fraction:
            parts = s.split('/')
            try:
                num = float(parts[0])
                den = float(parts[1])
                if den != 0:
                    return num / den
            except Exception:
                return None

        # Otherwise, plain numeric
        try:
            v = float(s)
            # Decimal with dot is treated as decimal fraction (0.25 => 0.25)
            if has_decimal_point:
                return v
            # Integer-like without '%' → treat as percent (1 => 0.01, 25 => 0.25, 100 => 1.0)
            return v / 100.0
        except ValueError:
            return None

    def normalize_percentage(self, raw: Any) -> Dict[str, Optional[float]]:
        """
        Normalize percentages and ranges such as:
          - '25%', '25%%', '0.25', '1-4%', '12–20 %'
        Returns dict with:
          {
            'raw': str or None,
            'min': float|None,  # decimal fraction e.g. 0.25
            'max': float|None
          }
        """
        if raw is None:
            return {"raw": None, "min": None, "max": None}
        s = self._clean_str(raw)
        if not s:
            return {"raw": None, "min": None, "max": None}

        # Normalize dash types
        s_dash = s.replace('–', '-').replace('—', '-').replace('to', '-')
        # Range?
        m = re.search(r'^\s*([^-\s]+)\s*-\s*([^-\s]+)\s*%?\s*$', s_dash)
        if m:
            a = self._parse_percentage_component(m.group(1))
            b = self._parse_percentage_component(m.group(2))
            # If both parse, ensure ordering
            if a is not None and b is not None:
                mn, mx = (a, b) if a <= b else (b, a)
                return {"raw": s, "min": mn, "max": mx}

        # Single value
        v = self._parse_percentage_component(s)
        return {"raw": s, "min": v, "max": v}

    def extract_salary(self, salary_raw: str) -> Dict[str, Any]:
        """
        Parse salary strings including currency symbols, K/k thousands, ranges,
        +/- markers, and period detection (annual/hourly).
        Returns:
          {
            'min': int|None,            # numeric amount in same unit (annual or hourly)
            'max': int|None,
            'currency': 'USD'|'EUR'|'GBP'|...,
            'period': 'annual'|'hourly',
            'has_plus': bool,
            'notes': str|None
          }
        """
        if not salary_raw or not isinstance(salary_raw, str):
            return {
                "min": None,
                "max": None,
                "currency": "USD",
                "period": "annual",
                "has_plus": False,
                "notes": None
            }

        s = salary_raw.strip()
        s_lower = s.lower()

        # Currency detection
        currency = "USD"
        if "€" in s or "eur" in s_lower or "euro" in s_lower:
            currency = "EUR"
        elif "£" in s or "gbp" in s_lower or "pound" in s_lower:
            currency = "GBP"
        elif "$" in s or "usd" in s_lower:
            currency = "USD"

        # Period detection (hourly if any of these match)
        period = "annual"
        hourly_pattern = re.compile(
            r'(\bper\s*hour\b|\b/hour\b|\b/hr\b|\bp/?\s*hr\b|\bph\b|\bhourly\b)',
            re.IGNORECASE
        )
        if hourly_pattern.search(s):
            period = "hourly"
        else:
            # Hints for annual
            if re.search(r'\b(per\s*annum|p\.?a\.?|annual|annum)\b', s_lower):
                period = "annual"

        has_plus = '+' in s or re.search(r'\bplus\b', s_lower) is not None

        notes = None
        if re.search(r'\bdoe\b', s_lower):
            notes = "DOE"
        elif re.search(r'\bdoq\b', s_lower):
            notes = "DOQ"

        def parse_value(val_str: str) -> Optional[int]:
            t = val_str.strip()
            # Remove currency and common tokens
            t = re.sub(r'[\$,€£]', '', t, flags=re.IGNORECASE)
            t = re.sub(r'\b(usd|eur|euro|gbp|pounds?)\b', '', t, flags=re.IGNORECASE)
            t = t.replace(',', '').strip()
            is_k = 'k' in t.lower()
            t = re.sub(r'[kK]', '', t)

            mnum = re.match(r'(\d+(?:\.\d+)?)', t)
            if not mnum:
                return None
            num = float(mnum.group(1))
            if is_k:
                num *= 1000
            elif period == 'annual' and num < 1000:
                # Heuristic: annual bare numbers like 90 => 90k
                num *= 1000
            return int(round(num))

        # Normalize dashes and separators
        s_num = s_lower.replace('–', '-').replace('—', '-').replace(' to ', '-')

        # Range pattern capturing K/k
        range_match = re.search(r'(\d+(?:[.,]\d+)?k?)\s*-\s*(\d+(?:[.,]\d+)?k?)', s_num, re.IGNORECASE)
        min_salary: Optional[int] = None
        max_salary: Optional[int] = None

        if range_match:
            a = parse_value(range_match.group(1))
            b = parse_value(range_match.group(2))
            if a is not None and b is not None:
                min_salary, max_salary = (a, b) if a <= b else (b, a)
        else:
            # Prefer numbers with thousands separators first to avoid small stray numbers
            m_thou = re.search(r'(\d{1,3}(?:,\d{3})+)', s)
            if m_thou:
                v = parse_value(m_thou.group(1))
                min_salary = v
                max_salary = v
            else:
                m_single = re.search(r'(\d+(?:\.\d+)?k?)', s_num, re.IGNORECASE)
                if m_single:
                    v = parse_value(m_single.group(1))
                    min_salary = v
                    max_salary = v

        return {
            "min": min_salary,
            "max": max_salary,
            "currency": currency,
            "period": period,
            "has_plus": bool(has_plus),
            "notes": notes
        }

    def normalize_location(self, ai: Dict[str, Any], mtb: Dict[str, Any]) -> Dict[str, Any]:
        """
        Consolidate location from MTB (authoritative) falling back to AI.
        Handles placeholders like 'Open (NE)' by extracting a region hint.
        """
        # Prefer MTB explicit fields
        city_raw = self._clean_str(mtb.get('City')) or self._clean_str(ai.get('city') or ai.get('location', ''))
        state_raw = self._clean_str(mtb.get('State')) or self._clean_str(ai.get('state') or '')
        country_raw = self._clean_str(mtb.get('Country')) or self._clean_str(ai.get('country') or '')

        region_hint = None
        # Handle "Open (NE)"
        m = re.match(r'^\s*([A-Za-z ]+)\s*\(([^)]+)\)\s*$', city_raw)
        if m:
            city = m.group(1).strip()
            region_hint = m.group(2).strip()
        else:
            city = city_raw

        return {"city": city, "state": state_raw, "country": country_raw, "region_hint": region_hint}

    def extract_bonus(self, ai_data: Dict[str, Any], mtb: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract and normalize bonus content from MTB or AI fallback.
        Returns dict with:
          {
            'raw': str|None,
            'percent_min': float|None,  # decimal fraction
            'percent_max': float|None
          }
        """
        raw = None
        if mtb.get('Bonus'):
            raw = str(mtb.get('Bonus'))
        else:
            # Look into AI salaryRange for 'bonus' mentions
            sr = self._clean_str(ai_data.get('salaryRange', ''))
            if 'bonus' in sr.lower():
                # naive split to get trailing part
                parts = sr.lower().split('bonus', 1)
                raw = parts[1].strip() if len(parts) > 1 else sr

        if not raw:
            return {"raw": None, "percent_min": None, "percent_max": None}

        norm = self.normalize_percentage(raw)
        return {"raw": raw, "percent_min": norm["min"], "percent_max": norm["max"]}

    @staticmethod
    def _split_contact_list(raw: str) -> List[str]:
        if not raw:
            return []
        # Remove 'cc:' parts
        cleaned = re.sub(r'\bcc:\s*[^,;]+', '', raw, flags=re.IGNORECASE)
        # Split on ',', ';'
        items = re.split(r'[;,]', cleaned)
        return [i.strip() for i in items if i.strip()]

    def normalize_contacts(self, mtb: Dict[str, Any]) -> Dict[str, Any]:
        hr_raw = self._clean_str(mtb.get('HR/HM'))
        cm_raw = self._clean_str(mtb.get('CM'))
        return {
            "hr": hr_raw,
            "cm": cm_raw,
            "hr_list": self._split_contact_list(hr_raw),
            "cm_list": self._split_contact_list(cm_raw),
        }

    # ------------------------
    # Convenience getters
    # ------------------------
    def get_value(self, obj: Dict[str, Any], keys: List[str], default: Any = None) -> Any:
        for key in keys:
            if key in obj:
                return obj[key]
        return default

    def get_array(self, obj: Dict[str, Any], keys: List[str]) -> List[str]:
        for key in keys:
            v = obj.get(key)
            if v and isinstance(v, list):
                return v
            if v and isinstance(v, str):
                return [v]
        return []

    # ------------------------
    # Validation
    # ------------------------
    @staticmethod
    def _is_nonempty(v: Any) -> bool:
        return v is not None and str(v).strip() != ""

    def validate_job(self, job: Dict[str, Any]) -> Dict[str, List[str]]:
        """
        Basic validations with errors and warnings lists.
        """
        errors: List[str] = []
        warnings: List[str] = []

        if not self._is_nonempty(job.get('job_id')):
            errors.append("job_id missing")
        if not self._is_nonempty(job.get('company')):
            errors.append("company missing")
        if not self._is_nonempty(job.get('job_title')):
            errors.append("job_title missing")

        loc = job.get('work_eligibility_location', {}) or {}
        if not any(self._is_nonempty(loc.get(k)) for k in ('city', 'state', 'country')):
            warnings.append("location incomplete")

        # Received date check
        rd = job.get('received_date')
        if rd:
            # Do basic format check
            if not re.match(r'^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$', str(rd)):
                warnings.append("received_date not normalized")

        # Salary sanity
        sal = job.get('salary') or {}
        mn, mx = sal.get('min'), sal.get('max')
        if mn is not None and mx is not None and mn > mx:
            warnings.append("salary range inverted (min > max)")

        # Percent fields sanity (0..1)
        for field_pair in [('bonus_percent_min', 'bonus_percent_max'), ('conditional_fee_min', 'conditional_fee_max')]:
            a = job.get(field_pair[0])
            b = job.get(field_pair[1])
            for v in (a, b):
                if v is not None and (v < 0 or v > 1):
                    warnings.append(f"{field_pair[0]}/{field_pair[1]} out of range [0,1]")

        return {"errors": errors, "warnings": warnings}

    # ------------------------
    # Main optimizer
    # ------------------------
    def optimize_job(
        self,
        ai_data: Dict[str, Any],
        mtb_data: Dict[str, Any],
        job_id: str,
        hr_notes: str = "",
        combined_text: str = ""
    ) -> Dict[str, Any]:
        """
        Optimizes and merges job data from AI and MTB, using the AI data as the base.
        Mapping favors explicit MTB fields where available.
        """
        optimized = dict(ai_data or {})
        optimized['job_id'] = job_id

        # Titles/Company/Industry
        optimized['job_title'] = mtb_data.get('Position', optimized.get('job_title'))
        optimized['company'] = mtb_data.get('Company', optimized.get('company'))

        # Normalize industry name; keep backward compatibility
        industry = mtb_data.get('Industry/Segment', optimized.get('industry_type') or optimized.get('industry_segment'))
        if industry is not None:
            optimized['industry_segment'] = industry
            # Preserve old key if present to avoid breaking downstream consumers
            optimized['industry_type'] = optimized.get('industry_type', industry)

        # Location
        loc_info = self.normalize_location(optimized.get('work_eligibility_location', {}) or {}, mtb_data)
        optimized['work_eligibility_location'] = optimized.get('work_eligibility_location', {}) or {}
        optimized['work_eligibility_location'].update(loc_info)

        # Salary:
        # Prefer MTB 'Salary' field first to avoid parsing stray numbers from combined_text
        salary_source = mtb_data.get('Salary')
        if not self._clean_str(salary_source):
            # fallback 1: AI salaryRange
            salary_source = optimized.get('salaryRange') or optimized.get('salary_range')
        if not self._clean_str(salary_source) and self._clean_str(combined_text):
            # fallback 2: combined text only if no explicit salary field
            salary_source = combined_text

        extracted_salary = self.extract_salary(self._clean_str(salary_source))
        optimized['salary'] = optimized.get('salary', {}) or {}
        optimized['salary'].update(extracted_salary)
        # Keep the raw salary field if present for traceability
        if self._clean_str(mtb_data.get('Salary')):
            optimized['salary_raw'] = self._clean_str(mtb_data.get('Salary'))

        # Bonus normalization
        bonus_info = self.extract_bonus(ai_data, mtb_data)
        if bonus_info['raw']:
            optimized['salary']['bonus'] = bonus_info['raw']
        optimized['bonus_percent_min'] = bonus_info['percent_min']
        optimized['bonus_percent_max'] = bonus_info['percent_max']

        # Conditional Fee normalization
        cond_norm = self.normalize_percentage(mtb_data.get('Conditional Fee'))
        if cond_norm['raw'] is not None:
            optimized['conditional_fee_raw'] = cond_norm['raw']
        optimized['conditional_fee_min'] = cond_norm['min']
        optimized['conditional_fee_max'] = cond_norm['max']

        # Contacts
        optimized['contact_info'] = self.normalize_contacts(mtb_data)

        # Additional MTB fields -> snake_case
        # Note: Received date normalized
        received_norm = self.normalize_mtb_date(mtb_data.get('Received (m/d/y)'))
        if received_norm:
            optimized['received_date'] = received_norm

        # Merge other important MTB data
        # Direct string/int mappings with snake_case keys
        other_map = {
            "Internal": "internal_notes",
            "Client Rating": "client_rating",
            "CAT": "category",
            "Visa": "visa_sponsorship",
            "Pipeline #": "pipeline_count",
            "Pipeline Candidates": "pipeline_candidates",
            "Notes": "mtb_notes"
        }
        for k, outk in other_map.items():
            val = mtb_data.get(k)
            if val is None or str(val).strip() == "":
                continue
            # Coerce certain fields
            if outk == "pipeline_count":
                try:
                    optimized[outk] = int(str(val).strip())
                except Exception:
                    optimized[outk] = str(val).strip()
            else:
                optimized[outk] = val

        # Provenance and notes
        optimized['source_file'] = os.path.basename(self.input_file) if self.input_file else 'Unknown'
        optimized['hr_notes'] = hr_notes

        # Validation
        validation = self.validate_job(optimized)
        if validation['errors'] or validation['warnings']:
            optimized['validation'] = validation

        # Remove None or empty-string top-level keys but keep 0/False
        cleaned = {}
        for k, v in optimized.items():
            if v is None:
                continue
            if isinstance(v, str) and v.strip() == "":
                continue
            cleaned[k] = v
        return cleaned
