const hre = require("hardhat");

  // deploy-token.js
async function main() {
  const Token = await ethers.getContractFactory("SplitwiseToken");
    const token = await Token.deploy(); // já aguarda deploy completo
    console.log("Token deployed at:", token.target); // endereço
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
