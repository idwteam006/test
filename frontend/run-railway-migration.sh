#!/bin/bash

# Railway Migration Script for Leave Management Module
# This script will run the Prisma migration on Railway

set -e  # Exit on error

echo "🚂 Railway Migration Script - Leave Management Module"
echo "=================================================="
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${YELLOW}⚠️  Railway CLI not found in PATH${NC}"
    echo "Checking alternative locations..."

    # Try to find Railway CLI
    RAILWAY_PATH=$(find ~ -name railway -type f 2>/dev/null | head -1)

    if [ -z "$RAILWAY_PATH" ]; then
        echo -e "${YELLOW}Installing Railway CLI...${NC}"
        curl -fsSL https://railway.app/install.sh | sh

        # Try to find it again
        RAILWAY_PATH=$(find ~ -name railway -type f 2>/dev/null | head -1)
    fi

    if [ -n "$RAILWAY_PATH" ]; then
        echo -e "${GREEN}✓ Found Railway CLI at: $RAILWAY_PATH${NC}"
        alias railway="$RAILWAY_PATH"
    else
        echo -e "${YELLOW}❌ Could not find or install Railway CLI${NC}"
        echo "Please install manually:"
        echo "  curl -fsSL https://railway.app/install.sh | sh"
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}Step 1: Login to Railway${NC}"
echo "A browser window will open. Please authorize the CLI."
echo ""
railway login

echo ""
echo -e "${BLUE}Step 2: Link to your project${NC}"
echo "Select your Zenora project from the list."
echo ""
cd /Volumes/E/zenora/frontend
railway link

echo ""
echo -e "${BLUE}Step 3: Running database migration${NC}"
echo "This will push the schema changes to your Railway database..."
echo ""

# Option 1: Use Prisma db push (fastest)
echo "Running: npx prisma db push"
railway run npx prisma db push

echo ""
echo -e "${GREEN}✓ Migration completed successfully!${NC}"
echo ""

echo -e "${BLUE}Step 4: Generating Prisma client${NC}"
railway run npx prisma generate

echo ""
echo -e "${GREEN}✓ Prisma client generated!${NC}"
echo ""

echo "=================================================="
echo -e "${GREEN}🎉 Migration Complete!${NC}"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Redeploy your frontend: railway up"
echo "2. Visit your app and navigate to /admin/leave/balance-management"
echo "3. Allocate leave balances for your employees"
echo ""
echo "New features available:"
echo "  - /admin/leave/balance-management (Balance allocation)"
echo "  - /manager/leave-calendar (Team calendar)"
echo "  - /admin/leave/reports (Reports & analytics)"
echo ""
