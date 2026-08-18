import { privateKeyToAccount, createWalletClient, http, parseEther, parseUnits } from "viem/accounts";
import { mainnet } from "viem/chains";
import * as fs from "fs";
import * as path from "path";

const ESCROW_CONTRACT = "0x07d7769081adc3a3DBe91f5E4B98E9A5a6B292e3";
const USDC_E = "0x9dC0c93F28552165eC0A4428C4A8F3B4eF8b478F"; // USDC.e on Vana mainnet (chain 1480)
const RPC_URL = "https://rpc.vana.org";

const ERC20_ABI = [
  { "inputs": [{"name": "spender", "type": "address"}, {"name": "amount", "type": "uint256"}], "name": "approve", "outputs": [{"name": "", "type": "bool"}], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{"name": "owner", "type": "address"}, {"name": "spender", "type": "address"}], "name": "allowance", "outputs": [{"name": "", "type": "uint256"}], "stateMutability": "view", "type": "function" },
  { "inputs": [{"name": "account", "type": "address"}], "name": "balanceOf", "outputs": [{"name": "", "type": "uint256"}], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "decimals", "outputs": [{"name": "", "type": "uint8"}], "stateMutability": "view", "type": "function" },
];

const ESCROW_ABI = [
  { "inputs": [{"name": "token", "type": "address"}, {"name": "amount", "type": "uint256"}, {"name": "deadline", "type": "uint256"}, {"name": "v", "type": "uint8"}, {"name": "r", "type": "bytes32"}, {"name": "s", "type": "bytes32"}], "name": "depositTokenWithAuthorization", "outputs": [], "stateMutability": "nonpayable", "type: "function" },
  { "inputs": [{"name": "grantee", "type": "address"}], "name": "granteeBalances", "outputs": [{"name": "token", "type": "address"}, {"name": "amount", "type": "uint256"}], "stateMutability": "view", "type": "function" },
];

async function main() {
  // Load new private key
  const pk = "0x0c809098495558b5d56ffd26c726579376aa7e4be3cd2471dcdbd67bdc9eae71";
  const account = privateKeyToAccount(pk as `0x${string}`);
  console.log("Funding escrow for:", account.address);

  const walletClient = createWalletClient({
    account,
    chain: { ...mainnet, id: 1480, rpcUrls: { default: { http: [RPC_URL] } } },
    transport: http(RPC_URL),
  });

  const publicClient = walletClient.extend({ public: true });

  // Check USDC.e balance
  const balance = await publicClient.readContract({
    address: USDC_E,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [account.address],
  });
  console.log("USDC.e balance:", balance.toString());

  const decimals = await publicClient.readContract({
    address: USDC_E,
    abi: ERC20_ABI,
    functionName: "decimals",
  });

  // Check allowance
  const allowance = await publicClient.readContract({
    address: USDC_E,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [account.address, ESCROW_CONTRACT],
  });
  console.log("Current allowance:", allowance.toString());

  // Deposit 5 USDC.e (same as before)
  const depositAmount = parseUnits("5", decimals);
  console.log("Deposit amount:", depositAmount.toString());

  // Use EIP-3009 authorization (gas-sponsored)
  const nonce = BigInt(Date.now());
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

  // Build EIP-3009 message
  const domain = {
    name: "USD Coin",
    version: "2",
    chainId: 1480,
    verifyingContract: USDC_E,
  };

  const types = {
    TransferWithAuthorization: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
    ],
  };

  const message = {
    from: account.address,
    to: ESCROW_CONTRACT,
    value: depositAmount,
    validAfter: 0n,
    validBefore: deadline,
    nonce: nonce,
  };

  const sig = await account.signTypedData({ domain, types, primaryType: "TransferWithAuthorization", message });
  console.log("EIP-3009 signature:", sig);

  // Deposit with authorization
  const { v, r, s } = {
    v: parseInt(sig.slice(0, 2), 16),
    r: "0x" + sig.slice(2, 66),
    s: "0x" + sig.slice(66, 130),
  };

  console.log("Submitting deposit...");
  const hash = await walletClient.writeContract({
    address: ESCROW_CONTRACT,
    abi: ESCROW_ABI,
    functionName: "depositTokenWithAuthorization",
    args: [USDC_E, depositAmount, deadline, v, r, s],
  });

  console.log("Tx hash:", hash);
  console.log("Waiting for confirmation...");

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("✅ Deposit confirmed! Block:", receipt.blockNumber);
  console.log("Gas used:", receipt.gasUsed.toString());

  // Check escrow balance
  const escrowBalance = await publicClient.readContract({
    address: ESCROW_CONTRACT,
    abi: ESCROW_ABI,
    functionName: "granteeBalances",
    args: [account.address],
  });
  console.log("Escrow balance:", escrowBalance);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});