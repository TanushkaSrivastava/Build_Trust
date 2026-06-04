@echo off
SETLOCAL EnableDelayedExpansion
SET PYTHONIOENCODING=utf-8
pushd %~dp0

echo ========================================
echo 🚀 BUILD_TRUST BACKEND BOOTSTRAPPER
echo ========================================

:: 1. Check for Virtual Environment
if exist venv\Scripts\activate (
    echo [1/3] Activating Virtual Environment...
    call venv\Scripts\activate
) else (
    echo [1/3] ⚠️ No venv found. Running in global Python context.
)

:: 2. Check for .env file
if not exist .env (
    echo [ERROR] Critical file '.env' is missing!
    echo Please create it based on .env.example
    pause
    exit /b 1
)

:: 3. Install/Update Dependencies
echo [2/3] Syncing dependencies (this may take a moment)...
python -m pip install -q -r requirements.txt

:: 4. Start Server
echo [3/3] Starting FastAPI server on http://localhost:8005
echo.
echo 💡 TIP: If you see a 'Port in use' error, close other Python terminals.
echo.
python main.py

popd
ENDLOCAL
