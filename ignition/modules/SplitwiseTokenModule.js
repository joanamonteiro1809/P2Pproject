const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const SplitwiseTokenModule = buildModule("SplitwiseTokenModule", (m) => {
  // Deploy the SplitwiseToken contract (no constructor args)
  const token = m.contract("SplitwiseToken");

  // Mint 1000 tokens (with 18 decimals) to this address
  const initialHolder = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const mintAmount = "1000000000000000000000"; // 1000 * 10^18 as string

  m.send(token.mint, [initialHolder, mintAmount]);

  return { token };
});

module.exports = SplitwiseTokenModule;
