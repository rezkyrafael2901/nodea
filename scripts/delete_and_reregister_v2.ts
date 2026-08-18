import * as fs from "fs";
import * as path from "path";
import { privateKeyToAccount } from "viem/accounts";

const GATEWAY_URL = "https://dp-rpc.vana.org";
const CHAIN_ID = 1480;
const VERIFYING_CONTRACT = "0x8325C0A0948483EdA023A1A2Fd895e62C5131234";
const BUILDER_ID = "0xf3dc77edc03e5492cccb5b6c7f86a76feb7cf71fb8a016d3bbc17e590b601d44";
const APP_URL = "https://nodea-vana.vercel.app";

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  const content = fs.readFileSync(envPath, "utf-8");
  const lines = content.split("\n");
  const env: Record<string, string> = {};
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim();
    }
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const pk = env.VANA_PRIVATE_KEY?.trim();
  console.log("PK length:", pk?.length, "starts with 0x:", pk?.startsWith("0x"));
  const account = privateKeyToAccount(pk as `0x${string}`);

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

  // Try DELETE with builderId
  const deleteRes = await fetch(`${GATEWAY_URL}/v1/builders/${BUILDER_ID}`, {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      authorization: `Web3Signed ${signature}`,
    },
    body: JSON.stringify(message),
  });

  console.log("DELETE status:", deleteRes.status);
  const deleteText = await deleteRes.text();
  console.log("DELETE response:", deleteText);

  if (deleteRes.ok) {
    console.log("DELETE success! Now POST new registration...");
    // Then POST (re-register)
    const postRes = await fetch(`${GATEWAY_URL}/v1/builders`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Web3Signed ${signature}`,
      },
      body: JSON.stringify(message),
    });

    console.log("POST status:", postRes.status);
    console.log("POST response:", await postRes.text());
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});