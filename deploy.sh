#!/bin/bash
set -e

# =============================================================================
# AI Engineering Room — VPS Deploy Script
# Usage: ./deploy.sh
# Prerequisites: Docker + Docker Compose installed on VPS
# =============================================================================

echo "🚀 Deploying AI Engineering Room..."

# Check prerequisites
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Install it first:"
    echo "   curl -fsSL https://get.docker.com | sh"
    exit 1
fi

# Check .env exists
if [ ! -f .env ]; then
    echo "📝 No .env file found. Creating from template..."
    cp .env.example .env
    echo "⚠️  Edit .env with your credentials before continuing:"
    echo "   nano .env"
    echo ""
    echo "Required: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (for Bedrock)"
    echo "Then re-run: ./deploy.sh"
    exit 1
fi

# Build and start
echo "🔨 Building Docker image..."
docker compose build

echo "📦 Starting services..."
docker compose up -d --remove-orphans

# Initialize database
echo "🗄️  Initializing database..."
sleep 3
sudo DATABASE_URL="file:/var/lib/docker/volumes/reposcope_app-data/_data/production.db" env "PATH=$PATH" npx prisma db push 2>/dev/null || echo "   (DB already initialized)"

echo ""
echo "✅ Deployed successfully!"
echo ""
echo "   App:    https://reposcope.myrepo.xyz"
echo "   Logs:   docker compose logs -f"
echo "   Stop:   docker compose down"
echo "   Update: git pull && docker compose up -d --build"
echo ""
