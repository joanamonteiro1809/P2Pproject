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

    await splitwise.createGroup("Trip", [user1.address, user2.address, user3.address]);
    groupId = Number(await splitwise.groupIdCounter()) - 1;

  });

  it("Should allow group creation and adding expenses", async function () {
    await splitwise.connect(user1).addExpense(groupId, "Dinner", 90, [user1.address, user2.address, user3.address]);

    const debt1 = await splitwise.getDebt(groupId, user2.address, user1.address);
    const debt2 = await splitwise.getDebt(groupId, user3.address, user1.address);

    expect(debt1).to.equal(30);
    expect(debt2).to.equal(30);
  });

  it("Should not allow creating a group with less than 2 members", async function () {
    // Para esse teste, você precisa adicionar o require no contrato Splitwise.createGroup:
    // require(initialMembers.length >= 1, "Group must have at least 2 members");
    await expect(
      splitwise.createGroup("Solo Trip", [user1.address])
    ).to.be.revertedWith("Group must have at least 2 members");
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

    await splitwise.connect(user1).simplifyDebts(groupId);

    const debt1 = await splitwise.getDebt(groupId, user2.address, user1.address);
    const debt2 = await splitwise.getDebt(groupId, user1.address, user2.address);

    expect(debt1).to.equal(0);
    expect(debt2).to.equal(0);
  });

  it("Should allow settling debt with TRUST tokens", async function () {
    // user2 owes user1
    await splitwise.connect(user1).addExpense(groupId, "Coffee", 100, [user1.address, user2.address]);

    // Mint tokens to user2 (ajuste conforme sua função mint)
    //await token.connect(user2).mint(user2.address, ethers.parseUnits("100", 18));
    await token.mint(user2.address, ethers.parseUnits("100", 18));

    // Approve splitwise to spend tokens on behalf of user2
    await token.connect(user2).approve(splitwise.target, 50);
    await splitwise.connect(user2).settleDebt(groupId, user1.address, 50);
    const remainingDebt = await splitwise.getDebt(groupId, user2.address, user1.address);

    // Como você subtrai 50, e dívida inicial é 50, o resto é zero
    expect(remainingDebt).to.equal(0n); // 0 como bigint
  });

  it("Should emit events correctly", async function () {
  // Cria dívida de user2 com user1
  await splitwise.connect(user1).addExpense(groupId, "Brunch", 60, [user1.address, user2.address]);

  // Confirma que há dívida de 30 (60/2)
  const currentDebt = await splitwise.getDebt(groupId, user2.address, user1.address);
  expect(currentDebt).to.equal(30);

  // Emite evento ao adicionar despesa
  await expect(
    splitwise.connect(user1).addExpense(groupId, "Brunch", 60, [user1.address, user2.address])
  ).to.emit(splitwise, "ExpenseAdded");

  // Prepara tokens
  await token.mint(user2.address, 30);
  await token.connect(user2).approve(splitwise.target, 30);

  // Emite evento ao quitar dívida
  await expect(
    splitwise.connect(user2).settleDebt(groupId, user1.address, 30)
  ).to.emit(splitwise, "DebtSettled");
});

});
