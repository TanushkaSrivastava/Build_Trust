from dotenv import load_dotenv
import os
import json
import time
import sys
import urllib.parse
from collections import defaultdict
from typing import List, Optional

# CRUCIAL: Load .env before any other imports
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path)

from fastapi import FastAPI, Depends, HTTPException, Request, BackgroundTasks, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.services.dataverse_service import dataverse_service
from app.services.ai.groq_service import ai_service # Switched from OpenRouter
from app.services.auth_service import auth_service, get_current_user
from app.services.user_db import user_db
from app.schemas import (
    LeadCreate, JobCreate, ChatMessageCreate, 
    OtpRequest, OtpVerify, CheckEmailRequest, 
    LoginPasswordRequest, RegisterRequest
)

app = FastAPI(title="Build_Trust CRM API")

# Rate Limiting
ai_rate_limits = defaultdict(list)
RATE_LIMIT_MAX_REQUESTS = 15  
RATE_LIMIT_WINDOW_SECONDS = 3600

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def log(msg):
    print(f"DEBUG: {msg}")
    sys.stdout.flush()

# Global Mock Data
MOCK_WORKERS = [
    {"id": "rajesh-kumar", "name": "Rajesh Kumar", "specialty": "Masonry", "rate": 450, "rating": 4.9, "verified": True, "image": "/assets/images/worker_rajesh_kumar.png"},
    {"id": "manish-sharma", "name": "Manish Sharma", "specialty": "Electrical", "rate": 350, "rating": 4.8, "verified": True, "image": "/assets/images/worker_marcus_thorne.png"},
    {"id": "sunita-rao", "name": "Sunita Rao", "specialty": "Painting", "rate": 280, "rating": 4.8, "verified": True, "image": "/assets/images/worker_sarah_jenkins.png"}
]

# --- EXTREME ADMIN BYPASS MIDDLEWARE ---
@app.middleware("http")
async def admin_bypass_middleware(request: Request, call_next):
    log(f"🌐 [{request.method}] {request.url.path}")
    
    if request.url.path == "/api/auth/login-password" and request.method == "POST":
        try:
            body = await request.json()
            email = body.get("email", "").lower().strip()
            password = body.get("password", "")
            if email == "admin@buildtrust.com" and password == "1234@":
                log("🚨 MIDDLEWARE: Admin bypass triggered!")
                token = auth_service.create_access_token(email)
                response = JSONResponse(content={"status": "success", "token": token, "user": {"email": email, "role": "admin", "name": "Vikram Singh"}})
                # Manually add CORS headers since we are bypassing the middleware chain
                response.headers["Access-Control-Allow-Origin"] = "*"
                response.headers["Access-Control-Allow-Methods"] = "*"
                response.headers["Access-Control-Allow-Headers"] = "*"
                return response
        except Exception: pass
            
    response = await call_next(request)
    return response

@app.on_event("startup")
async def startup_diagnostics():
    log("🚀 BUILD_TRUST BACKEND ONLINE (PORT 8005)")

# --- SECURITY DEPENDENCIES ---

def role_required(allowed_roles: List[str]):
    async def dependency(user: dict = Depends(get_current_user)):
        if user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=403, 
                detail=f"Access denied. Role '{user.get('role')}' is not authorized."
            )
        return user
    return dependency

# --- AUTHENTICATION ---

@app.post("/api/auth/check-email")
async def check_email(request: CheckEmailRequest):
    email = request.email.lower().strip()
    if email == "admin@buildtrust.com": return {"exists": True, "role": "admin"}
    
    local_user = user_db.get_user(email)
    if local_user: return {"exists": True, "role": local_user.get("role", "customer")}
    
    if dataverse_service.configured:
        try:
            # Check specialist table
            spec_data = await dataverse_service.get_data(f"cr034_specialists?$filter=cr034_email eq '{email}'")
            if spec_data.get("value"): return {"exists": True, "role": "specialist"}
        except Exception: pass
    
    return {"exists": False}

@app.post("/api/auth/login-password")
async def login_password(request: LoginPasswordRequest):
    email = request.email.lower().strip()
    
    # 1. Check Local DB (Shadow Cache for Offline Resilience)
    local_user = user_db.get_user(email)
    if local_user:
        if auth_service.verify_password(request.password, local_user.get("password_hash")):
            role = local_user.get("role", "customer")
            token = auth_service.create_access_token(email, role)
            return {"status": "success", "token": token, "user": {"email": email, "role": role, "name": local_user.get("name")}}
        raise HTTPException(status_code=401, detail="Invalid password")
    
    # 2. Check Dataverse (For specialists or remote users)
    if dataverse_service.configured:
        try:
            data = await dataverse_service.get_data(f"cr034_specialists?$filter=cr034_email eq '{email}'")
            users = data.get("value", [])
            if users:
                user = users[0]
                if auth_service.verify_password(request.password, user.get("cr034_password", "")):
                    role = "specialist"
                    token = auth_service.create_access_token(email, role)
                    return {"status": "success", "token": token, "user": {"email": email, "role": role, "name": user.get("cr034_name")}}
        except Exception: pass
        
    raise HTTPException(status_code=401, detail="User not found or credentials invalid")

@app.post("/api/auth/register")
async def register_user(request: RegisterRequest):
    email = request.email.lower().strip()
    
    # Unified Duplicate Check
    local_user = user_db.get_user(email)
    if local_user:
        raise HTTPException(status_code=400, detail="Account already exists with this email. Please login instead.")
    
    if dataverse_service.configured:
        try:
            spec_check = await dataverse_service.get_data(f"cr034_specialists?$filter=cr034_email eq '{email}'")
            if spec_check.get("value"):
                raise HTTPException(status_code=400, detail="Account already exists as a specialist. Please login instead.")
        except Exception: pass

    hashed_pwd = auth_service.get_password_hash(request.password)
    user_db.create_user(email, hashed_pwd, request.role, request.fullName)
    
    if dataverse_service.configured and request.role == "specialist":
        try:
            payload = {
                "cr034_name": request.fullName, 
                "cr034_email": email, 
                "cr034_password": hashed_pwd, 
                "cr034_specialty": request.specialty or "General", 
                "cr034_hourlyrate": request.rate or 300
            }
            await dataverse_service.post_data("cr034_specialists", payload)
        except Exception: pass

    token = auth_service.create_access_token(email, request.role)
    return {"status": "success", "token": token, "user": {"email": email, "role": request.role, "name": request.fullName}}

# --- ADMIN API (PROTECTED) ---

@app.get("/api/admin/stats")
async def get_admin_stats(user: dict = Depends(role_required(["admin"]))):
    if not dataverse_service.configured: return {"activeJobs": 124, "pendingLeads": 42, "completionRate": 80}
    try:
        jobs = await dataverse_service.get_data("cr034_jobses?$count=true&$top=1")
        leads = await dataverse_service.get_data("cr034_leadses?$count=true&$top=1")
        return {"activeJobs": jobs.get("@odata.count", 0), "pendingLeads": leads.get("@odata.count", 0), "completionRate": 88}
    except Exception: return {"activeJobs": 0, "pendingLeads": 0}

@app.get("/api/admin/live-ops")
async def get_live_ops(user: dict = Depends(role_required(["admin"]))):
    if not dataverse_service.configured: return []
    try:
        data = await dataverse_service.get_data("cr034_auditlogses?$top=10&$orderby=createdon desc")
        return [{
            "id": e.get("cr034_auditlogid"), "text": e.get("cr034_eventtext"), "time": "Just now", 
            "type": e.get("cr034_eventtype"), "icon": e.get("cr034_eventicon"), "color": e.get("cr034_eventcolor")
        } for e in data.get("value", [])]
    except Exception: return []

# --- CORE API ---

@app.post("/api/jobs")
async def create_job(job: JobCreate, user: dict = Depends(get_current_user)):
    # Standard booking endpoint
    if not dataverse_service.configured: return {"status": "success", "message": "Booked (Mock Mode)"}
    try:
        # In a real app, we'd save to Dataverse here
        return {"status": "success"}
    except Exception: raise HTTPException(status_code=500)

@app.get("/api/chat/{worker_id}")
async def get_chat_history(worker_id: str, user: dict = Depends(get_current_user)):
    if not dataverse_service.configured: return []
    try:
        customer_email = user['sub']
        endpoint = f"cr034_messageses?$filter=cr034_workerid eq '{worker_id}' and cr034_customerid eq '{customer_email}'&$orderby=createdon asc"
        data = await dataverse_service.get_data(endpoint)
        return [{
            "sender": m.get("cr034_sender"),
            "text": m.get("cr034_content"),
            "time": "Just now"
        } for m in data.get("value", [])]
    except Exception: return []

@app.post("/api/ai/agent")
async def ai_agent_chat(request: Request, payload: dict):
    # RATE LIMITING
    client_ip = request.client.host
    now = time.time()
    ai_rate_limits[client_ip] = [t for t in ai_rate_limits[client_ip] if now - t < RATE_LIMIT_WINDOW_SECONDS]
    if len(ai_rate_limits[client_ip]) >= RATE_LIMIT_MAX_REQUESTS:
        return {"status": "QUESTION", "message": "AI is busy. Please browse specialists manually.", "chips": ["Browse Specialists"]}
    ai_rate_limits[client_ip].append(now)

    history = payload.get("messages", [])
    
    system_content = """
    You are the Build_Trust Premium Project Manager. Your mission is to scope construction projects.
    STRICT PROTOCOL:
    1. Collect Project Size (e.g. sq ft), Material Quality, and Work Type.
    2. Ask ONE technical question at a time.
    3. Provide 3-4 specific reply options (chips).
    4. MUST respond in JSON format ONLY.
    
    If you have enough info, return:
    { "status": "READY", "trade": "Plumber", "summary": "Full summary...", "estimated_cost_inr": 5000 }
    Else return:
    { "status": "QUESTION", "message": "Technical question?", "chips": ["Opt 1", "Opt 2"] }
    """
    
    clean_history = [m for m in history if m.get('role') != 'system']
    clean_history.insert(0, {"role": "system", "content": system_content})
    
    try:
        log("Calling AI brain...")
        ai_raw = await ai_service.get_chat_response(clean_history)
        log(f"AI Raw: {ai_raw[:100]}...")
        
        import re
        match = re.search(r'\{.*\}', ai_raw, re.DOTALL | re.MULTILINE)
        if not match: raise ValueError("NO_JSON")
        
        data = json.loads(match.group())
        log(f"Parsed Status: {data.get('status')}")

        if data.get("status") == "READY":
            trade = data.get("trade", "General")
            specialists = []
            if dataverse_service.configured:
                try:
                    dv_data = await dataverse_service.get_data(f"cr034_specialists?$filter=cr034_specialty eq '{urllib.parse.quote(trade)}'&$top=3")
                    for w in dv_data.get("value", []):
                        specialists.append({"id": w.get("cr034_specialistid"), "name": w.get("cr034_name"), "specialty": trade, "rate": w.get("cr034_hourlyrate") or 450, "rating": w.get("cr034_rating") or 4.8})
                except: pass
            if not specialists: specialists = MOCK_WORKERS
            return {"status": "READY", "message": data.get("summary"), "estimate": {"trade": trade, "estimated_cost_inr": data.get("estimated_cost_inr")}, "specialists": specialists}
        
        return {"status": "QUESTION", "message": data.get("message", "More details?"), "chips": data.get("chips", ["Repair", "New Installation"])}

    except Exception as e:
        log(f"AI ERROR: {e}")
        if "RATE_LIMIT" in str(e): return {"status": "QUESTION", "message": "Brain overload! Wait 30s.", "chips": ["Try again"]}
        return {"status": "QUESTION", "message": "Tell me about the project area size?", "chips": ["Small room", "Full House", "Commercial"]}

@app.get("/")
async def root():
    return {"message": "Build_Trust API is LIVE", "port": 8005}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)
