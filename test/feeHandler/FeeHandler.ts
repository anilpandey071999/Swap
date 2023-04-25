import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer } from "ethers";
import {
  UUPSProxy,
  UUPSProxy__factory,
  WETH9__factory,
  WETH9,
  SimpleERC20__factory,
  SimpleERC20,
  KyotoSwapFactory__factory,
  KyotoSwapFactory,
  KyotoSwapRouter__factory,
  KyotoSwapRouter,
  KyotoSwapPair,
  PCSFeeHandler,
  PCSFeeHandler__factory,
} from "../../typechain-types";

const MAX_APPROVAL_AMOUNT = "115792089237316195423570985008687907853269984665640564039457584007913129639935"; // 2^256 -1
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const BURN_ADDRESS = "0x000000000000000000000000000000000000dEaD";
const SECONDS_IN_DAY = 86400;

const abi = ["event Transfer(address indexed from, address indexed to, uint256 value)"];
let iface = new ethers.utils.Interface(abi);

describe("Fee Handler", async () => {
  let owner: Signer,
    accounts1: Signer,
    accounts2: Signer,
    UUPSProxyFactory: UUPSProxy__factory,
    UUPSProxy: UUPSProxy,
    kyotoSwapFactoryFactory: KyotoSwapFactory__factory,
    simpleERC20Factory: SimpleERC20__factory,
    kyotoSwapRouterFactory: KyotoSwapRouter__factory,
    weth9Factory: WETH9__factory,
    kyotoSwapFactory: KyotoSwapFactory,
    PCSFeeHandlerFactory: PCSFeeHandler__factory,
    PCSFeeHandler: PCSFeeHandler,
    busd: SimpleERC20,
    kswap: SimpleERC20,
    kyotoSwapRouter: KyotoSwapRouter,
    weth9: WETH9,
    owner_addr: string,
    accounts1_addr: string,
    accounts2_addr: string;

  before(async () => {
    [owner, accounts1, accounts2] = await ethers.getSigners();
    owner_addr = await owner.getAddress();
    accounts1_addr = await accounts1.getAddress();
    accounts2_addr = await accounts2.getAddress();

    kyotoSwapFactoryFactory = (await ethers.getContractFactory("KyotoSwapFactory")) as KyotoSwapFactory__factory;
    kyotoSwapFactory = await kyotoSwapFactoryFactory.deploy(owner_addr);
    console.log("INIT CODE HASH ", await kyotoSwapFactory.INIT_CODE_PAIR_HASH());
    weth9Factory = (await ethers.getContractFactory("WETH9")) as WETH9__factory;
    weth9 = (await weth9Factory.connect(owner).deploy()) as WETH9;
    kyotoSwapRouterFactory = (await ethers.getContractFactory("KyotoSwapRouter")) as KyotoSwapRouter__factory;
    kyotoSwapRouter = await kyotoSwapRouterFactory.connect(owner).deploy(kyotoSwapFactory.address, weth9.address);
    simpleERC20Factory = (await ethers.getContractFactory("SimpleERC20")) as SimpleERC20__factory;
    busd = (await simpleERC20Factory.connect(owner).deploy("Binance USD", "BUSD")) as SimpleERC20;
    kswap = (await simpleERC20Factory.connect(owner).deploy("KSWAP TOKEN", "KSWAP")) as SimpleERC20;
    const initializeInterface = new ethers.utils.Interface([
      "function initialize(address _kswapToken,address _pankswapSwapRouter,address _operatorAddress,address _kswapBurnAddress,address _kswapVaultAddress,uint _kswapBurnRate,address[] memory destinations)",
    ]);
    const initializeFuncData = initializeInterface.encodeFunctionData("initialize", [kswap.address, kyotoSwapRouter.address, owner_addr, BURN_ADDRESS, owner_addr, 62500, [kswap.address, busd.address, weth9.address]]);

    PCSFeeHandlerFactory = (await ethers.getContractFactory("PCSFeeHandler")) as PCSFeeHandler__factory;
    PCSFeeHandler = (await PCSFeeHandlerFactory.connect(owner).deploy()) as PCSFeeHandler;
    UUPSProxyFactory = (await ethers.getContractFactory("UUPSProxy")) as UUPSProxy__factory;
    UUPSProxy = await UUPSProxyFactory.connect(owner).deploy(PCSFeeHandler.address, ZERO_ADDRESS, initializeFuncData);
    console.log("Implementation Address when fetched from UUPS Proxy ", await UUPSProxy.implementation());
    console.log("UUPS Proxy deployed at", UUPSProxy.address);
    PCSFeeHandler = PCSFeeHandler.attach(UUPSProxy.address);

    // Transfer KSWAP from Owner to Account1 and Account2
    await kswap.connect(owner).transfer(accounts1_addr, ethers.utils.parseEther("3000000000"));
    await kswap.connect(owner).transfer(accounts2_addr, ethers.utils.parseEther("3000000000"));

    // Transfer BUSD from Owner to Account1 and Account2
    await busd.connect(owner).transfer(accounts1_addr, ethers.utils.parseEther("3000000000"));
    await busd.connect(owner).transfer(accounts2_addr, ethers.utils.parseEther("3000000000"));
  });
  it("Set FeeTo in Factory", async () => {
    await kyotoSwapFactory.connect(owner).setFeeTo(PCSFeeHandler.address);
  });
  it("Add Liquidity Between KSWAP and BUSD By Account 1 and Account2 and Owner", async () => {
    const token1Address = kswap.address;
    const token2Address = busd.address;

    await kswap.connect(accounts1).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);
    await busd.connect(accounts1).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);

    await kswap.connect(accounts2).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);
    await busd.connect(accounts2).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);

    await kswap.connect(owner).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);
    await busd.connect(owner).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);

    const amountOfKSWAP = ethers.utils.parseEther("1000");
    const amountOfBUSD = ethers.utils.parseEther("1000000");

    let latestBlock = await ethers.provider.getBlock("latest");

    console.log("Initial Balance of KSWAP and BUSD Account1 ", ethers.utils.formatEther(await kswap.balanceOf(accounts1_addr)), ethers.utils.formatEther(await busd.balanceOf(accounts1_addr)));

    // Add Liquidity By Account1
    // Fixing Price 1 KSWAP = 1000 BUSD
    await (await kyotoSwapRouter.connect(accounts1).addLiquidity(token1Address, token2Address, amountOfKSWAP, amountOfBUSD, 0, 0, accounts1_addr, latestBlock.timestamp + 1000)).wait();

    // Add Liquidity By Account2
    await (await kyotoSwapRouter.connect(accounts2).addLiquidity(token1Address, token2Address, amountOfKSWAP.div(2), amountOfBUSD.div(2), 0, 0, accounts2_addr, latestBlock.timestamp + 1000)).wait();

    const pairAddress = await kyotoSwapFactory.getPair(token1Address, token2Address);
    const pair = (await ethers.getContractAt("KyotoSwapPair", pairAddress)) as KyotoSwapPair;

    const { _reserve0, _reserve1 } = await pair.getReserves();

    console.log("Price of KSwap in BUSD ", _reserve0.div(_reserve1).toString());

    console.log("Owner KSwap Balance ", ethers.utils.formatEther(await kswap.balanceOf(owner_addr)));

    // Swap KSWAP and get BUSD by Owner
    await (await kyotoSwapRouter.connect(owner).swapExactTokensForTokens(amountOfKSWAP, 0, [token1Address, token2Address], owner_addr, latestBlock.timestamp + 1000)).wait();

    await ethers.provider.send("evm_increaseTime", [100 * SECONDS_IN_DAY]);
    await ethers.provider.send("evm_mine", []);

    latestBlock = await ethers.provider.getBlock("latest");

    const pairBalanceAccount1 = await pair.balanceOf(accounts1_addr);

    console.log("Balance of Account1 ", ethers.utils.formatEther(pairBalanceAccount1));
    console.log("Pair Total Supply ", ethers.utils.formatEther(await pair.totalSupply()));

    await pair.connect(accounts1).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);

    // Remove Liquidity By Account1
    const tx = await kyotoSwapRouter.connect(accounts1).removeLiquidity(token1Address, token2Address, pairBalanceAccount1, 0, 0, accounts1_addr, latestBlock.timestamp + 1000);
    const receipt = await tx.wait();
    const abi = ["event Transfer(address indexed from, address indexed to, uint256 value)"];
    let iface = new ethers.utils.Interface(abi);
    const args = iface.parseLog(receipt.logs[1]).args;
    console.log(args.to, ethers.utils.formatEther(args.value));
  });
  it("Add Liquidity Between KSWAP and WBNB By Account 1 and Account2", async () => {
    const token1Address = kswap.address;

    const amountOfKSWAP = ethers.utils.parseEther("1000000");
    const amountOfWBNB = ethers.utils.parseEther("1000");

    let latestBlock = await ethers.provider.getBlock("latest");

    console.log("Initial Balance of KSWAP and BUSD Account1 ", ethers.utils.formatEther(await kswap.balanceOf(accounts1_addr)), ethers.utils.formatEther(await busd.balanceOf(accounts1_addr)));

    // Fixing Price 1 BNB = 1000 KSWAP i.e KSWAP = 0.001 BNB

    // Add BNB and KSWAP by Account1
    await kyotoSwapRouter.connect(accounts1).addLiquidityETH(token1Address, amountOfKSWAP, 0, 0, accounts1_addr, latestBlock.timestamp + 1000, { value: amountOfWBNB });

    // Add BNB and KSWAP by Account2
    await kyotoSwapRouter.connect(accounts2).addLiquidityETH(token1Address, amountOfKSWAP.div(2), 0, 0, accounts2_addr, latestBlock.timestamp + 1000, { value: amountOfWBNB.div(2) });

    // Swap KSWAP and get WBNB by Owner
    await (await kyotoSwapRouter.connect(owner).swapExactTokensForETH(amountOfKSWAP, 0, [token1Address, weth9.address], owner_addr, latestBlock.timestamp + 1000)).wait();

    const pairAddress = await kyotoSwapFactory.getPair(kswap.address, weth9.address);
    const pair = (await ethers.getContractAt("KyotoSwapPair", pairAddress)) as KyotoSwapPair;

    await pair.connect(accounts1).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);

    const pairBalanceAccount1 = await pair.balanceOf(accounts1_addr);

    const tx = await kyotoSwapRouter.connect(accounts1).removeLiquidityETH(token1Address, pairBalanceAccount1, 0, 0, accounts1_addr, latestBlock.timestamp + 1000);
    const receipt = await tx.wait();
    const args = iface.parseLog(receipt.logs[1]).args;
    console.log(args.to, ethers.utils.formatEther(args.value));
  });
  it("Process Fee", async () => {
    const pairAddressKSWAPBUSD = await kyotoSwapFactory.getPair(kswap.address, busd.address);
    const pairAddressKSWAPWBNB = await kyotoSwapFactory.getPair(kswap.address, weth9.address);

    const liquidityList = [
      {
        pair: pairAddressKSWAPWBNB,
        amount: ethers.utils.parseEther("9"),
        amountAMin: 0,
        amountBMin: 0,
      },
      {
        pair: pairAddressKSWAPBUSD,
        amount: ethers.utils.parseEther("9"),
        amountAMin: 0,
        amountBMin: 0,
      },
    ];

    const swapList = [
      {
        amountIn: ethers.utils.parseEther("1"),
        amountOutMin: 0,
        path: [busd.address, kswap.address],
      },
      {
        amountIn: ethers.utils.parseEther("1"),
        amountOutMin: 0,
        path: [weth9.address, kswap.address],
      },
    ];

    await PCSFeeHandler.connect(owner).processFee(liquidityList, swapList, false);
    console.log("KSWAP Balance of FeeHandler ", ethers.utils.formatEther(await kswap.balanceOf(PCSFeeHandler.address)));
  });
  it("Send KSWAP", async () => {
    const amount = ethers.utils.parseEther("900");
    const burnAmount = amount.mul(await PCSFeeHandler.kswapBurnRate()).div(await PCSFeeHandler.RATE_DENOMINATOR());
    const vaultAmount = amount.sub(burnAmount);
    expect(PCSFeeHandler.connect(owner).sendKSwap(amount)).to.emit(PCSFeeHandler, "Transfer").withArgs(PCSFeeHandler.address, BURN_ADDRESS, burnAmount);
  });
});
