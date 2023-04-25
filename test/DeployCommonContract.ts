import { ethers } from "hardhat"
import { WETH9__factory, WETH9, SimpleERC20__factory, SimpleERC20, KyotoSwapFactory__factory, KyotoSwapFactory, KyotoSwapRouter__factory, KyotoSwapRouter, FeeOnTransferToken__factory, FeeOnTransferToken } from "../typechain-types"

export default async function deployFactoryandRouter() {
    const [feeToSetter, feeTo, LiquidtyProvider, User1, User2] = await ethers.getSigners();
    const WBNB = (await ethers.getContractFactory("WETH9")) as WETH9__factory;
    const wbnb = (await WBNB.deploy()) as WETH9;

    const KyotoSwapFactory = (await ethers.getContractFactory("KyotoSwapFactory")) as KyotoSwapFactory__factory;
    const kyotoSwapFactory = (await KyotoSwapFactory.deploy(feeToSetter.address)) as KyotoSwapFactory;

    await kyotoSwapFactory.deployed();
    const Demo1 = await ethers.getContractFactory("SimpleERC20") as SimpleERC20__factory;
    const demo1 = (await Demo1.deploy("Demo1", "Demo1")) as SimpleERC20;
    const Demo2 = (await ethers.getContractFactory("SimpleERC20")) as SimpleERC20__factory;
    const demo2 = (await Demo2.deploy("Demo2", "Demo2")) as SimpleERC20;

    const TaxedToken = await ethers.getContractFactory("SimpleERC20") as SimpleERC20__factory;
    const taxedToken = await TaxedToken.deploy("SimpleERC20", "SE20") as SimpleERC20

    const Rebased = (await ethers.getContractFactory("FeeOnTransferToken")) as FeeOnTransferToken__factory
    const rebased = (await Rebased.deploy()) as FeeOnTransferToken

    const KyotoSwapRouter = (await ethers.getContractFactory("KyotoSwapRouter")) as KyotoSwapRouter__factory;
    const kyotoSwapRouter = (await KyotoSwapRouter.deploy(kyotoSwapFactory.address, wbnb.address)) as KyotoSwapRouter;

    await kyotoSwapRouter.deployed();

    const latestBlock = await ethers.provider.getBlock("latest")
    return {
      WBNB: wbnb,
      SimpleTokenERC20_1: demo1,
      SimpleTokenERC20_2: demo2,
      taxedToken,
      rebased,
      KyotoSwapFactory: kyotoSwapFactory,
      KyotoSwapRouter: kyotoSwapRouter,
      feeToSetter,
      feeTo,
      LiquidtyProvider,
      User1,
      User2,
      timeStamp: latestBlock.timestamp
    }
}