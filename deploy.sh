#!/bin/bash

echo "🚀 Starting Deployment..."

# 1. Update Code
echo "📥 Pulling latest changes..."
git pull

# 2. Install Dependencies (Frontend)
echo "📦 Installing Frontend Dependencies..."
npm install

# 3. Build Frontend
echo "🏗️ Building Frontend..."
npm run build

# 4. Backend Setup
echo "🔙 Setting up Backend..."
cd server
echo "📦 Installing Backend Dependencies..."
npm install
echo "🏗️ Building Backend..."
npm run build

# 5. Run Critical Migrations
echo "🗄️ Running Database Optimizations..."
# Always run performance indexes migration to ensure DB is fast
if [ -f "migration_performance_indexes.cjs" ]; then
    node migration_performance_indexes.cjs
fi
if [ -f "migration_harden_roles.cjs" ]; then
    node migration_harden_roles.cjs
fi
if [ -f "migration_force_ggcamou.cjs" ]; then
    node migration_force_ggcamou.cjs
fi

cd ..

# 6. Restart Services
echo "🔄 Restarting Application..."
pm2 restart all

echo "✅ DEPLOYMENT COMPLETE! 🚀"
