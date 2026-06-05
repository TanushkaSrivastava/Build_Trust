import random
import jwt
import os
import datetime
import resend
import hashlib
import base64
import bcrypt
from dotenv import load_dotenv

# Ensure .env is loaded at module level
dotenv_path = os.path.join(os.path.dirname(__file__), '../../.env')
load_dotenv(dotenv_path)

from app.services.dataverse_service import dataverse_service

class AuthService:
    def __init__(self):
        # ... (init code)
        self.secret_key = os.getenv("JWT_SECRET")
        if not self.secret_key:
            raise RuntimeError("CRITICAL ERROR: JWT_SECRET environment variable is missing!")
            
        self.resend_key = os.getenv("RESEND_API_KEY")
        self.email_configured = bool(self.resend_key)
        
        if self.email_configured:
            resend.api_key = self.resend_key
            print("🚀 Resend Email Service: ONLINE")
        else:
            print("⚠️ Resend Email Service: OFFLINE (Using Terminal Mock)")

    def _hash_for_bcrypt(self, password: str) -> bytes:
        """SHA-256 pre-hash to bypass bcrypt 72-byte limit and return bytes"""
        sha_hash = hashlib.sha256(password.encode('utf-8')).digest()
        return base64.b64encode(sha_hash)

    def get_password_hash(self, password: str) -> str:
        """Generates a secure bcrypt hash of a pre-hashed password"""
        prepared = self._hash_for_bcrypt(password)
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(prepared, salt)
        return hashed.decode('utf-8')

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verifies a plain password against a stored bcrypt hash"""
        try:
            prepared = self._hash_for_bcrypt(plain_password)
            return bcrypt.checkpw(prepared, hashed_password.encode('utf-8'))
        except Exception as e:
            print(f"PASSWORD_VERIFY_ERROR: {e}")
            return False

    async def generate_otp(self, email: str):
        # 1. Cleanup old codes for this email in Dataverse (Best effort)
        if dataverse_service.configured:
            try:
                old_data = await dataverse_service.get_data(f"cr034_otp_codeses?$filter=cr034_email eq '{email}'")
                for item in old_data.get("value", []):
                    # We'd need a delete_data method, but for now we'll just let them expire or ignore
                    pass 
            except: pass

        code = str(random.randint(100000, 999999))
        now = datetime.datetime.utcnow()
        expiry = now + datetime.timedelta(minutes=10)
        
        # 2. SAVE TO DATAVERSE
        if dataverse_service.configured:
            try:
                payload = {
                    "cr034_email": email,
                    "cr034_code": code,
                    "cr034_expiresat": expiry.isoformat() + "Z"
                }
                await dataverse_service.post_data("cr034_otp_codeses", payload)
            except Exception as e:
                print(f"❌ Failed to save OTP to Dataverse: {e}")
                raise Exception("Identity service temporarily unavailable. Please try again.")

        # 3. REAL EMAILER: Send via Resend (Domain Verified!)
        if self.email_configured:
            try:
                params = {
                    "from": "Build_Trust <verify@kurianjose.me>", 
                    "to": email,
                    "subject": f"{code} is your Build_Trust verification code",
                    "html": f"""
                    <!DOCTYPE html>
                    <html>
                    <body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="padding: 40px 0;">
                            <tr>
                                <td align="center">
                                    <table border="0" cellpadding="0" cellspacing="0" width="480" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e1e8ed;">
                                        <!-- Header -->
                                        <tr>
                                            <td style="padding: 32px 40px; background-color: #0b132b; color: #ffffff; text-align: left;">
                                                <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Build<span style="color: #ff6f00;">_Trust</span></h1>
                                                <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.8; letter-spacing: 1px; text-transform: uppercase;">Enterprise Operations Hub</p>
                                            </td>
                                        </tr>
                                        <!-- Body -->
                                        <tr>
                                            <td style="padding: 40px;">
                                                <h2 style="margin: 0 0 16px 0; color: #1a202c; font-size: 20px; font-weight: 600;">Verify your identity</h2>
                                                <p style="margin: 0 0 24px 0; color: #4a5568; font-size: 15px; line-height: 1.6;">Namaste! Please use the secure verification code below to complete your login or registration.</p>
                                                
                                                <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                                                    <span style="display: block; font-size: 11px; text-transform: uppercase; color: #64748b; margin-bottom: 8px; font-weight: 600; letter-spacing: 1px;">Your 6-Digit Code</span>
                                                    <div style="font-family: 'Courier New', Courier, monospace; font-size: 42px; font-weight: 700; color: #ff6f00; letter-spacing: 8px;">{code}</div>
                                                </div>

                                                <p style="margin: 0; color: #718096; font-size: 13px; line-height: 1.5;">This code is valid for <strong>10 minutes</strong>. If you did not request this email, you can safely ignore it.</p>
                                            </td>
                                        </tr>
                                        <!-- Footer -->
                                        <tr>
                                            <td style="padding: 24px 40px; background-color: #f8fafc; border-top: 1px solid #edf2f7; text-align: center;">
                                                <p style="margin: 0; font-size: 12px; color: #a0aec0;">&copy; 2026 Build_Trust India. All rights reserved.</p>
                                                <p style="margin: 8px 0 0 0; font-size: 11px; color: #cbd5e1;">Infrastructure managed by Kurian Jose Enterprise Systems</p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </body>
                    </html>
                    """
                }
                resend.Emails.send(params)
                print(f"✅ Real OTP email sent to {email}")
            except Exception as e:
                print(f"❌ Failed to send real email: {e}. Falling back to terminal log.")
                self.print_mock_log(email, code)
        else:
            self.print_mock_log(email, code)
            
        return code

    def print_mock_log(self, email, code):
        print("\n" + "="*40)
        print(f"📧 [MOCK] EMAIL TO: {email}")
        print(f"🔢 YOUR OTP CODE: {code}")
        print("="*40 + "\n")

    async def verify_otp(self, email: str, code: str):
        if not dataverse_service.configured:
            return False, "Dataverse connection required for verification"

        try:
            # Query for the latest valid code for this email
            # Note: Dataverse plural names often end in 'es' or 's'
            filter_str = f"cr034_email eq '{email}' and cr034_code eq '{code}'"
            endpoint = f"cr034_otp_codeses?$filter={filter_str}&$orderby=createdon desc&$top=1"
            data = await dataverse_service.get_data(endpoint)
            
            records = data.get("value", [])
            if not records:
                return False, "Invalid or expired code"
            
            stored_data = records[0]
            expiry_str = stored_data.get("cr034_expiresat")
            
            # Simple string comparison or date parsing
            # ISO format: 2026-05-29T12:00:00Z
            expiry_date = datetime.datetime.fromisoformat(expiry_str.replace('Z', '+00:00'))
            
            if datetime.datetime.now(datetime.timezone.utc) > expiry_date:
                return False, "Code has expired"
            
            # Success! Generate token
            token = self.create_access_token(email)
            return True, token
        except Exception as e:
            print(f"OTP_VERIFY_ERROR: {e}")
            return False, "Verification system error"

    def create_access_token(self, email: str, role: str = "customer"):
        payload = {
            "sub": email,
            "role": role,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(days=1),
            "iat": datetime.datetime.utcnow()
        }
        return jwt.encode(payload, self.secret_key, algorithm="HS256")

    def verify_token(self, token: str):
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=["HS256"])
            return payload # Returns dict with 'sub' (email) and 'role'
        except jwt.ExpiredSignatureError:
            raise Exception("Token has expired")
        except jwt.InvalidTokenError:
            raise Exception("Invalid token")

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends, HTTPException

security = HTTPBearer()

async def get_current_user(auth: HTTPAuthorizationCredentials = Depends(security)):
    try:
        user_data = auth_service.verify_token(auth.credentials)
        if not user_data:
            raise HTTPException(status_code=401, detail="Invalid user session")
        return user_data # Now contains email and role
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

auth_service = AuthService()
