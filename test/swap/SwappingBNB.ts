import { ethers } from "hardhat";
const { assert, expect } = require("chai")
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import deployFactoryandRouter from "../DeployCommonContract"
import { formatEther, parseEther } from "ethers/lib/utils";
import { AddressZero, Zero, MaxUint256 } from '@ethersproject/constants'


async function addLiquidity() {
    const {
        WBNB,
        SimpleTokenERC20_1,
        SimpleTokenERC20_2,
        KyotoSwapFactory,
        KyotoSwapRouter,
        User1,
        User2,
        timeStamp
    } = await deployFactoryandRouter()

    await SimpleTokenERC20_1.transfer(User1.getAddress(), parseEther("2000"))
    await SimpleTokenERC20_1.transfer(User2.getAddress(), parseEther("2000"))
    await SimpleTokenERC20_1.connect(User1).approve(KyotoSwapRouter.address, parseEther("2000"))
    await SimpleTokenERC20_1.connect(User2).approve(KyotoSwapRouter.address, parseEther("2000"))
    // await User1.sendTransaction({
    //     to: WBNB.address,
    //     value: parseEther("50")
    // })
    await WBNB.connect(User1).approve(KyotoSwapRouter.address, parseEther("50"))
    await WBNB.connect(User2).approve(KyotoSwapRouter.address, parseEther("50"))

    // console.log("balanceBeforSwap:- ", await User1.getBalance());

    // expect((await (await WBNB.balanceOf(User1.getAddress())).toString())).to.equal(parseEther("50").toString())
    await KyotoSwapRouter.connect(User1).addLiquidityETH(
        SimpleTokenERC20_1.address,
        parseEther("200").toString(),
        parseEther("200").toString(),
        parseEther("20").toString(),
        User1.getAddress(),
        timeStamp + 1100,
        {
            value: parseEther('20')
        }
    )

    return {
        WBNB,
        SimpleTokenERC20_1,
        SimpleTokenERC20_2,
        KyotoSwapFactory,
        KyotoSwapRouter,
        User1,
        User2,
        timeStamp
    }
}

async function addLiquidityForReburs() {
    const {
        WBNB,
        SimpleTokenERC20_1,
        SimpleTokenERC20_2,
        KyotoSwapFactory,
        KyotoSwapRouter,
        rebased,
        User1,
        User2,
        timeStamp
    } = await deployFactoryandRouter()

    await rebased.transfer(User1.getAddress(), parseEther("2000"))
    await rebased.transfer(User2.getAddress(), parseEther("2000"))
    await rebased.connect(User1).approve(KyotoSwapRouter.address, parseEther("2000"))
    await rebased.connect(User2).approve(KyotoSwapRouter.address, parseEther("2000"))
    // await User1.sendTransaction({
    //     to: WBNB.address,
    //     value: parseEther("50")
    // })
    await WBNB.connect(User1).approve(KyotoSwapRouter.address, parseEther("50"))
    await WBNB.connect(User2).approve(KyotoSwapRouter.address, parseEther("50"))

    // console.log("balanceBeforSwap:- ", await User1.getBalance());

    // expect((await (await WBNB.balanceOf(User1.getAddress())).toString())).to.equal(parseEther("50").toString())
    await KyotoSwapRouter.connect(User1).addLiquidityETH(
        rebased.address,
        parseEther("200").toString(),
        parseEther("200").toString(),
        0,
        User1.getAddress(),
        timeStamp + 1100,
        {
            value: parseEther('20')
        }
    )

    return {
        WBNB,
        rebased,
        KyotoSwapFactory,
        KyotoSwapRouter,
        User1,
        User2,
        timeStamp
    }
}

describe("Swapping with WBNB with out Fees", function () {
    describe("Swapping ERC20 Tokens For WBNB ", function () {
        describe("Swapping ERC20 token for WBNB on Success", async function () {
            it("Swapping ERC20 token for WBNB on Success", async function () {
                const {
                    WBNB,
                    SimpleTokenERC20_1,
                    SimpleTokenERC20_2,
                    KyotoSwapFactory,
                    KyotoSwapRouter,
                    User1,
                    User2,
                    timeStamp
                } = await addLiquidity()

                await User2.sendTransaction({
                    to: WBNB.address,
                    value: parseEther("20")
                })
                const balance = await User1.getBalance()

                const amount = await KyotoSwapRouter.getAmountsIn(
                    "1055798975874993401",
                    [SimpleTokenERC20_1.address, WBNB.address],
                )
                // console.log(amount);
                // const getToken = parseInt(formatEther(amount[0])) - 5

                await KyotoSwapRouter.connect(User2).swapTokensForExactETH(
                    "1055798975874993401",
                    amount[0],
                    [SimpleTokenERC20_1.address, WBNB.address],
                    User1.getAddress(),
                    timeStamp + 1000,
                )
                const balanceAfterSwap = await User1.getBalance()

                expect(parseInt(balanceAfterSwap.toString())).to.greaterThan(parseInt(balance.toString()))
            })
        })

        describe("Swapping ERC20 token for WBNB on failure", async function () {
            it("Should revert KyotoSwapRouter: INVALID_PATH", async function () {
                const {
                    WBNB,
                    SimpleTokenERC20_1,
                    KyotoSwapRouter,
                    User1,
                    User2,
                    timeStamp
                } = await addLiquidity();

                await User2.sendTransaction({
                    to: WBNB.address,
                    value: parseEther("20")
                })

                const amount = await KyotoSwapRouter.getAmountsIn(
                    parseEther("1"),
                    [SimpleTokenERC20_1.address, WBNB.address],
                )

                await expect(KyotoSwapRouter.connect(User2).swapTokensForExactETH(
                    parseEther("10"),
                    parseEther(amount[1].toString()),
                    [WBNB.address, SimpleTokenERC20_1.address],
                    User1.getAddress(),
                    timeStamp + 1000,
                )).to.be.revertedWith("KyotoSwapRouter: INVALID_PATH")
            })

            it("Should revert KyotoSwapRouter: EXCESSIVE_INPUT_AMOUNT", async function () {
                const {
                    WBNB,
                    SimpleTokenERC20_1,
                    SimpleTokenERC20_2,
                    KyotoSwapFactory,
                    KyotoSwapRouter,
                    User1,
                    User2,
                    timeStamp
                } = await addLiquidity();

                await User2.sendTransaction({
                    to: WBNB.address,
                    value: parseEther("20")
                })

                await expect(
                    KyotoSwapRouter.connect(User2).swapTokensForExactETH(
                        parseEther('5'),
                        2000,
                        [SimpleTokenERC20_1.address, WBNB.address],
                        User1.getAddress(),
                        timeStamp + 1000,
                    )
                ).to.be.revertedWith("KyotoSwapRouter: EXCESSIVE_INPUT_AMOUNT")
            })
        })
    })
})

describe("Swapping Reburs Erc20 tokens for WBNB", function () {
    describe("swapping Erc20 token for WBNB on Success", async function () {
        it("Swapping ERC20 token for WBNB on Success", async function () {
            const {
                WBNB,
                rebased,
                KyotoSwapFactory,
                KyotoSwapRouter,
                User1,
                User2,
                timeStamp
            } = await addLiquidityForReburs()

            const balance = await User1.getBalance()

            const amount = await KyotoSwapRouter.getAmountsIn(
                parseEther("9"),
                [rebased.address, WBNB.address],
            )

            // console.log("Amount ", ethers.utils.formatEther(amount[0]));

            await KyotoSwapRouter.connect(User2).swapExactTokensForETHSupportingFeeOnTransferTokens(
                amount[0],
                parseEther("6"),
                [rebased.address, WBNB.address],
                User1.getAddress(),
                timeStamp + 1000,
            )
            const balanceAfterSwap = await User1.getBalance()

            expect(parseInt(balanceAfterSwap.toString())).to.greaterThan(parseInt(balance.toString()))
        })
    })

    describe("Swapping ERC20 Reburs for WBNB on failure", async function () {
        it("Should revert KyotoSwap: K", async function () {
            const {
                WBNB,
                rebased,
                KyotoSwapFactory,
                KyotoSwapRouter,
                User1,
                User2,
                timeStamp
            } = await addLiquidityForReburs()

            await User2.sendTransaction({
                to: WBNB.address,
                value: parseEther("20")
            })
            const balance = await User1.getBalance()

            const amount = await KyotoSwapRouter.getAmountsIn(
                parseEther("1"),
                [rebased.address, WBNB.address],
            )

            await expect(KyotoSwapRouter.connect(User2).swapTokensForExactETH(
                parseEther("10"),
                parseEther(amount[1].toString()),
                [rebased.address, WBNB.address],
                User1.getAddress(),
                timeStamp + 1000,
            )).to.be.revertedWith("KyotoSwap: K")
        })

        it("Should revert KyotoSwapRouter: EXCESSIVE_INPUT_AMOUNT", async function () {
            const {
                WBNB,
                rebased,
                KyotoSwapFactory,
                KyotoSwapRouter,
                User1,
                User2,
                timeStamp
            } = await addLiquidityForReburs()

            await expect(
                KyotoSwapRouter.connect(User2).swapTokensForExactETH(
                    parseEther("10"),
                    parseEther("9.7"),
                    [rebased.address, WBNB.address],
                    User1.getAddress(),
                    timeStamp + 1000,
                )
            ).to.be.revertedWith("KyotoSwapRouter: EXCESSIVE_INPUT_AMOUNT")
        })
    })
})