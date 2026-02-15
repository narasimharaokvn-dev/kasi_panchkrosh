@echo off
echo ========================================
echo Kasi Sacred Boundary - Clean Build
echo ========================================
echo.

echo Step 1: Cleaning node_modules...
if exist node_modules (
    rmdir /s /q node_modules
    echo node_modules deleted
) else (
    echo node_modules not found
)
echo.

echo Step 2: Cleaning android folder...
if exist android (
    rmdir /s /q android
    echo android folder deleted
) else (
    echo android folder not found
)
echo.

echo Step 3: Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)
echo.

echo Step 4: Running prebuild...
call npx expo prebuild --clean
if %errorlevel% neq 0 (
    echo ERROR: prebuild failed
    pause
    exit /b 1
)
echo.

echo ========================================
echo Clean build complete!
echo ========================================
echo.
echo Next steps:
echo 1. Replace YOUR_API_KEY_HERE in app.json with your actual Google Maps API key
echo 2. Run: npx expo run:android
echo.
pause
