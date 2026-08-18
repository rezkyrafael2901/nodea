import { privateKeyToAccount } from "viem/accounts";

async function main() {
  // Generated for this environment — no contract or gateway knowledge required.
  const GATEWAY_URL = "https://dp-rpc.vana.org";
  const NETWORK = "mainnet";
  const CHAIN_ID = 1480;
  const VERIFYING_CONTRACT = "0x8325C0A0948483EdA023A1A2Fd895e62C5131234";

  const account = privateKeyToAccount(
    process.env.VANA_PRIVATE_KEY as `0x${string}`,
  );
  const appUrl = process.env.APP_URL!;

  const message = {
    ownerAddress: account.address,
    granteeAddress: account.address,
    publicKey: account.publicKey,
    appUrl,
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

  const response = await fetch(`${GATEWAY_URL}/v1/builders`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Web3Signed ${signature}`,
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    throw new Error(
      `Registration failed (${response.status}): ${await response.text()}`,
    );
  }

  console.log("Registered app identity:", account.address);
  console.log("appUrl:", appUrl);
  const body = await response.text();
  console.log("response:", body);
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});