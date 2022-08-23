import { ethers, upgrades } from "hardhat";
import "dotenv/config";

import * as betterBountyJson from "../artifacts/contracts/BetterBounty.sol/BetterBounty.json";

async function main() {
  const betterBountyContract = await ethers.getContractFactory("BetterBounty");

  const proxyAddress = process.env.PROXY_ADDRESS;

  if (!proxyAddress) return console.log("No proxy address found");

  console.log("Importing network for proxy : ", proxyAddress);

  const proxyContract = await upgrades.forceImport(
    proxyAddress as string,
    betterBountyContract,
    {
      kind: "uups",
    }
  );

  console.log(`Completed ${proxyContract}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
