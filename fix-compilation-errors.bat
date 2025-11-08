@echo off
echo ============================================================
echo   ASSURANCES BIAT - Fix TypeScript Compilation Errors
echo ============================================================
echo.

echo INSTRUCTIONS:
echo 1. This script will update entity files and run migrations
echo 2. Before running this script, STOP the development server
echo    (Press Ctrl+C in the terminal running 'npm run start:dev')
echo 3. Then run this script
echo 4. After completion, restart with 'npm run start:dev'
echo.
echo ============================================================
echo.

set /p continue="Have you stopped the dev server? (y/n): "
if /i not "%continue%"=="y" (
    echo.
    echo Script cancelled. Please stop the dev server first.
    exit /b 1
)

echo.
echo [1/3] Updating entity files...
echo ============================================================
node update-entities.js
if errorlevel 1 (
    echo.
    echo ERROR: Failed to update entity files
    echo Please check the error messages above
    pause
    exit /b 1
)

echo.
echo [2/3] Running database migrations...
echo ============================================================
call npm run migrate
if errorlevel 1 (
    echo.
    echo ERROR: Failed to run migrations
    echo Please check the error messages above
    pause
    exit /b 1
)

echo.
echo [3/3] Checking migration status...
echo ============================================================
node scripts/migration-status.js

echo.
echo ============================================================
echo   ALL FIXES APPLIED SUCCESSFULLY!
echo ============================================================
echo.
echo Next steps:
echo 1. Start the development server: npm run start:dev
echo 2. Check that TypeScript compilation completes without errors
echo 3. Test the new features:
echo    - Formation catalog OCR upload
echo    - Manager invitations system
echo    - Actuality interactions (views, likes, comments)
echo    - Notifications system
echo.
echo ============================================================
pause
