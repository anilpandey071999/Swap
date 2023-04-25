// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
import { ethers } from "hardhat";
import { KyotoSwapRouter, KyotoSwapRouter__factory } from "../typechain-types";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  // const [feeSetter] = await ethers.getSigners(); 
  console.log(process.env.KYOTOSWAPFACTORY_ADDRESS, process.env.WBNB_ADDRESS);
  const KYOTOSWAPFACTORY_ADDRESS = "0xa246Ca3B09F19810354daC78F512C2952c4a83Fc"
  const WBNB_ADDRESS = "0x0557917ed944E8bB9acB60B6784ef37e157d4b54"
  const KyotoSwapRouterFactory = (await ethers.getContractFactory("KyotoSwapRouter")) as KyotoSwapRouter__factory;
  const kyotoswapRouter = (await KyotoSwapRouterFactory.deploy(KYOTOSWAPFACTORY_ADDRESS, WBNB_ADDRESS)) as KyotoSwapRouter;
  console.log("Kyoto Swap Router Address is ",kyotoswapRouter.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
