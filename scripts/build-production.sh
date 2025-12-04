#!/bin/bash

# Production Build Script for Pack Attack
# This script prepares the application for production deployment

echo "🚀 Starting Production Build Process..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with required environment variables."
    echo "See .env.example for reference."
    exit 1
fi

# Check for required environment variables
required_vars=("DATABASE_URL" "NEXTAUTH_URL" "NEXTAUTH_SECRET")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: $var is not set in .env file!"
        exit 1
    fi
done

echo "✅ Environment variables verified"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Run database migrations
echo "🗄️ Running database migrations..."
npx prisma migrate deploy

# Build the Next.js application
echo "🏗️ Building Next.js application..."
npm run build

# Run type checking
echo "🔍 Running TypeScript type check..."
npx tsc --noEmit

# Run linting
echo "🧹 Running linter..."
npm run lint

echo "✅ Production build complete!"
echo ""
echo "To start the production server, run:"
echo "  npm start"
echo ""
echo "For process management, consider using PM2:"
echo "  pm2 start npm --name 'packattack' -- start"


