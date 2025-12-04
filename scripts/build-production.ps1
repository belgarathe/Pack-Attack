# Production Build Script for Pack Attack (Windows PowerShell)
# This script prepares the application for production deployment

Write-Host "🚀 Starting Production Build Process..." -ForegroundColor Green

# Check if .env file exists
if (-not (Test-Path .env)) {
    Write-Host "❌ Error: .env file not found!" -ForegroundColor Red
    Write-Host "Please create a .env file with required environment variables."
    Write-Host "See .env.example for reference."
    exit 1
}

Write-Host "✅ Environment file found" -ForegroundColor Green

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm ci
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Generate Prisma Client
Write-Host "🔧 Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to generate Prisma Client" -ForegroundColor Red
    exit 1
}

# Run database migrations
Write-Host "🗄️ Running database migrations..." -ForegroundColor Yellow
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to run migrations" -ForegroundColor Red
    exit 1
}

# Build the Next.js application
Write-Host "🏗️ Building Next.js application..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

# Run type checking
Write-Host "🔍 Running TypeScript type check..." -ForegroundColor Yellow
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ TypeScript errors found (non-blocking)" -ForegroundColor Yellow
}

# Run linting
Write-Host "🧹 Running linter..." -ForegroundColor Yellow
npm run lint
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Linting warnings found (non-blocking)" -ForegroundColor Yellow
}

Write-Host "✅ Production build complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To start the production server, run:" -ForegroundColor Cyan
Write-Host "  npm start" -ForegroundColor White
Write-Host ""
Write-Host "For process management on Windows, consider using:" -ForegroundColor Cyan
Write-Host "  node-windows or pm2-windows" -ForegroundColor White
