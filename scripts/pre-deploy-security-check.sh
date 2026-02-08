#!/bin/bash
# Pre-deployment security validation
# Prevents deployment of vulnerable code

set -euo pipefail

echo "=== PRE-DEPLOYMENT SECURITY CHECK ==="

# 1. Check Next.js version (CRITICAL - prevent CVE-2025-66478)
NEXTJS_VERSION=$(node -p "require('./package.json').dependencies.next" | tr -d '^~>=')
REQUIRED_VERSION="16.1.6"

if ! npx semver "$NEXTJS_VERSION" -r ">=$REQUIRED_VERSION"; then
    echo "❌ FAIL: Next.js $NEXTJS_VERSION vulnerable to CVE-2025-66478"
    echo "Required: >= $REQUIRED_VERSION"
    exit 1
fi
echo "✅ Next.js version: $NEXTJS_VERSION (patched)"

# 2. npm audit (CRITICAL)
echo "Running npm audit..."
npm audit --audit-level=high --production
if [ $? -ne 0 ]; then
    echo "❌ FAIL: High/critical vulnerabilities found"
    exit 1
fi
echo "✅ No high/critical vulnerabilities"

# 3. Verify withRetry usage in critical routes
echo "Checking database retry logic..."
ROUTES_WITHOUT_RETRY=$(grep -r "prisma\." src/app/api --include="*.ts" | 
    grep -v "withRetry" | 
    grep -v "import" | 
    grep -E "prisma\.(user|battle|box|card|transaction|order)" || true)

if [ -n "$ROUTES_WITHOUT_RETRY" ]; then
    echo "⚠️  WARNING: Routes without withRetry found:"
    echo "$ROUTES_WITHOUT_RETRY"
    echo "Consider wrapping in withRetry for stability"
fi

# 4. Verify global error handlers exist
if ! grep -q "unhandledRejection" src/instrumentation.ts 2>/dev/null; then
    echo "❌ FAIL: Missing unhandledRejection handler in src/instrumentation.ts"
    exit 1
fi
echo "✅ Global error handlers present"

# 5. Verify DATABASE_URL has connection pooling
if ! grep -q "connection_limit" .env* 2>/dev/null; then
    echo "⚠️  WARNING: DATABASE_URL missing connection_limit parameter"
    echo "Add: ?connection_limit=10&pool_timeout=30"
fi

# 6. Check for sensitive data in code
echo "Scanning for hardcoded secrets..."
if grep -r "password.*=.*['\"]" src/ --include="*.ts" --include="*.tsx" | grep -v "passwordHash" | grep -v "type" | grep -v "interface" | grep -v "password:" | grep -v "// " | grep -v "/\*"; then
    echo "⚠️  WARNING: Possible hardcoded credentials found"
fi

# 7. Verify PM2 config exists
if [ ! -f "ecosystem.config.cjs" ]; then
    echo "❌ FAIL: ecosystem.config.cjs not found"
    exit 1
fi
echo "✅ PM2 configuration present"

# 8. Verify Prisma schema exists
if [ ! -f "prisma/schema.prisma" ]; then
    echo "❌ FAIL: prisma/schema.prisma not found"
    exit 1
fi
echo "✅ Prisma schema present"

# 9. Check for TypeScript errors
echo "Running TypeScript check..."
npm run typecheck 2>&1 | tee /tmp/typecheck.log
if [ ${PIPESTATUS[0]} -ne 0 ]; then
    echo "❌ FAIL: TypeScript errors found"
    cat /tmp/typecheck.log
    exit 1
fi
echo "✅ TypeScript check passed"

# 10. Verify environment variables template
if [ ! -f ".env.example" ] && [ ! -f ".env.production.example" ]; then
    echo "⚠️  WARNING: No .env.example or .env.production.example found"
fi

echo "=== PRE-DEPLOYMENT CHECK COMPLETE ==="
echo ""
echo "✅ All critical checks passed!"
echo "⚠️  Review any warnings above before deploying"
