const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TVX (mainnet)", function () {
  async function deployTvxFixture() {
    const [owner, recipient, alice, bob] = await ethers.getSigners();
    const TVX = await ethers.getContractFactory("TVX");
    const tvx = await TVX.deploy();
    await tvx.waitForDeployment();

    return { tvx, owner, recipient, alice, bob };
  }

  it("sets the token metadata", async function () {
    const { tvx } = await deployTvxFixture();

    expect(await tvx.name()).to.equal("TIVOX");
    expect(await tvx.symbol()).to.equal("TVX");
    expect(await tvx.decimals()).to.equal(18);
  });

  it("mints the 1 billion supply to the deployer", async function () {
    const { tvx, owner } = await deployTvxFixture();

    const expectedSupply = ethers.parseUnits("1000000000", 18);
    expect(await tvx.TOTAL_SUPPLY()).to.equal(expectedSupply);
    expect(await tvx.totalSupply()).to.equal(expectedSupply);
    expect(await tvx.balanceOf(owner.address)).to.equal(expectedSupply);
    expect(await tvx.owner()).to.equal(owner.address);
  });

  it("transfers without any tax (receiver keeps every token)", async function () {
    const { tvx, owner, alice, bob } = await deployTvxFixture();

    const amount = ethers.parseUnits("250000000", 18);

    await tvx.transfer(alice.address, amount);
    await tvx.connect(alice).transfer(bob.address, ethers.parseUnits("100000000", 18));

    expect(await tvx.balanceOf(owner.address)).to.equal(ethers.parseUnits("750000000", 18));
    expect(await tvx.balanceOf(alice.address)).to.equal(ethers.parseUnits("150000000", 18));
    expect(await tvx.balanceOf(bob.address)).to.equal(ethers.parseUnits("100000000", 18));
  });

  it("allows holders to burn their own tokens and reduce supply", async function () {
    const { tvx, owner, alice } = await deployTvxFixture();
    const amount = ethers.parseUnits("500000000", 18);
    await tvx.transfer(alice.address, amount);

    const initialSupply = await tvx.totalSupply();
    const burnAmount = ethers.parseUnits("100000000", 18);

    await expect(tvx.connect(alice).burn(burnAmount))
      .to.emit(tvx, "Transfer")
      .withArgs(alice.address, ethers.ZeroAddress, burnAmount);

    expect(await tvx.totalSupply()).to.equal(initialSupply - burnAmount);
    expect(await tvx.balanceOf(alice.address)).to.equal(amount - burnAmount);
  });

  it("has no way to mint additional supply", async function () {
    const { tvx, owner } = await deployTvxFixture();

    const totalSupply = await tvx.totalSupply();
    const ownerBalance = await tvx.balanceOf(owner.address);

    // total supply equals the sum of all balances and the constant
    expect(totalSupply).to.equal(ownerBalance);
    expect(totalSupply).to.equal(await tvx.TOTAL_SUPPLY());
  });

  it("lets the owner renounce ownership", async function () {
    const { tvx, owner } = await deployTvxFixture();

    await expect(tvx.renounceOwnership()).to.emit(tvx, "OwnershipTransferred");
    expect(await tvx.owner()).to.equal(ethers.ZeroAddress);
  });
});