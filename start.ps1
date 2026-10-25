# ==========================================================
# SnoozeBox - One-Click Local Launcher (PowerShell)
# Built for DEV Hacktoberfest 2026: Week 3 "Slow and Steady"
# ==========================================================

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Starting SnoozeBox -- Local Email Attention Manager   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Configure and Verify Ollama on D: Drive
$env:OLLAMA_MODELS = "D:\Ollama\models"
$ollamaExe = "D:\Ollama\ollama.exe"

if (-not (Test-Path $ollamaExe)) {
    Write-Host "[!] Warning: D:\Ollama\ollama.exe not found. Checking system PATH..." -ForegroundColor Yellow
    $ollamaExe = (Get-Command ollama -ErrorAction SilentlyContinue).Source
}

Write-Host "[1/3] Checking Ollama AI Daemon..." -ForegroundColor Gray
$ollamaRunning = $false
try {
    $resp = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($resp) { $ollamaRunning = $true }
} catch {
    $ollamaRunning = $false
}

if (-not $ollamaRunning) {
    Write-Host "      Starting Ollama on GPU (models in D:\Ollama\models)..." -ForegroundColor Yellow
    Start-Process -FilePath $ollamaExe -ArgumentList "serve" -WindowStyle Minimized
    Start-Sleep -Seconds 3
} else {
    Write-Host "      Ollama is already active on port 11434." -ForegroundColor Green
}

# 2. Check Gemma Model
try {
    $models = (Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags").models
    $hasGemma = $models | Where-Object { $_.name -like "*gemma2:2b*" }
    if ($hasGemma) {
        Write-Host "      Google Gemma 2 2B is loaded and ready." -ForegroundColor Green
    } else {
        Write-Host "      Pulling gemma2:2b (first-time only)..." -ForegroundColor Yellow
        & $ollamaExe pull gemma2:2b
    }
} catch {
    Write-Host "      Warning: Could not query Ollama models list." -ForegroundColor Yellow
}

# 3. Start Backend & Open Browser
Write-Host "[2/3] Launching SnoozeBox Core Server on http://127.0.0.1:8080..." -ForegroundColor Gray
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -Path "$root\quiteos"

# Open default browser after a short delay
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 2
    Start-Process "http://127.0.0.1:8080"
} | Out-Null

Write-Host "[3/3] SnoozeBox is Live! Opening dashboard in your default browser..." -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C at any time to shut down SnoozeBox." -ForegroundColor Gray
Write-Host "----------------------------------------------------------" -ForegroundColor DarkGray

go run ./cmd/snoozebox
