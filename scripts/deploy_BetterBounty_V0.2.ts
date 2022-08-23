import { ethers, upgrades } from "hardhat";
import "dotenv/config";

import * as betterBountyJson from "../artifacts/contracts/BetterBounty.sol/BetterBounty.json";

async function main() {
  const betterBountyContract = await ethers.getContractFactory("BetterBounty");

  console.log("Deploying BetterBounty...");

  const proxyAddress = process.env.PROXY_ADDRESS;

  const betterBounty = await upgrades.upgradeProxy(
    proxyAddress as string,
    betterBountyContract,
    {
      kind: "uups",
    }
  );

  await betterBounty.deployed();

  console.log(`Proxy Contract address: ${betterBounty.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
