// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  
  // Deploy token1

  let dapp = await hre.ethers.deployContract('Token', ['Dapp Token', 'DAPP', '1000000'])
  await dapp.waitForDeployment()
  console.log(`Dapp Token deployed to: ${await dapp.getAddress()}\n`)

  // Deploy token2

  let usd = await hre.ethers.deployContract('Token', ['USD Token', 'DAPP', '1000000'])
  await usd.waitForDeployment()
  console.log(`USD Token deployed to: ${await usd.getAddress()}\n`)

  // Deploy AMM

  let amm = await hre.ethers.deployContract('AMM', [dapp, usd])
  await amm.waitForDeployment()
  console.log(`AMM deployed to: ${await amm.getAddress()}\n`)

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
