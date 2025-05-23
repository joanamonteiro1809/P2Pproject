const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const SplitwiseTokenModule = buildModule("SplitwiseTokenModule", async (m) => {
  const token = m.contract("SplitwiseToken");

  // Get deployer's address dynamically
  const deployer = await m.ethers.getSigner();
  const initialHolder = await deployer.getAddress();

  const mintAmount = "1000000000000000000000"; // 1000 tokens

  m.send(token.mint, [initialHolder, mintAmount]);

  return { token };
});

module.exports = SplitwiseTokenModule;
