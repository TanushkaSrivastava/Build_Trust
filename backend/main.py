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
                token = auth_service.create_access_token(email, "admin")
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
    # This verification returns a token but we need to know the role
    # For simplicity in this flow, we assume 'customer' unless they already exist
    success, result = await auth_service.verify_otp(request.email, request.code)
    if not success: return {"status": "error", "message": result}
    
    # Check if they exist to get correct role for the token
    local_user = user_db.get_user(request.email)
    role = local_user.get("role", "customer") if local_user else "customer"
    
    # Re-generate token with role
    token = auth_service.create_access_token(request.email, role)
    return {"status": "success", "token": token, "user": {"email": request.email, "role": role}}

# --- ADMIN API (PROTECTED) ---

@app.get("/api/admin/stats")
async def get_admin_stats(user: dict = Depends(role_required(["admin"]))):
    import random
    if not dataverse_service.configured: 
        # Dynamic Mocking based on current 'session' (randomized for realism)
        return {
            "activeJobs": random.randint(110, 150), 
            "pendingLeads": random.randint(30, 60), 
            "completionRate": random.randint(82, 94)
        }
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
            "id": e.get("cr034_auditlogid"), "text": e.get("cr034_eventtext"), "time": e.get("createdon") or "Just now", 
            "type": e.get("cr034_eventtype"), "icon": e.get("cr034_eventicon"), "color": e.get("cr034_eventcolor")
        } for e in data.get("value", [])]
    except Exception: return []

@app.get("/api/specialist/stats")
async def get_specialist_stats(user: dict = Depends(role_required(["specialist"]))):
    import random
    # In a real app, we'd query Dataverse for this specific specialist's performance
    return {
        "earnings": f"₹{random.randint(8000, 25000):,}",
        "completedJobs": random.randint(5, 20),
        "rating": 4.8,
        "profileViews": random.randint(50, 200)
    }

# --- CORE API ---

@app.get("/api/workers")
async def get_workers(
    category: str = "All", 
    text: str = "", 
    page: int = 1, 
    limit: int = 20,
    min_rating: float = 0,
    max_rate: int = 1000000
):
    # Calculate pagination offset
    skip_val = (page - 1) * limit

    def get_filtered_mock():
        filtered = MOCK_WORKERS
        if category != "All": filtered = [w for w in filtered if w.get("specialty") == category]
        if text: 
            s = text.lower()
            filtered = [w for w in filtered if s in w.get("name").lower() or s in w.get("specialty").lower()]
        filtered = [w for w in filtered if w.get("rating", 0) >= min_rating and w.get("rate", 0) <= max_rate]
        return filtered[skip_val : skip_val + limit]

    if not dataverse_service.configured:
        return get_filtered_mock()

    try:
        filters = []
        if category != "All": filters.append(f"cr034_specialty eq '{urllib.parse.quote(category)}'")
        if text:
            s = urllib.parse.quote(text.replace("'", "''"))
            filters.append(f"(contains(cr034_name, '{s}') or contains(cr034_specialty, '{s}'))")
        
        filters.append(f"cr034_rating ge {min_rating}")
        filters.append(f"cr034_hourlyrate le {max_rate}")
        
        # SECRET DIVERSITY LOGIC: Oversample to filter for unique names
        # Fetch 3x the requested amount to ensure we find enough unique names
        fetch_limit = limit * 3 if page == 1 else limit 
        
        endpoint = f"cr034_specialists?$top={fetch_limit}&$skip={skip_val}&$orderby=cr034_rating desc, cr034_name asc"
        
        if skip_val == 0:
             endpoint = f"cr034_specialists?$top={fetch_limit}&$orderby=cr034_rating desc, cr034_name asc"
            
        if filters: endpoint += f"&$filter={' and '.join(filters)}"
        
        data = await dataverse_service.get_data(endpoint)
        raw_results = data.get("value", [])

        if not raw_results:
            return []

        # Process uniqueness
        seen_names = set()
        unique_results = []
        duplicates = []
        
        for w in raw_results:
            name = w.get("cr034_name")
            if name not in seen_names and len(unique_results) < limit:
                unique_results.append(w)
                seen_names.add(name)
            else:
                duplicates.append(w)
        
        # Combine, putting unique results at the very top
        final_raw = (unique_results + duplicates)[:limit]
        
        # Available images for rotation
        images = [
            "/assets/images/worker_rajesh_kumar.png",
            "/assets/images/worker_sarah_jenkins.png",
            "/assets/images/worker_marcus_thorne.png",
            "/assets/images/worker_robert_chen.png"
        ]

        return [{
            "id": w.get("cr034_specialistid"), 
            "name": w.get("cr034_name"), 
            "specialty": w.get("cr034_specialty", "General"),
            "rate": w.get("cr034_hourlyrate") or 300, 
            "rating": w.get("cr034_rating") or 4.0, 
            "verified": w.get("cr034_verified") or False,
            "image": images[i % len(images)]
        } for i, w in enumerate(final_raw)]
    except Exception as e:
        log(f"Dataverse Search Failed: {e}")
        return get_filtered_mock()

@app.post("/api/leads")
async def create_lead(lead: LeadCreate, background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    log(f"Project Lead Captured: {lead.title} (Budget: {lead.budget}) by {user['sub']}")
    if not dataverse_service.configured: return {"status": "success", "message": "Lead registered for trade matching."}
    try:
        await dataverse_service.post_data("cr034_leadses", {
            "cr034_name": lead.title, 
            "cr034_category": lead.category, 
            "cr034_location": lead.location, 
            "cr034_budget": lead.budget, 
            "cr034_description": lead.desc
        })
        return {"status": "success"}
    except Exception: raise HTTPException(status_code=500)

@app.post("/api/jobs")
async def create_job(job: JobCreate, user: dict = Depends(get_current_user)):
    log(f"Job Booking Request: {job.workerName} for {job.hours} hrs. User: {user['sub']}")
    
    # PERMISSION: Persist Hire to Audit Logs for Admin Visibility
    if dataverse_service.configured:
        try:
            audit_payload = {
                "cr034_eventtext": f"New Hire: {job.workerName} booked for {job.hours} hrs by {user['sub']}",
                "cr034_eventtype": "job",
                "cr034_eventicon": "✓",
                "cr034_eventcolor": "green-bg"
            }
            await dataverse_service.post_data("cr034_auditlogses", audit_payload)
        except Exception as e:
            log(f"Audit Log Failed: {e}")

    if not dataverse_service.configured: return {"status": "success", "message": "Booking confirmed in offline mode."}
    return {"status": "success"}

@app.post("/api/chat")
async def send_chat_message(msg: ChatMessageCreate, user: dict = Depends(get_current_user)):
    if not dataverse_service.configured: 
        log(f"Real Chat Signal: {user['sub']} -> {msg.workerId}: {msg.text}")
        return {"status": "success"}
    try:
        await dataverse_service.post_data("cr034_messageses", {
            "cr034_sender": "client", 
            "cr034_content": msg.text, 
            "cr034_workerid": msg.workerId, 
            "cr034_customerid": user['sub']
        })
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
            "time": m.get("createdon") or "Just now"
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
