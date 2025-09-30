"""
AI Resume Matcher Module (Shortlist-6 Optimized)

This module uses the selected AI agent to analyze resumes against job listings,
pre-filters likely matches for speed, and produces:
  1) a machine-readable JSON shortlist (exactly 6 if possible)
  2) an HR-ready Markdown table/report

Drop-in replacement for your existing AIResumeMatcher.
"""

import os
import json
import tempfile
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
import docx
import PyPDF2
from openai import OpenAI
import config
import time
import subprocess
import shutil
import re
import difflib

class AIResumeMatcher:
    """
    Class for matching resumes to jobs using AI.
    """

    # ----------------------------
    # Initialization / Client
    # ----------------------------
    def __init__(self, ai_agent: str = None, api_key: str = None):
        """
        Initialize the AI Resume Matcher.

        Args:
            ai_agent: The AI agent to use (grok, gemini, deepseek, openai, qwen, zai)
            api_key: The API key for the AI agent
        """
        self.ai_agent = ai_agent or config.DEFAULT_AI_AGENT

        # Agent-specific config
        if self.ai_agent == "grok":
            self.api_key = api_key or config.load_api_key("GROK_API_KEY")
            self.base_url = config.GROK_BASE_URL
            self.model = config.GROK_MODEL
        elif self.ai_agent == "gemini":
            self.api_key = api_key or config.load_api_key("GEMINI_API_KEY")
            self.base_url = config.GEMINI_BASE_URL
            self.model = config.GEMINI_MODEL
        elif self.ai_agent == "deepseek":
            self.api_key = api_key or config.load_api_key("DEEPSEEK_API_KEY")
            self.base_url = config.DEEPSEEK_BASE_URL
            self.model = config.DEEPSEEK_MODEL
        elif self.ai_agent == "openai":
            self.api_key = api_key or config.load_api_key("OPENAI_API_KEY")
            self.base_url = config.OPENAI_BASE_URL
            # Allow runtime override for model
            self.model = os.getenv("OPENAI_MODEL", config.OPENAI_MODEL).strip()
        elif self.ai_agent == "qwen":
            self.api_key = api_key or config.load_api_key("DASHSCOPE_API_KEY")
            self.base_url = config.QWEN_BASE_URL
            self.model = os.getenv("QWEN_MODEL", config.QWEN_MODEL).strip()
        elif self.ai_agent == "zai":
            self.api_key = api_key or config.load_api_key("ZAI_API_KEY")
            self.base_url = config.ZAI_BASE_URL
            self.model = os.getenv("ZAI_MODEL", config.ZAI_MODEL).strip()
        else:
            raise ValueError(f"Unknown AI agent: {self.ai_agent}")

        if not self.api_key:
            raise ValueError(
                f"No API key found for {self.ai_agent.upper()}. "
                f"Please add it to credentials/api_keys.txt or set the {self.ai_agent.upper()}_API_KEY environment variable."
            )

        # Validate model before initializing client
        if self.ai_agent == "openai":
            success, message = config.test_ai_agent("openai")
            if not success:
                raise ValueError(f"OpenAI model validation failed: {message}")

        self.client = OpenAI(api_key=self.api_key, base_url=self.base_url)
        try:
            print(f"Using AI agent: {self.ai_agent.upper()}, model: {self.model}")
        except Exception:
            print(f"Using AI agent: {self.ai_agent.upper()} (model unknown)")

        # Install the optimized system prompt
        self.system_prompt = self._build_system_prompt()

    # ----------------------------
    # Prompts
    # ----------------------------
    def _build_system_prompt(self) -> str:
        return """
You are an expert resume-to-job matching engine for heavy industry (cement, aggregates, lime, mining, ready-mix, HMA). Evaluate only the jobs provided and return a shortlist of exactly six (6) jobIds that best fit the candidate, ranked by fit score (if six viable exist).

Scoring (100):
- Skills & experience: 55
- Role & industry alignment: 25
- Education (degree/field/substitutions): 15
- Location & other (authorization, shift/travel, physical demands, seniority): 5

Education rule:
- If the job requires a specific non-negotiable degree/field and the resume lacks it (with no stated substitution), set Education = 0 and mark Education Fit = "Miss".

No hallucinations:
- Use only facts present in the resume text and the provided job JSON. Quote jobId exactly (jobId or jobid).

Output contract:
1) First block: a machine-readable JSON object with the exact schema shown below.
2) Second block: a Markdown report with an HR-ready table.
If fewer than six clear fits exist, return fewer and explain why.

Selection constraints:
- Prefer same/adjacent industries/functions (cement, aggregates, mining, lime, ready-mix, HMA; engineering/operations/reliability/field/project).
- Penalize jobs requiring a different core profession (e.g., strict Electrical Manager if resume lacks required EE background).
- Respect hard disqualifiers: visas, degree non-negotiable, shift/location constraints.
- Prefer roles aligned to seniority of last 10 years.
- Break ties by (1) must-have criteria met, (2) recent tool/process exposure, (3) location feasibility.

Required JSON schema (return this FIRST):
{
  "candidate": {"name": "", "headline": "", "education": "", "location": ""},
  "shortlist": [
    {
      "jobId": "",
      "company": "",
      "position": "",
      "industry": "",
      "location": "",
      "score_total": 0,
      "scores": {
        "skills_experience": 0,
        "role_industry": 0,
        "education": 0,
        "location_other": 0
      },
      "why_fit": "",
      "risks": "",
      "education_fit": "Meets / Partial / Miss",
      "visa_note": ""
    }
  ],
  "notes": {
    "excluded_examples": [
      {"jobId": "", "reason": ""}
    ]
  }
}

Required Markdown (return this SECOND):
## Top 6 Job Matches (Ready for HR Submission)
| JobID | Company | Position | Industry | Location | Fit Score | Why Fit | Risks/Gaps | Education Fit | Visa/Other |
|---|---|---|---|---|---|---|---|---|---|
... six rows ...

**Submission Notes**
- 3–5 bullets summarizing overall rationale/caveats.
"""

    def _make_user_prompt(self, resume_text: str, jobs_subset: List[Dict[str, Any]], resume_max_chars: int = 3000) -> str:
        """
        Build the user prompt. To avoid exceeding model context windows, the resume_text
        is truncated to resume_max_chars characters (default 3000). jobs_subset is expected
        to be a reasonably small list (we pre-filter before calling this).
        """
        # Truncate resume to keep prompt size bounded (prefer recent experience and skills)
        if resume_text and len(resume_text) > resume_max_chars:
            # Keep head and tail to preserve contact/header and recent roles
            head = resume_text[:int(resume_max_chars * 0.6)]
            tail = resume_text[-int(resume_max_chars * 0.4):]
            resume_excerpt = head + "\n\n...TRUNCATED...\n\n" + tail
        else:
            resume_excerpt = resume_text or ""

        return f"""
You will analyze the following candidate and job subset.

### Candidate (Resume Excerpt)
{resume_excerpt}

### Jobs Subset (JSON Array)
{json.dumps(jobs_subset, indent=2)}

### Instructions
1) Evaluate only the jobs provided above.
2) Score each job using the 100-point rubric.
3) Select the top six jobs (or fewer if fewer are viable), and return:
   - First: the JSON object per the schema in the system prompt.
   - Second: a Markdown report:
     - Title: “Top 6 Job Matches (Ready for HR Submission)”
     - A table with columns: JobID | Company | Position | Industry | Location | Fit Score | Why Fit | Risks/Gaps | Education Fit | Visa/Other
     - A “Submission Notes” bullet list (3–5 bullets).

Rules:
- Do not invent data; only use the resume and the jobs array above.
- Always include the actual jobId (accept jobId or jobid field).
- If a strict degree requirement is not met and the job text says it’s non-negotiable, set Education Fit = “Miss” and penalize accordingly.
- Keep the Markdown concise and easy to scan for HR.
"""

    # ----------------------------
    # Resume text extraction
    # ----------------------------
    def extract_text_from_resume(self, file_path: str) -> str:
        _, ext = os.path.splitext(file_path)
        ext = ext.lower()

        if ext == '.pdf':
            return self._extract_text_from_pdf(file_path)
        elif ext in ['.docx', '.doc']:
            return self._extract_text_from_docx(file_path)
        elif ext == '.txt':
            return self._extract_text_from_txt(file_path)
        else:
            raise ValueError(f"Unsupported file format: {ext}")

    def _extract_text_from_pdf(self, file_path: str) -> str:
        text = ""
        repaired_path: Optional[str] = None
        repair_method: Optional[str] = None
        stderr_val = ""
        try:
            with open(file_path, 'rb') as f:
                try:
                    import io, contextlib
                    stderr_buf = io.StringIO()
                    with contextlib.redirect_stderr(stderr_buf):
                        pdf_reader = PyPDF2.PdfReader(f)
                    stderr_val = stderr_buf.getvalue().strip()
                except Exception as initial_e:
                    try:
                        f.seek(0)
                        import io, contextlib
                        stderr_buf = io.StringIO()
                        with contextlib.redirect_stderr(stderr_buf):
                            pdf_reader = PyPDF2.PdfReader(f, strict=False)
                        stderr_val = stderr_buf.getvalue().strip()
                    except Exception:
                        repaired = False
                        try:
                            try:
                                import pikepdf  # type: ignore
                            except Exception:
                                pikepdf = None  # type: ignore

                            if pikepdf:
                                tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
                                tmp_path = tmp.name
                                tmp.close()
                                try:
                                    pikepdf.Pdf.open(file_path).save(tmp_path)
                                    repaired = True
                                    repaired_path = tmp_path
                                    repair_method = "pikepdf"
                                except Exception:
                                    try:
                                        os.unlink(tmp_path)
                                    except Exception:
                                        pass
                                    repaired = False

                            if not repaired and shutil.which("qpdf"):
                                tmp2 = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
                                tmp2_path = tmp2.name
                                tmp2.close()
                                try:
                                    res = subprocess.run(["qpdf", "--linearize", file_path, tmp2_path], capture_output=True, text=True)
                                    if res.returncode == 0:
                                        repaired = True
                                        repaired_path = tmp2_path
                                        repair_method = "qpdf"
                                    else:
                                        try:
                                            os.unlink(tmp2_path)
                                        except Exception:
                                            pass
                                except Exception:
                                    try:
                                        os.unlink(tmp2_path)
                                    except Exception:
                                        pass

                            if repaired and repaired_path:
                                with open(repaired_path, "rb") as rf:
                                    import io, contextlib
                                    stderr_buf = io.StringIO()
                                    with contextlib.redirect_stderr(stderr_buf):
                                        pdf_reader = PyPDF2.PdfReader(rf)
                                    stderr_val = stderr_buf.getvalue().strip()
                            else:
                                raise initial_e
                        except Exception:
                            raise initial_e

                for page_num in range(len(pdf_reader.pages)):
                    try:
                        page_text = pdf_reader.pages[page_num].extract_text() or ""
                    except Exception:
                        page_text = ""
                    if page_text:
                        text += page_text + "\n"
        except Exception as e:
            try:
                import re as _re
                with open(file_path, 'rb') as f:
                    raw = f.read()
                matches = _re.findall(rb'[\x20-\x7E]{20,}', raw)
                chunks = [m.decode('latin-1', errors='ignore') for m in matches[:80]]
                text = "\n".join(chunks).strip()
            except Exception as e2:
                if repaired_path:
                    try:
                        os.unlink(repaired_path)
                    except Exception:
                        pass
                raise ValueError(f"Error extracting text from PDF: {e2}")

        try:
            self._last_pdf_processing = {
                "file": os.path.basename(file_path),
                "repaired_path": repaired_path,
                "repair_method": repair_method,
                "stderr_warnings": stderr_val,
                "extracted_length": len(text) if text else 0
            }
        except Exception:
            self._last_pdf_processing = {}

        if repaired_path:
            try:
                os.unlink(repaired_path)
            except Exception:
                pass

        if not text.strip():
            raise ValueError("PDF text extraction failed (possibly scanned or corrupted).")
        return text + "\n"

    def _extract_text_from_docx(self, file_path: str) -> str:
        text = ""
        try:
            doc = docx.Document(file_path)
            for para in doc.paragraphs:
                text += para.text + "\n"
        except Exception as e:
            raise ValueError(f"Error extracting text from DOCX: {str(e)}")
        return text

    def _extract_text_from_txt(self, file_path: str) -> str:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except UnicodeDecodeError:
            try:
                with open(file_path, 'r', encoding='latin-1') as f:
                    return f.read()
            except Exception as e:
                raise ValueError(f"Error extracting text from TXT: {str(e)}")

    # ----------------------------
    # Job pre-filtering
    # ----------------------------
    def _normalize_job(self, job: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize keys across possible shapes."""
        return {
            "jobId": job.get("jobId", job.get("jobid", "Unknown Job ID")),
            "jobTitle": job.get("jobTitle", job.get("position", "")) or "",
            "company": job.get("clientName", job.get("company", "")) or "",
            "industry": job.get("industry", job.get("industry/Segment", job.get("segment", ""))) or "",
            "city": job.get("city", ""),
            "state": job.get("state", ""),
            "location": job.get("location", f"{job.get('city', '')}, {job.get('state', '')}".strip(", ")),
            "matchCriteria": job.get("matchCriteria", {}),
            "raw": job
        }

    def _pre_filter_jobs(self, jobs_data: Any, resume_text: str, target_size: int = 20) -> List[Dict[str, Any]]:
        """
        Thin jobs to ~target_size by industry/function/education/seniority/keywords.

        Enhanced behavior (relaxed near-match policy):
        - Detects candidate functional keywords (e.g., sales-related terms) and will
          allow matching jobs that contain those function terms even if the job is
          outside the strict industry list.
        - Uses difflib fuzzy matching (threshold ~0.7) against lightweight resume keywords
          to catch near-matches.
        """
        # Determine job list form
        if isinstance(jobs_data, dict) and "jobs" in jobs_data:
            jobs = jobs_data["jobs"]
        elif isinstance(jobs_data, list):
            jobs = jobs_data
        else:
            jobs = [jobs_data]

        # Light resume keyword extraction
        rtext = (resume_text or "").lower()
        kw_resume = set()
        for kw in [
            "cement", "aggregate", "aggregates", "lime", "mining", "ready-mix", "ready mix", "hma",
            "reliability", "maintenance", "commissioning", "installation", "project", "field service",
            "kiln", "mill", "quarry", "industrial minerals", "oem", "vendor", "predictive", "preventive",
            "sap", "cmms", "root cause", "rca", "shutdown", "turnaround", "outage",
            # broaden with common business functions
            "sales", "territory", "account", "business development", "bdm", "representative", "rep"
        ]:
            if kw in rtext:
                kw_resume.add(kw)

        # Detect candidate-level function flags (we care about sales mapping per request)
        sales_keywords = ["sales", "territory", "account", "business development", "bdm", "rep", "representative"]
        candidate_has_sales = any(kw in rtext for kw in sales_keywords)

        def industry_ok(ind: str) -> bool:
            ind_l = (ind or "").lower()
            return any(x in ind_l for x in ["cement", "agg", "aggregate", "mining", "lime", "ready", "hma"])

        def role_ok(title: str) -> bool:
            t = (title or "").lower()
            return any(x in t for x in [
                "engineer", "reliability", "maintenance", "project", "operations",
                "plant", "manager", "superintendent", "supervisor", "field"
            ])

        def education_hard_block(job: Dict[str, Any]) -> bool:
            crit = job.get("matchCriteria") or job.get("aiExtractedCriteria") or {}
            # Look for explicit, non-negotiable degree field
            deg_field = ""
            if isinstance(crit, dict):
                # flexible paths
                deg_field = (
                    (crit.get("required_education") or {}).get("field_of_study", "") or
                    crit.get("education_field", "")
                )
                nonneg = str((crit.get("required_education") or {}).get("non_negotiable", "")).lower()
            else:
                nonneg = ""
            if deg_field:
                # crude check: if resume lacks the degree field phrase at all, block
                return deg_field.lower() not in rtext and ("true" in nonneg or "yes" in nonneg or "1" in nonneg)
            return False

        def seniority_score(title: str) -> int:
            t = (title or "").lower()
            score = 0
            if any(x in t for x in ["manager", "superintendent", "supervisor", "lead"]):
                score += 2
            if any(x in t for x in ["engineer", "project", "reliability", "maintenance", "operations", "plant"]):
                score += 2
            return score

        def keyword_boost(title: str, industry: str) -> int:
            t = (title or "").lower()
            i = (industry or "").lower()
            boost = 0
            for kw in kw_resume:
                if kw in t or kw in i:
                    boost += 1
            return boost

        # Fuzzy matching using rapidfuzz (required dependency)
        from rapidfuzz import fuzz
        def fuzzy_match(a: str, b: str, thresh: float = 0.7) -> bool:
            """
            Use rapidfuzz's token_set_ratio for fuzzy matching. This is better than difflib for:
            - Handling word order differences ("sales manager" ≈ "manager of sales")
            - Partial token matches ("sales rep" ≈ "sales representative")
            - Unicode/case normalization
            """
            try:
                if not a or not b:
                    return False
                # rapidfuzz returns 0-100, normalize to 0-1
                score = fuzz.token_set_ratio(a, b) / 100.0
                return score >= thresh
            except Exception as e:
                print(f"[WARNING] Fuzzy match error ({a} ≈ {b}): {e}")
                return False

        # Industry terms we care about for candidate detection (expandable)
        industry_terms = [
            "cement", "aggregate", "aggregates", "lime", "mining", "ready-mix", "ready mix", "hma",
            "magnesium", "rmx", "agg", "packaging", "minerals", "salt"
        ]

        # Detect industries mentioned in resume (exact or fuzzy)
        candidate_industries = set()
        for ind in industry_terms:
            if ind in rtext:
                candidate_industries.add(ind)
            else:
                # fuzzy check against resume text snippets (token-level)
                try:
                    if fuzzy_match(rtext, ind, thresh=0.75):
                        candidate_industries.add(ind)
                except Exception:
                    pass

        # Role mapping to expand candidate functions => job-title terms
        role_mapping = {
            "sales": ["sales", "territory", "account", "business development", "representative", "rep", "territory sales", "sales manager", "account manager"]
        }

        scored: List[Tuple[int, Dict[str, Any]]] = []
        for j in jobs:
            norm = self._normalize_job(j)

            # Hard exclude if education mismatch
            if education_hard_block(norm["raw"]):
                continue

            job_title = (norm.get("jobTitle") or "").strip()
            job_industry = (norm.get("industry") or "").strip()

            # Primary inclusion checks (industry/function)
            include_flag = False

            # If job industry clearly matches our industry list, include
            if industry_ok(job_industry) or industry_ok(job_title):
                include_flag = True

            # If job role/title looks like the functions we want, include
            if role_ok(job_title):
                include_flag = True

            # If candidate has explicit industry mentions, allow jobs in those industries.
            # This prevents disqualifying good matches when the candidate worked in one of the industries.
            if candidate_industries:
                ji_lower = (job_industry or "").lower()
                # direct substring match
                if any(ind in ji_lower for ind in candidate_industries):
                    include_flag = True
                else:
                    # fuzzy match job industry/title against detected candidate industries
                    for ind in candidate_industries:
                        try:
                            if fuzzy_match(job_industry or "", ind, thresh=0.7) or fuzzy_match(job_title or "", ind, thresh=0.7):
                                include_flag = True
                                break
                        except Exception:
                            pass

            # If candidate has sales background, allow sales-like jobs through
            if candidate_has_sales:
                jt_lower = job_title.lower()
                ji_lower = job_industry.lower()
                if any(s_kw in jt_lower or s_kw in ji_lower for s_kw in role_mapping["sales"]):
                    include_flag = True
                else:
                    # fuzzy check between job title and sales mapping terms
                    for term in role_mapping["sales"]:
                        if fuzzy_match(job_title, term) or fuzzy_match(job_industry, term):
                            include_flag = True
                            break

            # Fuzzy matching against resume keywords to catch near matches
            if not include_flag and kw_resume:
                for kw in kw_resume:
                    if fuzzy_match(job_title, kw) or fuzzy_match(job_industry, kw):
                        include_flag = True
                        break

            # If still not included, skip
            if not include_flag:
                continue

            # Heuristic scoring
            base = 0
            base += seniority_score(job_title)
            base += keyword_boost(job_title, job_industry)

            # Small boost if jobTitle fuzzy-matches resume keywords
            for kw in kw_resume:
                try:
                    if fuzzy_match(job_title, kw, thresh=0.8):
                        base += 1
                except Exception:
                    pass

            scored.append((base, norm))

        # Sort by heuristic score desc, keep top N
        scored.sort(key=lambda x: x[0], reverse=True)
        subset = [s[1] for s in scored[:target_size]]

        # Fallback: if empty, relax role filter and keep first N normalized
        if not subset:
            for j in jobs[:target_size]:
                subset.append(self._normalize_job(j))

        print(f"Pre-filtered jobs from {len(jobs)} to {len(subset)}")
        return subset

    # ----------------------------
    # MasterTrackingBoard (MTB) helpers
    # ----------------------------
    def _load_mtb_job_ids(self, mtb_path: Optional[str], cat: str = "ALL", state: str = "ALL", client_rating: str = "ALL") -> Optional[set]:
        """
        Load job IDs from the MasterTrackingBoard using modules.mtb_processor.master_tracking_board_activities.
        Returns a set of jobId strings, or None if mtb_path not provided or load failed.
        """
        if not mtb_path:
            return None
        try:
            # Lazy import to avoid circular import at module load time
            from modules import mtb_processor
            print(f"Loading MTB job IDs from: {mtb_path} (cat={cat}, state={state}, client_rating={client_rating})")
            job_ids = mtb_processor.master_tracking_board_activities(mtb_path, cat, state, client_rating, extract_job_ids=True)
            if job_ids:
                return set(str(j).strip() for j in job_ids)
            return set()
        except Exception as e:
            print(f"[WARNING] Could not load MTB job IDs from {mtb_path}: {e}")
            return None

    # ----------------------------
    # Model call + parsing
    # ----------------------------
    def _call_model_with_retry(self, user_prompt, max_completion_tokens=3500, temp=0.2):
        try:
            return self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=temp,
                max_tokens=max_completion_tokens
            )
        except Exception as inner_e:
            inner_err = str(inner_e).lower()
            if "unsupported parameter" in inner_err and "max_tokens" in inner_err:
                try:
                    return self.client.chat.completions.create(
                        model=self.model,
                        messages=[
                            {"role": "system", "content": self.system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        temperature=temp,
                        max_completion_tokens=max_completion_tokens
                    )
                except Exception as inner2_e:
                    inner2_err = str(inner2_e).lower()
                    if "unsupported value" in inner2_err and "temperature" in inner2_err:
                        return self.client.chat.completions.create(
                            model=self.model,
                            messages=[
                                {"role": "system", "content": self.system_prompt},
                                {"role": "user", "content": user_prompt}
                            ],
                            max_completion_tokens=max_completion_tokens
                        )
                    else:
                        raise
            elif "unsupported value" in inner_err and "temperature" in inner_err:
                return self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": self.system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    max_tokens=max_completion_tokens
                )
            else:
                raise

    def _extract_first_json_object(self, text: str) -> Optional[Dict[str, Any]]:
        """Extract first JSON object from text. Supports ```json fences or plain blocks."""
        if not text:
            return None
        # Prefer fenced code block
        fence = re.search(r"```json\s*(\{.*?\})\s*```", text, re.DOTALL | re.IGNORECASE)
        if fence:
            try:
                return json.loads(fence.group(1))
            except Exception:
                pass
        # Otherwise, try brace matching from first '{'
        start = text.find("{")
        if start == -1:
            return None
        depth = 0
        for i in range(start, len(text)):
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
                if depth == 0:
                    candidate = text[start:i+1]
                    try:
                        return json.loads(candidate)
                    except Exception:
                        break
        return None

    def _extract_markdown_after_json(self, text: str) -> str:
        """Return everything after the first JSON object (or entire text if none)."""
        if not text:
            return ""
        # If fenced JSON present, return text after fence
        fence = re.search(r"```json\s*\{.*?\}\s*```", text, re.DOTALL | re.IGNORECASE)
        if fence:
            return text[fence.end():].strip()
        # Else try brace matching to find end of first JSON
        start = text.find("{")
        if start == -1:
            return text.strip()
        depth = 0
        end_pos = -1
        for i in range(start, len(text)):
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
                if depth == 0:
                    end_pos = i + 1
                    break
        if end_pos != -1:
            return text[end_pos:].strip()
        return text.strip()

    def _markdown_from_json(self, data: Dict[str, Any]) -> str:
        """Build HR-ready Markdown if the model didn't provide the second block."""
        rows = []
        for item in (data.get("shortlist") or []):
            rows.append([
                str(item.get("jobId", "")),
                str(item.get("company", "")),
                str(item.get("position", "")),
                str(item.get("industry", "")),
                str(item.get("location", "")),
                str(item.get("score_total", "")),
                (item.get("why_fit", "") or "").replace("\n", " "),
                (item.get("risks", "") or "").replace("\n", " "),
                str(item.get("education_fit", "")),
                str(item.get("visa_note", "")),
            ])

        table_lines = [
            "## Top 6 Job Matches (Ready for HR Submission)",
            "",
            "| JobID | Company | Position | Industry | Location | Fit Score | Why Fit | Risks/Gaps | Education Fit | Visa/Other |",
            "|---|---|---|---|---|---|---|---|---|---|",
        ]
        for r in rows:
            table_lines.append("| " + " | ".join(r) + " |")

        notes = data.get("notes", {})
        excluded = notes.get("excluded_examples", [])
        md = "\n".join(table_lines)
        md += "\n\n**Submission Notes**\n"
        bullets = []
        bullets.append("- Shortlist generated by rubric (skills/role/education/location).")
        if excluded:
            bullets.append(f"- {len(excluded)} example(s) excluded; see JSON for reasons.")
        bullets.append("- Verify work authorization and shift/travel early.")
        bullets.append("- Prioritize interviews by Fit Score and must-have criteria.")
        return md + "\n" + "\n".join(bullets) + "\n"

    # ----------------------------
    # Main matching flow
    # ----------------------------
    def match_resume_to_jobs(self, resume_text: str, jobs_data: List[Dict[str, Any]], mtb_job_ids: Optional[set] = None) -> Tuple[str, str]:
        """
        Match a resume to jobs using the AI agent.

        mtb_job_ids: optional set of jobId strings coming from MasterTrackingBoard filtering.
    
        Returns:
            Tuple of (json_block_str, markdown_block_str)
        """
        # If MTB job id filter provided, filter jobs_data first (do this before pre-filtering)
        filtered_jobs_input = jobs_data
        if mtb_job_ids is not None:
            try:
                def _job_matches_mtb(j):
                    jid = str(j.get("jobId", j.get("jobid", ""))).strip()
                    return jid in mtb_job_ids
                if isinstance(jobs_data, dict) and "jobs" in jobs_data:
                    filtered = [j for j in jobs_data["jobs"] if _job_matches_mtb(j)]
                elif isinstance(jobs_data, list):
                    filtered = [j for j in jobs_data if _job_matches_mtb(j)]
                else:
                    filtered = [jobs_data] if _job_matches_mtb(jobs_data) else []
                filtered_jobs_input = filtered
                print(f"[DEBUG] Filtered jobs count after MTB filter: {len(filtered_jobs_input)}")
            except Exception as e:
                print(f"[WARNING] Error applying MTB jobId filter: {e}")
                filtered_jobs_input = jobs_data

        # 1) Pre-filter for speed
        subset = self._pre_filter_jobs(filtered_jobs_input, resume_text, target_size=20)
        print(f"[{datetime.utcnow().isoformat()}] Model input subset size: {len(subset)}")

        # 2) Build prompt and call model
        user_prompt = self._make_user_prompt(resume_text, subset)

        # Debug: Log prompt size and save sample to file
        try:
            prompt_len = len(user_prompt)
            prompt_chars = len(user_prompt.encode('utf-8'))
            print(f"[DEBUG] Prompt size: {prompt_len} chars, {prompt_chars} bytes")

            # Save prompt sample to debug file
            ts = datetime.utcnow().strftime("%Y%m%d%H%M%S")
            debug_fn = os.path.join("output", f"prompt_debug_{ts}.log")
            os.makedirs("output", exist_ok=True)
            with open(debug_fn, "w", encoding="utf-8") as df:
                df.write("=== PROMPT HEAD (first 500 chars) ===\n")
                df.write(user_prompt[:500] + "\n\n")
                df.write("=== PROMPT TAIL (last 500 chars) ===\n")
                df.write(user_prompt[-500:] if len(user_prompt) > 500 else user_prompt)
                df.write("\n\n=== SYSTEM PROMPT ===\n")
                df.write(self.system_prompt)
            print(f"[DEBUG] Saved prompt sample to {debug_fn}")
        except Exception as e:
            print(f"[DEBUG] Error saving prompt debug info: {e}")

        response = self._call_model_with_retry(user_prompt)
 
        # 3) Extract content (robust + diagnostics + retry)
        content = ""
 
        def _extract_content_from_response(resp) -> str:
            """Robustly extract textual content from different response shapes."""
            try:
                # Common SDK shape: resp.choices[0].message.content
                choices = getattr(resp, "choices", None)
                if choices and len(choices) > 0:
                    first = choices[0]
                    # Try attribute-style access (object-like)
                    try:
                        return (first.message.content or "") if getattr(first, "message", None) else ""
                    except Exception:
                        pass
                    # Try dictionary-style message
                    try:
                        msg = getattr(first, "message", None)
                        if isinstance(msg, dict):
                            return msg.get("content", "") or ""
                    except Exception:
                        pass
                    # Try other common fields
                    try:
                        return getattr(first, "content", "") or getattr(first, "text", "") or ""
                    except Exception:
                        pass
                # Fallback to stringifying whole response
                return str(resp) or ""
            except Exception:
                return ""
 
        content = _extract_content_from_response(response)
 
        # If empty, save raw response for debugging and retry with alternative params
        if not content.strip():
            try:
                ts = datetime.utcnow().strftime("%Y%m%d%H%M%S")
                debug_fn = os.path.join("output", f"ai_response_debug_{ts}.log")
                os.makedirs("output", exist_ok=True)
                with open(debug_fn, "w", encoding="utf-8") as df:
                    df.write("=== RESPONSE REPR ===\n")
                    df.write(repr(response) + "\n\n")
                    df.write("=== RESPONSE STR ===\n")
                    df.write(str(response) + "\n\n")
                    df.write("=== TRUNCATED PROMPT (first 10000 chars) ===\n")
                    df.write(user_prompt[:10000])
                print(f"[DEBUG] Saved raw model response to {debug_fn}")
            except Exception as e:
                print(f"[DEBUG] Could not save raw response: {e}")
 
            # Retry strategies (reduce token budget / adjust temperature)
            retry_attempts = [
                {"max_tokens": 1200, "temp": 0.0},
                {"max_tokens": 800, "temp": 0.0},
                {"max_tokens": 400, "temp": 0.2},
            ]
            for r in retry_attempts:
                try:
                    print(f"[DEBUG] Empty response; retrying with max_completion_tokens={r['max_tokens']} temp={r['temp']}")
                    response = self._call_model_with_retry(user_prompt, max_completion_tokens=r["max_tokens"], temp=r["temp"])
                    content = _extract_content_from_response(response)
                    if content and content.strip():
                        print("[DEBUG] Retry succeeded and produced content")
                        break
                except Exception as ex:
                    print(f"[DEBUG] Retry failed: {ex}")
 
            # Final clarifying attempt: ask the model explicitly to output the JSON block only.
            if not content.strip():
                try:
                    clarifying_prompt = user_prompt + "\n\nPlease now OUTPUT ONLY the required JSON object (no explanation, no markdown). " \
                                            "If fewer than six matches exist, return the JSON with a shorter shortlist.\n\n" \
                                            "Return immediately with the JSON object only."
                    print("[DEBUG] Performing final clarifying call to coax visible output from model.")
                    response = self._call_model_with_retry(clarifying_prompt, max_completion_tokens=800, temp=0.0)
                    content = _extract_content_from_response(response)
                    if content and content.strip():
                        print("[DEBUG] Clarifying call produced content")
                except Exception as ex:
                    print(f"[DEBUG] Clarifying call failed: {ex}")
 
        if not content.strip():
            msg = f"[ERROR] Empty response from {self.ai_agent.upper()} (model={getattr(self, 'model', 'unknown')}). See output/ai_response_debug_*.log for raw response."
            print(msg)
            try:
                raw_preview = str(response)[:1000]
            except Exception:
                raw_preview = ""
            return json.dumps({"error": msg, "raw_response_preview": raw_preview}, indent=2), msg

        # 4) Parse JSON first block, then Markdown second block
        parsed_json = self._extract_first_json_object(content)
        md_part = self._extract_markdown_after_json(content)

        if parsed_json is None:
            print("[WARNING] No valid JSON block parsed from model output; generating fallback.")
            # Fallback: write entire content as Markdown
            return json.dumps({"warning": "No JSON parsed", "raw_preview": content[:2000]}, indent=2), content

        # Guarantee shortlist length <= 6
        if isinstance(parsed_json.get("shortlist"), list) and len(parsed_json["shortlist"]) > 6:
            parsed_json["shortlist"] = parsed_json["shortlist"][:6]

        # 5) If Markdown missing or empty, generate from JSON
        if not md_part.strip():
            md_part = self._markdown_from_json(parsed_json)

        # Return both blocks as strings
        json_block = json.dumps(parsed_json, indent=2, ensure_ascii=False)
        return json_block, md_part

    # ----------------------------
    # Public processing helpers
    # ----------------------------
    def process_resume(self, resume_path: str, jobs_data: List[Dict[str, Any]], mtb_job_ids: Optional[set] = None) -> Tuple[str, str]:
        """
        Process a single resume file.

        mtb_job_ids: optional set of jobIds to restrict matching to (from MTB).
    
        Returns:
            Tuple of (resume_filename, combined_markdown_output)
        """
        ts = datetime.utcnow().isoformat()
        try:
            model_name = getattr(self, "model", "unknown")
        except Exception:
            model_name = "unknown"
        print(f"[{ts}] Processing resume: {os.path.basename(resume_path)} (path: {resume_path}) - model: {model_name}")

        # Extract resume text
        try:
            resume_text = self.extract_text_from_resume(resume_path)
        except Exception as e:
            error_msg = f"[ERROR] Could not extract text from resume {os.path.basename(resume_path)}: {e}"
            print(error_msg)
            return os.path.basename(resume_path), error_msg

        # Match to jobs
        try:
            json_block, markdown_block = self.match_resume_to_jobs(resume_text, jobs_data, mtb_job_ids=mtb_job_ids)
        except Exception as e:
            error_msg = f"[ERROR] AI processing failed for {os.path.basename(resume_path)}: {e}"
            print(error_msg)
            return os.path.basename(resume_path), error_msg

        # Compose final .md with both blocks: JSON first, Markdown second
        combined = "```json\n" + json_block + "\n```\n\n" + markdown_block
        return os.path.basename(resume_path), combined

    def process_resumes(self, resume_path: str, jobs_file: str, output_dir: str, mtb_path: Optional[str] = None, mtb_cat: str = "ALL", mtb_state: str = "ALL", mtb_client_rating: str = "ALL") -> List[str]:
        """
        Process one or more resume files.

        mtb_path: optional path to MasterTrackingBoard.csv (or Google Sheet URL). If None, will attempt to use "MasterTrackingBoard.csv" in cwd.
    
        Returns:
            List of paths to the output files (Markdown).
        """
        # Load jobs data
        try:
            with open(jobs_file, 'r', encoding='utf-8') as f:
                jobs_data = json.load(f)
                print(f"Successfully loaded jobs file: {jobs_file}")
        except Exception as e:
            raise Exception(f"Error loading jobs file: {str(e)}")

        if isinstance(jobs_data, dict) and "jobs" in jobs_data:
            print(f"Found 'jobs' array with {len(jobs_data['jobs'])} jobs")
        elif isinstance(jobs_data, list):
            print(f"Found list with {len(jobs_data)} jobs")
        else:
            jobs_data = [jobs_data]
            print("Found single job object, wrapped in list")

        # Determine default MTB path if not provided
        if mtb_path is None:
            # Try organized data structure first
            data_dir = os.getenv("DATA_DIR", "/app/data")
            mtb_dir = os.path.join(data_dir, "MTB")
            organized_mtb_path = os.path.join(mtb_dir, "MasterTrackingBoard.csv")
            
            if os.path.exists(organized_mtb_path):
                mtb_path = organized_mtb_path
            elif os.path.exists("MasterTrackingBoard.csv"):
                mtb_path = "MasterTrackingBoard.csv"  # Fallback to legacy location

        mtb_job_ids = None
        if mtb_path:
            mtb_job_ids = self._load_mtb_job_ids(mtb_path, cat=mtb_cat, state=mtb_state, client_rating=mtb_client_rating)
            if mtb_job_ids is None:
                print("[INFO] MTB loader returned None (proceeding without MTB-based filtering)")
            else:
                print(f"[INFO] MTB provided {len(mtb_job_ids)} job IDs to filter against")

        os.makedirs(output_dir, exist_ok=True)

        output_files = []

        if os.path.isdir(resume_path):
            resume_files = []
            for ext in [".pdf", ".docx", ".doc", ".txt"]:
                resume_files.extend([
                    os.path.join(resume_path, f)
                    for f in os.listdir(resume_path)
                    if f.lower().endswith(ext)
                ])
            if not resume_files:
                raise ValueError(f"No resume files found in {resume_path}")

            for resume_file in resume_files:
                resume_filename, combined_md = self.process_resume(resume_file, jobs_data, mtb_job_ids=mtb_job_ids)
                output_file = os.path.join(output_dir, f"{os.path.splitext(resume_filename)[0]}_analysis.md")
                with open(output_file, 'w', encoding='utf-8') as f:
                    f.write(combined_md)
                output_files.append(output_file)
                print(f"Analysis saved to: {output_file}")
        else:
            resume_filename, combined_md = self.process_resume(resume_path, jobs_data, mtb_job_ids=mtb_job_ids)
            output_file = os.path.join(output_dir, f"{os.path.splitext(resume_filename)[0]}_analysis.md")
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(combined_md)
            output_files.append(output_file)
            print(f"Analysis saved to: {output_file}")

        return output_files
