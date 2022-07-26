import { ethers, upgrades } from "hardhat";
import "dotenv/config";

import * as betterBountyJson from "../artifacts/contracts/BetterBounty.sol/BetterBounty.json";

async function main() {
  const betterBountyContract = await ethers.getContractFactory("BetterBounty");

  console.log("Deploying BetterBounty...");

  const betterBounty = await upgrades.deployProxy(betterBountyContract, [], {
    initializer: "initialize",
  });

  await betterBounty.deployed()

  console.log(`Proxy Contract address: ${betterBounty.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
