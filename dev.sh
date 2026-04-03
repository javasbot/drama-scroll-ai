#!/usr/bin/env bash
set -euo pipefail

# ============================================================
#  DramaScroll AI - Development Runner
#  Starts all services concurrently
# ============================================================
echo "🎭 DramaScroll AI - Starting All Services..."

# Trap to cleanup on exit
cleanup() {
  echo ""
  echo "🛑 Shutting down all services..."
  kill 0 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Start infrastructure
echo "🐳 Starting Docker infrastructure..."
docker-compose up -d 2>/dev/null || docker compose up -d 2>/dev/null || {
  echo "⚠️  Docker not running. Services will use fallback/mock mode."
}

# Wait for infrastructure
sleep 2

# Start Node.js BFF
echo "🟢 Starting Node.js BFF on port 3001..."
(cd backend-node && npm run dev) &
NODE_PID=$!

# Start Frontend
echo "⚛️  Starting Frontend on port 5173..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

# Give services time to start
sleep 3

echo ""
echo "============================================"
echo "🎉 All services running!"
echo ""
echo "🌐 Frontend:     http://localhost:5173"
echo "🟢 Node.js BFF:  http://localhost:3001"
echo "============================================"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for any process to exit
wait
