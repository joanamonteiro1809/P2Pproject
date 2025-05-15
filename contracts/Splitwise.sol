// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

IERC20 public token;

    constructor(address tokenAddress) {
        token = IERC20(tokenAddress);
    }



contract SplitwiseContract {
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

    // IERC20 public token;

    event GroupCreated(uint256 groupId, string name, address creator);
    event MemberJoined(uint256 groupId, address member);
    event ExpenseAdded(uint256 groupId, string description, uint256 amount, address paidBy);
    //event DebtSettled(uint256 groupId, address from, address to, uint256 amount);
    
    /*constructor(address tokenAddress) {
        token = IERC20(tokenAddress); // ERC-20 token address passed on deployment
    }*/
    
    modifier onlyMember(uint256 groupId) {
        require(groups[groupId].isMember[msg.sender], "Not a group member");
        _;
    }

    function createGroup(string calldata name, address[] calldata initialMembers) external returns (uint256) {
        uint256 groupId = groupIdCounter++;
        Group storage group = groups[groupId];
        group.name = name;

        // Add creator
        group.members.push(msg.sender);
        group.isMember[msg.sender] = true;

        // Add initial members
        for (uint i = 0; i < initialMembers.length; i++) {
            address member = initialMembers[i];
            if (!group.isMember[member]) {
                group.members.push(member);
                group.isMember[member] = true;
            }
        }

        group.exists = true;

        emit GroupCreated(groupId, name, msg.sender);
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

    function getGroupMembers(uint256 groupId) external view returns (address[] memory) {
        return groups[groupId].members;
    }

    function isGroupMember(uint256 groupId, address user) internal view returns (bool) {
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
        Group storage group = groups[groupId];
        require(group.exists, "Group does not exist");
        require(involved.length > 0, "No involved members");

        uint256 share = amount / involved.length;

        for (uint256 i = 0; i < involved.length; i++) {
            address member = involved[i];
            require(isGroupMember(groupId, member), "User not in group");

            if (member != msg.sender) {
                // Member owes msg.sender
                group.debts[member][msg.sender] += share;
            }
        }
        
        Expense memory newExpense = Expense({
            description: description,
            amount: amount,
            paidBy: msg.sender,
            involved: involved,
            timestamp: block.timestamp
        });

        group.expenses.push(newExpense);*/

        emit ExpenseAdded(groupId, msg.sender, amount, description);
    }


    function simplifyDebts(uint groupId) public onlyMember(groupId) {
        Group storage group = groups[groupId];
        uint n = group.members.length;

        // Step 1: Compute balances
        mapping(address => int) memory balances;
        for (uint i = 0; i < n; i++) {
            address a = group.members[i];
            for (uint j = 0; j < n; j++) {
                address b = group.members[j];
                balances[a] -= int(group.debts[a][b]);
                balances[a] += int(group.debts[b][a]);
            }
        }

        // Step 2: Clear old debts
        for (uint i = 0; i < n; i++) {
            for (uint j = 0; j < n; j++) {
                group.debts[group.members[i]][group.members[j]] = 0;
            }
        }

        // Step 3: Separate creditors and debtors
        address[] memory creditors = new address[](n);
        address[] memory debtors = new address[](n);
        uint credCount = 0;
        uint debtCount = 0;

        for (uint i = 0; i < n; i++) {
            address member = group.members[i];
            int bal = balances[member];
            if (bal > 0) creditors[credCount++] = member;
            else if (bal < 0) debtors[debtCount++] = member;
        }

        // Step 4: Greedy Matching
        uint i = 0;
        uint j = 0;
        while (i < debtCount && j < credCount) {
            address debtor = debtors[i];
            address creditor = creditors[j];
            int debtBal = -balances[debtor];
            int credBal = balances[creditor];
            uint256 minTransfer = uint256(debtBal < credBal ? debtBal : credBal);

            group.debts[debtor][creditor] = minTransfer;

            balances[debtor] += int(minTransfer);
            balances[creditor] -= int(minTransfer);

            if (balances[debtor] == 0) i++;
            if (balances[creditor] == 0) j++;
        }
    }

    function getDebt(uint groupId, address from, address to) public view returns (uint) {
        return groups[groupId].debts[from][to];
    }

    function getExpenses(uint256 groupId) external view returns (Expense[] memory) {
        return groups[groupId].expenses;
    }

    function settleDebt(uint groupId, address to) external onlyMember(groupId) {
        groups[groupId].debts[msg.sender][to] = 0;
    }

    function settleDebt(uint256 groupId, address creditor, uint256 amount) external {
        Group storage group = groups[groupId];
        require(group.exists, "Group does not exist");
        require(isGroupMember(groupId, msg.sender), "You are not a member of this group");
        require(isGroupMember(groupId, creditor), "Creditor is not a member of this group");
        require(group.debts[msg.sender][creditor] >= amount, "Not that much debt to settle");

        // Transfer ERC-20 tokens from debtor to creditor
        bool success = token.transferFrom(msg.sender, creditor, amount);
        require(success, "Token transfer failed");

        // Update debt mapping
        group.debts[msg.sender][creditor] -= amount;

        emit DebtSettled(groupId, msg.sender, creditor, amount);
    }
    

   function getDebtGraph(uint256 groupId) external view returns (
        address[] memory debtors,
        address[] memory creditors,
        uint256[] memory amounts
    ) {
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
                int256 debtAmount = group.debts[group.members[i]][group.members[j]];
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
