import { ethers } from "hardhat";
import { WETH9__factory, WETH9, SimpleERC20__factory, SimpleERC20, KyotoSwapRouter, KyotoSwapFactory } from "../typechain-types";
import dotenv from "dotenv";
dotenv.config();

async function main() {
    const [dev] = await ethers.getSigners()
    const Demo1 = await ethers.getContractFactory("SimpleERC20") as SimpleERC20__factory;
    const simpleERC20Token1 = (await Demo1.deploy("Token1", "T1")) as SimpleERC20;
    const Demo2 = (await ethers.getContractFactory("SimpleERC20")) as SimpleERC20__factory;
    const simpleERC20Token2 = (await Demo2.deploy("Token2", "T2")) as SimpleERC20;
    
    const factory = await ethers.getContractAt("KyotoSwapFactory", "0xa246Ca3B09F19810354daC78F512C2952c4a83Fc", dev) as KyotoSwapFactory
    const router = await ethers.getContractAt("KyotoSwapRouter", "0xdc1F9736783Ce91B0B38C4C6164dA17E3861319B", dev) as KyotoSwapRouter
    await simpleERC20Token1.approve(router.address, ethers.utils.parseEther('100'))
    await simpleERC20Token2.approve(router.address, ethers.utils.parseEther('100'))

    const token1Address = simpleERC20Token1.address;
    const token2Address = simpleERC20Token2.address;
    const MAX_APPROVAL_AMOUNT = "115792089237316195423570985008687907853269984665640564039457584007913129639935"; // 2^256 -1


    await simpleERC20Token1.approve(router.address, MAX_APPROVAL_AMOUNT);
    await simpleERC20Token2.approve(router.address, MAX_APPROVAL_AMOUNT);

    const value = ethers.utils.parseEther("1000");
    let latestBlock = await ethers.provider.getBlock("latest");
    await router.addLiquidity(token1Address, token2Address, value, value, 0, 0, dev.getAddress(), latestBlock.timestamp + 1000);

    console.log(await factory.getPair(simpleERC20Token1.address,simpleERC20Token2.address))

    
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
