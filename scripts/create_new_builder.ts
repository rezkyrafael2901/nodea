import { privateKeyToAccount, createWalletClient, http } from "viem/accounts";
import { generatePrivateKey } from "viem/accounts";
import { mainnet } from "viem/chains";

const GATEWAY_URL = "https://dp-rpc.vana.org";
const CHAIN_ID = 1480;
const VERIFYING_CONTRACT = "0x8325C0A0948483EdA023A1A2Fd895e62C5131234";
const APP_URL = "https://nodea-vana.vercel.app";

async function main() {
  // Generate new private key
  const newPk = generatePrivateKey();
  console.log("NEW PRIVATE KEY:", newPk);
  console.log("SAVE THIS KEY SECURELY - it will be the new builder key");

  const account = privateKeyToAccount(newPk as `0x${string}`);
  console.log("New builder address:", account.address);
  console.log("New public key:", account.publicKey);

  const message = {
    ownerAddress: account.address,
    granteeAddress: account.address,
    publicKey: account.publicKey,
    appUrl: APP_URL,
  };

  const signature = await account.signTypedData({
    domain: {
      name: "Vana Data Portability",
      version: "1",
      chainId: CHAIN_ID,
      verifyingContract: VERIFYING_CONTRACT as `0x${string}`,
    },
    types: {
      BuilderRegistration: [
        { name: "ownerAddress", type: "address" },
        { name: "granteeAddress", type: "address" },
        { name: "publicKey", type: "string" },
        { name: "appUrl", type: "string" },
      ],
    },
    primaryType: "BuilderRegistration",
    message,
  });

  // Register new builder
  const postRes = await fetch(`${GATEWAY_URL}/v1/builders`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Web3Signed ${signature}`,
    },
    body: JSON.stringify(message),
  });

  console.log("POST status:", postRes.status);
  const postText = await postRes.text();
  console.log("POST response:", postText);

  if (postRes.ok) {
    const data = JSON.parse(postText);
    console.log("\n✅ NEW BUILDER REGISTERED!");
    console.log("Builder ID:", data.builderId);
    console.log("Address:", data.ownerAddress);
    console.log("App URL:", data.appUrl);
    console.log("\n--- NEXT STEPS ---");
    console.log("1. Add this private key to .env.local as VANA_PRIVATE_KEY_NEW");
    console.log("2. Fund escrow for this new address");
    console.log("3. Generate manifest.json with signature from this new key");
    console.log("4. Deploy manifest to https://nodea-vana.vercel.app/manifest.json");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});