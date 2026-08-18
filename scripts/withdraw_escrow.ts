import { createWalletClient, http, parseEther, getContract, createPublicClient, encodeFunctionData, hexToBytes, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { vana } from "viem/chains";
import * as fs from "fs";

const RPC_URL = "https://rpc.vana.org";

// Load private key from .env.local
const envContent = fs.readFileSync("/home/ubuntu/nodea/.env.local", "utf-8");
const PRIVATE_KEY = (envContent.match(/VANA_PRIVATE_KEY=(0x[^\n]+)/)?.[1] ?? "") as `0x${string}`;
if (!PRIVATE_KEY) throw new Error("VANA_PRIVATE_KEY not found in .env.local");
console.log("Loaded private key:", PRIVATE_KEY.slice(0, 10) + "...");

const ESCROW = "0x07d7769081adc3a3DBe91f5E4B98E9A5a6B292e3";
const USDC_E = "0xf1815bd50389c46847f0bda824ec8da914045d14";
const OWNER = "0x5c9a3DfB86839dE29ffa84A7d426bc70EbBAF061";

const ESCROW_ABI = [
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "auth", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "token", type: "address" },
      { name: "account", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const USDC_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

async function main() {
  const account = privateKeyToAccount(PRIVATE_KEY);
  console.log("Account:", account.address);

  const publicClient = createPublicClient({
    chain: vana,
    transport: http(RPC_URL),
  });

  const walletClient = createWalletClient({
    account,
    chain: vana,
    transport: http(RPC_URL),
  });

  const escrow = getContract({ address: ESCROW, abi: ESCROW_ABI, client: publicClient });
  const usdc = getContract({ address: USDC_E, abi: USDC_ABI, client: publicClient });

  // Check balances before
  const escrowBal = await escrow.read.balanceOf([USDC_E, ESCROW]);
  const ownerBal = await usdc.read.balanceOf([account.address]);
  console.log(`Escrow USDC.e balance: ${Number(escrowBal) / 1e6} USDC.e`);
  console.log(`Owner USDC.e balance: ${Number(ownerBal) / 1e6} USDC.e`);

  // Check VANA balance
  const vanaBal = await publicClient.getBalance({ address: account.address });
  console.log(`Owner VANA balance: ${vanaBal / 10n ** 18n} VANA`);

  // Get current nonce for EIP-3009
  // EIP-3009: withdrawWithAuthorization(token, to, value, validAfter, validBefore, nonce)
  // auth = keccak256(abi.encode(token, to, value, validAfter, validBefore, nonce))
  // Then sign the auth hash with private key
  // The contract will verify the signature matches the owner

  // For Vana escrow, the auth is likely a simple EIP-3009 authorization
  // Let's check the contract to understand the exact format
  // We'll use the standard EIP-3009 format

  const amount = escrowBal; // withdraw full balance
  const validAfter = BigInt(Math.floor(Date.now() / 1000));
  const validBefore = validAfter + 86400n; // 24 hours
  const nonce = 0n; // simple nonce

  // EIP-3009 authorization message
  const domain = {
    name: "Bridged USDC (Stargate)",
    version: "1",
    chainId: 1480,
    verifyingContract: USDC_E,
  };

  // The authorization struct for EIP-3009
  // We need to sign: approve(spender, value, deadline, nonce) but for withdraw it's different
  // Let's try the standard withdrawWithAuthorization pattern

  // Actually, looking at the withdraw function: withdraw(token, to, amount, auth)
  // The auth is likely a signed message authorizing the escrow to pull tokens
  // Let's check what the contract expects by looking at similar implementations

  // For now, let's try to call withdraw with a dummy auth to see the error
  // Then we can understand the format
  console.log("\nAttempting withdraw...");

  // First, let's check if there's a specific authorization format
  // We'll try with a zero auth first to see revert reason
  try {
    const hash = await walletClient.writeContract({
      address: ESCROW,
      abi: ESCROW_ABI,
      functionName: "withdraw",
      args: [USDC_E, account.address, amount, "0x0000000000000000000000000000000000000000000000000000000000000000"],
    });
    console.log("Tx hash:", hash);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("Receipt:", receipt);
  } catch (e: any) {
    console.log("Error (expected):", e.message);
  }

  // The auth format needs to be determined
  // Let's check the contract code more carefully
}

main().catch(console.error);