//require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");
//require("@nomicfoundation/hardhat-ignition");

const ALCHEMY_API_KEY = "TN3nGtD9REJ9ltAUFh-cPoZdfKUaYFoo";
const SEPOLIA_PRIVATE_KEY = "e07b2a08839271d7fac3d1f06f32b3e1f8b6ec461349c87792db1be8473f3b6b";

const config = {
  solidity: "0.8.28",
  networks: {
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [SEPOLIA_PRIVATE_KEY]
    }
  }
};
module.exports = config;

