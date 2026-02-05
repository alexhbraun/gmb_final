Write-Host "🛑 Killing old Node and Java processes..." -ForegroundColor Yellow
taskkill /F /IM node.exe /T 2>$null
taskkill /F /IM java.exe /T 2>$null

Write-Host "✅ Cleanup complete." -ForegroundColor Green
Write-Host "🚀 Starting Backend Emulators (New Window)..." -ForegroundColor Cyan

# Start Backend in a new detached window
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d ""$PSScriptRoot"" && npx firebase-tools emulators:start --only functions,firestore,hosting"

# Wait a moment for backend to initialize
Write-Host "⏳ Waiting 10 seconds for backend to warm up..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

Write-Host "🌐 Starting Frontend (This Window)..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot/apps/web"
npm run dev
