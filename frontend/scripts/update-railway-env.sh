#!/bin/bash

# Railway Environment Variables Update Script
# This script helps you update .env.local with Railway credentials

echo "🚂 Railway Environment Setup"
echo "================================"
echo ""

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Install it first:"
    echo "npm i -g @railway/cli"
    exit 1
fi

# Check if linked to Railway project
if ! railway status &> /dev/null; then
    echo "❌ Not linked to Railway project. Run: railway link"
    exit 1
fi

echo "✅ Connected to Railway project"
echo ""

# Get DATABASE_URL
echo "Getting DATABASE_URL..."
DATABASE_URL=$(railway variables get DATABASE_URL 2>/dev/null)

if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL not found. Add PostgreSQL: railway add --database postgresql"
else
    echo "✅ DATABASE_URL found"
fi

# Get REDIS_URL
echo "Getting REDIS_URL..."
REDIS_URL=$(railway variables get REDIS_URL 2>/dev/null)

if [ -z "$REDIS_URL" ]; then
    echo "⚠️  REDIS_URL not found. Add Redis: railway add --database redis"
else
    echo "✅ REDIS_URL found"
fi

echo ""
echo "================================"
echo "📋 Your Railway Credentials:"
echo "================================"
echo ""
echo "DATABASE_URL:"
echo "$DATABASE_URL"
echo ""
echo "REDIS_URL:"
echo "$REDIS_URL"
echo ""
echo "================================"
echo ""
echo "Copy these values to your .env.local file"
echo "Or run: railway run npm run dev"
echo ""
