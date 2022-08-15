import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";

import { BetterBounty } from "../typechain";

describe("Better Bounty", function () {
  let bountyContract: any;
  let accounts: any[] = [];
  const bounty = {
    id: "https://github.com/better-feedback/better-app/issues/45",
    deadline: "2020-01-01T00:00:00Z",
  };

  // Deploying a new contract for each test case
  beforeEach(async () => {
    accounts = await ethers.getSigners();
    const bountyFactory = await ethers.getContractFactory("BetterBountyNonUpgradable");

    bountyContract = await bountyFactory.deploy();
    await bountyContract.deployed();
  });

  describe("When contract is deployed", () => {
    it("should have 0 bounties", async () => {
      const bounties = await bountyContract.bountyCount();
      expect(bounties).to.equal(0);
    });

    it("should add contract deployer to admin list", async () => {
      const admin = await bountyContract.isAdmin(accounts[0].address);
      expect(admin).to.equal(true);
    });
  });

  describe("When a bounty is funded", () => {
    it("should revert if a eth not passed when adding a new bounty", async () => {
      await expect(
        bountyContract.fundBounty(bounty.id, bounty.deadline)
      ).to.be.revertedWith("You have to put some ETH to fund the bounty");
    });

    it("should be able to add a new bounty", async () => {
      await bountyContract.fundBounty(bounty.id, bounty.deadline, {
        value: ethers.utils.parseEther("1"),
      });
      const bounties = await bountyContract.bountyCount();
      expect(bounties).to.equal(1);
    });

    it("should be able to get a bounty", async () => {
      await bountyContract.fundBounty(bounty.id, bounty.deadline, {
        value: ethers.utils.parseEther("1"),
      });
      const bountyFromContract = await bountyContract.getBountyById(bounty.id);
      expect(bountyFromContract.id).to.equal(bounty.id);
      expect(bountyFromContract.deadline).to.equal(bounty.deadline);
      expect(bountyFromContract.funders[0]).to.equal(accounts[0].address);
    });
  });

  describe("When user starts work", () => {
    it("should revert if bounty does not exist", async () => {
      await expect(bountyContract.startWork(bounty.id)).to.be.revertedWith(
        "Bounty with ID doesn not exist"
      );
    });

    it("should be able to start work", async () => {
      await bountyContract.fundBounty(bounty.id, bounty.deadline, {
        value: ethers.utils.parseEther("1"),
      });
      await bountyContract.startWork(bounty.id);
      const bountyFromContract = await bountyContract.getBountyById(bounty.id);
      expect(bountyFromContract.workers.length).to.equal(1);
      expect(bountyFromContract.workers[0]).to.equal(accounts[0].address);
    });

    it("should revert if user already is working on the bounty", async () => {
      await bountyContract.fundBounty(bounty.id, bounty.deadline, {
        value: ethers.utils.parseEther("1"),
      });
      await bountyContract.startWork(bounty.id);

      await expect(bountyContract.startWork(bounty.id)).to.revertedWith(
        "You are already working on this issue"
      );
    });
  });
  describe("When admin uses contract", () => {
    it("should revert if a regular user tries to call admin methods", async () => {
      await expect(
        bountyContract.connect(accounts[1]).addAdmin(accounts[1].address)
      ).to.be.revertedWith("Only admins can call this method");
    });

    it("should be able to add an admin", async () => {
      await bountyContract.addAdmin(accounts[1].address);
      const admin = await bountyContract.isAdmin(accounts[1].address);
      expect(admin).to.equal(true);
    });

    it("should be able to remove an admin", async () => {
      await bountyContract.addAdmin(accounts[1].address);
      await bountyContract.removeAdmin(accounts[1].address);
      const admin = await bountyContract.isAdmin(accounts[1].address);
      expect(admin).to.equal(false);
    });
  });

  describe("When paying out a bounty", () => {
    it("should revert if not called by admin", async () => {
      await bountyContract.fundBounty(bounty.id, bounty.deadline, {
        value: ethers.utils.parseEther("1"),
      });

      await expect(
        bountyContract
          .connect(accounts[1])
          .payoutBounty(bounty.id, accounts[1].address, 25)
      ).to.be.revertedWith("Only admins can call this method");
    });
    it("should revert if percentage larger than 100", async () => {
      await bountyContract.fundBounty(bounty.id, bounty.deadline, {
        value: ethers.utils.parseEther("1"),
      });

      await expect(
        bountyContract.payoutBounty(bounty.id, accounts[1].address, 105)
      ).to.be.revertedWith("Percentage must be between 0 and 100");
    });

    it("should revert if a bounty does not exist", async () => {
      await expect(
        bountyContract.payoutBounty(bounty.id, accounts[1].address, 25)
      ).to.be.revertedWith("Bounty with ID doesn not exist");
    });


    it("should be able to payout a bounty", async () => {
      await bountyContract.fundBounty(bounty.id, bounty.deadline, {
        value: ethers.utils.parseEther("1"),
      });
      await bountyContract.payoutBounty(bounty.id, accounts[1].address, 25);
      expect(parseFloat(await accounts[1].getBalance()) > parseFloat(ethers.utils.parseEther("100.24").toString())).eq(true);
    })

  });
});