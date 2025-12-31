# Restart both API and Add-in servers
Write-Host 'Restarting servers...' -ForegroundColor Cyan

# Kill processes on ports 3000 and 3001  
$ports = @(3000, 3001)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        $connections | ForEach-Object {
            Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
}

Start-Sleep -Seconds 1

# Start servers
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Start-Process pwsh -ArgumentList '-NoExit', '-Command', "cd '$scriptDir\api'; npm run dev"
Start-Sleep -Seconds 2
Start-Process pwsh -ArgumentList '-NoExit', '-Command', "cd '$scriptDir\addin'; npm run dev"

Write-Host 'Servers started in new windows!' -ForegroundColor Green
