#Requires -Version 5.1
<#
.SYNOPSIS
    Pack-Attack Deep Security Audit
    Comprehensive security analysis of code, infrastructure, and runtime

.DESCRIPTION
    This script performs a thorough security audit covering:
    - Code security (dependencies, CVEs, secrets)
    - Configuration security (env, database, auth)
    - Runtime security (processes, network)
    - Application security (health, SSL)
    - Compliance & best practices

.EXAMPLE
    .\Deep-SecurityAudit.ps1
#>

[CmdletBinding()]
param()

# Initialize counters
$script:Critical = 0
$script:High = 0
$script:Medium = 0
$script:Low = 0
$script:Info = 0

$AuditReport = Join-Path $env:TEMP "packattack-security-audit-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
$Results = @()

function Write-Critical {
    param([string]$Message)
    Write-Host "[CRITICAL] $Message" -ForegroundColor Red
    Add-Content -Path $AuditReport -Value "[CRITICAL] $Message"
    $Results += @{ Severity = "CRITICAL"; Message = $Message }
    $script:Critical++
}

function Write-High {
    param([string]$Message)
    Write-Host "[HIGH] $Message" -ForegroundColor Red
    Add-Content -Path $AuditReport -Value "[HIGH] $Message"
    $Results += @{ Severity = "HIGH"; Message = $Message }
    $script:High++
}

function Write-Medium {
    param([string]$Message)
    Write-Host "[MEDIUM] $Message" -ForegroundColor Yellow
    Add-Content -Path $AuditReport -Value "[MEDIUM] $Message"
    $Results += @{ Severity = "MEDIUM"; Message = $Message }
    $script:Medium++
}

function Write-Low {
    param([string]$Message)
    Write-Host "[LOW] $Message" -ForegroundColor Yellow
    Add-Content -Path $AuditReport -Value "[LOW] $Message"
    $Results += @{ Severity = "LOW"; Message = $Message }
    $script:Low++
}

function Write-InfoLine {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
    Add-Content -Path $AuditReport -Value "[INFO] $Message"
    $script:Info++
}

function Write-Section {
    param([string]$Title)
    Write-Host "`n============================================" -ForegroundColor Cyan
    Write-Host "$Title" -ForegroundColor Cyan
    Write-Host "============================================`n" -ForegroundColor Cyan
    Add-Content -Path $AuditReport -Value "`n============================================"
    Add-Content -Path $AuditReport -Value "$Title"
    Add-Content -Path $AuditReport -Value "============================================`n"
}

function Write-Subsection {
    param([string]$Title)
    Write-Host "`n--- $Title ---" -ForegroundColor Blue
    Add-Content -Path $AuditReport -Value "`n--- $Title ---"
}

# Header
Clear-Host
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║       PACK-ATTACK DEEP SECURITY AUDIT                     ║" -ForegroundColor Magenta
Write-Host "║       Comprehensive Security Analysis                      ║" -ForegroundColor Magenta
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

$HeaderInfo = @"
Date: $(Get-Date)
Host: $env:COMPUTERNAME
User: $env:USERNAME
Path: $(Get-Location)
"@

Write-Host $HeaderInfo
Add-Content -Path $AuditReport -Value $HeaderInfo

# ============================================
# 1. CODE SECURITY AUDIT
# ============================================
Write-Section "1. CODE SECURITY AUDIT"

Write-Subsection "1.1 Dependency Vulnerabilities"

# Find package.json
$PackageJson = $null
if (Test-Path "package.json") {
    $PackageJson = "package.json"
} elseif (Test-Path "Pack-Attack\package.json") {
    $PackageJson = "Pack-Attack\package.json"
    Push-Location "Pack-Attack"
} else {
    Write-Critical "Cannot find package.json - run from project root"
    exit 1
}

if ($PackageJson) {
    Write-Host "Running npm audit..." -ForegroundColor Gray
    
    try {
        $npmAuditRaw = npm audit --json 2>&1 | Out-String
        $npmAudit = $npmAuditRaw | ConvertFrom-Json -ErrorAction SilentlyContinue
        
        if ($npmAudit.metadata) {
            $criticalVuln = $npmAudit.metadata.vulnerabilities.critical
            $highVuln = $npmAudit.metadata.vulnerabilities.high
            $moderateVuln = $npmAudit.metadata.vulnerabilities.moderate
            $lowVuln = $npmAudit.metadata.vulnerabilities.low
            
            if ($criticalVuln -gt 0) {
                Write-Critical "Found $criticalVuln critical npm vulnerabilities - RUN 'npm audit fix' IMMEDIATELY"
            }
            
            if ($highVuln -gt 0) {
                Write-High "Found $highVuln high npm vulnerabilities - Update packages ASAP"
            }
            
            if ($moderateVuln -gt 0) {
                Write-Medium "Found $moderateVuln moderate npm vulnerabilities"
            }
            
            if ($lowVuln -gt 0) {
                Write-Low "Found $lowVuln low npm vulnerabilities"
            }
            
            if ($criticalVuln -eq 0 -and $highVuln -eq 0 -and $moderateVuln -eq 0) {
                Write-InfoLine "No critical/high/moderate npm vulnerabilities detected"
            }
        } else {
            Write-InfoLine "npm audit completed (no structured output available)"
        }
    } catch {
        Write-Medium "Failed to run npm audit: $_"
    }
}

Write-Subsection "1.2 Next.js CVE Check"

try {
    $package = Get-Content $PackageJson | ConvertFrom-Json
    $nextjsVersion = $package.dependencies.next
    
    if ($nextjsVersion) {
        # Extract version number
        $version = $nextjsVersion -replace '[^0-9.]', ''
        $versionParts = $version.Split('.')
        $major = [int]$versionParts[0]
        $minor = [int]$versionParts[1]
        
        if ($major -lt 16 -or ($major -eq 16 -and $minor -lt 1)) {
            Write-Critical "Next.js $nextjsVersion vulnerable to CVE-2025-66478 RCE - UPGRADE TO >= 16.1.6"
        } else {
            Write-InfoLine "Next.js $nextjsVersion - CVE-2025-66478 patched"
        }
    }
} catch {
    Write-Medium "Failed to check Next.js version: $_"
}

Write-Subsection "1.3 Hardcoded Secrets Scan"

Write-Host "Scanning for hardcoded secrets..." -ForegroundColor Gray

$secretsFound = 0

# Scan for potential secrets in source files
$sourceFiles = Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx","*.js","*.jsx" -ErrorAction SilentlyContinue

foreach ($file in $sourceFiles) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    
    # Check for API keys, tokens, passwords
    if ($content -match '(password|secret|api_key|token|private_key)\s*=\s*[''"]([A-Za-z0-9+/=]{20,}|[a-z0-9]{32,})[''"]' -and $content -notmatch 'NEXTAUTH_SECRET') {
        Write-High "Potential hardcoded secret found in: $($file.Name)"
        $secretsFound++
    }
    
    # Check for AWS keys
    if ($content -match 'AKIA[0-9A-Z]{16}') {
        Write-Critical "AWS Access Key found in: $($file.Name) - REVOKE IMMEDIATELY"
        $secretsFound++
    }
    
    # Check for private keys
    if ($content -match '-----BEGIN.*PRIVATE KEY-----') {
        Write-Critical "Private key found in: $($file.Name) - REMOVE IMMEDIATELY"
        $secretsFound++
    }
}

if ($secretsFound -eq 0) {
    Write-InfoLine "No obvious hardcoded secrets detected"
}

Write-Subsection "1.4 Security Best Practices in Code"

# Check for SQL injection risks
$rawQueries = Select-String -Path "src\**\*.ts" -Pattern 'prisma\.\$executeRaw\(|prisma\.\$queryRaw\(' -ErrorAction SilentlyContinue | Where-Object { $_.Line -notmatch '`' }

if ($rawQueries) {
    Write-High "Potential SQL injection risk - use tagged templates with Prisma raw queries"
}

# Check for eval usage
$evalUsage = Select-String -Path "src\**\*.ts","src\**\*.tsx","src\**\*.js" -Pattern '\beval\(' -ErrorAction SilentlyContinue

if ($evalUsage) {
    Write-High "eval() usage detected - high security risk"
}

# Check for dangerouslySetInnerHTML
$dangerousHtml = Select-String -Path "src\**\*.tsx","src\**\*.jsx" -Pattern 'dangerouslySetInnerHTML' -ErrorAction SilentlyContinue

if ($dangerousHtml) {
    $count = ($dangerousHtml | Measure-Object).Count
    Write-Medium "Found $count uses of dangerouslySetInnerHTML - verify XSS protection"
}

# Check for authentication on API routes
if (Test-Path "src\app\api") {
    $apiRoutes = Get-ChildItem -Path "src\app\api" -Filter "route.ts" -Recurse -ErrorAction SilentlyContinue
    $unprotected = 0
    
    foreach ($route in $apiRoutes) {
        $content = Get-Content $route.FullName -Raw
        if ($content -notmatch 'getServerSession|auth\(') {
            $unprotected++
        }
    }
    
    if ($unprotected -gt 5) {
        Write-Medium "$unprotected API routes may lack authentication - verify access control"
    }
}

Write-InfoLine "Code security audit completed"

# ============================================
# 2. CONFIGURATION SECURITY
# ============================================
Write-Section "2. CONFIGURATION SECURITY"

Write-Subsection "2.1 Environment Variables"

# Check for .env files
$envFiles = @(".env", ".env.local", ".env.production")

foreach ($envFile in $envFiles) {
    if (Test-Path $envFile) {
        $acl = Get-Acl $envFile
        Write-InfoLine "Found $envFile - verify permissions are restrictive"
        
        # Check if file is readable by everyone
        $everyoneAccess = $acl.Access | Where-Object { $_.IdentityReference -eq "Everyone" -or $_.IdentityReference -eq "BUILTIN\Users" }
        if ($everyoneAccess) {
            Write-High "$envFile has broad access permissions - restrict access"
        }
    }
}

Write-Subsection "2.2 Database Security"

# Check DATABASE_URL for security features
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    
    $databaseUrl = ($envContent | Select-String -Pattern '^DATABASE_URL=(.+)$').Matches.Groups[1].Value
    
    if ($databaseUrl) {
        if ($databaseUrl -notmatch 'sslmode=require') {
            Write-High "DATABASE_URL missing sslmode=require - database connection not encrypted"
        } else {
            Write-InfoLine "Database SSL encryption enabled"
        }
        
        if ($databaseUrl -notmatch 'connection_limit') {
            Write-Medium "DATABASE_URL missing connection_limit - may cause connection pool issues"
        } else {
            Write-InfoLine "Database connection pooling configured"
        }
    }
}

Write-Subsection "2.3 NextAuth Configuration"

if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    
    $nextauthSecret = ($envContent | Select-String -Pattern '^NEXTAUTH_SECRET=(.+)$').Matches.Groups[1].Value -replace '"', ''
    
    if ([string]::IsNullOrWhiteSpace($nextauthSecret)) {
        Write-Critical "NEXTAUTH_SECRET not set - authentication completely broken"
    } elseif ($nextauthSecret.Length -lt 32) {
        Write-High "NEXTAUTH_SECRET too short ($($nextauthSecret.Length) chars) - should be >= 32 characters"
    } else {
        Write-InfoLine "NEXTAUTH_SECRET length adequate ($($nextauthSecret.Length) chars)"
    }
    
    $nextauthUrl = ($envContent | Select-String -Pattern '^NEXTAUTH_URL=(.+)$').Matches.Groups[1].Value -replace '"', ''
    if ($nextauthUrl -match '^http://') {
        Write-Medium "NEXTAUTH_URL uses HTTP - should use HTTPS in production"
    } elseif ($nextauthUrl -match '^https://') {
        Write-InfoLine "NEXTAUTH_URL uses HTTPS"
    }
}

Write-InfoLine "Configuration security audit completed"

# ============================================
# 3. RUNTIME SECURITY
# ============================================
Write-Section "3. RUNTIME SECURITY"

Write-Subsection "3.1 Process Security"

# Check for unusual processes
Write-Host "Checking for suspicious processes..." -ForegroundColor Gray

$suspiciousProcessNames = @('xmrig', 'minerd', 'cpuminer', 'kdevtmpfsi', 'kinsing')
$suspiciousFound = $false

foreach ($procName in $suspiciousProcessNames) {
    $procs = Get-Process -Name "*$procName*" -ErrorAction SilentlyContinue
    if ($procs) {
        Write-Critical "SUSPICIOUS PROCESS DETECTED: $procName"
        $suspiciousFound = $true
    }
}

if (-not $suspiciousFound) {
    Write-InfoLine "No known malware processes detected"
}

Write-Subsection "3.2 Network Security"

# Check for active connections on unusual ports
$connections = Get-NetTCPConnection -State Established -ErrorAction SilentlyContinue

$highPorts = $connections | Where-Object { $_.RemotePort -gt 50000 }
if ($highPorts.Count -gt 10) {
    Write-Medium "$($highPorts.Count) connections to unusual high ports - investigate"
}

Write-Subsection "3.3 Application Status"

# Check if Node.js processes are running
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    Write-InfoLine "Node.js processes running: $($nodeProcesses.Count)"
    
    # Check for high CPU usage
    foreach ($proc in $nodeProcesses) {
        if ($proc.CPU -gt 300) {
            Write-Medium "Node process $($proc.Id) has high CPU time: $($proc.CPU)s - investigate"
        }
    }
} else {
    Write-Medium "No Node.js processes running - application may be down"
}

Write-Subsection "3.4 Resource Usage"

# Memory
$computerInfo = Get-CimInstance -ClassName Win32_OperatingSystem
$totalMemGB = [math]::Round($computerInfo.TotalVisibleMemorySize / 1MB, 2)
$freeMemGB = [math]::Round($computerInfo.FreePhysicalMemory / 1MB, 2)
$usedMemGB = $totalMemGB - $freeMemGB
$memPct = [math]::Round(($usedMemGB / $totalMemGB) * 100, 0)

if ($memPct -gt 90) {
    Write-High "Memory usage critical: ${memPct}%"
} elseif ($memPct -gt 80) {
    Write-Medium "Memory usage high: ${memPct}%"
} else {
    Write-InfoLine "Memory usage normal: ${memPct}%"
}

# Disk space
$disk = Get-PSDrive -Name C
$diskPct = [math]::Round((($disk.Used / ($disk.Used + $disk.Free)) * 100), 0)

if ($diskPct -gt 90) {
    Write-Critical "Disk space critical: ${diskPct}%"
} elseif ($diskPct -gt 80) {
    Write-High "Disk space high: ${diskPct}%"
} else {
    Write-InfoLine "Disk space normal: ${diskPct}%"
}

Write-InfoLine "Runtime security audit completed"

# ============================================
# 4. APPLICATION SECURITY
# ============================================
Write-Section "4. APPLICATION SECURITY"

Write-Subsection "4.1 Health Endpoint"

# Try to check health endpoint
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -TimeoutSec 5 -ErrorAction Stop
    if ($health.status -eq "healthy") {
        Write-InfoLine "Application health check: OK (localhost)"
    } else {
        Write-High "Application health check returned unexpected status: $($health.status)"
    }
} catch {
    Write-Medium "Cannot connect to localhost:3000 - application may not be running locally"
}

Write-Subsection "4.2 File Permissions"

# Check for world-readable sensitive files
$sensitiveFiles = @("prisma\schema.prisma", ".env", ".env.local", ".env.production")

foreach ($file in $sensitiveFiles) {
    if (Test-Path $file) {
        $acl = Get-Acl $file
        $everyoneAccess = $acl.Access | Where-Object { 
            ($_.IdentityReference -eq "Everyone" -or $_.IdentityReference -eq "BUILTIN\Users") -and 
            $_.FileSystemRights -match "Read"
        }
        
        if ($everyoneAccess) {
            Write-Medium "$file has broad read permissions - restrict access"
        }
    }
}

Write-InfoLine "Application security audit completed"

# ============================================
# 5. COMPLIANCE & BEST PRACTICES
# ============================================
Write-Section "5. COMPLIANCE & BEST PRACTICES"

Write-Subsection "5.1 OWASP Top 10 Coverage"

# A01:2021 - Broken Access Control
$authChecks = Select-String -Path "src\app\api\**\*.ts" -Pattern "getServerSession" -ErrorAction SilentlyContinue
if ($authChecks) {
    Write-InfoLine "Authentication checks implemented in API routes"
} else {
    Write-Medium "Limited authentication checks in API routes - verify access control"
}

# A03:2021 - Injection
$zodUsage = Select-String -Path "src\app\api\**\*.ts" -Pattern "zod" -ErrorAction SilentlyContinue
if ($zodUsage) {
    Write-InfoLine "Input validation with Zod detected"
} else {
    Write-Medium "No obvious input validation library - verify all inputs are validated"
}

# A05:2021 - Security Misconfiguration
$nextConfig = Get-ChildItem -Filter "next.config.*" -ErrorAction SilentlyContinue
if ($nextConfig) {
    $configContent = Get-Content $nextConfig.FullName -Raw
    if ($configContent -match 'headers\(\)') {
        Write-InfoLine "Security headers configured in Next.js"
    } else {
        Write-Medium "No security headers in Next.js config - verify they're added elsewhere"
    }
}

# A07:2021 - Authentication Failures
try {
    $package = Get-Content $PackageJson | ConvertFrom-Json
    if ($package.dependencies.'next-auth') {
        Write-InfoLine "NextAuth authentication framework in use"
    }
} catch {
    # Ignore
}

Write-Subsection "5.2 TypeScript Configuration"

if (Test-Path "tsconfig.json") {
    $tsconfig = Get-Content "tsconfig.json" | ConvertFrom-Json
    
    if ($tsconfig.compilerOptions.strict) {
        Write-InfoLine "TypeScript strict mode enabled"
    } else {
        Write-Medium "TypeScript strict mode disabled - enable for better type safety"
    }
}

Write-InfoLine "Compliance audit completed"

# ============================================
# SUMMARY
# ============================================
Write-Section "AUDIT SUMMARY"

Write-Host ""
Write-Host "Findings Summary:" -ForegroundColor White
Write-Host "  Critical Issues: $script:Critical" -ForegroundColor $(if ($script:Critical -gt 0) { "Red" } else { "Green" })
Write-Host "  High Severity:   $script:High" -ForegroundColor $(if ($script:High -gt 0) { "Red" } else { "Green" })
Write-Host "  Medium Severity: $script:Medium" -ForegroundColor $(if ($script:Medium -gt 0) { "Yellow" } else { "Green" })
Write-Host "  Low Severity:    $script:Low" -ForegroundColor $(if ($script:Low -gt 0) { "Yellow" } else { "Green" })
Write-Host "  Info/Passed:     $script:Info" -ForegroundColor Green
Write-Host ""

# Calculate security score
$totalIssues = ($script:Critical * 10) + ($script:High * 5) + ($script:Medium * 2) + ($script:Low * 1)
$score = [Math]::Max(0, 100 - $totalIssues)

Write-Host "Security Score: $score/100" -ForegroundColor $(
    if ($score -ge 90) { "Green" }
    elseif ($score -ge 70) { "Yellow" }
    else { "Red" }
)
Write-Host ""

$summaryText = @"

Findings Summary:
  Critical Issues: $script:Critical
  High Severity:   $script:High
  Medium Severity: $script:Medium
  Low Severity:    $script:Low
  Info/Passed:     $script:Info

Security Score: $score/100
"@

Add-Content -Path $AuditReport -Value $summaryText

if ($script:Critical -gt 0) {
    Write-Host "⚠️  CRITICAL ISSUES DETECTED - IMMEDIATE ACTION REQUIRED" -ForegroundColor Red
    $exitCode = 2
} elseif ($script:High -gt 0) {
    Write-Host "⚠️  HIGH SEVERITY ISSUES - ADDRESS WITHIN 24 HOURS" -ForegroundColor Red
    $exitCode = 1
} elseif ($script:Medium -gt 0) {
    Write-Host "ℹ️  MEDIUM SEVERITY ISSUES - ADDRESS WITHIN 1 WEEK" -ForegroundColor Yellow
    $exitCode = 0
} else {
    Write-Host "✅ NO CRITICAL/HIGH ISSUES DETECTED" -ForegroundColor Green
    $exitCode = 0
}

Write-Host ""
Write-Host "Full report saved to: $AuditReport" -ForegroundColor Cyan
Write-Host ""

# Open report in notepad
$openReport = Read-Host "Open full report in notepad? (Y/N)"
if ($openReport -eq 'Y' -or $openReport -eq 'y') {
    notepad $AuditReport
}

if (Test-Path "Pack-Attack") {
    Pop-Location
}

exit $exitCode
