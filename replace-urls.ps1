# Simple PowerShell script to replace hardcoded URLs in remaining files
# Run this from the project root: .\replace-urls.ps1

$files = Get-ChildItem -Path "G:\USPEM\client\src" -Recurse -Include "*.jsx","*.js" | Where-Object { $_.FullName -notlike "*node_modules*" }

$count = 0
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    
    if ($content -and $content -match "http://localhost:5000") {
        # Check if API_URL import already exists
        $hasImport = $content -match "import API_URL"
        
        # Replace URLs
        $newContent = $content -replace "'http://localhost:5000'", '`${API_URL}`'
        $newContent = $newContent -replace '"http://localhost:5000"', '`${API_URL}`'
        
        # Add import if needed
        if (-not $hasImport) {
            # Determine import path
            $relativePath = $file.DirectoryName.Replace("G:\USPEM\client\src\", "")
            $depth = ($relativePath -split "\\").Count
            $importPath = if ($depth -eq 0) { "./config/api" } else { "../" * $depth + "config/api" }
            
            # Find last import line
            $lines = $newContent -split "`r?`n"
            $lastImportIdx = -1
            for ($i = 0; $i -lt $lines.Count; $i++) {
                if ($lines[$i] -match "^import ") { $lastImportIdx = $i }
            }
            
            if ($lastImportIdx -ge 0) {
                $lines = $lines[0..$lastImportIdx] + "import API_URL from '$importPath';" + $lines[($lastImportIdx+1)..($lines.Count-1)]
                $newContent = $lines -join "`r`n"
            }
        }
        
        Set-Content -Path $file.FullName -Value $newContent -NoNewline
        Write-Host "Updated: $($file.Name)" -ForegroundColor Green
        $count++
    }
}

Write-Host "`nTotal files updated: $count" -ForegroundColor Cyan
