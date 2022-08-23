import { ethers } from "hardhat";
import "dotenv/config";

import * as betterBountyJson from "../artifacts/contracts/BetterBountyV0.2.sol/BetterBountyV2.json";

async function main() {
  
  const betterBountyContract = await ethers.getContractFactory("BetterBountyV2");


  const ballotContract = await betterBountyContract.deploy("betterhq");
  await ballotContract.deployed();
  console.log(`Contract address: ${ballotContract.address}`);

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});