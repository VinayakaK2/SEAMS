# Quick Fix Script - Replace all hardcoded URLs
# Run this to fix all remaining files at once

# Get all .jsx and .js files in src
$files = Get-ChildItem -Path "G:\USPEM\client\src" -Recurse -Include "*.jsx","*.js" | Where-Object { $_.FullName -notlike "*node_modules*" }

$count = 0
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    
    if ($content -and $content -match "http://localhost:5000") {
        # Replace all hardcoded URLs
        $newContent = $content -replace "'http://localhost:5000'", '`${API_URL}`'
        $newContent = $newContent -replace '"http://localhost:5000"', '`${API_URL}`'
        $newContent = $newContent -replace "``http://localhost:5000", '`${API_URL}'
        
        Set-Content -Path $file.FullName -Value $newContent -NoNewline
        Write-Host "✓ Fixed: $($file.Name)" -ForegroundColor Green
        $count++
    }
}

Write-Host "`n✅ Fixed $count files!" -ForegroundColor Cyan
Write-Host "Now run: npm run build" -ForegroundColor Yellow
