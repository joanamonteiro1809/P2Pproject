// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SplitwiseContract {
    struct Expense {
        string description;
        uint256 amount;
        address paidBy;
        address[] involved;
        uint256 timestamp;
    }

    struct Group {
        string name;
        address[] members;
        mapping(address => bool) isMember;
        Expense[] expenses;
        mapping(address => mapping(address => int256)) debts; // debts[from][to] = amount
    }

    uint256 public groupIdCounter;
    mapping(uint256 => Group) private groups;

    event GroupCreated(uint256 groupId, string name, address creator);
    event MemberJoined(uint256 groupId, address member);
    event ExpenseAdded(uint256 groupId, string description, uint256 amount, address paidBy);

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

        emit GroupCreated(groupId, name, msg.sender);
        return groupId;
    }

    function joinGroup(uint256 groupId) external {
        Group storage group = groups[groupId];
        require(!group.isMember[msg.sender], "Already a member");

        group.members.push(msg.sender);
        group.isMember[msg.sender] = true;

        emit MemberJoined(groupId, msg.sender);
    }

    function getGroupMembers(uint256 groupId) external view returns (address[] memory) {
        return groups[groupId].members;
    }
    function addExpense(
        uint256 groupId,
        string calldata description,
        uint256 amount,
        address[] calldata involved
    ) external onlyMember(groupId)

}
