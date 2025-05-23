const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const SplitwiseTokenModule = buildModule("SplitwiseTokenModule", async (m) => {
  const token = m.contract("SplitwiseToken");

  // Get deployer's address dynamically
  //const deployer = await m.ethers.getSigner();
  //const initialHolder = await deployer.getAddress();
  const initialHolder = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199"; // Replace with the actual deployer address
  const mintAmount = "1000000000000000000000"; // 1000 tokens

  m.send(token.mint, [initialHolder, mintAmount]);

  return { token };
});

module.exports = SplitwiseTokenModule;
