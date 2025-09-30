import os
import json
from datetime import datetime
from docx import Document
from PyPDF2 import PdfReader
import openai
import google.generativeai as genai

# --- AI API Integration ---
def get_ai_response(api_choice, model_choice, prompt):
    if api_choice.lower() == "openai":
        try:
            response = openai.chat.completions.create(
                model=model_choice,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Error with OpenAI API: {e}")
            return None
    elif api_choice.lower() == "gemini":
        try:
            model = genai.GenerativeModel(model_choice)
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"Error with Gemini API: {e}")
            return None
    elif api_choice.lower() == "grok" or api_choice.lower() == "other":
        print(f"Integration for {api_choice} is not yet implemented. Please choose OpenAI or Gemini.")
        return None
    else:
        print("Invalid API choice.")
        return None

def process_resume_with_ai(resume_content, api_choice, model_choice):
    print(f"Processing resume with {api_choice} and model {model_choice}")
    prompt = f"""Analyze the following resume content and provide:
    1. A concise overview of the candidate\'s qualifications.
    2. A list of their last 4 relevant job experiences, each with: title, company, dates (start-end), location, and industry.

    Format the output as a JSON object with two keys: \'overview\' (string) and \'jobs\' (list of objects).
    Resume Content:
    {resume_content}
    """
    
    ai_response = get_ai_response(api_choice, model_choice, prompt)
    if ai_response:
        try:
            # Attempt to parse the AI response as JSON
            parsed_response = json.loads(ai_response)
            return parsed_response
        except json.JSONDecodeError:
            print("AI response was not valid JSON. Returning default empty profile.")
            return {"overview": "Could not extract a structured overview from AI response.", "jobs": []}
    return None

def match_resume_to_jobs(resume_content, job_data, api_choice, model_choice):
    print(f"Matching resume to jobs using {api_choice} and model {model_choice}")
    matched_jobs = []

    for job in job_data:
        job_description = json.dumps(job) # Convert job dict to string for AI
        
        # Pre-filtering with AI for hard deal breakers
        pre_filter_prompt = f"""Given the following resume and job description, determine if the candidate meets the absolute minimum requirements (hard deal breakers) for this job. Consider education, specific certifications, mandatory years of experience, citizenship, and previous employment with the company. Respond with \'YES\' if they meet the minimum, \'NO\' otherwise. Provide a brief reason if \'NO\'.
        Resume: {resume_content}
        Job Description: {job_description}
        """
        pre_filter_response = get_ai_response(api_choice, model_choice, pre_filter_prompt)

        if pre_filter_response and "NO" in pre_filter_response.upper():
            print(f"Pre-filtering out Job ID {job.get(\'jobid\')} due to: {pre_filter_response}")
            continue # Skip this job if it fails pre-filter

        # Detailed evaluation with AI
        evaluation_prompt = f"""Given the following resume and job description, evaluate the candidate\'s qualification for the job on a scale of 0-100%. Consider all aspects: education, experience, skills (technical and soft), responsibilities, and any other criteria. Provide only the percentage as a number, followed by a brief explanation of why this rating was given.
        Resume: {resume_content}
        Job Description: {job_description}
        """
        evaluation_response = get_ai_response(api_choice, model_choice, evaluation_prompt)

        if evaluation_response:
            try:
                # Extract rating (assuming AI returns \'XX% Explanation\' or just \'XX\')
                rating_str = evaluation_response.split(\'%\')[0].strip()
                rating = int(rating_str)
                if rating >= 60:
                    matched_jobs.append({
                        "jobid": job.get("jobid"),
                        "company": job.get("company"),
                        "position": job.get("position"),
                        "city": job.get("city"),
                        "state": job.get("state"),
                        "salary": f"{job.get(\'salary\', {}).get(\'min\', \'\')}-{job.get(\'salary\', {}).get(\'max\', \'\')} {job.get(\'salary\', {}).get(\'currency\', \'\')}",
                        "bonus": job.get("bonus"),
                        "visa": job.get("visa"),
                        "rating": rating
                    })
            except ValueError:
                print(f"Could not parse rating from AI response for Job ID {job.get(\'jobid\')}: {evaluation_response}")

    return matched_jobs

def load_job_data(file_path):
    with open(file_path, \'r\') as f:
        data = json.load(f)
    return data[\'jobs\']

def extract_text_from_docx(docx_path):
    doc = Document(docx_path)
    full_text = []
    for para in doc.paragraphs:
        full_text.append(para.text)
    return \'\n\'.join(full_text)

def extract_text_from_pdf(pdf_path):
    # This function is intentionally left as is, but the calling logic will skip PDFs.
    text = ""
    try:
        with open(pdf_path, \'rb\') as file:
            reader = PdfReader(file)
            for page in reader.pages:
                text += page.extract_text() or ""
    except Exception as e:
        print(f"Error reading PDF {pdf_path}: {e}")
        return None
    return text

def get_resume_content(resume_path):
    _, ext = os.path.splitext(resume_path)
    ext = ext.lower()

    if ext == \'.docx\':
        return extract_text_from_docx(resume_path)
    elif ext == \'.pdf\':
        print(f"Skipping PDF file: {os.path.basename(resume_path)} as requested.")
        return None
    elif ext == \'.doc\':
        print(f"Warning: .doc files are not directly supported for text extraction. Please convert {os.path.basename(resume_path)} to .docx or .pdf for better results.")
        return None # Placeholder for .doc handling
    else:
        print(f"Unsupported file type: {ext} for {os.path.basename(resume_path)}")
        return None

def main():
    print("Welcome to the Resume-to-Job Matching Script!")

    # Phase 5: File Handling - Prompt for resume input location
    resume_input_type = input("\\nWhere are your resumes located? (local_file/local_directory/google_drive_directory): ").lower()
    resume_paths = []

    if resume_input_type == \'local_file\':
        file_path = input("Enter the full path to your resume file (e.g., /home/user/resume.pdf): ")
        resume_paths.append(file_path)
    elif resume_input_type == \'local_directory\':
        dir_path = input("Enter the full path to your resume directory (e.g., /home/user/resumes/): ")
        for filename in os.listdir(dir_path):
            if filename.endswith((\'.docx\', \'.doc\')):
                resume_paths.append(os.path.join(dir_path, filename))
            elif filename.endswith(\'.pdf\'):
                print(f"Skipping PDF file: {filename} as requested.")
    elif resume_input_type == \'google_drive_directory\':
        print("Google Drive integration requires additional setup. For this script, please manually download files to a local directory and select \'local_directory\'.")
        return # Exit for now, will implement Google Drive later if needed
    else:
        print("Invalid input type. Please choose \'local_file\', \'local_directory\', or \'google_drive_directory\'.")
        return

    if not resume_paths:
        print("No resumes found. Exiting.")
        return

    # Phase 4: AI Integration - Prompt for API and model
    api_choice = input("\\nWhich AI API would you like to use? (OpenAI/Gemini/Grok/Other): ")
    model_choice = input(f"Which model would you like to use with {api_choice}? (e.g., gpt-4, gemini-pro): ")

    # Load job data - try organized structure first
    data_dir = os.getenv("DATA_DIR", "/app/data")
    output_dir = os.getenv("OUTPUT_DIR", "/app/output")
    
    # Look for most recent jobs file
    job_data_path = None
    if os.path.exists(output_dir):
        for file in os.listdir(output_dir):
            if file.startswith("jobs_") and file.endswith("_optimized.json"):
                job_data_path = os.path.join(output_dir, file)
                break
    
    # Fallback to legacy path
    if not job_data_path:
        job_data_path = '/home/ubuntu/upload/jobs_20250809_optimized.json'
    
    if not os.path.exists(job_data_path):
        print(f"Job data file not found: {job_data_path}")
        return
        
    jobs = load_job_data(job_data_path)

    for resume_path in resume_paths:
        print(f"\\n--- Processing Resume: {os.path.basename(resume_path)} ---")
        resume_content = get_resume_content(resume_path)

        if resume_content:
            # Process resume with AI
            candidate_profile = process_resume_with_ai(resume_content, api_choice, model_choice)

            if candidate_profile:
                # Generate overview
                print("\\nCandidate Overview:")
                print(candidate_profile[\'overview\'])
                print("\\nPrevious Job Experience:")
                for job in candidate_profile[\'jobs\']:
                    print(f"- {job[\'title\']} at {job[\'company\']} ({job[\'dates\']}) in {job[\'location\']} ({job[\'industry\']})")

                # Match resume to jobs
                recommended_jobs = match_resume_to_jobs(resume_content, jobs, api_choice, model_choice)

                # Output recommended jobs
                print("\\nRecommended Job IDs (Rating >= 60%):")
                if recommended_jobs:
                    for job in recommended_jobs:
                        print(f"Job ID: {job[\'jobid\']}, Company: {job[\'company\']}, Position: {job[\'position\']}, Location: {job[\'city\']}, {job[\'state\']}, Salary: {job[\'salary\']}, Bonus: {job[\'bonus\']}, Visa: {job[\'visa\']}, Rating: {job[\'rating\']}% ")
                else:
                    print("No suitable jobs found for this resume.")
            else:
                print(f"Could not process resume {os.path.basename(resume_path)} with AI. Skipping.")
        else:
            print(f"Skipping {os.path.basename(resume_path)} due to content extraction issues.")

if __name__ == "__main__":
    main()


