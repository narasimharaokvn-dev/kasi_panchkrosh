@echo off
echo ========================================
echo Force Clean - Kasi Sacred Boundary
echo ========================================
echo.

echo Stopping Java/Gradle processes...
taskkill /F /IM java.exe 2>nul
taskkill /F /IM node.exe 2>nul
taskkill /F /IM gradle.exe 2>nul
timeout /t 2 /nobreak >nul
echo.

echo Cleaning node_modules (this may take a moment)...
if exist node_modules (
    echo Attempting to remove node_modules...
    rd /s /q node_modules 2>nul
    if exist node_modules (
        echo Some files locked, trying alternative method...
        for /d %%i in (node_modules\*) do rd /s /q "%%i" 2>nul
        del /f /s /q node_modules\*.* 2>nul
        rd /s /q node_modules 2>nul
    )
)
echo.

echo Cleaning android folder...
if exist android (
    rd /s /q android 2>nul
)
echo.

echo Cleaning cache folders...
if exist .expo (
    rd /s /q .expo 2>nul
)
if exist .gradle (
    rd /s /q .gradle 2>nul
)
echo.

echo ========================================
echo Cleanup complete!
echo ========================================
echo.
echo Please close Android Studio if it's open, then run:
echo   npm install
echo   npx expo prebuild --clean
echo.
pause
