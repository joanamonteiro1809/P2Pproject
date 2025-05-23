// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

//import "./SplitwiseToken.sol";

contract Splitwise{
    struct Expense {
        string description;
        uint256 amount;
        address paidBy;
        address[] involved;
        uint256 timestamp;
    }

    struct Group {
        uint id;
        string name;
        address owner;
        address[] members;
        mapping(address => bool) isMember;
        Expense[] expenses;
        mapping(address => mapping(address => int256)) debts; // debts[from][to] = amount
        bool exists;
    }

    uint256 public groupIdCounter;
    mapping(uint256 => Group) private groups;

    IERC20 public token;

    //SplitwiseToken public token;

    event GroupCreated(uint256 groupId, string name, address creator, address[] members);
    event MemberJoined(uint256 groupId, address member);
    event ExpenseAdded(
        uint256 groupId,
        string description,
        uint256 amount,
        address paidBy
    );
    event DebtSettled(
        uint256 groupId,
        address from,
        address to,
        uint256 amount
    );

    constructor(address tokenAddress) {
        token = IERC20(tokenAddress); // ERC-20 token address passed on deployment
    }

    uint256 public constant TOKENS_PER_ETH = 1000;

    /*function mintWithETH() external payable {
        require(msg.value > 0, "Send ETH to mint tokens");

        uint256 tokensToMint = msg.value * TOKENS_PER_ETH;

        token.mint(msg.sender, tokensToMint);
    }*/


    modifier onlyMember(uint256 groupId) {
        require(groups[groupId].isMember[msg.sender], "Not a group member");
        _;
    }

    function createGroup(
    string calldata name,
    address[] calldata initialMembers
    ) external returns (uint256) {
        require(initialMembers.length >= 1, "Group must have at least 2 members including creator");

        uint256 groupId = groupIdCounter++;
        Group storage group = groups[groupId];
        group.name = name;

        // Add creator
        group.members.push(msg.sender);
        group.isMember[msg.sender] = true;

        // Add initial members (no duplicates)
        for (uint i = 0; i < initialMembers.length; i++) {
            address member = initialMembers[i];
            if (!group.isMember[member]) {
                group.members.push(member);
                group.isMember[member] = true;
            }
        }

        group.exists = true;

        emit GroupCreated(groupId, name, msg.sender, group.members);
        return groupId;
    }

    function joinGroup(uint256 groupId) external {
        Group storage group = groups[groupId];
        require(group.exists, "Group does not exist");
        require(!group.isMember[msg.sender], "Already a member");

        group.members.push(msg.sender);
        group.isMember[msg.sender] = true;

        emit MemberJoined(groupId, msg.sender);
    }

    /*function getGroupMembers(
        uint256 groupId
    ) external view returns (address[] memory) {
        return groups[groupId].members;
    }
    */

    function isGroupMember(
        uint256 groupId,
        address user
    ) internal view returns (bool) {
        Group storage group = groups[groupId];
        for (uint256 i = 0; i < group.members.length; i++) {
            if (group.members[i] == user) {
                return true;
            }
        }
        return false;
    }

    function addExpense(
        uint256 groupId,
        string calldata description,
        uint256 amount,
        address[] calldata involved
    ) external onlyMember(groupId) {
        require(amount > 0, "Amount must be greater than zero");
        Group storage group = groups[groupId];
        require(group.exists, "Group does not exist");
        require(involved.length > 0, "No involved members");

        uint256 share = amount / involved.length;

        for (uint256 i = 0; i < involved.length; i++) {
            address member = involved[i];
            require(isGroupMember(groupId, member), "User not in group");

            if (member != msg.sender) {
                // Member owes msg.sender
                group.debts[member][msg.sender] += int256(share);
            }
        }

        Expense memory newExpense = Expense({
            description: description,
            amount: amount,
            paidBy: msg.sender,
            involved: involved,
            timestamp: block.timestamp
        });

        group.expenses.push(newExpense);

        emit ExpenseAdded(groupId, description, amount, msg.sender);
    }

    function simplifyDebts(uint groupId) public onlyMember(groupId) {
    Group storage group = groups[groupId];
    uint n = group.members.length;

    // Step 1: Compute balances
    int256[] memory balances = new int256[](n);

    for (uint i = 0; i < n; i++) {
        address a = group.members[i];
        for (uint j = 0; j < n; j++) {
            address b = group.members[j];
            balances[i] -= group.debts[a][b];
            balances[i] += group.debts[b][a];
        }
    }

    // Step 2: Clear old debts
    for (uint i1 = 0; i1 < n; i1++) {
        for (uint j1 = 0; j1 < n; j1++) {
            group.debts[group.members[i1]][group.members[j1]] = 0;
        }
    }

    // Step 3: Separate creditors and debtors
    address[] memory creditors = new address[](n);
    int256[] memory credBalances = new int256[](n);
    address[] memory debtors = new address[](n);
    int256[] memory debtBalances = new int256[](n);
    uint credCount = 0;
    uint debtCount = 0;

    for (uint i = 0; i < n; i++) {
        int256 bal = balances[i];
        address member = group.members[i];
        if (bal > 0) {
            creditors[credCount] = member;
            credBalances[credCount] = bal;
            credCount++;
        } else if (bal < 0) {
            debtors[debtCount] = member;
            debtBalances[debtCount] = -bal; // make it positive
            debtCount++;
        }
    }

    // Step 4: Greedy Matching
    uint debtIdx = 0;
    uint credIdx = 0;

    while (debtIdx < debtCount && credIdx < credCount) {
        uint256 minAmount = debtBalances[debtIdx] < credBalances[credIdx]
            ? uint256(debtBalances[debtIdx])
            : uint256(credBalances[credIdx]);

        group.debts[debtors[debtIdx]][creditors[credIdx]] = int256(minAmount);

        debtBalances[debtIdx] -= int256(minAmount);
        credBalances[credIdx] -= int256(minAmount);

        if (debtBalances[debtIdx] == 0) debtIdx++;
        if (credBalances[credIdx] == 0) credIdx++;
    }

}

    function getDebt(
        uint groupId,
        address from,
        address to
    ) public view returns (int256) {
        return groups[groupId].debts[from][to];
    }

    function getExpenses(
        uint256 groupId
    ) external view returns (Expense[] memory) {
        return groups[groupId].expenses;
    }

    //function settleDebt(uint groupId, address to) external onlyMember(groupId) {
      //  groups[groupId].debts[msg.sender][to] = 0;
    //}

    function settleDebt(
    uint256 groupId,
    address creditor,
    uint256 amount
    ) external {
        Group storage group = groups[groupId];
        require(group.exists, "Group does not exist");
        require(
            isGroupMember(groupId, msg.sender),
            "You are not a member of this group"
        );
        require(
            isGroupMember(groupId, creditor),
            "Creditor is not a member of this group"
        );

        int256 currentDebt = group.debts[msg.sender][creditor];
        require(currentDebt >= 0, "No outstanding debt");
        require(uint256(currentDebt) >= amount, "Not enough debt to settle");

        // Transfer ERC-20 tokens
        bool success = token.transferFrom(msg.sender, creditor, amount);
        require(success, "Token transfer failed");

        // Update debt mapping
        group.debts[msg.sender][creditor] -= int256(amount);

        emit DebtSettled(groupId, msg.sender, creditor, amount);
    }

    /*function settleDebtWithETH(uint256 groupId, address creditor) external payable onlyMember(groupId) {
        Group storage group = groups[groupId];
        require(group.exists, "Group does not exist");
        require(isGroupMember(groupId, creditor), "Creditor not in group");

        int256 currentDebt = group.debts[msg.sender][creditor];
        require(currentDebt > 0, "No debt to settle");
        require(msg.value <= uint256(currentDebt), "Paying more than debt");

        // Accept ETH and update debt
        group.debts[msg.sender][creditor] -= int256(msg.value);

        // Send ETH to creditor
        (bool sent, ) = creditor.call{value: msg.value}("");
        require(sent, "Failed to send Ether");

        emit DebtSettled(groupId, msg.sender, creditor, msg.value);
    }*/

    function getDebtGraph(
        uint256 groupId
    )
        external
        view
        returns (
            address[] memory debtors,
            address[] memory creditors,
            uint256[] memory amounts
        )
    {
        Group storage group = groups[groupId];
        uint256 membersCount = group.members.length;

        // Count total debts to size the arrays
        uint256 count = 0;
        for (uint i = 0; i < membersCount; i++) {
            for (uint j = 0; j < membersCount; j++) {
                if (group.debts[group.members[i]][group.members[j]] > 0) {
                    count++;
                }
            }
        }

        // Initialize arrays to the count size
        debtors = new address[](count);
        creditors = new address[](count);
        amounts = new uint256[](count);

        uint256 index = 0;
        for (uint i = 0; i < membersCount; i++) {
            for (uint j = 0; j < membersCount; j++) {
                int256 debtAmount = group.debts[group.members[i]][
                    group.members[j]
                ];
                if (debtAmount > 0) {
                    debtors[index] = group.members[i];
                    creditors[index] = group.members[j];
                    amounts[index] = uint256(debtAmount);
                    index++;
                }
            }
        }
    }
}
