#!/bin/bash
# Vana App Identity Setup Script
# Run this to generate wallet + setup Vana app for Vana Cup

set -e

echo "👁️ Nodea - App Identity Setup"
echo "=================================="
echo ""

# Step 1: Generate EVM wallet for app identity
echo "Step 1: Generating EVM wallet for app identity..."
if [ -f ".env.local" ]; then
    PRIVATE_KEY=$(grep VANA_PRIVATE_KEY .env.local | cut -d= -f2)
    if [ -n "$PRIVATE_KEY" ] && [ "$PRIVATE_KEY" != "" ]; then
        # Use existing key
        ADDRESS=$(cast wallet address --private-key "$PRIVATE_KEY" 2>/dev/null)
        echo "  ✓ Using existing wallet: $ADDRESS"
    else
        # Generate new wallet
        echo "  Generating new wallet..."
        NEW_KEY=$(cast wallet new --json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['privateKey']); print(d['address'])" 2>/dev/null)
        if [ -n "$NEW_KEY" ]; then
            NEW_PK=$(echo "$NEW_KEY" | head -1)
            NEW_ADDR=$(echo "$NEW_KEY" | tail -1)
            echo "  ✓ New wallet generated: $NEW_ADDR"
            echo "  ⚠️  SAVE THIS KEY! Add to .env.local:"
            echo "     VANA_PRIVATE_KEY=$NEW_PK"
            echo ""
            echo "  To add automatically, run:"
            echo "     echo 'VANA_PRIVATE_KEY=$NEW_PK' >> .env.local"
        else
            echo "  ✗ cast not found. Install foundry:"
            echo "     curl -L https://foundry.paradigm.xyz | bash"
            echo "     foundryup"
        fi
    fi
else
    echo "  .env.local not found. Create it with:"
    echo "     cp .env.example .env.local"
    echo "     nano .env.local"
fi

echo ""
echo "Step 2: Register app at account.vana.org/developers"
echo "  1. Go to https://account.vana.org/developers"
echo "  2. Connect your wallet"
echo "  3. Register app: 'Nodea'"
echo "  4. Set icon and description"
echo "  5. Note your app ID/grantee address"
echo ""
echo "Step 3: Fund escrow (mainnet)"
echo "  Bridge USDC.e to your app escrow address"
echo "  For testnet: use Moksha faucet for VANA"
echo ""
echo "Step 4: Update .env.local with:"
echo "  VANA_APP_NAME=Nodea"
echo "  VANA_NETWORK=mainnet"
echo "  VANA_ESCROW_USDC=<your_escrow_address>"
echo "  VANA_PRIVATE_KEY=<your_private_key>"
