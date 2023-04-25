// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
//const { ethers, upgrades } = require("hardhat");
import { ethers, upgrades } from "hardhat";
import { PCSFeeHandler, PCSFeeHandler__factory } from "../typechain-types";
import dotenv from "dotenv";
dotenv.config();

const { KSWAP_ADDRESS, KYOTOSWAPROUTER_ADDRESS, OWNER_ADDRESS, BURNWALLET_ADDRESS, BUSD_ADDRESS, WBNB_ADDRESS } = process.env;

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  const PCSFeeHandlerFactory = (await ethers.getContractFactory("PCSFeeHandler")) as PCSFeeHandler__factory;

  const pcsFeeHandlerlProxy = (await upgrades.deployProxy(PCSFeeHandlerFactory, [KSWAP_ADDRESS, KYOTOSWAPROUTER_ADDRESS, OWNER_ADDRESS, BURNWALLET_ADDRESS, OWNER_ADDRESS, 62500, [KSWAP_ADDRESS, BUSD_ADDRESS, WBNB_ADDRESS]], {
    kind: "uups",
    initializer: "initialize",
  })) as PCSFeeHandler;
  await pcsFeeHandlerlProxy.deployed();
  console.log("PCS Fee Handler deployed to:", pcsFeeHandlerlProxy.address);
  console.log("Proxy Implementation Address ", await upgrades.erc1967.getImplementationAddress(pcsFeeHandlerlProxy.address));

  // We get the contract to deploy
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
