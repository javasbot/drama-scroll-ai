#!/usr/bin/env bash
set -euo pipefail

# ============================================================
#  DramaScroll AI - Project Setup Script
# ============================================================
echo "🎭 DramaScroll AI - Setting Up Project..."
echo "============================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check prerequisites
check_command() {
  if ! command -v "$1" &> /dev/null; then
    echo -e "${RED}❌ $1 is not installed. Please install it first.${NC}"
    return 1
  fi
  echo -e "${GREEN}✅ $1 found${NC}"
}

echo ""
echo "📋 Checking prerequisites..."
check_command "node"
check_command "npm"
check_command "docker"
check_command "java" || echo -e "${YELLOW}⚠️  Java not found. Java backend will not be available.${NC}"

# ============================================================
# Step 1: Start Docker infrastructure
# ============================================================
echo ""
echo "🐳 Step 1: Starting Docker infrastructure..."
if command -v docker &> /dev/null; then
  docker-compose up -d 2>/dev/null || docker compose up -d 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Docker Compose failed. Make sure Docker is running.${NC}"
  }
else
  echo -e "${YELLOW}⚠️  Docker not available. Skipping infrastructure setup.${NC}"
fi

# ============================================================
# Step 2: Install Frontend dependencies
# ============================================================
echo ""
echo "⚛️  Step 2: Setting up Frontend..."
cd frontend
cp -n .env.example .env 2>/dev/null || true
npm install
echo -e "${GREEN}✅ Frontend ready${NC}"
cd ..

# ============================================================
# Step 3: Install Node.js BFF dependencies
# ============================================================
echo ""
echo "🟢 Step 3: Setting up Node.js BFF..."
cd backend-node
cp -n .env.example .env 2>/dev/null || true
npm install
echo -e "${GREEN}✅ Node.js BFF ready${NC}"
cd ..

# ============================================================
# Step 4: Setup Java Backend
# ============================================================
echo ""
echo "☕ Step 4: Setting up Java Backend..."
if command -v java &> /dev/null; then
  cd backend-java
  if [ -f "mvnw" ]; then
    chmod +x mvnw
    ./mvnw dependency:resolve -q 2>/dev/null || echo -e "${YELLOW}⚠️  Maven dependency resolution failed (non-critical)${NC}"
  elif command -v mvn &> /dev/null; then
    mvn dependency:resolve -q 2>/dev/null || echo -e "${YELLOW}⚠️  Maven dependency resolution failed (non-critical)${NC}"
  else
    echo -e "${YELLOW}⚠️  Neither mvnw nor mvn found. Please install Maven.${NC}"
  fi
  echo -e "${GREEN}✅ Java Backend ready${NC}"
  cd ..
else
  echo -e "${YELLOW}⚠️  Java not available. Skipping Java backend setup.${NC}"
fi

# ============================================================
# Done
# ============================================================
echo ""
echo "============================================"
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo ""
echo "To start development:"
echo ""
echo "  1. Frontend:     cd frontend && npm run dev"
echo "  2. Node.js BFF:  cd backend-node && npm run dev"
echo "  3. Java Backend: cd backend-java && ./mvnw spring-boot:run"
echo ""
echo "  Infrastructure:  docker-compose up -d  (Redis + PostgreSQL)"
echo ""
echo "🌐 Frontend:     http://localhost:5173"
echo "🟢 Node.js BFF:  http://localhost:3001"
echo "☕ Java Backend: http://localhost:8080"
echo ""
echo -e "${YELLOW}⚡ Don't forget to configure API keys in .env files!${NC}"
echo "============================================"
