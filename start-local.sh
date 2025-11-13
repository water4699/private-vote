#!/bin/bash

echo "🚀 Starting Private Pool Vault - Local Development"
echo "=================================================="

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start Hardhat node in background
echo "🏭 Starting Hardhat local node..."
npx hardhat node > hardhat.log 2>&1 &
HARDHAT_PID=$!

# Wait for node to start
echo "⏳ Waiting for Hardhat node to initialize..."
sleep 5

# Deploy contracts
echo "📄 Deploying contracts to local network..."
npx hardhat run scripts/deploy.ts --network localhost

# Start frontend
echo "🌐 Starting frontend development server..."
npm run dev

# Cleanup when script exits
trap "echo '🛑 Stopping Hardhat node...'; kill $HARDHAT_PID 2>/dev/null" EXIT
