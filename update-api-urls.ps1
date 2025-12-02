# Script to update all frontend files to use API_URL configuration
# This replaces hardcoded 'http://localhost:5000' with ${API_URL}

$files = @(
    "G:\USPEM\client\src\pages\VerifyEmail.jsx",
    "G:\USPEM\client\src\pages\UserManagement.jsx",
    "G:\USPEM\client\src\pages\ResetPassword.jsx",
    "G:\USPEM\client\src\pages\QRScanner.jsx",
    "G:\USPEM\client\src\pages\MyRegistrations.jsx",
    "G:\USPEM\client\src\pages\MyProfile.jsx",
    "G:\USPEM\client\src\pages\ManageParticipants.jsx",
    "G:\USPEM\client\src\pages\ManageEvents.jsx",
    "G:\USPEM\client\src\pages\ForgotPassword.jsx",
    "G:\USPEM\client\src\pages\EventList.jsx",
    "G:\USPEM\client\src\pages\EventDetails.jsx",
    "G:\USPEM\client\src\pages\EventApprovals.jsx",
    "G:\USPEM\client\src\pages\Dashboard.jsx",
    "G:\USPEM\client\src\pages\CreateEvent.jsx",
    "G:\USPEM\client\src\pages\AuditLogs.jsx",
    "G:\USPEM\client\src\components\PhoneVerificationModal.jsx"
)

$importStatement = "import API_URL from '../config/api';"
$pagesImportStatement = "import API_URL from '../config/api';"
$componentsImportStatement = "import API_URL from '../config/api';"

foreach ($file in $files) {
    Write-Host "Processing: $file"
    
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $modified = $false
        
        # Determine correct import path based on file location
        if ($file -like "*\pages\*") {
            $importToAdd = $pagesImportStatement
        } else {
            $importToAdd = $componentsImportStatement
        }
        
        # Add import statement if not already present
        if ($content -notmatch "import API_URL") {
            # Find the last import statement
            $lines = $content -split "`r?`n"
            $lastImportIndex = -1
            for ($i = 0; $i -lt $lines.Count; $i++) {
                if ($lines[$i] -match "^import ") {
                    $lastImportIndex = $i
                }
            }
            
            if ($lastImportIndex -ge 0) {
                $lines = $lines[0..$lastImportIndex] + $importToAdd + $lines[($lastImportIndex + 1)..($lines.Count - 1)]
                $content = $lines -join "`r`n"
                $modified = $true
            }
        }
        
        # Replace all occurrences of 'http://localhost:5000' with ${API_URL}
        $originalContent = $content
        $content = $content -replace "'http://localhost:5000'", '`${API_URL}`'
        $content = $content -replace '"http://localhost:5000"', '`${API_URL}`'
        $content = $content -replace "``http://localhost:5000", '`${API_URL}'
        
        # For image sources like src={`http://localhost:5000${event.poster}`}
        $content = $content -replace 'src=\{`http://localhost:5000(\$\{[^}]+\})`\}', 'src={`${API_URL}$1`}'
        
        if ($content -ne $originalContent) {
            $modified = $true
        }
        
        if ($modified) {
            Set-Content -Path $file -Value $content -NoNewline
            Write-Host "  ✓ Updated" -ForegroundColor Green
        } else {
            Write-Host "  - No changes needed" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ✗ File not found" -ForegroundColor Red
    }
}

Write-Host "`nAll files processed!" -ForegroundColor Cyan
