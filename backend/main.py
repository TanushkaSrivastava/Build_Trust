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
                return JSONResponse(content={"status": "success", "token": token, "user": {"email": email, "role": "admin", "name": "Vikram Singh"}})
        except Exception: pass
            
    response = await call_next(request)
    return response

@app.on_event("startup")
async def startup_diagnostics():
    log("🚀 BUILD_TRUST BACKEND ONLINE (PORT 8005)")

# --- AUTHENTICATION ---

@app.post("/api/auth/check-email")
async def check_email(request: CheckEmailRequest):
    email = request.email.lower().strip()
    if email == "admin@buildtrust.com": return {"exists": True, "role": "admin"}
    local_user = user_db.get_user(email)
    if local_user: return {"exists": True, "role": local_user.get("role", "customer")}
    if not dataverse_service.configured: return {"exists": False}
    try:
        spec_data = await dataverse_service.get_data(f"cr034_specialists?$filter=cr034_email eq '{email}'")
        if spec_data.get("value"): return {"exists": True, "role": "specialist"}
    except Exception: pass
    return {"exists": False}

@app.post("/api/auth/login-password")
async def login_password(request: LoginPasswordRequest):
    email = request.email.lower().strip()
    local_user = user_db.get_user(email)
    if local_user:
        if auth_service.verify_password(request.password, local_user.get("password_hash")):
            token = auth_service.create_access_token(email)
            return {"status": "success", "token": token, "user": {"email": email, "role": local_user.get("role"), "name": local_user.get("name")}}
        raise HTTPException(status_code=401, detail="Invalid password")
    
    if not dataverse_service.configured: raise HTTPException(status_code=401, detail="User not found")
    try:
        data = await dataverse_service.get_data(f"cr034_specialists?$filter=cr034_email eq '{email}'")
        users = data.get("value", [])
        if users:
            user = users[0]
            if auth_service.verify_password(request.password, user.get("cr034_password", "")):
                token = auth_service.create_access_token(email)
                return {"status": "success", "token": token, "user": {"email": email, "role": "specialist", "name": user.get("cr034_name")}}
    except Exception: pass
    raise HTTPException(status_code=401, detail="Authentication failed")

@app.post("/api/auth/register")
async def register_user(request: RegisterRequest):
    email = request.email.lower().strip()
    hashed_pwd = auth_service.get_password_hash(request.password)
    user_db.create_user(email, hashed_pwd, request.role, request.fullName)
    if dataverse_service.configured:
        try:
            payload = {"cr034_name": request.fullName, "cr034_email": email, "cr034_password": hashed_pwd, "cr034_specialty": request.specialty or "General", "cr034_hourlyrate": request.rate or 300}
            await dataverse_service.post_data("cr034_specialists", payload)
        except Exception: pass
    token = auth_service.create_access_token(email)
    return {"status": "success", "token": token, "user": {"email": email, "role": request.role, "name": request.fullName}}

@app.post("/api/auth/send-otp")
async def send_otp(request: OtpRequest):
    email = request.email.lower().strip()
    if email == "admin@buildtrust.com": return {"status": "error", "message": "Use password."}
    try:
        await auth_service.generate_otp(email)
        return {"status": "success"}
    except Exception: return {"status": "error"}

@app.post("/api/auth/verify-otp")
async def verify_otp(request: OtpVerify):
    success, result = await auth_service.verify_otp(request.email, request.code)
    if not success: return {"status": "error", "message": result}
    return {"status": "success", "token": result, "user": {"email": request.email}}

# --- CORE API ---

@app.get("/api/workers")
async def get_workers(category: str = "All", text: str = "", limit: int = 20):
    if not dataverse_service.configured:
        filtered = MOCK_WORKERS
        if category != "All": filtered = [w for w in filtered if w.get("specialty") == category]
        return filtered[0:limit]
    try:
        filters = []
        if category != "All": filters.append(f"cr034_specialty eq '{urllib.parse.quote(category)}'")
        if text:
            s = urllib.parse.quote(text.replace("'", "''"))
            filters.append(f"(contains(cr034_name, '{s}') or contains(cr034_specialty, '{s}'))")
        endpoint = f"cr034_specialists?$top={limit}"
        if filters: endpoint += f"&$filter={' and '.join(filters)}"
        data = await dataverse_service.get_data(endpoint)
        return [{
            "id": w.get("cr034_specialistid"), "name": w.get("cr034_name"), "specialty": w.get("cr034_specialty", "General"),
            "rate": w.get("cr034_hourlyrate") or 300, "rating": w.get("cr034_rating") or 4.0, "verified": w.get("cr034_verified") or False,
            "image": "/assets/images/worker_rajesh_kumar.png"
        } for w in data.get("value", [])]
    except Exception: return MOCK_WORKERS

@app.get("/api/admin/stats")
async def get_admin_stats(user: dict = Depends(get_current_user)):
    if not dataverse_service.configured: return {"activeJobs": 124, "pendingLeads": 42, "completionRate": 80}
    try:
        jobs = await dataverse_service.get_data("cr034_jobses?$count=true&$top=1")
        leads = await dataverse_service.get_data("cr034_leadses?$count=true&$top=1")
        return {"activeJobs": jobs.get("@odata.count", 0), "pendingLeads": leads.get("@odata.count", 0), "completionRate": 88}
    except Exception: return {"activeJobs": 0, "pendingLeads": 0}

@app.get("/api/admin/live-ops")
async def get_live_ops(user: dict = Depends(get_current_user)):
    if not dataverse_service.configured: return []
    try:
        data = await dataverse_service.get_data("cr034_auditlogses?$top=10&$orderby=createdon desc")
        return [{
            "id": e.get("cr034_auditlogid"), "text": e.get("cr034_eventtext"), "time": "Just now", 
            "type": e.get("cr034_eventtype"), "icon": e.get("cr034_eventicon"), "color": e.get("cr034_eventcolor")
        } for e in data.get("value", [])]
    except Exception: return []

@app.post("/api/leads")
async def create_lead(lead: LeadCreate, background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    if not dataverse_service.configured: return {"status": "success"}
    try:
        await dataverse_service.post_data("cr034_leadses", {"cr034_name": lead.title, "cr034_category": lead.category, "cr034_location": lead.location, "cr034_budget": lead.budget, "cr034_description": lead.desc})
        return {"status": "success"}
    except Exception: raise HTTPException(status_code=500)

@app.post("/api/chat")
async def send_chat_message(msg: ChatMessageCreate, user: dict = Depends(get_current_user)):
    if not dataverse_service.configured: return {"status": "success"}
    try:
        await dataverse_service.post_data("cr034_messageses", {"cr034_sender": "client", "cr034_content": msg.text, "cr034_workerid": msg.workerId, "cr034_customerid": user['email']})
        return {"status": "success"}
    except Exception: raise HTTPException(status_code=500)

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
