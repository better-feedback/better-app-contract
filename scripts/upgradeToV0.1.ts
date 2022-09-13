import { ethers, upgrades } from "hardhat";
import "dotenv/config";

async function main() {
  const betterBountyContract = await ethers.getContractFactory(
    "BetterBountyV1"
  );

  console.log("UPGRADING BetterBounty...");

  const betterBounty = await upgrades.upgradeProxy(
    "PUT PROXY ADDRESS HERE",
    betterBountyContract,
    {}
  );

  await betterBounty.deployed();

  console.log(`Proxy Contract address: ${betterBounty.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
