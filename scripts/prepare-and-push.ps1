# Prepares the project and pushes to GitHub to trigger IPA build
# Requires: git, gh (GitHub CLI)

$projectDir = Split-Path -Parent $PSScriptRoot
Set-Location $projectDir

# 1. Initialize git repo
if (-not (Test-Path ".git")) {
    git init
    git add .
    git commit -m "Initial commit"
    Write-Host "✓ Git repo initialized" -ForegroundColor Green
}

# 2. Check if GitHub remote exists
$remote = git remote get-url origin 2>$null
if (-not $remote) {
    Write-Host "Creating GitHub repository..." -ForegroundColor Cyan
    gh repo create nexus-browser-ios --public --push --source=. --remote=origin
    Write-Host "✓ Repository created and pushed" -ForegroundColor Green
} else {
    Write-Host "Pushing to existing remote..." -ForegroundColor Cyan
    git push -u origin main
}

Write-Host ""
Write-Host "== Next Steps ==" -ForegroundColor Yellow
Write-Host "1. Go to: https://github.com/$(gh repo view --json nameWithOwner -q '.nameWithOwner 2>$null')/actions"
Write-Host "2. Click 'Build IPA' workflow"
Write-Host "3. Click 'Run workflow'"
Write-Host "4. Wait 5 minutes"
Write-Host "5. Download the NexusBrowser-iOS artifact"
Write-Host "6. Unzip and sideload with Sideloadly"
