require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ignition");

const ALCHEMY_API_KEY = "TN3nGtD9REJ9ltAUFh-cPoZdfKUaYFoo";
const SEPOLIA_PRIVATE_KEY = "a93d6ce953464e98383e4e36c9618dee6a179ad9b6964600d456199c6e719b1c";

module.exports = {
  solidity: "0.8.20",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [SEPOLIA_PRIVATE_KEY],
    },
  },
};

