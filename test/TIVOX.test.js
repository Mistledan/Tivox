const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TIVOX", function () {
  async function deployTivoxFixture() {
    const [owner, recipient] = await ethers.getSigners();
    const TIVOX = await ethers.getContractFactory("TIVOX");
    const tivox = await TIVOX.deploy(owner.address);
    await tivox.waitForDeployment();

    return { tivox, owner, recipient };
  }

  it("sets the token metadata", async function () {
    const { tivox } = await deployTivoxFixture();

    expect(await tivox.name()).to.equal("TIVOX");
    expect(await tivox.symbol()).to.equal("TVX");
    expect(await tivox.decimals()).to.equal(18);
  });

  it("mints the fixed supply to the initial owner", async function () {
    const { tivox, owner } = await deployTivoxFixture();

    const expectedSupply = ethers.parseUnits("1000000", 18);
    expect(await tivox.TOTAL_SUPPLY()).to.equal(expectedSupply);
    expect(await tivox.totalSupply()).to.equal(expectedSupply);
    expect(await tivox.balanceOf(owner.address)).to.equal(expectedSupply);
    expect(await tivox.owner()).to.equal(owner.address);
  });

  it("allows holders to transfer tokens", async function () {
    const { tivox, owner, recipient } = await deployTivoxFixture();
    const amount = ethers.parseUnits("25", 18);

    await expect(tivox.transfer(recipient.address, amount))
      .to.emit(tivox, "Transfer")
      .withArgs(owner.address, recipient.address, amount);

    expect(await tivox.balanceOf(recipient.address)).to.equal(amount);
  });

  it("allows holders to burn their own tokens", async function () {
    const { tivox, owner } = await deployTivoxFixture();
    const burnAmount = ethers.parseUnits("100", 18);
    const initialSupply = await tivox.totalSupply();

    await expect(tivox.burn(burnAmount))
      .to.emit(tivox, "Transfer")
      .withArgs(owner.address, ethers.ZeroAddress, burnAmount);

    expect(await tivox.totalSupply()).to.equal(initialSupply - burnAmount);
  });
});
