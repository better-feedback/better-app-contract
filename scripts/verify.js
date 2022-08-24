const { ethers } = require("hardhat");
require("dotenv").config({ path: ".env" });
require("@nomiclabs/hardhat-etherscan");
async function main() {
  // Verify the contract after deploying
  await hre.run("verify:verify", {
    address: "WRITE THE CONTRACT ADDRESS HERE",
    constructorArguments: [],
    
  });
}
// Call the main function and catch if there is any error
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
