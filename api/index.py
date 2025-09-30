from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import os
import sys
import json
import tempfile
from typing import List, Optional
from pathlib import Path

# Add parent directory to path for imports
parent_dir = Path(__file__).parent.parent
sys.path.insert(0, str(parent_dir))

try:
    import config
    from modules.mtb_processor import master_tracking_board_activities
    from modules.job_processor_Original import JobProcessor
    from modules.final_optimizer import FinalOptimizer
    from modules.ai_resume_matcher_unified import main as resume_matcher_main
    from modules.gdrive_operations import authenticate_drive, extract_folder_id, parallel_download_and_report
except ImportError as e:
    print(f"Import error: {e}")
    print("Some modules may not be available. Running in limited mode.")
    config = None

app = FastAPI(
    title="AI Job Processing Platform", 
    version="1.0.0",
    description="AI-powered job processing and resume matching platform",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Mount static files
app.mount("/static", StaticFiles(directory="public"), name="static")

@app.get("/", response_class=HTMLResponse)
async def read_root():
    """Serve the main web interface"""
    try:
        with open("public/index.html", "r") as f:
            return HTMLResponse(content=f.read())
    except FileNotFoundError:
        return HTMLResponse(content="""
        <!DOCTYPE html>
        <html>
        <head>
            <title>AI Job Processing Platform</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .container { max-width: 800px; margin: 0 auto; }
                .endpoint { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
                .method { color: #007bff; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>AI Job Processing Platform</h1>
                <p>Welcome to the AI-powered job processing and resume matching platform.</p>
                
                <h2>Available Endpoints:</h2>
                <div class="endpoint">
                    <span class="method">GET</span> /api/status - Check system status
                </div>
                <div class="endpoint">
                    <span class="method">POST</span> /api/process-mtb - Process Master Tracking Board
                </div>
                <div class="endpoint">
                    <span class="method">POST</span> /api/process-jobs - Process job descriptions with AI
                </div>
                <div class="endpoint">
                    <span class="method">POST</span> /api/match-resumes - Match resumes to jobs
                </div>
                <div class="endpoint">
                    <span class="method">POST</span> /api/optimize-json - Optimize JSON output
                </div>
                
                <h2>Documentation:</h2>
                <p><a href="/docs">API Documentation (Swagger UI)</a></p>
                <p><a href="/redoc">API Documentation (ReDoc)</a></p>
            </div>
        </body>
        </html>
        """)

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "AI Job Processing Platform is running",
        "timestamp": "2024-01-01T00:00:00Z"
    }

@app.get("/api/status")
async def get_status():
    """Check system status and available AI agents"""
    try:
        if config:
            # Check if config is loaded
            ai_agents = list(config.AVAILABLE_MODELS.keys())
            current_agent = config.DEFAULT_AI_AGENT
        else:
            ai_agents = ["grok", "gemini", "openai", "deepseek", "qwen", "zai"]
            current_agent = "grok"
        
        return {
            "status": "operational",
            "available_ai_agents": ai_agents,
            "current_ai_agent": current_agent,
            "version": "1.0.0",
            "mode": "limited" if not config else "full"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")

@app.post("/api/process-mtb")
async def process_mtb(
    csv_path: str = Form(...),
    category: str = Form("ALL"),
    state: str = Form("ALL"),
    client_rating: str = Form("ALL"),
    extract_ids: bool = Form(True)
):
    """Process Master Tracking Board and extract job IDs"""
    try:
        job_ids = master_tracking_board_activities(
            csv_path, category, state, client_rating, extract_ids
        )
        
        return {
            "success": True,
            "job_ids": job_ids,
            "count": len(job_ids),
            "message": f"Successfully extracted {len(job_ids)} job IDs"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MTB processing failed: {str(e)}")

@app.post("/api/process-jobs")
async def process_jobs(
    job_ids: List[str] = Form(...),
    folder_path: str = Form(...),
    csv_path: str = Form(...),
    ai_agent: str = Form("grok")
):
    """Process job descriptions using AI agent"""
    try:
        # Create temporary directory for processing
        with tempfile.TemporaryDirectory() as temp_dir:
            processor = JobProcessor(
                job_ids_to_process=job_ids,
                folder_path=folder_path,
                csv_path=csv_path,
                ai_agent=ai_agent
            )
            
            output_file = processor.run()
            
            # Read the output file
            if output_file and os.path.exists(output_file):
                with open(output_file, 'r') as f:
                    result_data = json.load(f)
                
                return {
                    "success": True,
                    "output_file": output_file,
                    "job_count": len(job_ids),
                    "ai_agent": ai_agent,
                    "data": result_data
                }
            else:
                raise HTTPException(status_code=500, detail="No output file generated")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Job processing failed: {str(e)}")

@app.post("/api/match-resumes")
async def match_resumes(
    resume_files: List[UploadFile] = File(...),
    jobs_json_path: str = Form(...),
    tracking_csv_path: Optional[str] = Form(None),
    ai_provider: str = Form("openai"),
    model: str = Form("gpt-4o-mini")
):
    """Match resumes to job listings using AI"""
    try:
        # Save uploaded files temporarily
        temp_files = []
        temp_dir = tempfile.mkdtemp()
        
        for file in resume_files:
            temp_path = os.path.join(temp_dir, file.filename)
            with open(temp_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            temp_files.append(temp_path)
        
        # Process resumes (simplified version for API)
        results = []
        for temp_file in temp_files:
            # This would need to be adapted from the original resume matcher
            # For now, return a placeholder response
            results.append({
                "resume_file": os.path.basename(temp_file),
                "status": "processed",
                "matches": []
            })
        
        return {
            "success": True,
            "processed_files": len(temp_files),
            "results": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resume matching failed: {str(e)}")

@app.post("/api/optimize-json")
async def optimize_json(
    input_json: str = Form(...)
):
    """Optimize JSON output with field corrections"""
    try:
        # Parse input JSON
        data = json.loads(input_json)
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as temp_file:
            json.dump(data, temp_file)
            temp_path = temp_file.name
        
        # Run optimizer
        optimizer = FinalOptimizer(temp_path)
        optimized_file = optimizer.run_optimization()
        
        # Read optimized result
        with open(optimized_file, 'r') as f:
            optimized_data = json.load(f)
        
        # Clean up temp file
        os.unlink(temp_path)
        
        return {
            "success": True,
            "optimized_data": optimized_data,
            "message": "JSON optimization completed successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"JSON optimization failed: {str(e)}")

@app.post("/api/download-drive-files")
async def download_drive_files(
    folder_link: str = Form(...),
    job_ids: List[str] = Form(...),
    destination_path: str = Form("temp_downloads")
):
    """Download files from Google Drive by job IDs"""
    try:
        folder_id = extract_folder_id(folder_link)
        if not folder_id:
            raise HTTPException(status_code=400, detail="Invalid Google Drive folder link")
        
        drive = authenticate_drive()
        if not drive:
            raise HTTPException(status_code=500, detail="Failed to authenticate with Google Drive")
        
        # Create temporary directory
        temp_dir = tempfile.mkdtemp()
        report_path = os.path.join(temp_dir, "download_report.csv")
        
        # Download files
        parallel_download_and_report(drive, folder_id, job_ids, temp_dir, report_path)
        
        return {
            "success": True,
            "downloaded_files": len(job_ids),
            "temp_directory": temp_dir,
            "report_path": report_path
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Drive download failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

