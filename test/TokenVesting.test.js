const { expect } = require("chai");
const { ethers } = require("hardhat");

const DAY = 24 * 60 * 60;

describe("TokenVesting (community lock)", function () {
  async function vestFixture() {
    const [deployer, beneficiary, stranger] = await ethers.getSigners();
    const TVX = await ethers.getContractFactory("TVX");
    const tvx = await TVX.deploy();
    await tvx.waitForDeployment();

    const start = (await ethers.provider.getBlock("latest")).timestamp + 30 * DAY;
    const duration = 180n * BigInt(DAY);
    const Vesting = await ethers.getContractFactory("TokenVesting");
    const vesting = await Vesting.deploy(beneficiary.address, start, duration);
    await vesting.waitForDeployment();

    const communityAmount = ethers.parseUnits("200000000", 18);
    await tvx.transfer(await vesting.getAddress(), communityAmount);

    return { tvx, vesting, deployer, beneficiary, stranger, start, duration, communityAmount };
  }

  it("holds the community allocation during the cliff", async function () {
    const { tvx, vesting, beneficiary, communityAmount } = await vestFixture();

    expect(await tvx.balanceOf(await vesting.getAddress())).to.equal(communityAmount);
    // Nothing is vested before the cliff: release would send zero.
    await expect(vesting.connect(beneficiary)["release(address)"](await tvx.getAddress()))
      .to.emit(vesting, "ERC20Released").withArgs(await tvx.getAddress(), 0n);
    expect(await tvx.balanceOf(beneficiary.address)).to.equal(0n);
  });

  it("unlocks linearly after the cliff", async function () {
    const { tvx, vesting, beneficiary, start, duration, communityAmount } = await vestFixture();
    const tvxAddress = await tvx.getAddress();

    // Halfway through the unlock window -> half is vested.
    const half = duration / 2n;
    const target = BigInt(start) + half;
    await ethers.provider.send("evm_setNextBlockTimestamp", ["0x" + target.toString(16)]);
    const receipt = await (await vesting.connect(beneficiary)["release(address)"](tvxAddress)).wait();
    const block = await ethers.provider.getBlock(receipt.blockNumber);

    // Vested = totalAllocation * elapsed / duration, evaluated at the tx block.
    const expected =
      (communityAmount * (BigInt(block.timestamp) - BigInt(await vesting.start()))) / duration;
    expect(await tvx.balanceOf(beneficiary.address)).to.equal(expected);
  });

  it("releases everything once the schedule completes", async function () {
    const { tvx, vesting, beneficiary, start, duration, communityAmount } = await vestFixture();

    const target = BigInt(start) + duration;
    await ethers.provider.send("evm_setNextBlockTimestamp", ["0x" + target.toString(16)]);
    await ethers.provider.send("evm_mine", []);
    await vesting.connect(beneficiary)["release(address)"](await tvx.getAddress());

    expect(await tvx.balanceOf(beneficiary.address)).to.equal(communityAmount);
    expect(await tvx.balanceOf(await vesting.getAddress())).to.equal(0n);
  });

  it("can be triggered by anyone, but funds always reach the beneficiary", async function () {
    const { tvx, vesting, beneficiary, stranger, start, duration, communityAmount } = await vestFixture();

    // release() is permissionless (OZ VestingWallet v5): anyone may call it,
    // but tokens are always sent to the beneficiary (owner) address.
    const target = BigInt(start) + duration;
    await ethers.provider.send("evm_setNextBlockTimestamp", ["0x" + target.toString(16)]);
    await ethers.provider.send("evm_mine", []);
    await vesting.connect(stranger)["release(address)"](await tvx.getAddress());

    expect(await tvx.balanceOf(beneficiary.address)).to.equal(communityAmount);
    expect(await tvx.balanceOf(stranger.address)).to.equal(0n);
  });
});