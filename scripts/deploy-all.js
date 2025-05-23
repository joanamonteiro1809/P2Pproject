const { ethers } = require("hardhat");

async function main() {
  const Token = await ethers.getContractFactory("SplitwiseToken");
  const token = await Token.deploy(); 
  console.log("Token deployed at:", token.target); 

  const Splitwise = await ethers.getContractFactory("Splitwise");
  const splitwise = await Splitwise.deploy(token.target);
  console.log("Splitwise deployed at:", splitwise.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


