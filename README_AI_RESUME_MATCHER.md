# AI Resume-to-Job Matching

A powerful AI-driven system for analyzing resume files against job listings to identify suitable matches based on a 100-point scoring methodology.

## Overview

The AI Resume-to-Job Matching system uses the selected AI agent to perform a comprehensive analysis of resumes against job listings. It provides detailed match scores, justifications, strengths, weaknesses, and recommendations for each candidate.

Key features:

- **AI-Driven Analysis**: Uses the AI agent selected in option 8 to analyze resumes against job listings
- **Multiple Resume Formats**: Supports PDF, DOCX, and TXT resume files
- **Comprehensive Scoring**: Evaluates matches on a 100-point scale across multiple dimensions:
  - Skills & Experience (60 points)
  - Role & Industry Alignment (25 points)
  - Education (10 points)
  - Location & Other Factors (5 points)
- **Critical Education Matching**: Enforces education requirements with experience substitution logic
- **Detailed Justifications**: Provides clear explanations for each match, including specific job IDs
- **Batch Processing**: Process multiple resumes at once

## Usage

### From the Main Menu

1. Select option 11 from the main menu: "AI Resume-to-Job Matching"
2. Follow the prompts to:
   - Confirm the automatically detected jobs_optimized.json file or enter a custom path
   - Specify the resume file or directory containing multiple resumes
   - Set the output directory

The system will use the AI agent selected in option 8 to analyze each resume against all job listings and generate detailed reports.

### Input Files

#### Resume Files

The system supports the following resume file formats:
- PDF (.pdf)
- Microsoft Word (.docx, .doc)
- Plain Text (.txt)

#### Jobs File

The system uses the jobs_optimized.json file created by option 7 or the jobs_optimized_with_mtb.json file created by option 9. The file should contain a list of job objects with the following structure:

```json
[
  {
    "jobId": "JOB123",
    "jobTitle": "Senior Software Engineer",
    "clientName": "Tech Company Inc.",
    "location": "San Francisco, CA",
    "matchCriteria": {
      "education": {
        "degreeLevel": "Bachelor's",
        "fieldOfStudy": ["Computer Science", "Software Engineering"]
      },
      "skills": {
        "required": ["Python", "JavaScript", "AWS"],
        "preferred": ["React", "Docker", "Kubernetes"]
      },
      "experience": {
        "years": 5,
        "responsibilities": [
          "Develop scalable web applications",
          "Design and implement APIs",
          "Lead technical projects"
        ]
      },
      "industry": "Technology",
      "function": "Engineering",
      "certifications": ["AWS Certified Developer"],
      "visaSponsorship": false
    }
  }
]
```

### Output

The system generates detailed match reports in Markdown format. The reports include:

- Candidate profile information
- Ranked job matches with scores, clearly listing the JobID for each match
- Detailed justifications for each match
- Strengths and weaknesses for each match
- Recommendations for the candidate

The system will always include the specific JobID for each job match, making it easy to identify which jobs from the provided listings are the best matches for the candidate.

## AI Agent Selection

The system uses the AI agent selected in option 8 of the main application. This ensures consistency in AI capabilities across the entire application. The supported AI agents are:

1. Grok
2. Gemini
3. Deepseek
4. OpenAI
5. Qwen

To change the AI agent, use option 8 in the main menu before running the AI Resume-to-Job Matching.

## Comparison with Option 10

Option 10 "Resume-to-Job Matching Analysis" uses a rule-based approach with optional AI enhancement, while Option 11 "AI Resume-to-Job Matching" uses a fully AI-driven approach.

| Feature | Option 10 | Option 11 |
|---------|-----------|-----------|
| Approach | Rule-based with optional AI enhancement | Fully AI-driven |
| Scoring | Fixed rules with 100-point scale | AI judgment with 100-point scale |
| Output Formats | Markdown, JSON, Text | Markdown only |
| Filtering Options | Min score, top N, qualified only | None (AI handles relevance) |
| Processing Speed | Faster | Slower (depends on AI response time) |
| Analysis Depth | Good | Excellent (more nuanced) |

Choose Option 10 for faster, more consistent results with customizable filtering, or Option 11 for deeper, more nuanced analysis with better handling of edge cases.

## Troubleshooting

If you encounter any issues:

1. **Missing jobs_optimized.json file**: Run option 7 or 9 to create the file, or specify a custom file path
2. **AI agent not working**: Ensure you have selected an AI agent in option 8 and provided the necessary API key
3. **Resume parsing issues**: Ensure your resume files are in a supported format (PDF, DOCX, TXT) and are properly formatted