import { expect } from "chai";
import { ethers } from "hardhat"

import deployFactoryandRouter from "../DeployCommonContract"
import { KyotoSwapPair } from "../../typechain-types";
import { parseEther } from "ethers/lib/utils";

async function addLiquidityNormalERC20() {
  const {
    SimpleTokenERC20_1,
    SimpleTokenERC20_2,
    KyotoSwapRouter,
    KyotoSwapFactory,
    User1,
    User2,
    timeStamp
  } = await deployFactoryandRouter()

  await SimpleTokenERC20_1.transfer(User1.getAddress(), ethers.utils.parseEther('100'))
  await SimpleTokenERC20_2.transfer(User1.getAddress(), ethers.utils.parseEther('100'))
  await SimpleTokenERC20_1.transfer(User2.getAddress(), ethers.utils.parseEther('100'))
  await SimpleTokenERC20_2.transfer(User2.getAddress(), ethers.utils.parseEther('100'))
  await SimpleTokenERC20_1.connect(User1).approve(KyotoSwapRouter.address, ethers.utils.parseEther('100'))
  await SimpleTokenERC20_1.connect(User2).approve(KyotoSwapRouter.address, ethers.utils.parseEther('100'))
  await SimpleTokenERC20_2.connect(User1).approve(KyotoSwapRouter.address, ethers.utils.parseEther('100'))
  await SimpleTokenERC20_2.connect(User2).approve(KyotoSwapRouter.address, ethers.utils.parseEther('100'))

  let tokenAddress1 = SimpleTokenERC20_1.address
  let tokenAddress2 = SimpleTokenERC20_2.address
  let timeStampNew = timeStamp + 10000

  const value = ethers.utils.parseEther('100')

  await KyotoSwapRouter.connect(User1).addLiquidity(
    tokenAddress1,
    tokenAddress2,
    value,
    value,
    0,
    0,
    User1.getAddress(),
    timeStampNew
  )

  return {
    SimpleTokenERC20_1,
    SimpleTokenERC20_2,
    KyotoSwapRouter,
    KyotoSwapFactory,
    User1,
    User2,
    timeStamp
  }
}

async function addLiquidityRebaseERC20() {
  const { SimpleTokenERC20_1, rebased, User1, User2, feeToSetter, KyotoSwapRouter, timeStamp } = await deployFactoryandRouter()

  await SimpleTokenERC20_1.transfer(User1.getAddress(), ethers.utils.parseEther('100'))
  await rebased.transfer(User1.getAddress(), ethers.utils.parseEther('100'))
  await SimpleTokenERC20_1.connect(User1).approve(KyotoSwapRouter.address, ethers.utils.parseEther("100"))
  await rebased.connect(User1).approve(KyotoSwapRouter.address, ethers.utils.parseEther("100"))

  await SimpleTokenERC20_1.transfer(User2.getAddress(), ethers.utils.parseEther('100'))
  await rebased.transfer(User2.getAddress(), ethers.utils.parseEther('100'))
  await SimpleTokenERC20_1.connect(User2).approve(KyotoSwapRouter.address, ethers.utils.parseEther("100"))
  await rebased.connect(User2).approve(KyotoSwapRouter.address, ethers.utils.parseEther("100"))
  const value = ethers.utils.parseEther('100')
  let timeStampNew = timeStamp + 100


  await KyotoSwapRouter.connect(User1).addLiquidity(
    SimpleTokenERC20_1.address,
    rebased.address,
    value,
    value,
    0,
    0,
    User1.address,
    timeStampNew
  )

  return {
    SimpleTokenERC20_1, rebased, User1, User2, feeToSetter, KyotoSwapRouter, timeStampNew
  }
}

describe("Swapping ERC20 Tokens For ERC20 Tokens with out Fees", function () {
  // We define a fixture to reuse the same setup in every test. We use
  // loadFixture to run this setup once, snapshot that state, and reset Hardhat
  // Network to that snapshot in every test.

  // You can nest describe calls to create subsections.
  // describe("Swapping Success", async function () {
  // `it` is another Mocha function. This is the one you use to define each
  // of your tests. It receives the test name, and a callback function.
  //
  // If the callback function is async, Mocha will `await` it.

  describe("swapping normal ERC20 Token", async function () {
    it("swapping normal ERC20 Token Success", async function () {
      const {
        SimpleTokenERC20_1,
        SimpleTokenERC20_2,
        KyotoSwapRouter,
        KyotoSwapFactory,
        User1,
        User2,
        timeStamp
      } = await addLiquidityNormalERC20()
      // await addLiquidityNormalERC20()

      const pairAddress = await KyotoSwapFactory.getPair(
        SimpleTokenERC20_1.address,
        SimpleTokenERC20_2.address
      )
      let timeStampNew = timeStamp + 100


      const pair = (await ethers.getContractAt("KyotoSwapPair", pairAddress.toString())) as KyotoSwapPair
      const amount = await KyotoSwapRouter.getAmountsOut(ethers.utils.parseEther('10'), [SimpleTokenERC20_1.address,
      SimpleTokenERC20_2.address])
      
      const swapAmount = ethers.utils.parseEther('10')
      const amounts = (await KyotoSwapRouter.getAmountsOut(swapAmount, [SimpleTokenERC20_1.address, SimpleTokenERC20_2.address])).map((e) => {
        return parseInt(e.toString())
      })
      await KyotoSwapRouter.connect(User2).swapExactTokensForTokens(
        `${amounts[0]}`,
        `${parseEther("0.5")}`,
        [SimpleTokenERC20_1.address, SimpleTokenERC20_2.address],
        User2.address,
        timeStampNew + 100
      )



      const balance = await SimpleTokenERC20_2.balanceOf(User2.address)

      expect(parseInt(balance.toString())).to.greaterThan(parseInt(ethers.utils.parseEther('108').toString()))
    })

    it("Should revert normal ERC20 KyotoSwapRouter: INSUFFICIENT_OUTPUT_AMOUNT", async function () {
      const {
        SimpleTokenERC20_1,
        SimpleTokenERC20_2,
        KyotoSwapRouter,
        KyotoSwapFactory,
        User1,
        User2,
        timeStamp
      } = await addLiquidityNormalERC20()


      const pairAddress = await KyotoSwapFactory.getPair(
        SimpleTokenERC20_1.address,
        SimpleTokenERC20_2.address
      )
      let timeStampNew = timeStamp + 100


      const pair = (await ethers.getContractAt("KyotoSwapPair", pairAddress.toString())) as KyotoSwapPair
      const swapAmount = ethers.utils.parseEther('10')
      const amounts = (await KyotoSwapRouter.getAmountsOut(swapAmount, [SimpleTokenERC20_1.address, SimpleTokenERC20_2.address])).map((e) => {
        return parseInt(e.toString())
      })
      await expect(KyotoSwapRouter.connect(User2).swapExactTokensForTokens(
        `${swapAmount}`,
        ethers.utils.parseEther('11.7'),
        [SimpleTokenERC20_1.address, SimpleTokenERC20_2.address],
        User2.address,
        timeStampNew + 100
      )).to.be.revertedWith("KyotoSwapRouter: INSUFFICIENT_OUTPUT_AMOUNT")
    })
  })

  describe("swapping Rebase ERC20 Token", async function () {
    it("swapping Rebase ERC20 Token Success", async function () {
      const { SimpleTokenERC20_1, rebased, User1, User2, feeToSetter, KyotoSwapRouter, timeStampNew } = await addLiquidityRebaseERC20()

      const swapAmount = ethers.utils.parseEther('10')

      await KyotoSwapRouter.connect(User2).swapExactTokensForTokens(
        `${swapAmount}`,
        ethers.utils.parseEther('8'),
        [SimpleTokenERC20_1.address, rebased.address],
        User2.address,
        timeStampNew + 100
      )

      const balance = await rebased.balanceOf(User2.address)

      expect(parseInt(balance.toString())).to.greaterThan(parseInt(ethers.utils.parseEther('108').toString()))

    })

    it("Should revert Rebase ERC20 KyotoSwapRouter: INSUFFICIENT_OUTPUT_AMOUNT", async function () {
      const { SimpleTokenERC20_1, rebased, User1, User2, feeToSetter, KyotoSwapRouter, timeStampNew } = await addLiquidityRebaseERC20()

      const swapAmount = ethers.utils.parseEther('10')

      await expect(KyotoSwapRouter.connect(User2).swapExactTokensForTokens(
        `${swapAmount}`,
        ethers.utils.parseEther('11.7'),
        [SimpleTokenERC20_1.address, rebased.address],
        User2.address,
        timeStampNew + 100
      )).to.be.revertedWith("KyotoSwapRouter: INSUFFICIENT_OUTPUT_AMOUNT")
    })
  });
});