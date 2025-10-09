#!/bin/bash

# p0qp0q-IK-Solver Documentation Deployment Script
# Deploys HTML documentation to poqpoq.com

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"
REMOTE_USER="ubuntu"
REMOTE_HOST="poqpoq.com"
REMOTE_DIR="/var/www/ik-solver-docs"
SSH_KEY="$HOME/.ssh/poqpoq2025.pem"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 p0qp0q-IK-Solver Documentation Deployment${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}❌ Error: SSH key not found at $SSH_KEY${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Configuration:${NC}"
echo -e "   Local:  ${LOCAL_DIR}"
echo -e "   Remote: ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}"
echo ""

# Test SSH connection
echo -e "${YELLOW}🔐 Testing SSH connection...${NC}"
if ssh -i "$SSH_KEY" -o ConnectTimeout=5 -o BatchMode=yes "$REMOTE_USER@$REMOTE_HOST" exit 2>/dev/null; then
    echo -e "${GREEN}✅ SSH connection successful${NC}"
else
    echo -e "${RED}❌ Error: Cannot connect to server${NC}"
    exit 1
fi
echo ""

# Create remote directory if it doesn't exist
echo -e "${YELLOW}📁 Ensuring remote directory exists...${NC}"
ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" "sudo mkdir -p $REMOTE_DIR && sudo chown ubuntu:www-data $REMOTE_DIR"
echo -e "${GREEN}✅ Directory ready${NC}"
echo ""

# Deploy files
echo -e "${YELLOW}📤 Uploading documentation files...${NC}"
rsync -avz --delete \
  --exclude '.git' \
  --exclude '*.sh' \
  --exclude 'DEPLOYMENT.md' \
  -e "ssh -i $SSH_KEY" \
  "$LOCAL_DIR/" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Files uploaded successfully${NC}"
else
    echo -e "${RED}❌ Error uploading files${NC}"
    exit 1
fi
echo ""

# Set permissions
echo -e "${YELLOW}🔒 Setting permissions...${NC}"
ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" \
  "sudo chown -R ubuntu:www-data $REMOTE_DIR && sudo chmod -R 755 $REMOTE_DIR && sudo chmod 644 $REMOTE_DIR/*.html $REMOTE_DIR/css/*.css 2>/dev/null || true"
echo -e "${GREEN}✅ Permissions set${NC}"
echo ""

# Create symlink to models if needed
echo -e "${YELLOW}🔗 Creating symlink to model images...${NC}"
ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" \
  "if [ ! -L $REMOTE_DIR/models ]; then ln -sf /home/ubuntu/ik-solver/models $REMOTE_DIR/models || echo 'Symlink already exists or models directory not found'; fi"
echo -e "${GREEN}✅ Symlink checked${NC}"
echo ""

# Test deployment
echo -e "${YELLOW}🧪 Testing deployment...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://poqpoq.com/ik-solver-docs/ || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Documentation is live and accessible!${NC}"
elif [ "$HTTP_CODE" = "000" ]; then
    echo -e "${YELLOW}⚠️  Could not test (curl failed), but files are deployed${NC}"
else
    echo -e "${YELLOW}⚠️  HTTP $HTTP_CODE - Check Apache configuration${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}🌐 Documentation URL:${NC}"
echo -e "   ${BLUE}https://poqpoq.com/ik-solver-docs/${NC}"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo -e "   1. Visit the URL above to verify deployment"
echo -e "   2. Check that images and styles load correctly"
echo -e "   3. Test navigation between pages"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
