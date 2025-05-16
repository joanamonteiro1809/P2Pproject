const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("SplitwiseModule", (m) => {
  const splitwiseToken = m.contract("SplitwiseToken");
  const splitwise = m.contract("Splitwise", [splitwiseToken]);

  return { splitwiseToken, splitwise };
});



