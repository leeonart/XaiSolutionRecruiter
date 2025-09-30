export interface Resume {
  id: number;
  filename: string;
  content: string;
  
  // Basic Contact Info
  candidate_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  
  // Professional Summary
  current_title?: string;
  current_company?: string;
  years_experience?: number;
  seniority_level?: string;
  
  // Work Authorization (Critical for matching)
  work_authorization?: string;
  citizenship?: string;
  
  // Work Preferences (Critical for matching)
  willing_to_relocate?: boolean;
  willing_to_travel?: boolean;
  remote_work_preference?: string;
  
  // Industry & Function (Critical for matching)
  primary_industry?: string;
  primary_function?: string;
  
  // File Management
  candidate_id?: string;
  version_number: number;
  is_latest_version: boolean;
  content_hash?: string;
  original_file_path?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

