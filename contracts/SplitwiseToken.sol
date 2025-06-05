// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SplitwiseToken is ERC20 {
    uint256 public constant TOKENS_PER_ETH = 1000; 

    constructor() ERC20("Trust Token", "TRUST") {}

    function mintWithETH() external payable {
        require(msg.value > 0, "Send ETH to mint tokens");
        uint256 tokensToMint = msg.value * TOKENS_PER_ETH;
        _mint(msg.sender, tokensToMint);
    }
}
