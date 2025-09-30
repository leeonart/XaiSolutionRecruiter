#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations
"""
AI Resume → JobID Matcher (Single-File Edition)
================================================
Author: Paul + GPT-5 Thinking
Date: 2025-08-09 (patched)

What this does
--------------
- Loads your jobs dataset (JSON + optional CSV tracking board) and parses resumes (PDF/DOCX).
- Prompts you for:
  • Where your resumes live (local folder, single file, or Google Drive folder/file **or link**).
  • Which AI provider/model to use (OpenAI, Gemini, Grok/xAI, or "none" for rules-only).
- Quickly screens out non-fit jobs (hard deal-breakers: education, experience, industry, visa, prior company conflicts, etc.).
- Uses an LLM to deeply evaluate the remaining shortlist and returns only jobs with rating ≥ 60%.
- Produces a clear, hiring-manager-ready Markdown report per resume, plus a CSV of all scored jobs.

Dependencies (install these)
----------------------------
    pip install --upgrade pip
    pip install pandas pydantic tqdm python-docx docx2txt pypdf pdfminer.six rapidfuzz tenacity python-dotenv
    # Optional (any one of these Drive stacks is fine):
    pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib
    pip install pydrive2
    # Alternative: pip install pydrive (older version)

Environment variables
---------------------
Set any you intend to use (or just provide interactively):
    OPENAI_API_KEY=...
    OPENAI_BASE_URL=https://api.openai.com/v1           # optional override
    GEMINI_API_KEY=...
    XAI_API_KEY=...                                     # Grok

Default dataset locations (you can override interactively)
----------------------------------------------------------
    Jobs JSON: /mnt/data/jobs_20250809_optimized.json
    Tracking CSV (optional): /mnt/data/MasterTrackingBoard.csv

Outputs
-------
- output/<resume_stem>/report.md        → nicely formatted summary + recommendations
- output/<resume_stem>/matches.csv      → full scored list (kept for auditability)
- output/aggregate_summary.csv          → one-line summary per resume

"""

import os
import io
import re
import sys
import json
import csv
import math
import time
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
from datetime import datetime

# Third-party
import pandas as pd
# from pydantic import BaseModel, Field
# Using simple classes instead of pydantic due to import issues
class BaseModel:
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

def Field(**kwargs):
    return kwargs.get('default_factory', lambda: kwargs.get('default'))() if 'default_factory' in kwargs else kwargs.get('default')
from tqdm import tqdm
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from rapidfuzz import fuzz

# Resume parsing deps
try:
    import docx2txt
except ImportError:
    docx2txt = None

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

try:
    import fitz  # PyMuPDF
    def pdfminer_extract_text(path):
        doc = fitz.open(path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text
except ImportError:
    pdfminer_extract_text = None

# Legacy .doc support removed (no textract). .doc files are no longer supported.

# Optional Google Drive stacks
# A) googleapiclient
# Required packages: google-auth, google-auth-oauthlib, google-api-python-client
# Note: type: ignore comments are used to suppress linter warnings for these imports
# as they may not be recognized by all IDEs despite being valid at runtime
try:
    from googleapiclient.discovery import build as gbuild  # type: ignore
    from googleapiclient.http import MediaIoBaseDownload  # type: ignore
    from google.oauth2.credentials import Credentials  # type: ignore
    from google_auth_oauthlib.flow import InstalledAppFlow  # type: ignore
    from google.auth.transport.requests import Request  # type: ignore
    GOOGLE_API_AVAILABLE = True
except ImportError:
    gbuild = None
    MediaIoBaseDownload = None
    Credentials = None
    InstalledAppFlow = None
    Request = None
    GOOGLE_API_AVAILABLE = False
    print("Warning: Google API client libraries not available. Google Drive functionality will be limited.")
    print("To enable Google Drive functionality, install: pip install google-auth google-auth-oauthlib google-api-python-client")

# B) PyDrive2
# Required package: pydrive2
try:
    # Try the standard pydrive2 import first
    from pydrive2.auth import GoogleAuth as PDGoogleAuth
    from pydrive2.drive import GoogleDrive as PDGoogleDrive
    PYDRIVE2_AVAILABLE = True
except ImportError:
    try:
        # Fallback to pydrive (older version)
        from pydrive.auth import GoogleAuth as PDGoogleAuth
        from pydrive.drive import GoogleDrive as PDGoogleDrive
        PYDRIVE2_AVAILABLE = True
        print("Note: Using pydrive (older version) instead of pydrive2")
    except ImportError:
        PDGoogleAuth = None
        PDGoogleDrive = None
        PYDRIVE2_AVAILABLE = False
        print("Warning: PyDrive2/PyDrive libraries not available. Alternative Google Drive functionality will be limited.")
        print("To enable PyDrive functionality, install: pip install pydrive2 or pip install pydrive")

# ---------------------------
# Util
# ---------------------------

def prompt_default(prompt: str, default: str) -> str:
    val = input(f"{prompt} [{default}]: ").strip()
    return val or default

def yesno(prompt: str, default: bool=True) -> bool:
    d = "Y/n" if default else "y/N"
    val = input(f"{prompt} ({d}): ").strip().lower()
    if not val:
        return default
    return val.startswith("y")

def safe_mkdir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)

def read_text_file(p: Path, encoding="utf-8") -> str:
    try:
        return p.read_text(encoding=encoding, errors="ignore")
    except Exception:
        return p.read_text(errors="ignore")

def normalize_ws(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()

def sanitize_filename(name: str) -> str:
    name = re.sub(r"[\\/:*?\"<>|]", "_", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name or "file"

# ---------------------------
# Google Drive helpers
# ---------------------------

SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

def extract_file_or_folder_id(link_or_id: str, expect: str) -> Optional[str]:
    """
    Accepts a raw ID or a full Google Drive URL and extracts the appropriate ID.
    expect: 'file' or 'folder'
    """
    s = (link_or_id or "").strip()
    if not s:
        return None
    if s.startswith("http"):
        m_folder = re.search(r"/folders/([A-Za-z0-9_-]+)", s)
        m_file = re.search(r"/d/([A-Za-z0-9_-]+)", s)
        if expect == "folder" and m_folder:
            return m_folder.group(1)
        if expect == "file" and m_file:
            return m_file.group(1)
        m_qs = re.search(r"[?&]id=([A-Za-z0-9_-]+)", s)
        if m_qs:
            return m_qs.group(1)
        return None
    return s

def get_drive_service_googleapiclient() -> Optional[Any]:
    try:
        from modules.gdrive_operations import authenticate_drive
        return authenticate_drive()
    except (ImportError, Exception):
        if gbuild is None or Credentials is None or InstalledAppFlow is None:
            return None
        creds = None
        token_path = Path("token.json")
        if Path("credentials/credentials.json").exists():
            creds_path = Path("credentials/credentials.json")
        else:
            creds_path = Path("credentials.json")
        try:
            if token_path.exists():
                creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)
            if not creds or not creds.valid:
                if Request is None:
                    print("Warning: google.auth.transport.requests not available. Cannot refresh credentials.")
                    return None
                
                if creds and creds.expired and creds.refresh_token:
                    creds.refresh(Request())
                else:
                    if not creds_path.exists():
                        return None
                    flow = InstalledAppFlow.from_client_secrets_file(str(creds_path), SCOPES)
                    creds = flow.run_local_server(port=0)
                token_path.write_text(creds.to_json())
            return gbuild('drive', 'v3', credentials=creds)
        except Exception as e:
            print(f"Error setting up Google Drive service: {e}")
            return None

def get_drive_service_pydrive2() -> Optional[Any]:
    if PDGoogleAuth is None or PDGoogleDrive is None:
        return None
    cred_dir = Path("credentials")
    client_secrets = cred_dir / "credentials.json"
    cred_dir.mkdir(exist_ok=True)
    try:
        gauth = PDGoogleAuth()
        creds_file = cred_dir / "mycreds.txt"
        if client_secrets.exists():
            gauth.LoadClientConfigFile(str(client_secrets))
        try:
            gauth.LoadCredentialsFile(str(creds_file))
        except Exception:
            pass
        if gauth.credentials is None or gauth.access_token_expired:
            if client_secrets.exists():
                gauth.LocalWebserverAuth()
                gauth.SaveCredentialsFile(str(creds_file))
            else:
                return None
        else:
            gauth.Authorize()
        return PDGoogleDrive(gauth)
    except Exception as e:
        print(f"Error setting up PyDrive2 service: {e}")
        return None

def list_folder_files_googleapiclient(service, folder_id: str) -> List[Dict[str, Any]]:
    files = []
    page_token = None
    query = f"'{folder_id}' in parents and trashed=false"
    while True:
        resp = service.files().list(q=query, spaces='drive',
                                    fields='files(id, name, mimeType), nextPageToken',
                                    pageToken=page_token).execute()
        files.extend(resp.get('files', []))
        page_token = resp.get('nextPageToken')
        if not page_token:
            break
    return files

def download_file_googleapiclient(service, file_id: str, out_path: Path) -> Path:
    if MediaIoBaseDownload is None:
        raise ImportError("MediaIoBaseDownload not available. Google API client libraries may not be installed.")
    request = service.files().get_media(fileId=file_id)
    fh = io.FileIO(out_path, 'wb')
    downloader = MediaIoBaseDownload(fh, request)
    done = False
    while not done:
        status, done = downloader.next_chunk()
    return out_path

def list_folder_files_pydrive2(drive: Any, folder_id: str) -> List[Dict[str, Any]]:
    try:
        q = {
            'q': f"'{folder_id}' in parents and trashed=false",
            'maxResults': 1000,
            'supportsAllDrives': True,
            'includeItemsFromAllDrives': True
        }
        return drive.ListFile(q).GetList()
    except Exception:
        return []

def download_file_pydrive2(drive: Any, file_obj, out_path: Path) -> Path:
    mime = file_obj.get('mimeType', '')
    name = sanitize_filename(file_obj.get('title') or file_obj.get('name') or 'file')
    if 'application/vnd.google-apps.document' in mime:
        out_path = out_path.with_suffix('.docx')
        file_obj.GetContentFile(str(out_path), mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    elif 'application/vnd.google-apps.spreadsheet' in mime:
        out_path = out_path.with_suffix('.csv')
        file_obj.GetContentFile(str(out_path), mimetype='text/csv')
    elif 'application/vnd.google-apps.presentation' in mime:
        out_path = out_path.with_suffix('.pptx')
        file_obj.GetContentFile(str(out_path), mimetype='application/vnd.openxmlformats-officedocument.presentationml.presentation')
    else:
        file_obj.GetContentFile(str(out_path))
    return out_path

def download_drive_folder_to(temp_dir: Path, folder_input: str) -> List[Path]:
    folder_id = extract_file_or_folder_id(folder_input, expect="folder")
    if not folder_id:
        print("Could not parse a folder ID from the input; expected a Drive folder link or ID.")
        return []
    service = get_drive_service_googleapiclient()
    out_files: List[Path] = []
    if service is not None:
        try:
            files = list_folder_files_googleapiclient(service, folder_id)
            for f in files:
                name = sanitize_filename(f.get("name") or "file")
                if not re.search(r"\.(pdf|docx|txt)$", name, re.I) and not f.get("mimeType","").startswith("application/vnd.google-apps"):
                    continue
                out = temp_dir / name
                try:
                    download_file_googleapiclient(service, f["id"], out)
                    out_files.append(out)
                except Exception as e:
                    print(f"  Skip {name}: {e}")
            return out_files
        except Exception as e:
            print(f"googleapiclient error: {e}")
    drive = get_drive_service_pydrive2()
    if drive is not None:
        try:
            files = list_folder_files_pydrive2(drive, folder_id)
            for f in files:
                name = sanitize_filename(f.get("title") or f.get("name") or "file")
                if not re.search(r"\.(pdf|docx|txt)$", name, re.I) and not f.get("mimeType","").startswith("application/vnd.google-apps"):
                    continue
                out = temp_dir / name
                try:
                    download_file_pydrive2(drive, f, out)
                    out_files.append(out)
                except Exception as e:
                    print(f"  Skip {name}: {e}")
            return out_files
        except Exception as e:
            print(f"PyDrive2 error: {e}")
    print("Drive API unavailable or not configured. You can use a local path (e.g., Google Drive desktop sync).")
    return []

def download_drive_file_to(temp_dir: Path, file_input: str) -> Optional[Path]:
    file_id = extract_file_or_folder_id(file_input, expect="file")
    if not file_id:
        print("Could not parse a file ID from the input; expected a Drive file link or ID.")
        return None
    service = get_drive_service_googleapiclient()
    if service is not None:
        try:
            meta = service.files().get(fileId=file_id, fields="id, name, mimeType").execute()
            name = sanitize_filename(meta.get("name") or "file")
            out = temp_dir / name
            download_file_googleapiclient(service, file_id, out)
            return out
        except Exception as e:
            print(f"googleapiclient error: {e}")
    drive = get_drive_service_pydrive2()
    if drive is not None:
        try:
            f = drive.CreateFile({'id': file_id})
            f.FetchMetadata()
            name = sanitize_filename(f.get('title') or f.get('name') or 'file')
            out = temp_dir / name
            download_file_pydrive2(drive, f, out)
            return out
        except Exception as e:
            print(f"PyDrive2 error: {e}")
    print("Drive API unavailable or not configured. You can use a local path (e.g., Google Drive desktop sync).")
    return None

# ---------------------------
# Data models
# ---------------------------

class CandidateJobScore(BaseModel):
    def __init__(self, jobid: str, rating: float = 0.0, reasons: List[str] = None, disqualifiers: List[str] = None, hard_no: bool = False):
        self.jobid = jobid
        self.rating = max(0, min(100, rating))
        self.reasons = reasons or []
        self.disqualifiers = disqualifiers or []
        self.hard_no = hard_no

class CandidateOverview(BaseModel):
    def __init__(self, name: Optional[str] = None, location: Optional[str] = None, citizenship: Optional[str] = None,
                 total_years_experience: Optional[float] = None, education_summary: Optional[str] = None,
                 recent_roles: List[Dict[str, Any]] = None):
        self.name = name
        self.location = location
        self.citizenship = citizenship
        self.total_years_experience = total_years_experience
        self.education_summary = education_summary
        self.recent_roles = recent_roles or []

# ---------------------------
# LLM Providers
# ---------------------------

class LLMBase:
    name = "base"
    def __init__(self, model: str):
        self.model = model
    def score(self, system_prompt: str, user_prompt: str) -> str:
        raise NotImplementedError

class OpenAIClient(LLMBase):
    name = "openai"
    def __init__(self, model: str, base_url: Optional[str] = None, api_key: Optional[str] = None):
        super().__init__(model)
        self.api_key = api_key or os.getenv("OPENAI_API_KEY") or ""
        self.base_url = base_url or os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        if not self.api_key:
            raise RuntimeError("OPENAI_API_KEY not set")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10), retry=retry_if_exception_type(Exception))
    def score(self, system_prompt: str, user_prompt: str) -> str:
        import requests
        url = f"{self.base_url}/chat/completions"
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        payload = {
            "model": self.model,
            "messages": [{"role": "system", "content": system_prompt},
                         {"role": "user", "content": user_prompt}],
            "temperature": 0.0,
            "response_format": {"type": "json_object"}
        }
        r = requests.post(url, headers=headers, json=payload, timeout=30)
        if r.status_code >= 400:
            raise RuntimeError(f"OpenAI error {r.status_code}: {r.text[:300]}")
        data = r.json()
        return data["choices"][0]["message"]["content"]

class GeminiClient(LLMBase):
    name = "gemini"
    def __init__(self, model: str, api_key: Optional[str] = None, base_url: Optional[str] = None):
        super().__init__(model)
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or ""
        self.base_url = base_url or os.getenv("GEMINI_BASE_URL")
        if not self.api_key:
            raise RuntimeError("GEMINI_API_KEY not set")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10), retry=retry_if_exception_type(Exception))
    def score(self, system_prompt: str, user_prompt: str) -> str:
        import requests
        base = self.base_url or "https://generativelanguage.googleapis.com"
        url = f"{base}/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        payload = {
            "contents": [{
                "parts": [{"text": f"System:\n{system_prompt}\n\nUser:\n{user_prompt}"}]
            }],
            "generationConfig": {
                "temperature": 0.0,
                "responseMimeType": "application/json"
            }
        }
        r = requests.post(url, json=payload, timeout=60)
        if r.status_code >= 400:
            raise RuntimeError(f"Gemini error {r.status_code}: {r.text[:300]}")
        data = r.json()
        try:
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            return text
        except Exception:
            return json.dumps(data)

class GrokClient(LLMBase):
    name = "grok"
    def __init__(self, model: str, api_key: Optional[str] = None, base_url: Optional[str] = None):
        super().__init__(model)
        self.api_key = api_key or os.getenv("XAI_API_KEY") or ""
        self.base_url = base_url or os.getenv("XAI_BASE_URL", "https://api.x.ai/v1")
        if not self.api_key:
            raise RuntimeError("XAI_API_KEY not set")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10), retry=retry_if_exception_type(Exception))
    def score(self, system_prompt: str, user_prompt: str) -> str:
        import requests
        url = f"{self.base_url}/chat/completions"
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        payload = {
            "model": self.model,
            "messages": [{"role": "system", "content": system_prompt},
                         {"role": "user", "content": user_prompt}],
            "temperature": 0.0
        }
        r = requests.post(url, headers=headers, json=payload, timeout=30)
        if r.status_code >= 400:
            raise RuntimeError(f"Grok error {r.status_code}: {r.text[:300]}")
        data = r.json()
        return data["choices"][0]["message"]["content"]

def make_client(provider: str, model: str) -> Optional[LLMBase]:
    provider = provider.lower().strip()
    if provider in ("openai", "oai"):
        return OpenAIClient(model=model)
    if provider in ("gemini", "google"):
        return GeminiClient(model=model)
    if provider in ("grok", "xai", "x.ai"):
        return GrokClient(model=model)
    if provider in ("none", "rule", "rules"):
        return None
    raise ValueError(f"Unknown provider: {provider}")

# ---------------------------
# Resume parsing
# ---------------------------

def extract_text_from_pdf(path: Path) -> str:
    # Attempt with PyMuPDF first as it's often more robust
    if pdfminer_extract_text:
        try:
            return normalize_ws(pdfminer_extract_text(str(path)))
        except Exception as e:
            print(f"  - PyMuPDF failed on {path.name}: {e}")

    # Fallback to pypdf
    if PdfReader is not None:
        try:
            text = ""
            with open(path, "rb") as f:
                reader = PdfReader(f)
                for page in reader.pages:
                    text += page.extract_text() or ""
            return normalize_ws(text)
        except Exception as e:
            print(f"  - pypdf failed on {path.name}: {e}")
    
    print(f"  - Could not extract text from PDF: {path.name}")
    return ""

def extract_text_from_docx(path: Path) -> str:
    if not docx2txt:
        return ""
    try:
        text = docx2txt.process(str(path))
        # Aggressively remove control characters and normalize
        if text:
            # Remove null bytes
            text = text.replace('\x00', '')
            # Remove other common control characters except for whitespace
            text = re.sub(r'[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
            return normalize_ws(text)
        return ""
    except Exception as e:
        print(f"  - docx2txt failed on {path.name}: {e}")
        return ""


def read_resume_text(path: Path) -> str:
    suf = path.suffix.lower()
    if suf == ".pdf":
        return extract_text_from_pdf(path)
    if suf == ".docx":
        return extract_text_from_docx(path)
    # legacy .doc support removed: fall back to plain text reading for other suffixes
    try:
        return normalize_ws(read_text_file(path))
    except Exception:
        return ""

# ---------------------------
# Heuristic parsing
# ---------------------------

DATE_RX = r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{4}|\d{4}"
def extract_overview_from_resume(resume_text: str) -> 'CandidateOverview':
    lines = [l.strip() for l in resume_text.splitlines() if l.strip()]
    name = None
    if lines:
        first = lines[0]
        name = re.split(r"\s+[•|\|]\s+|[-–—]\s+", first)[0].strip()
        name = re.sub(r"\b[\w\.-]+@[\w\.-]+\.\w+\b", "", name)
        name = re.sub(r"\+?\d[\d\s().-]{7,}", "", name).strip() or None

    loc_match = re.search(r"\b([A-Za-z .'-]+,\s*[A-Z]{2})\b", resume_text)
    location = loc_match.group(1) if loc_match else None

    citizenship = None
    if re.search(r"\b(US|U\.S\.)\s*(citizen|citizenship)\b", resume_text, re.I):
        citizenship = "US"
    elif re.search(r"\b(Green Card|Permanent Resident)\b", resume_text, re.I):
        citizenship = "US PR"
    elif re.search(r"\b(TN Visa|H-1B|H1B|EAD|OPT)\b", resume_text, re.I):
        citizenship = "Work authorization noted"

    years = []
    for d in re.finditer(r"\b(\d{4})\b", resume_text):
        y = int(d.group(1))
        if 1950 <= y <= datetime.now().year + 1:
            years.append(y)
    total_years = None
    if years:
        total_years = max(years) - min(years)
        if total_years < 0:
            total_years = None

    date_range_rx = re.compile(rf"({DATE_RX})\s*[-–—]\s*({DATE_RX}|Present|Current)", re.I)
    role_rx = re.compile(r"(?P<title>[A-Za-z][A-Za-z0-9 /&\-,.()]+)\s+[-–—]\s+(?P<company>[A-Za-z0-9 .,&()/-]+)")
    recent_roles = []
    for i, line in enumerate(lines):
        if date_range_rx.search(line):
            window = " ".join(lines[max(0, i-2):i+2])
            m = role_rx.search(window)
            if m:
                title = m.group("title").strip()
                company = m.group("company").strip()
            else:
                title = lines[i-1] if i > 0 else ""
                company = ""
            if not title or not company:
                continue
            dd = date_range_rx.search(line).group(0)
            locm = re.search(r"\b([A-Za-z .'-]+,\s*[A-Z]{2})\b", window)
            loc = locm.group(1) if locm else None
            recent_roles.append({"title": title[:100], "company": company[:120], "date_range": dd, "location": loc})
    uniq = []
    seen = set()
    for r in recent_roles:
        key = (r["title"], r["company"], r.get("date_range"))
        if key not in seen:
            uniq.append(r); seen.add(key)
    recent_roles = uniq[:4]
    return CandidateOverview(name=name, location=location, citizenship=citizenship,
                             total_years_experience=total_years, education_summary=None,
                             recent_roles=recent_roles)

# ---------------------------
# Load jobs & tracking board
# ---------------------------

def load_jobs(jobs_json_path: str, tracking_csv_path: Optional[str]) -> pd.DataFrame:
    
    # --- Helper to download if path is a URL ---
    def _download_if_url(path_or_url: Optional[str], expect_type: str) -> Optional[Path]:
        if not path_or_url:
            return None
        
        path_or_url = path_or_url.strip()
        
        if not path_or_url.startswith("http"):
            p = Path(path_or_url)
            if p.is_dir():
                print(f"Searching for {expect_type} in directory: {p}")
                if expect_type == "jobs JSON":
                    for pattern in [r"jobs_.*_optimized_with_mtb\.json$", r"jobs_.*_optimized\.json$", r"jobs_.*\.json$"]:
                        for f in p.glob('*.json'):
                            if re.search(pattern, f.name):
                                print(f"  Found: {f}")
                                return f
                elif expect_type == "tracking CSV":
                     for f in p.glob('*.csv'):
                        if "mastertrackingboard" in f.name.lower():
                            print(f"  Found: {f}")
                            return f
                print(f"  No suitable file found in directory.")
                return None
            else:
                return p

        print(f"Downloading {expect_type} from URL: {path_or_url}")
        temp_dir = Path("tmp_downloads")
        safe_mkdir(temp_dir)

        # Determine if it's a file or folder link
        # Simplified check: if it looks like a folder URL, treat it as such
        is_folder = '/folders/' in path_or_url
        
        if is_folder:
            folder_id = extract_file_or_folder_id(path_or_url, 'folder')
            if not folder_id:
                print(f"  Could not extract folder ID from: {path_or_url}")
                return None

            # Logic to find the specific file within the folder
            service = get_drive_service_googleapiclient()
            if not service:
                drive = get_drive_service_pydrive2()
                if not drive:
                    print("  Google Drive service not available.")
                    return None
                file_list = list_folder_files_pydrive2(drive, folder_id)
                files_meta = [{"id": f['id'], "name": f['title']} for f in file_list]
            else:
                files_meta = list_folder_files_googleapiclient(service, folder_id)

            target_file_name = None
            if expect_type == "jobs JSON":
                # Look for the most specific JSON file first
                for pattern in [r"jobs_.*_optimized_with_mtb\.json$", r"jobs_.*_optimized\.json$", r"jobs_.*\.json$"]:
                    for f_meta in files_meta:
                        if re.search(pattern, f_meta['name']):
                            target_file_name = f_meta['name']
                            break
                    if target_file_name:
                        break
            elif expect_type == "tracking CSV":
                for f_meta in files_meta:
                   if "mastertrackingboard" in f_meta['name'].lower() and f_meta['name'].endswith(".csv"):
                        target_file_name = f_meta['name']
                        break

            if not target_file_name:
                print(f"  Could not find a suitable '{expect_type}' file in the Drive folder.")
                return None
            
            # Find the ID for the target file
            file_id_to_download = None
            for f_meta in files_meta:
                if f_meta['name'] == target_file_name:
                    file_id_to_download = f_meta['id']
                    break
            
            if not file_id_to_download:
                 print(f"  Error finding ID for file '{target_file_name}'.")
                 return None

            # Now download the specific file using its ID
            print(f"  Found '{target_file_name}' in folder. Downloading...")
            return download_drive_file_to(temp_dir, file_id_to_download)

        else: # It's a file link or ID
            downloaded_path = download_drive_file_to(temp_dir, path_or_url)
            if downloaded_path and downloaded_path.exists():
                print(f"  Successfully downloaded to {downloaded_path}")
                return downloaded_path
            else:
                print(f"  Failed to download file from URL/ID.")
                return None

    # --- Process paths ---
    local_jobs_path = _download_if_url(jobs_json_path, "jobs JSON")
    local_tracking_path = _download_if_url(tracking_csv_path, "tracking CSV")

    if not local_jobs_path or not local_jobs_path.exists():
        raise FileNotFoundError(f"Could not load jobs JSON from: {jobs_json_path}")

    # --- Load data ---
    with open(local_jobs_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    jobs = pd.json_normalize(data.get("jobs", []), max_level=3)

    # Harmonize columns coming from different JSON schemas
    rename_map = {
        "jobId": "jobid",
        "job_id": "jobid",  # new normalized key from optimizer
        # Legacy location shape
        "location.city": "city",
        "location.state": "state",
        "location.country": "country",
        # Optimizer normalized location shape
        "work_eligibility_location.city": "city",
        "work_eligibility_location.state": "state",
        "work_eligibility_location.country": "country",
        # Title mapping
        "job_title": "position",
    }
    for k, v in rename_map.items():
        if k in jobs.columns and v not in jobs.columns:
            jobs.rename(columns={k: v}, inplace=True)

    # Ensure presence for downstream consumers
    if "position" not in jobs.columns and "job_title" in jobs.columns:
        jobs["position"] = jobs["job_title"]
    if "visa" not in jobs.columns and "visa_sponsorship" in jobs.columns:
        jobs["visa"] = jobs["visa_sponsorship"]

    if "salary.min" in jobs.columns and "salary.max" in jobs.columns:
        jobs["salary_min"] = jobs["salary.min"]
        jobs["salary_max"] = jobs["salary.max"]

    # Bonus percent handling:
    # 1) Prefer nested salary.bonusPercent if present
    if "salary.bonusPercent" in jobs.columns:
        jobs["bonusPercent"] = jobs["salary.bonusPercent"]
    else:
        # 2) Build from normalized fields if available (decimal fractions)
        #    bonus_percent_min / bonus_percent_max -> "25%" or "12%–20%"
        if ("bonus_percent_min" in jobs.columns) or ("bonus_percent_max" in jobs.columns):
            def _fmt_pct_val(x):
                try:
                    return f"{(float(x) * 100):g}%"
                except Exception:
                    return None
            def _combine_bonus(row):
                a = row.get("bonus_percent_min")
                b = row.get("bonus_percent_max")
                try:
                    import math
                    a_f = None if pd.isna(a) or a == "" else float(a)
                    b_f = None if pd.isna(b) or b == "" else float(b)
                except Exception:
                    a_f = None; b_f = None
                if a_f is not None and b_f is not None:
                    if abs(a_f - b_f) < 1e-9:
                        return _fmt_pct_val(a_f)
                    lo, hi = (a_f, b_f) if a_f <= b_f else (b_f, a_f)
                    return f"{(lo*100):g}%–{(hi*100):g}%"
                v = a_f if a_f is not None else b_f
                return _fmt_pct_val(v)
            try:
                jobs["bonusPercent"] = jobs.apply(_combine_bonus, axis=1)
            except Exception:
                pass

    # Bonus raw handling (free text)
    if "salary.bonus" in jobs.columns:
        jobs["bonus_raw"] = jobs["salary.bonus"]
    elif "bonus" in jobs.columns:
        jobs["bonus_raw"] = jobs["bonus"]

    for c in ("jobid","company","position","city","state","country","industry/Segment","visa"):
        if c in jobs.columns:
            jobs[c] = jobs[c].astype(str)

    if local_tracking_path and local_tracking_path.exists():
        tb = pd.read_csv(local_tracking_path, dtype=str)
        key = "jobid" if "jobid" in tb.columns else ("JobID" if "JobID" in tb.columns else None)
        if key:
            if key != "jobid":
                tb = tb.rename(columns={key:"jobid"})
            jobs = jobs.merge(tb, on="jobid", how="left", suffixes=("", "_tb"))

    if "jobid" not in jobs.columns:
        raise RuntimeError("Jobs JSON missing 'jobid' field(s).")
    jobs["jobid"] = jobs["jobid"].astype(str)

    jobs["criteria_json"] = None
    for i, row in jobs.iterrows():
        crit = None
        for key in ("aiExtractedCriteria",):
            if key in row and isinstance(row[key], (dict, list)):
                crit = row[key]
                break
        jobs.at[i, "criteria_json"] = crit
    return jobs

# ---------------------------
# Prefiltering & Heuristics
# ---------------------------

INDUSTRY_KEYWORDS = {
    "Cement": ["cement", "kiln", "clinker", "raw mill", "finish mill"],
    "Aggregates": ["aggregate", "quarry", "pit", "crushing", "screening", "drilling", "blasting"],
    "RMX": ["ready-mix", "ready mix", "rmx", "batch plant", "concrete truck"],
    "Lime": ["lime", "kiln", "calcining"],
    "Magnesium": ["magnesia", "magnesium"]
}

def resume_mentions_any(resume_text: str, words: List[str]) -> bool:
    rt = resume_text.lower()
    return any(w.lower() in rt for w in words)

def rough_industry_match(resume_text: str, job_industry: str) -> bool:
    if not job_industry:
        return True
    key = None
    for k in INDUSTRY_KEYWORDS:
        if k.lower() in job_industry.lower():
            key = k; break
    if not key:
        return True
    return resume_mentions_any(resume_text, INDUSTRY_KEYWORDS[key])

def hard_rules_filter(resume_text: str, overview: 'CandidateOverview', job_row: pd.Series) -> Tuple[bool, List[str]]:
    reasons = []
    visa = str(job_row.get("visa") or "").strip().lower()
    if "no visa" in visa or "us citizen" in str(job_row.get("hrNotes") or "").lower():
        if overview.citizenship not in ("US", "US PR"):
            reasons.append("Requires US citizen / no visas")

    criteria = job_row.get("criteria_json") or {}
    deg_req = str(((criteria.get("required_education") or {}).get("degree_level") or "")).lower()
    if any(k in deg_req for k in ["bachelor", "bs", "b.s", "degree required"]):
        if not re.search(r"\b(BS|B\.S\.|Bachelor|Bachelors|BA|B\.A\.)\b", resume_text, re.I):
            reasons.append("Bachelor's degree required (not found in resume text)")

    job_ind = str(job_row.get("industry/Segment") or "")
    if not rough_industry_match(resume_text, job_ind):
        reasons.append(f"Industry mismatch: {job_ind}")

    exp_text = str(((criteria.get("required_experience") or {}).get("total_years_relevant") or ""))
    m = re.search(r"(\d+)\+?\s*years?", exp_text, re.I)
    if m and overview.total_years_experience is not None:
        req = int(m.group(1))
        if overview.total_years_experience < req - 1:
            reasons.append(f"Requires ~{req}+ years; resume shows ~{int(overview.total_years_experience)}")

    hrn = str(job_row.get("hrNotes") or "")
    if re.search(r"\b(no\s+former\s+employees|no\s+rehires|conflict of interest)\b", hrn, re.I):
        comp = str(job_row.get("company") or "")
        if comp and re.search(re.escape(comp), resume_text, re.I):
            reasons.append(f"Prior employment conflict with {comp}")
    return (len(reasons) > 0, reasons)

def heuristic_score(resume_text: str, job_row: pd.Series) -> float:
    base = 0
    pos = str(job_row.get("position") or "")
    sim = fuzz.token_set_ratio(resume_text[:5000].lower(), pos.lower())
    base += 0.5 * sim
    job_ind = str(job_row.get("industry/Segment") or "")
    if rough_industry_match(resume_text, job_ind):
        base += 25
    crit = job_row.get("criteria_json") or {}
    tools = ((crit.get("core_technical_skills") or {}).get("tools_systems_software_machinery") or [])[:8]
    hits = sum(1 for t in tools if t and t.lower() in resume_text.lower())
    base += min(20, 5 * hits)
    return max(0, min(100, base))

# ---------------------------
# LLM Prompting
# ---------------------------

SYSTEM_PROMPT = """You are an expert technical recruiter for heavy industry (cement, aggregates, lime, ready-mix, rotary equipment).
Your task: evaluate candidate resumes against job descriptions and return a **strict, objective** JSON.
Rules:
- NEVER invent facts about the candidate or the job. Only use the provided text.
- Apply **hard disqualifiers** first (education required, minimum years, industry mismatch, citizenship/visa constraints, prior employment conflicts).
- Scoring rubric (0..100):
  * 0 if any hard disqualifier is definitive.
  * 40%: Industry & environment fit (cement, aggregates, mining, RMX, lime, rotary equipment; dusty plant vs. clean env; union vs non-union; field vs office).
  * 30%: Functional fit (skills, certifications, tools: PLCs, VFDs, SAP, ISO9000, MSHA/OSHA, etc.).
  * 20%: Seniority/years alignment (too junior/senior reduces score).
  * 10%: Location/relocation and travel requirements alignment.
- Return only JSON using this schema:
  {
    "jobid": "<jobid>",
    "rating": <0-100 number>,
    "hard_no": <true|false>,
    "disqualifiers": ["..."],
    "reasons": ["..."]
  }
If unsure, be conservative.
"""

def make_user_prompt(resume_text: str, overview: 'CandidateOverview', job_rows: List[Dict[str, Any]]) -> str:
    max_resume_chars = 12000
    rtext = resume_text[:max_resume_chars]
    ov = {
        "name": overview.name,
        "location": overview.location,
        "citizenship": overview.citizenship,
        "total_years_experience": overview.total_years_experience,
        "recent_roles": overview.recent_roles[:4]
    }
    jobs = []
    for row in job_rows:
        jobs.append({
            "jobid": str(row.get("jobid")),
            "company": row.get("company"),
            "position": row.get("position"),
            "industry": row.get("industry/Segment"),
            "city": row.get("city"),
            "state": row.get("state"),
            "country": row.get("country"),
            "salary_min": row.get("salary_min"),
            "salary_max": row.get("salary_max"),
            "bonusPercent": row.get("bonusPercent") or row.get("bonus") or row.get("bonus_raw"),
            "visa": row.get("visa"),
            "hrNotes": (row.get("hrNotes") or "")[:1200],
            "criteria": row.get("criteria_json")
        })
    payload = {"candidate_overview": ov, "resume_text": rtext, "jobs_to_score": jobs}
    return json.dumps(payload, ensure_ascii=False)

def llm_score_batch(client: Optional['LLMBase'], resume_text: str, overview: 'CandidateOverview', jobs_batch: List[Dict[str, Any]]) -> List['CandidateJobScore']:
    if client is None:
        out = []
        for row in jobs_batch:
            jobid = str(row.get("jobid"))
            score = heuristic_score(resume_text, pd.Series(row))
            out.append(CandidateJobScore(jobid=jobid, rating=float(score), hard_no=(score < 20), reasons=["rules-only heuristic"], disqualifiers=[]))
        return out

    user_prompt = make_user_prompt(resume_text, overview, jobs_batch)
    raw = client.score(SYSTEM_PROMPT, user_prompt)
    results: List[Dict[str, Any]] = []
    try:
        js = json.loads(raw)
        if isinstance(js, dict) and "results" in js:
            results = js["results"]
        elif isinstance(js, list):
            results = js
        elif all(k in js for k in ("jobid","rating")):
            results = [js]
        else:
            results = [js]
    except Exception as e:
        print(f"\n--- LLM Response Caused_Error ---")
        print(f"LLM Provider: {client.name}")
        print(f"Raw response:\n{raw}")
        print(f"JSONDecodeError: {e}")
        print("---------------------------------")
        results = [] # Set to empty list to prevent further errors

    out = []
    for item in results:
        try:
            out.append(CandidateJobScore(
                jobid=str(item.get("jobid")),
                rating=float(item.get("rating", 0.0)),
                hard_no=bool(item.get("hard_no", False)),
                disqualifiers=list(item.get("disqualifiers") or []),
                reasons=list(item.get("reasons") or [])
            ))
        except Exception:
            continue
    return out

# ---------------------------
# Pipeline
# ---------------------------

def shortlist_jobs(resume_text: str, overview: 'CandidateOverview', jobs_df: pd.DataFrame, k: int = 24) -> Tuple[pd.DataFrame, Dict[str, List[str]]]:
    disq_map: Dict[str, List[str]] = {}
    scores = []
    for _, row in jobs_df.iterrows():
        disq, reasons = hard_rules_filter(resume_text, overview, row)
        if disq:
            disq_map[row["jobid"]] = reasons
            continue
        s = heuristic_score(resume_text, row)
        scores.append((row["jobid"], s))
    top_ids = set([jid for jid, _ in sorted(scores, key=lambda x: x[1], reverse=True)[:k]])
    shortlisted = jobs_df[jobs_df["jobid"].isin(top_ids)].copy()
    return shortlisted, disq_map

def format_overview_md(overview: 'CandidateOverview') -> str:
    head = []
    if overview.name: head.append(f"**Name:** {overview.name}")
    if overview.location: head.append(f"**Location:** {overview.location}")
    if overview.citizenship: head.append(f"**Citizenship/Work Auth:** {overview.citizenship}")
    if overview.total_years_experience is not None: head.append(f"**Experience:** ~{int(overview.total_years_experience)} years")
    out = "\n".join(head) if head else "_Overview not fully detected from resume text._"
    jobs_md = ["\n**Recent Roles (last 4):**\n", "| Dates | Title | Company | Location |", "|---|---|---|---|"]
    for r in overview.recent_roles[:4]:
        jobs_md.append(f"| {r.get('date_range','')} | {r.get('title','')} | {r.get('company','')} | {r.get('location','')} |")
    if len(jobs_md) == 3:
        jobs_md.append("|  |  |  |  |")
    return out + "\n\n" + "\n".join(jobs_md)

def format_recommendations_md(rows: List[Dict[str, Any]]) -> str:
    md = ["\n**Recommended Jobs (≥ 60%):**\n",
          "| JobID | Company | Position | City | State | Salary | Bonus | Visa | Rating |",
          "|---:|---|---|---|---|---:|---:|---|---:|"]
    for r in rows:
        sal = ""
        if r.get("salary_min") or r.get("salary_max"):
            try:
                sal = f"${int(float(r.get('salary_min') or 0)):,}–${int(float(r.get('salary_max') or 0)):,}"
            except Exception:
                sal = ""
        bonus = str(r.get("bonusPercent") or r.get("bonus_raw") or "")
        visa = str(r.get("visa") or "")
        md.append(f"| {r.get('jobid')} | {r.get('company','')} | {r.get('position','')} | {r.get('city','')} | {r.get('state','')} | {sal} | {bonus} | {visa} | {r.get('rating',0):.0f}% |")
    if len(md) == 3:
        md.append("|  |  |  |  |  |  |  |  |  |")
    return "\n".join(md)

def run_for_resume(resume_path: Path, jobs_df: pd.DataFrame, client: Optional['LLMBase'], output_dir: Path) -> Dict[str, Any]:
    print(f"\nProcessing: {resume_path.name}")
    text = read_resume_text(resume_path)
    if not text or len(text) < 200:
        print("  Warning: Could not extract sufficient text; skipping.")
        return {"resume": resume_path.name, "status": "no_text"}
    overview = extract_overview_from_resume(text)
    shortlisted, disq = shortlist_jobs(text, overview, jobs_df, k=24)
    if shortlisted.empty:
        print("  No jobs passed rule-based screen.")
        rec_dir = output_dir / resume_path.stem
        safe_mkdir(rec_dir)
        (rec_dir / "report.md").write_text("# Candidate Report\n\n" + format_overview_md(overview) + "\n\n_No recommendations._\n", encoding="utf-8")
        return {"resume": resume_path.name, "status": "no_fit"}
    batch_size = 12
    records = []
    for i in range(0, len(shortlisted), batch_size):
        batch_rows = shortlisted.iloc[i:i+batch_size].to_dict("records")
        scored = llm_score_batch(client, text, overview, batch_rows)
        score_map = {s.jobid: s for s in scored}
        for r in batch_rows:
            jid = str(r["jobid"])
            s = score_map.get(jid)
            if s:
                r["rating"] = s.rating
                r["hard_no"] = s.hard_no
                r["llm_disq"] = s.disqualifiers
                r["llm_reasons"] = s.reasons
            else:
                r["rating"] = heuristic_score(text, pd.Series(r))
                r["hard_no"] = False
                r["llm_disq"] = []
                r["llm_reasons"] = ["LLM returned no item; used heuristic"]
            if jid in disq:
                r.setdefault("prefilter_disq", disq[jid])
            records.append(r)
    df = pd.DataFrame(records)
    df["rating"] = pd.to_numeric(df["rating"], errors="coerce").fillna(0.0)
    df = df.sort_values("rating", ascending=False)
    recommended = df[(df["rating"] >= 60.0) & (df["hard_no"] == False)].copy()
    rec_dir = output_dir / resume_path.stem
    safe_mkdir(rec_dir)
    df.to_csv(rec_dir / "matches.csv", index=False, encoding="utf-8")
    top_rows = recommended[["jobid","company","position","city","state","salary_min","salary_max","bonusPercent","bonus_raw","visa","rating"]].to_dict("records")
    md = ["# Candidate Report", format_overview_md(overview), format_recommendations_md(top_rows)]
    excluded = []
    for _, row in df.iterrows():
        if row["rating"] < 60.0 or row["hard_no"]:
            reasons = []
            reasons += row.get("llm_disq", []) or []
            reasons += row.get("prefilter_disq", []) or []
            if reasons:
                excluded.append((row["jobid"], list(dict.fromkeys(reasons))))
    if excluded:
        md.append("\n**Excluded Jobs (selected reasons):**\n")
        for jid, reasons in excluded[:15]:
            md.append(f"- {jid}: " + "; ".join(reasons)[:500])
    (rec_dir / "report.md").write_text("\n\n".join(md) + "\n", encoding="utf-8")
    best = top_rows[:6]
    return {"resume": resume_path.name, "status": "ok", "recommended_count": len(best), "top": best}

# ---------------------------
# Main
# ---------------------------

def main(drive_service: Optional[Any] = None):
    """
    Main execution function. Can be called from another script.
    
    Args:
        drive_service: An optional, pre-authenticated Google Drive service object.
                       If provided, it will be used instead of re-authenticating.
    """
    if drive_service:
        # Monkey-patch the authentication functions to use the provided service
        global get_drive_service_googleapiclient, get_drive_service_pydrive2
        
        # Check the type of the passed service object to decide which one to patch
        # This is a bit heuristic, but should work for pydrive2 and googleapiclient
        if 'GoogleDrive' in str(type(drive_service)):
             get_drive_service_pydrive2 = lambda: drive_service
             get_drive_service_googleapiclient = lambda: None
             print("Using provided PyDrive2 service.")
        else:
             get_drive_service_googleapiclient = lambda: drive_service
             get_drive_service_pydrive2 = lambda: None
             print("Using provided Google API Client service.")

    print("=== AI Resume → JobID Matcher ===")
    default_jobs_json = "https://drive.google.com/drive/u/1/folders/1h_tR64KptPn3UC1t4ytufyUYHOls71du"
    default_tracking_csv = "https://drive.google.com/drive/u/1/folders/1h_tR64KptPn3UC1t4ytufyUYHOls71du"

    jobs_path = prompt_default("Path to jobs JSON", default_jobs_json)
    tracking_path = prompt_default("Path to tracking CSV (optional, ENTER to skip)", default_tracking_csv)

    provider = prompt_default("LLM provider (openai | gemini | grok | none)", "openai")
    default_model = {
        "openai": "gpt-5-mini",
        "gemini": "gemini-1.5-pro",
        "grok": "grok-2-latest",
        "none": ""
    }.get(provider.lower(), "gpt-5-mini")
    model = prompt_default("Model name", default_model)

    client = None
    if provider.lower() != "none":
        try:
            client = make_client(provider, model)
        except Exception as e:
            print(f"Could not init provider '{provider}': {e}\nFalling back to rules-only mode.")
            client = None

    print("\nResume source options:")
    print("  1) Local directory")
    print("  2) Single local file")
    print("  3) Google Drive folder (ID or full link)")
    print("  4) Google Drive file (ID or full link)")
    choice = prompt_default("Choose 1/2/3/4", "1").strip()

    resume_files: List[Path] = []
    temp_dl = Path("tmp_downloads")
    safe_mkdir(temp_dl)

    def fallback_local_prompt() -> List[Path]:
        print("Falling back to local path. Enter a local folder containing resumes (or ENTER for current directory).")
        local_dir = Path(prompt_default("Local directory", str(Path.cwd())))
        found: List[Path] = []
        for suf in ("*.pdf","*.docx","*.txt"):
            found.extend(local_dir.glob(suf))
        return found

    if choice == "1":
        resume_dir_path = prompt_default("Local directory with resumes", str(Path.cwd())).strip('\"')
        resume_dir = Path(resume_dir_path)
        if not resume_dir.exists():
            print(f"Directory not found: {resume_dir}")
            sys.exit(1)
        try:
            for suf in ("*.pdf","*.docx","*.txt"):
                resume_files.extend(resume_dir.glob(suf))
        except PermissionError:
            print(f"\n[Error] Permission denied for directory: {resume_dir}")
            print("Please ensure you have read permissions for this folder, or run this script with elevated privileges.")
            sys.exit(1)

    elif choice == "2":
        file_path = Path(input("Path to a single resume file: ").strip())
        if not file_path.exists():
            print("File not found")
            sys.exit(1)
        resume_files.append(file_path)

    elif choice == "3":
        default_folder_link = "https://drive.google.com/drive/u/1/folders/1MlFM4wTWGMGNEHunm6h2VQHcGUfER__m"
        folder_in = prompt_default("Google Drive FOLDER ID or sharing link", default_folder_link)
        files = download_drive_folder_to(temp_dl, folder_in)
        if not files:
            print("No files fetched from Drive folder.")
            resume_files = fallback_local_prompt()
        else:
            resume_files = files

    elif choice == "4":
        default_file_link = "https://drive.google.com/drive/u/1/folders/1MlFM4wTWGMGNEHunm6h2VQHcGUfER__m" # User can replace with a specific file
        file_in = prompt_default("Google Drive FILE ID or sharing link", default_file_link)
        f = download_drive_file_to(temp_dl, file_in)
        if not f:
            print("No file fetched from Drive.")
            resume_files = fallback_local_prompt()
        else:
            resume_files = [f]
    else:
        print("Invalid choice.")
        sys.exit(1)

    if not resume_files:
        print("No resumes found.")
        sys.exit(0)

    print("\nLoading jobs...")
    jobs_df = load_jobs(jobs_path, tracking_path)
    print(f"Loaded {len(jobs_df)} jobs.")

    out_dir = Path("output")
    safe_mkdir(out_dir)

    summary_rows = []
    for rp in resume_files:
        res = run_for_resume(rp, jobs_df, client, out_dir)
        summary_rows.append({
            "resume": res.get("resume"),
            "status": res.get("status"),
            "recommended_count": res.get("recommended_count", 0)
        })

    pd.DataFrame(summary_rows).to_csv(out_dir / "aggregate_summary.csv", index=False, encoding="utf-8")
    print("\nDone. See 'output/' for reports.")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nInterrupted by user.")
