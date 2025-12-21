import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrivaBidAuction", function () {
  async function deployFixture() {
    const [owner, bidder1, bidder2] = await ethers.getSigners();
    const PrivaBidAuction = await ethers.getContractFactory("PrivaBidAuction");
    const auction = await PrivaBidAuction.deploy();
    await auction.waitForDeployment();
    return { auction, owner, bidder1, bidder2 };
  }

  it("Should deploy and create auction", async function () {
    const { auction, owner } = await deployFixture();
    
    const tx = await auction.createAuction("Test NFT", 60);
    await tx.wait();
    
    const info = await auction.getAuctionInfo(0);
    expect(info[0]).to.equal(owner.address);
    expect(info[1]).to.equal("Test NFT");
    expect(info[3]).to.equal(true);
  });

  it("Should accept simple bids", async function () {
    const { auction, bidder1 } = await deployFixture();
    
    await auction.createAuction("Test", 60);
    
    // Submit simple bid (no encryption for testing)
    await auction.connect(bidder1).submitSimpleBid(0);
    
    const info = await auction.getAuctionInfo(0);
    expect(info[4]).to.equal(1); // bidCount
    expect(info[5]).to.equal(bidder1.address); // pendingWinner
  });

  it("Should handle multiple bidders", async function () {
    const { auction, bidder1, bidder2 } = await deployFixture();
    
    await auction.createAuction("Test", 60);
    
    await auction.connect(bidder1).submitSimpleBid(0);
    await auction.connect(bidder2).submitSimpleBid(0);
    
    const info = await auction.getAuctionInfo(0);
    expect(info[4]).to.equal(2); // Two bids
  });

  it("Should end auction", async function () {
    const { auction, owner } = await deployFixture();
    
    await auction.createAuction("Test", 1);
    
    // Fast forward
    await ethers.provider.send("evm_increaseTime", [61]);
    await ethers.provider.send("evm_mine", []);
    
    await auction.endAuction(0);
    
    const info = await auction.getAuctionInfo(0);
    expect(info[3]).to.equal(false); // Not active
  });

  it("Should return test message", async function () {
    const { auction } = await deployFixture();
    
    const message = await auction.getTestMessage();
    expect(message).to.equal("FHE Auction: Bids remain encrypted until revealed via Zama relayer");
  });
});