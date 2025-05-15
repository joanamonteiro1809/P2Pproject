const hre = require("hardhat");

  // deploy-token.js
async function main() {
  const SplitwiseToken = await hre.ethers.getContractFactory("SplitwiseToken");
  const token = await SplitwiseToken.deploy();

  await token.deployed();
  console.log("SplitwiseToken deployed to:", token.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
