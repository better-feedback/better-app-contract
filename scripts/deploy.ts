import { ethers } from "hardhat";
import "dotenv/config";

import * as betterBountyJson from "../artifacts/contracts/BetterBounty.sol/BetterBounty.json";

async function main() {
  
  const betterBountyContract = await ethers.getContractFactory("BetterBounty");


  const ballotContract = await betterBountyContract.deploy();
  await ballotContract.deployed();
  console.log(`Contract address: ${ballotContract.address}`);

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
