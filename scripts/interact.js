const { ethers } = require("hardhat");

async function main() {
  const [deployer, user1, user2] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("User1:", user1.address);
  console.log("User2:", user2.address);

  const splitwiseAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const Splitwise = await ethers.getContractFactory("Splitwise");
  const splitwise = Splitwise.attach(splitwiseAddress);

  console.log("Calling createGroup...");
  const tx = await splitwise.createGroup("Test Group", [user1.address, user2.address]);
  const receipt = await tx.wait();

  console.log("Transaction status:", receipt.status);
  console.log("Raw logs:", receipt.logs);

  // Use contract interface to parse logs manually
  let groupCreatedEvent = null;
  for (const log of receipt.logs) {
    try {
      const parsedLog = splitwise.interface.parseLog(log);
      if (parsedLog.name === "GroupCreated") {
        groupCreatedEvent = parsedLog;
        break;
      }
    } catch (err) {
      // Ignore logs that don't match the event signature
    }
  }

  if (!groupCreatedEvent) {
    console.error("GroupCreated event not found!");
    return;
  }

  console.log(`Group created with ID: ${groupCreatedEvent.args.groupId.toString()}`);
  console.log(`Group name: ${groupCreatedEvent.args.name}`);
  console.log(`Creator address: ${groupCreatedEvent.args.creator}`);
}

main().catch(console.error);
