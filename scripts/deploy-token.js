async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying SplitwiseToken with account:", deployer.address);

  const SplitwiseToken = await ethers.getContractFactory("SplitwiseToken");
  const token = await SplitwiseToken.deploy();

  await token.waitForDeployment();

  console.log("SplitwiseToken deployed to:", await token.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
