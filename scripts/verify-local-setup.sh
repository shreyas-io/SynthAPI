#!/bin/bash
set -e

echo "=== Verifying Local Development Setup ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if running in correct directory
if [ ! -f "docker-compose.yml" ]; then
    check_fail "Must run from project root (docker-compose.yml not found)"
fi

# Check docker compose is running
echo "1. Checking Docker Compose services..."
if ! docker compose ps &> /dev/null; then
    check_fail "Docker Compose is not running. Start with: docker compose up --build"
fi

if docker compose ps | grep -q "synthapi-api.*Up"; then
    check_pass "API service is running"
else
    check_fail "API service is not running"
fi

if docker compose ps | grep -q "synthapi-postgres.*healthy"; then
    check_pass "Postgres service is healthy"
else
    check_fail "Postgres service is not healthy"
fi

if docker compose ps | grep -q "synthapi-web.*Up"; then
    check_pass "Web service is running"
else
    check_fail "Web service is not running"
fi

if docker compose ps | grep -q "synthapi-landing.*Up"; then
    check_pass "Landing service is running"
else
    check_fail "Landing service is not running"
fi

if docker compose ps | grep -q "synthapi-python-runner-lambda.*Up"; then
    check_pass "Python Runner Lambda service is running"
else
    check_fail "Python Runner Lambda service is not running"
fi

echo ""
echo "2. Testing API endpoints..."

# Test health endpoint
HEALTH_RESPONSE=$(curl -s http://localhost:8787/health)
if echo "$HEALTH_RESPONSE" | grep -q '"app":"ok"'; then
    check_pass "API health endpoint returns ok"
else
    check_fail "API health endpoint failed"
fi

if echo "$HEALTH_RESPONSE" | grep -q '"db":true'; then
    check_pass "Database connectivity verified"
else
    check_fail "Database connectivity failed"
fi

echo ""
echo "3. Testing database connection..."

if psql "postgresql://user:password@localhost:5432/mock_api" -c "SELECT 1;" &> /dev/null; then
    check_pass "Direct database connection works"
else
    check_fail "Cannot connect to database directly"
fi

# Check if tables exist (migrations ran)
TABLE_COUNT=$(psql "postgresql://user:password@localhost:5432/mock_api" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d ' ')
if [ "$TABLE_COUNT" -ge 1 ]; then
    check_pass "Database tables exist (migrations ran)"
else
    check_warn "No tables found - migrations may not have run"
fi

echo ""
echo "4. Checking for binding initialization in logs..."

if docker compose logs api 2>&1 | grep -qi "kv"; then
    check_pass "KV binding initialized"
else
    check_warn "Could not verify KV binding initialization (check logs manually)"
fi

if docker compose logs api 2>&1 | grep -qi "durable\|rate.limit"; then
    check_pass "Durable Object binding initialized"
else
    check_warn "Could not verify DO binding initialization (check logs manually)"
fi

echo ""
echo "5. Testing frontend endpoints..."

if curl -s http://localhost:5173 | grep -qi "html"; then
    check_pass "Web frontend is serving"
else
    check_fail "Web frontend is not responding"
fi

if curl -s http://localhost:5174 | grep -qi "html"; then
    check_pass "Landing page is serving"
else
    check_fail "Landing page is not responding"
fi

echo ""
echo "6. Testing Python Lambda endpoint..."

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9001)
if [ "$HTTP_CODE" = "200" ]; then
    check_pass "Python Lambda is responding"
else
    check_warn "Python Lambda may not be fully ready (HTTP code: $HTTP_CODE)"
fi

echo ""
echo -e "${GREEN}=== All critical checks passed! ===${NC}"
echo ""
echo "Services are running at:"
echo "  API:     http://localhost:8787"
echo "  Web:     http://localhost:5173"
echo "  Landing: http://localhost:5174"
echo "  Lambda:  http://localhost:9001"
echo "  Postgres: localhost:5432"
echo ""
echo "Test the API:"
echo "  curl http://localhost:8787/health"
echo "  curl http://localhost:8787/api/v1/projects"
echo ""
echo "View logs:"
echo "  docker compose logs -f api"
echo "  docker compose logs -f web"
