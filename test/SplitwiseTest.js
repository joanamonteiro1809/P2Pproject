const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Splitwise System", function () {
  let splitwise, token, owner, user1, user2, user3, outsider, groupId;

  beforeEach(async function () {
    [owner, user1, user2, user3, outsider] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("SplitwiseToken");
    token = await Token.deploy();
    await token.waitForDeployment();

    const Splitwise = await ethers.getContractFactory("Splitwise");
    splitwise = await Splitwise.deploy(token.target);
    await splitwise.waitForDeployment();

    const tx = await splitwise.createGroup("Trip", [user1.address, user2.address, user3.address]);
    const receipt = await tx.wait();
    console.log("Gas used for createGroup:", receipt.gasUsed.toString());
    groupId = Number(await splitwise.groupIdCounter()) - 1;

  });

  it("Should allow group creation and adding expenses", async function () {
    const tx = await splitwise.connect(user1).addExpense(groupId, "Dinner", 90, [user1.address, user2.address, user3.address]);
    const receipt = await tx.wait();
    console.log("Gas used for addExpense:", receipt.gasUsed.toString());

    const debt1 = await splitwise.getDebt(groupId, user2.address, user1.address);
    const debt2 = await splitwise.getDebt(groupId, user3.address, user1.address);

    expect(debt1).to.equal(30);
    expect(debt2).to.equal(30);
  });

  it("Should not allow adding an expense of 0", async function () {
    // Para esse teste, você precisa adicionar no addExpense:
    // require(amount > 0, "Amount must be greater than zero");
    await expect(
      splitwise.connect(user1).addExpense(groupId, "Empty", 0, [user1.address, user2.address])
    ).to.be.revertedWith("Amount must be greater than zero");
  });

  it("Should not allow a non-group member to add expense", async function () {
    await expect(
      splitwise.connect(outsider).addExpense(groupId, "Food", 100, [user1.address, user2.address])
    ).to.be.revertedWith("Not a group member"); // "Not a group member" vem do modifier onlyMember
  });

  it("Should simplify debts correctly", async function () {
    await splitwise.connect(user1).addExpense(groupId, "Taxi", 60, [user1.address, user2.address]);
    await splitwise.connect(user2).addExpense(groupId, "Snacks", 60, [user1.address, user2.address]);

    const tx = await splitwise.connect(user1).simplifyDebts(groupId);
    const receipt = await tx.wait();
    console.log("Gas used for simplifyDebts:", receipt.gasUsed.toString());

    const debt1 = await splitwise.getDebt(groupId, user2.address, user1.address);
    const debt2 = await splitwise.getDebt(groupId, user1.address, user2.address);

    expect(debt1).to.equal(0);
    expect(debt2).to.equal(0);
  });

  it("Should allow settling debt with TRUST tokens", async function () {
    await splitwise.connect(user1).addExpense(groupId, "Coffee", 100, [user1.address, user2.address]);

    // Mint tokens to user2 (ajuste conforme sua função mint)
    //await token.connect(user2).mint(user2.address, ethers.parseUnits("100", 18));
    const mintTx = await token.mint(user2.address, ethers.parseUnits("100", 18));
    const mintReceipt = await mintTx.wait();
    console.log("Gas used for mint:", mintReceipt.gasUsed.toString());

    // Approve splitwise to spend tokens on behalf of user2
    const approveTx = await token.connect(user2).approve(splitwise.target, 50);
    const approveReceipt = await approveTx.wait();
    console.log("Gas used for approve:", approveReceipt.gasUsed.toString());

    const settleTx = await splitwise.connect(user2).settleDebt(groupId, user1.address, 50);
    const settleReceipt = await settleTx.wait();
    console.log("Gas used for settleDebt:", settleReceipt.gasUsed.toString());

    const remainingDebt = await splitwise.getDebt(groupId, user2.address, user1.address);

    expect(remainingDebt).to.equal(0n); 
  });

  it("Should emit events correctly", async function () {
    const addTx = await splitwise.connect(user1).addExpense(groupId, "Brunch", 60, [user1.address, user2.address]);
    await expect(addTx).to.emit(splitwise, "ExpenseAdded");

    const currentDebt = await splitwise.getDebt(groupId, user2.address, user1.address);
    expect(currentDebt).to.equal(30);

    const mintTx = await token.mint(user2.address, 30);
    await mintTx.wait();

    const approveTx = await token.connect(user2).approve(splitwise.target, 30);
    await approveTx.wait();

    const settleTx = await splitwise.connect(user2).settleDebt(groupId, user1.address, 30);
    await expect(settleTx).to.emit(splitwise, "DebtSettled");

    const settleReceipt = await settleTx.wait();
    console.log("Gas used for settleDebt (event test):", settleReceipt.gasUsed.toString());
  });

  it("Should not allow settling debt without token approval", async () => {
    const [alice, bob] = await ethers.getSigners();
    await splitwise.createGroup("Group A", [alice.address, bob.address]);
    await splitwise.connect(alice).addExpense(0, "Test Expense", 100, [bob.address]);
    await expect(
    splitwise.connect(bob).settleDebt(0, alice.address, 100)).to.be.reverted;

  });

  it("Should not allow a user to join a group twice", async () => {
    const [alice, bob] = await ethers.getSigners();
    await splitwise.createGroup("Group A", [alice.address, bob.address]);
    await expect(splitwise.connect(alice).joinGroup(0)).to.be.revertedWith('Already a member');
  });

  it("Should return correct debt graph after multiple expenses", async () => {
    const [alice, bob, charlie] = await ethers.getSigners();

    await splitwise.createGroup("Group A", [alice.address, bob.address, charlie.address]);

    const groupIdCounter = await splitwise.groupIdCounter();
    const groupId = groupIdCounter - 1n;

    await splitwise.connect(alice).addExpense(groupId, "Lunch", 100, [bob.address]);
    await splitwise.connect(bob).addExpense(groupId, "Drinks", 50, [charlie.address]);

    const debts = await splitwise.getDebtGraph(groupId);
    const [froms, tos, amounts] = debts;

    console.log("froms:", froms);
    console.log("tos:", tos);
    console.log("amounts:", amounts.map(a => a.toString()));

    expect(amounts.length).to.equal(2);
    expect(amounts[0]).to.equal(100n);
    expect(amounts[1]).to.equal(50n);

  });

  it("Should allow settling debt with ETH", async () => {
    const [alice, bob] = await ethers.getSigners();

    // Create a group with alice and bob
    await splitwise.createGroup("Group ETH", [alice.address, bob.address]);
    const groupId = (await splitwise.groupIdCounter()) - 1n;

    // Alice adds an expense for Bob
    const amountInWei = ethers.parseEther("100"); // 100 ETH in wei
    await splitwise.connect(alice).addExpense(groupId, "Dinner", amountInWei, [bob.address]);

    let initialDebt = await splitwise.getDebt(groupId, bob.address, alice.address);
    expect(initialDebt).to.equal(amountInWei);

    const settleTx = await splitwise.connect(bob).settleDebtWithETH(groupId, alice.address, {
      value: ethers.parseEther("40") // 40 ETH in wei
    });
    await settleTx.wait();

    // Check remaining debt
    const amountInWei1 = ethers.parseEther("60"); // 100 ETH in wei
    let afterPartialSettle = await splitwise.getDebt(groupId, bob.address, alice.address);
    expect(afterPartialSettle).to.equal(amountInWei1);

    // Bob settles the remaining 60 ETH
    const settleTx2 = await splitwise.connect(bob).settleDebtWithETH(groupId, alice.address, {
      value: ethers.parseEther("60")
    });
    await settleTx2.wait();

    // Debt should now be zero
    let finalDebt = await splitwise.getDebt(groupId, bob.address, alice.address);
    expect(finalDebt).to.equal(0);
  });

  it("Should return empty debt graph for new group", async () => {
    await splitwise.createGroup("Empty Group", [user1.address, user2.address]);
    const debts = await splitwise.getDebtGraph(1);
    expect(debts[0].length).to.equal(0);
  });

  it("Should simplify debts correctly regardless of expense order", async () => {
    await splitwise.connect(user1).addExpense(groupId, "Dinner", 90, [user1.address, user2.address, user3.address]);
    await splitwise.connect(user3).addExpense(groupId, "Lunch", 90, [user1.address, user2.address, user3.address]);

    await splitwise.simplifyDebts(groupId);

    const debtUser2ToUser1 = await splitwise.getDebt(groupId, user2.address, user1.address);
    const debtUser2ToUser3 = await splitwise.getDebt(groupId, user2.address, user3.address);
    const debtUser1ToUser3 = await splitwise.getDebt(groupId, user1.address, user3.address);
    const debtUser3ToUser1 = await splitwise.getDebt(groupId, user3.address, user1.address);

    expect(debtUser2ToUser1).to.equal(30);
    expect(debtUser2ToUser3).to.equal(30);
    expect(debtUser1ToUser3).to.equal(0);
    expect(debtUser3ToUser1).to.equal(0);
  });
});
