# Check GitHub Actions Deployment Status
# Run this script to check the latest workflow run without leaving VS Code

Write-Output ""
Write-Output "════════════════════════════════════════════════════════════════════"
Write-Output "  GitHub Actions Deployment Status"
Write-Output "════════════════════════════════════════════════════════════════════"
Write-Output ""

# Get the latest workflow run using GitHub CLI if available
if (Get-Command gh -ErrorAction SilentlyContinue) {
    Write-Output "Fetching latest workflow run..."
    Write-Output ""
    
    # Get the latest run
    $run = gh run list --limit 1 --json status,conclusion,displayTitle,createdAt,url | ConvertFrom-Json | Select-Object -First 1
    
    if ($run) {
        Write-Output "Latest Run:"
        Write-Output "  Title: $($run.displayTitle)"
        Write-Output "  Status: $($run.status)"
        Write-Output "  Conclusion: $($run.conclusion)"
        Write-Output "  Started: $($run.createdAt)"
        Write-Output "  URL: $($run.url)"
        Write-Output ""
        
        # Check if it's complete
        if ($run.status -eq "completed") {
            if ($run.conclusion -eq "success") {
                Write-Output "✅ DEPLOYMENT SUCCESSFUL!"
                Write-Output ""
                Write-Output "Test the health endpoint:"
                Write-Output "  https://happy-rock-01b03941e.1.azurestaticapps.net/api/health"
                Write-Output ""
                
                # Test the endpoint
                Write-Output "Testing health endpoint..."
                try {
                    $response = Invoke-RestMethod -Uri "https://happy-rock-01b03941e.1.azurestaticapps.net/api/health" -Method Get -TimeoutSec 10
                    Write-Output ""
                    Write-Output "✅ Health endpoint is live!"
                    Write-Output ($response | ConvertTo-Json -Depth 10)
                } catch {
                    Write-Output "⚠️  Health endpoint not responding yet (may take a few more seconds)"
                    Write-Output "   Error: $($_.Exception.Message)"
                }
            } else {
                Write-Output "❌ DEPLOYMENT FAILED"
                Write-Output ""
                Write-Output "View logs with:"
                Write-Output "  gh run view --log"
                Write-Output ""
                Write-Output "Or click the URL above to see details in browser"
            }
        } else {
            Write-Output "⏳ Deployment in progress..."
            Write-Output ""
            Write-Output "Watch logs with:"
            Write-Output "  gh run watch"
        }
    }
} else {
    Write-Output "GitHub CLI (gh) not found."
    Write-Output ""
    Write-Output "Install GitHub CLI to check status directly from VS Code:"
    Write-Output "  winget install --id GitHub.cli"
    Write-Output ""
    Write-Output "Or view in browser:"
    Write-Output "  https://github.com/AKLutterbach/outlook-activity-report/actions"
}

Write-Output ""
Write-Output "════════════════════════════════════════════════════════════════════"
