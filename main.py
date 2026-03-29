import os
import shutil
import random
from fastapi import FastAPI, UploadFile, File, Form, Depends
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import models
from database import engine, get_db

# Create DB tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Pothole Management System API")

# Ensure directories exist
os.makedirs("uploads", exist_ok=True)
frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
os.makedirs(frontend_path, exist_ok=True)

# API Endpoints
@app.post("/api/reports")
async def create_report(
    latitude: float = Form(...),
    longitude: float = Form(...),
    image: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    image_path = None
    if image:
        image_path = f"uploads/{image.filename}"
        with open(image_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
            
    # Mock ML Inference for severity
    severities = ["Low", "Medium", "High"]
    severity = random.choice(severities)
    
    report = models.Report(
        latitude=latitude,
        longitude=longitude,
        severity_level=severity,
        image_path=image_path
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    
    return {"message": "Report created successfully", "report": report}

@app.get("/api/reports")
def get_reports(db: Session = Depends(get_db)):
    reports = db.query(models.Report).all()
    return reports

# Mount file serving
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/static", StaticFiles(directory=frontend_path), name="static")

@app.get("/")
def read_root():
    index_path = os.path.join(frontend_path, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Frontend not found."}
