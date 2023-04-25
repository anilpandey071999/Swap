import { ethers, network } from "hardhat";
import { Signer, BigNumber } from "ethers";
import { ecsign } from "ethereumjs-util";

import { WETH9__factory, WETH9, SimpleERC20__factory, SimpleERC20, KyotoSwapFactory__factory, KyotoSwapFactory, KyotoSwapRouter__factory, KyotoSwapRouter, FeeOnTransferToken__factory, FeeOnTransferToken, KyotoSwapPair } from "../../typechain-types";

const MAX_APPROVAL_AMOUNT = "115792089237316195423570985008687907853269984665640564039457584007913129639935"; // 2^256 -1
const SECONDS_IN_DAY = 86400;

const abicoder = ethers.utils.defaultAbiCoder;

describe("Liquidity Tests", () => {
  let kyotoSwapFactoryFactory: KyotoSwapFactory__factory,
    simpleERC20Factory: SimpleERC20__factory,
    feeOnTransferTokenFactory: FeeOnTransferToken__factory,
    kyotoSwapRouterFactory: KyotoSwapRouter__factory,
    weth9Factory: WETH9__factory,
    kyotoSwapFactory: KyotoSwapFactory,
    simpleERC20Token1: SimpleERC20,
    simpleERC20Token2: SimpleERC20,
    feeOnTransferToken1: FeeOnTransferToken,
    feeOnTransferToken2: FeeOnTransferToken,
    kyotoSwapRouter: KyotoSwapRouter,
    weth9: WETH9,
    user1: Signer,
    user2: Signer;

  function getDomainSeparator(name: string, tokenAddress: string, chainId: number) {
    return ethers.utils.keccak256(
      abicoder.encode(
        ["bytes32", "bytes32", "bytes32", "uint256", "address"],
        [
          ethers.utils.keccak256(ethers.utils.toUtf8Bytes("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")),
          ethers.utils.keccak256(ethers.utils.toUtf8Bytes(name)),
          ethers.utils.keccak256(ethers.utils.toUtf8Bytes("1")),
          chainId,
          tokenAddress,
        ]
      )
    );
  }
  const PERMIT_TYPEHASH = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"));
  async function getApprovalDigest(
    token: KyotoSwapPair,
    approve: {
      owner: string;
      spender: string;
      value: BigNumber;
    },
    nonce: BigNumber,
    deadline: BigNumber
  ): Promise<string> {
    const name = await token.name();
    const DOMAIN_SEPARATOR = getDomainSeparator(name, token.address, parseInt((await token.chainId()).toString()));
    return ethers.utils.keccak256(
      ethers.utils.solidityPack(
        ["bytes1", "bytes1", "bytes32", "bytes32"],
        [
          "0x19",
          "0x01",
          DOMAIN_SEPARATOR,
          ethers.utils.keccak256(abicoder.encode(["bytes32", "address", "address", "uint256", "uint256", "uint256"], [PERMIT_TYPEHASH, approve.owner, approve.spender, approve.value.toString(), nonce.toString(), deadline.toString()])),
        ]
      )
    );
  }
  before(async () => {
    [user1, user2] = await ethers.getSigners();
  });
  beforeEach(async () => {
    kyotoSwapFactoryFactory = (await ethers.getContractFactory("KyotoSwapFactory")) as KyotoSwapFactory__factory;
    simpleERC20Factory = (await ethers.getContractFactory("SimpleERC20")) as SimpleERC20__factory;
    feeOnTransferTokenFactory = (await ethers.getContractFactory("FeeOnTransferToken")) as FeeOnTransferToken__factory;
    kyotoSwapRouterFactory = (await ethers.getContractFactory("KyotoSwapRouter")) as KyotoSwapRouter__factory;
    weth9Factory = (await ethers.getContractFactory("WETH9")) as WETH9__factory;
    kyotoSwapFactory = await kyotoSwapFactoryFactory.deploy(await user1.getAddress());
    weth9 = await weth9Factory.deploy();
    simpleERC20Token1 = await simpleERC20Factory.deploy("SimpleERC20Token1", "SERC20T1");
    simpleERC20Token2 = await simpleERC20Factory.deploy("SimpleERC20Token2", "SERC20T2");
    feeOnTransferToken1 = await feeOnTransferTokenFactory.deploy();
    feeOnTransferToken2 = await feeOnTransferTokenFactory.deploy();
    kyotoSwapRouter = await kyotoSwapRouterFactory.deploy(kyotoSwapFactory.address, weth9.address);
  });
  afterEach(async () => {
    await network.provider.request({ method: "hardhat_reset", params: [] });
  });

  describe("Add Liquidity", async () => {
    it("Adding Liquidity Between Two Simple ERC20 Token", async function () {
      const token1Address = simpleERC20Token1.address;
      const token2Address = simpleERC20Token2.address;

      await simpleERC20Token1.connect(user1).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);
      await simpleERC20Token2.connect(user1).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);

      const value = ethers.utils.parseEther("1000");
      let latestBlock = await ethers.provider.getBlock("latest");
      await kyotoSwapRouter.connect(user1).addLiquidity(token1Address, token2Address, value, value, 0, 0, user1.getAddress(), latestBlock.timestamp + 1000);
    });
    it("Adding Liquidity Between WETH and ERC20 Token", async () => {
      const token1Address = simpleERC20Token1.address;

      await simpleERC20Token1.connect(user1).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);

      const value = ethers.utils.parseEther("1000");
      let latestBlock = await ethers.provider.getBlock("latest");

      await kyotoSwapRouter.connect(user1).addLiquidityETH(token1Address, value, 0, 0, user1.getAddress(), latestBlock.timestamp + 1000, { value });
    });
    it("Adding Liquidity Between A Simple ERC20 and FeeonTransfer Token", async () => {
      const token1Address = simpleERC20Token1.address;
      const token2Address = feeOnTransferToken1.address;

      await simpleERC20Token1.connect(user1).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);

      await feeOnTransferToken1.transfer(user2.getAddress(), ethers.utils.parseEther("1000000"));
      await feeOnTransferToken1.connect(user1).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);
      await feeOnTransferToken1.connect(user2).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);

      const value = ethers.utils.parseEther("1000");
      let latestBlock = await ethers.provider.getBlock("latest");

      await kyotoSwapRouter.connect(user1).addLiquidity(token1Address, token2Address, value, value, 0, 0, user1.getAddress(), latestBlock.timestamp + 1000);
    });
    it("Adding Liquidity Between two FeeonTransfer Tokens", async () => {
      const token1Address = feeOnTransferToken1.address;
      const token2Address = feeOnTransferToken2.address;

      await feeOnTransferToken1.transfer(user2.getAddress(), ethers.utils.parseEther("1000000"));
      await feeOnTransferToken1.connect(user1).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);
      await feeOnTransferToken1.connect(user2).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);

      await feeOnTransferToken2.transfer(user2.getAddress(), ethers.utils.parseEther("1000000"));
      await feeOnTransferToken2.connect(user1).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);
      await feeOnTransferToken2.connect(user2).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);

      const value = ethers.utils.parseEther("1000");
      let latestBlock = await ethers.provider.getBlock("latest");

      await kyotoSwapRouter.connect(user1).addLiquidity(token1Address, token2Address, value, value, 0, 0, user1.getAddress(), latestBlock.timestamp + 1000);
    });
    it("Adding Liquidity Between WETH and FeeonTransfer Token", async () => {
      const token1Address = feeOnTransferToken1.address;
      await feeOnTransferToken1.transfer(user2.getAddress(), ethers.utils.parseEther("1000000"));
      await feeOnTransferToken1.connect(user1).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);
      await feeOnTransferToken1.connect(user2).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);

      const value = ethers.utils.parseEther("1000");
      let latestBlock = await ethers.provider.getBlock("latest");

      await kyotoSwapRouter.connect(user1).addLiquidityETH(token1Address, value, 0, 0, user1.getAddress(), latestBlock.timestamp + 1000, { value });
    });
    it("Removing Liquidity Between Two Simple ERC20 Token", async function () {
      const token1Address = simpleERC20Token1.address;
      const token2Address = simpleERC20Token2.address;

      await simpleERC20Token1.connect(user1).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);
      await simpleERC20Token2.connect(user1).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);

      const value = ethers.utils.parseEther("1000");
      let latestBlock = await ethers.provider.getBlock("latest");

      await kyotoSwapRouter.connect(user1).addLiquidity(token1Address, token2Address, value, value, 0, 0, user1.getAddress(), latestBlock.timestamp + 1000);

      await ethers.provider.send("evm_increaseTime", [100 * SECONDS_IN_DAY]);
      await ethers.provider.send("evm_mine", []);

      latestBlock = await ethers.provider.getBlock("latest");

      const pairAddress = await kyotoSwapFactory.getPair(token1Address, token2Address);

      const pair = (await ethers.getContractAt("KyotoSwapPair", pairAddress.toString())) as KyotoSwapPair;

      await pair.connect(user1).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);
      const liquidity = await pair.balanceOf(await user1.getAddress());

      await kyotoSwapRouter.connect(user1).removeLiquidity(token1Address, token2Address, liquidity, 0, 0, user1.getAddress(), latestBlock.timestamp + 1000);
    });
    it("Removing Liquidity Between WETH and ERC20 Token", async () => {
      const token1Address = simpleERC20Token1.address;

      await simpleERC20Token1.connect(user1).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);

      const value = ethers.utils.parseEther("1000");
      let latestBlock = await ethers.provider.getBlock("latest");

      await kyotoSwapRouter.connect(user1).addLiquidityETH(token1Address, value, 0, 0, user1.getAddress(), latestBlock.timestamp + 1000, { value });
      await ethers.provider.send("evm_increaseTime", [100 * SECONDS_IN_DAY]);
      await ethers.provider.send("evm_mine", []);

      latestBlock = await ethers.provider.getBlock("latest");

      const pairAddress = await kyotoSwapFactory.getPair(token1Address, weth9.address);

      const pair = (await ethers.getContractAt("KyotoSwapPair", pairAddress.toString())) as KyotoSwapPair;
      await pair.connect(user1).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);
      const liquidity = await pair.balanceOf(await user1.getAddress());

      await kyotoSwapRouter.connect(user1).removeLiquidityETH(token1Address, liquidity, 0, 0, user1.getAddress(), latestBlock.timestamp + 1000);
    });
    it("Removing Liquidity Between A Simple ERC20 and FeeonTransfer Token", async () => {
      const token1Address = simpleERC20Token1.address;
      const token2Address = feeOnTransferToken1.address;

      await simpleERC20Token1.connect(user1).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);
      await feeOnTransferToken1.connect(user1).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);

      const value = ethers.utils.parseEther("1000");
      let latestBlock = await ethers.provider.getBlock("latest");

      await kyotoSwapRouter.connect(user1).addLiquidity(token1Address, token2Address, value, value, 0, 0, user1.getAddress(), latestBlock.timestamp + 1000);

      await ethers.provider.send("evm_increaseTime", [100 * SECONDS_IN_DAY]);
      await ethers.provider.send("evm_mine", []);

      latestBlock = await ethers.provider.getBlock("latest");

      const pairAddress = await kyotoSwapFactory.getPair(token1Address, token2Address);

      const pair = (await ethers.getContractAt("KyotoSwapPair", pairAddress.toString())) as KyotoSwapPair;

      await pair.connect(user1).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);
      const liquidity = await pair.balanceOf(await user1.getAddress());

      await kyotoSwapRouter.connect(user1).removeLiquidity(token1Address, token2Address, liquidity, 0, 0, user1.getAddress(), latestBlock.timestamp + 1000);
    });
    it("Removing Liquidity Between Two FeeonTransfer Tokens", async () => {
      const token1Address = feeOnTransferToken1.address;
      const token2Address = feeOnTransferToken2.address;

      await feeOnTransferToken1.connect(user1).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);
      await feeOnTransferToken2.connect(user1).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);

      const value = ethers.utils.parseEther("1000");
      let latestBlock = await ethers.provider.getBlock("latest");

      await kyotoSwapRouter.connect(user1).addLiquidity(token1Address, token2Address, value, value, 0, 0, user1.getAddress(), latestBlock.timestamp + 1000);

      await ethers.provider.send("evm_increaseTime", [100 * SECONDS_IN_DAY]);
      await ethers.provider.send("evm_mine", []);

      latestBlock = await ethers.provider.getBlock("latest");

      const pairAddress = await kyotoSwapFactory.getPair(token1Address, token2Address);

      const pair = (await ethers.getContractAt("KyotoSwapPair", pairAddress.toString())) as KyotoSwapPair;

      await pair.connect(user1).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);
      const liquidity = await pair.balanceOf(await user1.getAddress());

      await kyotoSwapRouter.connect(user1).removeLiquidity(token1Address, token2Address, liquidity, 0, 0, user1.getAddress(), latestBlock.timestamp + 1000);
    });
    it("Removing Liquidity Between WETH and FeeonTransfer Token", async () => {
      const token1Address = feeOnTransferToken1.address;
      await feeOnTransferToken1.connect(user1).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);

      const value = ethers.utils.parseEther("1000");
      let latestBlock = await ethers.provider.getBlock("latest");

      await kyotoSwapRouter.connect(user1).addLiquidityETH(token1Address, value, 0, 0, user1.getAddress(), latestBlock.timestamp + 1000, { value });

      latestBlock = await ethers.provider.getBlock("latest");

      const pairAddress = await kyotoSwapFactory.getPair(token1Address, weth9.address);

      const pair = (await ethers.getContractAt("KyotoSwapPair", pairAddress.toString())) as KyotoSwapPair;
      await pair.connect(user1).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);
      const liquidity = await pair.balanceOf(await user1.getAddress());

      await kyotoSwapRouter.connect(user1).removeLiquidityETHSupportingFeeOnTransferTokens(token1Address, liquidity, 0, 0, user1.getAddress(), latestBlock.timestamp + 1000);
    });
    it("Removing Liquidity Between Two Simple ERC20 Tokens With Permit", async function () {
      const token1Address = simpleERC20Token1.address;
      const token2Address = simpleERC20Token2.address;
      const owner = await user1.getAddress();
      const spender = kyotoSwapRouter.address;

      await simpleERC20Token1.connect(user1).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);
      await simpleERC20Token2.connect(user1).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);

      let value = ethers.utils.parseEther("1000");
      let latestBlock = await ethers.provider.getBlock("latest");

      await kyotoSwapRouter.connect(user1).addLiquidity(token1Address, token2Address, value, value, 0, 0, user1.getAddress(), latestBlock.timestamp + 1000);

      await ethers.provider.send("evm_increaseTime", [100 * SECONDS_IN_DAY]);
      await ethers.provider.send("evm_mine", []);

      latestBlock = await ethers.provider.getBlock("latest");

      const pairAddress = await kyotoSwapFactory.getPair(token1Address, token2Address);

      const pair = (await ethers.getContractAt("KyotoSwapPair", pairAddress.toString())) as KyotoSwapPair;
      value = await pair.balanceOf(owner);

      let nonce = await pair.nonces(owner);
      const deadline = latestBlock.timestamp + 1000;
      const digest = await getApprovalDigest(pair, { owner, spender, value }, nonce, BigNumber.from(deadline));

      const signer = new ethers.Wallet("ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as string);

      const { v, r, s } = ecsign(Buffer.from(digest.slice(2), "hex"), Buffer.from(signer.privateKey.slice(2), "hex"));

      await kyotoSwapRouter.connect(user1).removeLiquidityWithPermit(token1Address, token2Address, value, 0, 0, owner, deadline, false, v, r, s);
    });
    it("Removing Liquidity Between Fee on Transfer Tokens With Permit", async function () {
      const token1Address = feeOnTransferToken1.address;
      const token2Address = feeOnTransferToken2.address;
      const owner = await user1.getAddress();
      const spender = kyotoSwapRouter.address;

      await feeOnTransferToken1.connect(user1).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);
      await feeOnTransferToken2.connect(user1).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);

      let value = ethers.utils.parseEther("1000");
      let latestBlock = await ethers.provider.getBlock("latest");

      await kyotoSwapRouter.connect(user1).addLiquidity(token1Address, token2Address, value, value, 0, 0, user1.getAddress(), latestBlock.timestamp + 1000);

      await ethers.provider.send("evm_increaseTime", [100 * SECONDS_IN_DAY]);
      await ethers.provider.send("evm_mine", []);

      latestBlock = await ethers.provider.getBlock("latest");

      const pairAddress = await kyotoSwapFactory.getPair(token1Address, token2Address);

      const pair = (await ethers.getContractAt("KyotoSwapPair", pairAddress.toString())) as KyotoSwapPair;
      value = await pair.balanceOf(owner);

      let nonce = await pair.nonces(owner);
      const deadline = latestBlock.timestamp + 1000;
      const digest = await getApprovalDigest(pair, { owner, spender, value }, nonce, BigNumber.from(deadline));

      const signer = new ethers.Wallet("ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as string);

      const { v, r, s } = ecsign(Buffer.from(digest.slice(2), "hex"), Buffer.from(signer.privateKey.slice(2), "hex"));

      await kyotoSwapRouter.connect(user1).removeLiquidityWithPermit(token1Address, token2Address, value, 0, 0, owner, deadline, false, v, r, s);
    });
    it("Removing Liquidity Between Simple ERC20 and Fee on Transfer Tokens With Permit", async function () {
      const token1Address = simpleERC20Token1.address;
      const token2Address = feeOnTransferToken1.address;
      const owner = await user1.getAddress();
      const spender = kyotoSwapRouter.address;

      await simpleERC20Token1.connect(user1).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);
      await feeOnTransferToken1.connect(user1).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);

      let value = ethers.utils.parseEther("1000");
      let latestBlock = await ethers.provider.getBlock("latest");

      await kyotoSwapRouter.connect(user1).addLiquidity(token1Address, token2Address, value, value, 0, 0, user1.getAddress(), latestBlock.timestamp + 1000);

      await ethers.provider.send("evm_increaseTime", [100 * SECONDS_IN_DAY]);
      await ethers.provider.send("evm_mine", []);

      latestBlock = await ethers.provider.getBlock("latest");

      const pairAddress = await kyotoSwapFactory.getPair(token1Address, token2Address);

      const pair = (await ethers.getContractAt("KyotoSwapPair", pairAddress.toString())) as KyotoSwapPair;
      value = await pair.balanceOf(owner);

      let nonce = await pair.nonces(owner);
      const deadline = latestBlock.timestamp + 1000;
      const digest = await getApprovalDigest(pair, { owner, spender, value }, nonce, BigNumber.from(deadline));

      const signer = new ethers.Wallet("ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as string);

      const { v, r, s } = ecsign(Buffer.from(digest.slice(2), "hex"), Buffer.from(signer.privateKey.slice(2), "hex"));

      await kyotoSwapRouter.connect(user1).removeLiquidityWithPermit(token1Address, token2Address, value, 0, 0, owner, deadline, false, v, r, s);
    });
    it("Removing Liquidity Between Eth and Fee on Transfer Tokens With Permit", async function () {
      const token1Address = simpleERC20Token1.address;
      const owner = await user1.getAddress();
      const spender = kyotoSwapRouter.address;

      await simpleERC20Token1.connect(user1).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);
      await feeOnTransferToken1.connect(user1).approve(kyotoSwapRouter.address, MAX_APPROVAL_AMOUNT);

      let value = ethers.utils.parseEther("1000");
      let latestBlock = await ethers.provider.getBlock("latest");

      await kyotoSwapRouter.connect(user1).addLiquidityETH(token1Address, value, 0, 0, user1.getAddress(), latestBlock.timestamp + 1000,{value});

      await ethers.provider.send("evm_increaseTime", [100 * SECONDS_IN_DAY]);
      await ethers.provider.send("evm_mine", []);

      latestBlock = await ethers.provider.getBlock("latest");

      const pairAddress = await kyotoSwapFactory.getPair(token1Address, weth9.address);

      const pair = (await ethers.getContractAt("KyotoSwapPair", pairAddress.toString())) as KyotoSwapPair;
      value = await pair.balanceOf(owner);

      let nonce = await pair.nonces(owner);
      const deadline = latestBlock.timestamp + 1000;
      const digest = await getApprovalDigest(pair, { owner, spender, value }, nonce, BigNumber.from(deadline));

      const signer = new ethers.Wallet("ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as string);

      const { v, r, s } = ecsign(Buffer.from(digest.slice(2), "hex"), Buffer.from(signer.privateKey.slice(2), "hex"));

      await kyotoSwapRouter.connect(user1).removeLiquidityETHWithPermitSupportingFeeOnTransferTokens(token1Address, value, 0, 0, owner, deadline, false, v, r, s);
    });
  });
});
