#!/bin/bash
# Build Rust contract → Deploy via offckb → Copy artifacts to frontend
set -e

NETWORK=${1:-devnet}
echo "Deploying to network: $NETWORK"

# 1. Build the contract
echo "Building contracts..."
make build

# 2. Deploy using offckb
echo "Deploying with offckb..."
if [ -n "$PRIVATE_KEY" ]; then
  echo "Using provided PRIVATE_KEY for deployment..."
  offckb deploy --network $NETWORK --target build/release --output deployment -y --privkey "$PRIVATE_KEY"
else
  offckb deploy --network $NETWORK --target build/release --output deployment -y
fi
# 3. Copy deployment data to frontend
echo "Copying deployment configs to frontend..."
mkdir -p ../frontend/src/deployment
cp deployment/scripts.json ../frontend/src/deployment/

echo "Deployment complete! Frontend config updated."
