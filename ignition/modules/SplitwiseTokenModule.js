const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const SplitwiseTokenModule = buildModule("SplitwiseTokenModule", async (m) => {
  const token = m.contract("SplitwiseToken");

  const initialHolder = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199"; 
  const mintAmount = "1000000000000000000000"; 

  m.send(token.mint, [initialHolder, mintAmount]);

  return { token };
});

module.exports = SplitwiseTokenModule;
