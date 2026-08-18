import { privateKeyToAccount } from "viem/accounts";

const GATEWAY_URL = "https://dp-rpc.vana.org";
const CHAIN_ID = 1480;
const VERIFYING_CONTRACT = "0x8325C0A0948483EdA023A1A2Fd895e62C5131234";
const BUILDER_ADDRESS = "0x5c9a3DfB86839dE29ffa84A7d426bc70EbBAF061";

async function main() {
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

  // Try DELETE first
  const deleteRes = await fetch(`${GATEWAY_URL}/v1/builders/${BUILDER_ADDRESS}`, {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      authorization: `Web3Signed ${signature}`,
    },
    body: JSON.stringify(message),
  });

  console.log("DELETE status:", deleteRes.status);
  console.log("DELETE response:", await deleteRes.text());

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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});