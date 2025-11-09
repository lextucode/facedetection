from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Query, Depends, Header
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import json
import csv
import io
import base64
import numpy as np
from PIL import Image
import cv2
from deepface import DeepFace
from passlib.context import CryptContext
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class MoodEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    mood: str  # happy, sad, angry, anxious, neutral
    note: Optional[str] = None
    detection_method: str = "manual"  # manual or camera
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MoodEntryCreate(BaseModel):
    mood: str
    note: Optional[str] = None
    detection_method: str = "manual"

class EmotionDetectionResponse(BaseModel):
    emotion: str
    confidence: float
    all_emotions: dict

# Emotion mapping from DeepFace to our mood categories
EMOTION_MAP = {
    "happy": "happy",
    "sad": "sad",
    "angry": "angry",
    "fear": "anxious",
    "surprise": "neutral",
    "disgust": "angry",
    "neutral": "neutral"
}

@api_router.get("/")
async def root():
    return {"message": "Mood Tracker API"}

@api_router.post("/moods", response_model=MoodEntry)
async def create_mood_entry(input: MoodEntryCreate):
    """Create a new mood entry"""
    mood_obj = MoodEntry(**input.model_dump())
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = mood_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.mood_entries.insert_one(doc)
    return mood_obj

@api_router.post("/moods/detect", response_model=EmotionDetectionResponse)
async def detect_emotion(file: UploadFile = File(...)):
    """Detect emotion from uploaded image using DeepFace"""
    try:
        # Read image file
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        # Analyze emotion using DeepFace
        result = DeepFace.analyze(
            img_path=img,
            actions=['emotion'],
            enforce_detection=False,
            detector_backend='opencv'
        )
        
        # Extract emotion data
        if isinstance(result, list):
            result = result[0]
        
        emotions = result['emotion']
        dominant_emotion = result['dominant_emotion']
        
        # Map to our mood categories
        mapped_emotion = EMOTION_MAP.get(dominant_emotion.lower(), "neutral")
        confidence = float(emotions.get(dominant_emotion, 0))
        
        # Convert numpy types to Python native types for JSON serialization
        all_emotions_converted = {k: float(v) for k, v in emotions.items()}
        
        return EmotionDetectionResponse(
            emotion=mapped_emotion,
            confidence=confidence,
            all_emotions=all_emotions_converted
        )
    
    except Exception as e:
        logging.error(f"Error detecting emotion: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error detecting emotion: {str(e)}")

@api_router.get("/moods", response_model=List[MoodEntry])
async def get_mood_entries(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    """Get all mood entries with optional date filtering"""
    query = {}
    
    if start_date or end_date:
        query['timestamp'] = {}
        if start_date:
            query['timestamp']['$gte'] = start_date
        if end_date:
            query['timestamp']['$lte'] = end_date
    
    mood_entries = await db.mood_entries.find(query, {"_id": 0}).sort("timestamp", -1).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for entry in mood_entries:
        if isinstance(entry['timestamp'], str):
            entry['timestamp'] = datetime.fromisoformat(entry['timestamp'])
    
    return mood_entries

@api_router.get("/moods/stats")
async def get_mood_stats():
    """Get mood statistics for charts"""
    mood_entries = await db.mood_entries.find({}, {"_id": 0}).to_list(1000)
    
    # Count by mood
    mood_counts = {"happy": 0, "sad": 0, "angry": 0, "anxious": 0, "neutral": 0}
    timeline_data = []
    
    for entry in mood_entries:
        mood = entry.get('mood', 'neutral')
        mood_counts[mood] = mood_counts.get(mood, 0) + 1
        
        # Prepare timeline data
        timestamp = entry.get('timestamp')
        if isinstance(timestamp, str):
            timestamp = datetime.fromisoformat(timestamp)
        
        timeline_data.append({
            "date": timestamp.strftime("%Y-%m-%d"),
            "mood": mood,
            "timestamp": timestamp.isoformat()
        })
    
    return {
        "mood_counts": mood_counts,
        "timeline": sorted(timeline_data, key=lambda x: x['timestamp'])
    }

@api_router.get("/moods/export")
async def export_moods(format: str = Query("csv", regex="^(csv|json)$")):
    """Export mood data as CSV or JSON"""
    mood_entries = await db.mood_entries.find({}, {"_id": 0}).sort("timestamp", -1).to_list(1000)
    
    # Convert timestamps to string format
    for entry in mood_entries:
        if isinstance(entry['timestamp'], str):
            entry['timestamp'] = entry['timestamp']
        else:
            entry['timestamp'] = entry['timestamp'].isoformat()
    
    if format == "json":
        json_str = json.dumps(mood_entries, indent=2)
        return StreamingResponse(
            io.BytesIO(json_str.encode()),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=mood_export_{datetime.now().strftime('%Y%m%d')}.json"}
        )
    
    else:  # CSV
        output = io.StringIO()
        if mood_entries:
            fieldnames = ['id', 'mood', 'note', 'detection_method', 'timestamp']
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            for entry in mood_entries:
                writer.writerow({
                    'id': entry.get('id', ''),
                    'mood': entry.get('mood', ''),
                    'note': entry.get('note', ''),
                    'detection_method': entry.get('detection_method', ''),
                    'timestamp': entry.get('timestamp', '')
                })
        
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=mood_export_{datetime.now().strftime('%Y%m%d')}.csv"}
        )

@api_router.delete("/moods/{mood_id}")
async def delete_mood_entry(mood_id: str):
    """Delete a mood entry"""
    result = await db.mood_entries.delete_one({"id": mood_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Mood entry not found")
    
    return {"message": "Mood entry deleted successfully"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()