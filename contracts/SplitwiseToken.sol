// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SplitwiseToken is ERC20 {
    address public owner;

    constructor() ERC20("TrustToken", "TRUST") {
        owner = msg.sender;
    }

    // Payable mint: users send ETH to get TRUST tokens
    function mint() external payable {
        require(msg.value > 0, "Send ETH to mint tokens");

        uint256 amountToMint = msg.value * 1000; // 1 ETH = 1000 TRUST tokens
        _mint(msg.sender, amountToMint);
    }

    // Withdraw Ether collected in the contract (only owner)
    function withdraw() external {
        require(msg.sender == owner, "Only owner can withdraw");
        payable(owner).transfer(address(this).balance);
    }
}