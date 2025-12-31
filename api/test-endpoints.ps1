# Test API Endpoints
Write-Host "Testing Outlook Weekly API endpoints..." -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3001"

# Test 1: Health Check
Write-Host "1. GET /health" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/health" -UseBasicParsing
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
}
Write-Host ""

# Test 2: Create Settings
Write-Host "2. PUT /me/settings" -ForegroundColor Yellow
try {
    $body = @{
        cadence = "WEEKLY"
        dayOfWeek = 1
        timeOfDay = "9:00"
        timezone = "America/New_York"
        outputMode = "DRAFT_EMAIL_TO_SELF"
        includeCalendar = $true
        includeSentMail = $true
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/me/settings" -Method Put -Body $body -ContentType "application/json" -UseBasicParsing
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
}
Write-Host ""

# Test 3: Get Settings
Write-Host "3. GET /me/settings" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/me/settings" -UseBasicParsing
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
}
Write-Host ""

# Test 4: Generate Report
Write-Host "4. POST /me/generate" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/me/generate" -Method Post -UseBasicParsing
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
}
Write-Host ""

# Test 5: Get Runs
Write-Host "5. GET /me/runs?limit=5" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/me/runs?limit=5" -UseBasicParsing
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
}
Write-Host ""

# Test 6: Get PDF Link (stub endpoint)
Write-Host "6. GET /me/runs/test-123/pdf-link" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/me/runs/test-123/pdf-link" -UseBasicParsing
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    if ($_.Exception.Response.StatusCode.Value__ -eq 501) {
        Write-Host "Status: 501 (Not Implemented - Expected)" -ForegroundColor Yellow
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host $reader.ReadToEnd()
        $reader.Close()
    } else {
        Write-Host "ERROR: $_" -ForegroundColor Red
    }
}
Write-Host ""

Write-Host "All tests complete!" -ForegroundColor Cyan
