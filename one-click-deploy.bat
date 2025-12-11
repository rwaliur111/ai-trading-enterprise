@echo off
echo ================================================================
echo    AI TRADING ENTERPRISE - ONE CLICK DEPLOYMENT
echo ================================================================
echo.
echo This will:
echo  1. Push all changes to GitHub
echo  2. Deploy to Vercel (Production)
echo  3. Show deployment status
echo.
set /p choice=Continue? (Y/N): 

if /i "%choice%"=="y" (
    echo.
    echo Starting deployment process...
    powershell -ExecutionPolicy Bypass -File push-to-git.ps1
) else (
    echo Deployment cancelled.
)

pause