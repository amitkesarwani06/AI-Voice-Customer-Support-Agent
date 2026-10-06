from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
from agent import process_chat, generate_summary

app = FastAPI(title="Aura Skincare AI Voice Agent API")

# Allow CORS for frontend
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    messages: List[Dict[str, Any]]

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        reply = await process_chat(request.messages)
        return {"reply": reply}
    except Exception as e:
        print(f"API Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/summary")
async def summary_endpoint(request: ChatRequest):
    try:
        summary = await generate_summary(request.messages)
        return summary
    except Exception as e:
        print(f"API Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
@app.get("/health")
@app.get("/")
async def health_check():
    return {"status": "ok", "message": "Aura AI Voice Agent Backend is running"}
