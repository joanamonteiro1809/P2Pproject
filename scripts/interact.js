const { ethers } = require("hardhat");

async function main() {
  const [deployer, user1, user2] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("User1:", user1.address);
  console.log("User2:", user2.address);

  // Replace with your deployed contract address
  const splitwiseAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

  const Splitwise = await ethers.getContractFactory("Splitwise");
  const splitwise = Splitwise.attach(splitwiseAddress);

  console.log("Calling createGroup...");

  const tx = await splitwise.createGroup("Test Group", [user1.address, user2.address]);
  const receipt = await tx.wait();

  console.log("Transaction status:", receipt.status);
  console.log("Raw logs:", receipt.logs);

  // Manually define the interface with just the event you want to parse
  const iface = new ethers.utils.Interface([
    "event GroupCreated(uint256 indexed groupId, string name, address indexed creator)"
  ]);

  // Find and parse the GroupCreated event from logs
  let groupCreatedEvent = null;
  for (const log of receipt.logs) {
    try {
      const parsedLog = iface.parseLog(log);
      if (parsedLog.name === "GroupCreated") {
        groupCreatedEvent = parsedLog;
        break;
      }
    } catch (e) {
      // Not a GroupCreated event, continue searching
    }
  }

  if (!groupCreatedEvent) {
    console.error("GroupCreated event not found!");
    return;
  }

  const groupId = groupCreatedEvent.args.groupId;
  const groupName = groupCreatedEvent.args.name;
  const creator = groupCreatedEvent.args.creator;

  console.log(`Group created with ID: ${groupId.toString()}`);
  console.log(`Group name: ${groupName}`);
  console.log(`Creator address: ${creator}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
