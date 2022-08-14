import { expect } from "chai";
import { Contract } from "ethers";
import { ethers, network } from "hardhat";

import { BetterBountyV2 } from "../typechain";

describe("Better Bounty", function () {
  let bountyContract: any;
  let accounts: any[] = [];
  const bounty = {
    id: "https://github.com/better-feedback/better-app/issues/45",
    deadline: 1660849993,
    startedAt: 1660491541,
    project: "betterhq",
  };

  // Deploying a new contract for each test case
  beforeEach(async () => {
    accounts = await ethers.getSigners();
    const bountyFactory = await ethers.getContractFactory("BetterBountyV2");

    bountyContract = await bountyFactory.deploy("betterhq");
    await bountyContract.deployed();
  });

  describe("When contract is deployed", () => {
    it("should add contract deployer to admin list", async () => {
      const admin = await bountyContract.isAdmin(
        accounts[0].address,
        "betterhq"
      );
      expect(admin).to.equal(true);
    });
  });

  describe("When user starts work", () => {
    it("should revert if bounty does not exist", async () => {
      await expect(bountyContract.startWork(bounty.id)).to.be.revertedWith(
        "BetterBounty__NoBountyWithId()"
      );
    });

    it("should be able to start work", async () => {
      await bountyContract.fundBounty(
        bounty.id,
        bounty.deadline,
        bounty.startedAt,
        bounty.project,
        {
          value: ethers.utils.parseEther("1"),
        }
      );
      await bountyContract.startWork(bounty.id);
      const bountyFromContract = await bountyContract.getBountyById(bounty.id);
      expect(bountyFromContract.workers.length).to.equal(1);
      expect(bountyFromContract.workers[0]).to.equal(accounts[0].address);
    });

    it("should revert if user already is working on the bounty", async () => {
      await bountyContract.fundBounty(
        bounty.id,
        bounty.deadline,
        bounty.startedAt,
        bounty.project,
        {
          value: ethers.utils.parseEther("1"),
        }
      );
      await bountyContract.startWork(bounty.id);

      await expect(bountyContract.startWork(bounty.id)).to.revertedWith(
        "BetterBounty__AlreadyWorking()"
      );
    });

    // Tested with max of 10 workers
    it("should revert if max workers been exceeded", async () => {
      await bountyContract.fundBounty(
        bounty.id,
        bounty.deadline,
        bounty.startedAt,
        bounty.project,
        {
          value: ethers.utils.parseEther("1"),
        }
      );

      for (let i = 0; i <= 9; i++) {
        await bountyContract.connect(accounts[i]).startWork(bounty.id);
      }

      await expect(
        bountyContract.connect(accounts[10]).startWork(bounty.id)
      ).to.be.revertedWith("BetterBounty__MaxWorkersReached()");
    });
  });
  describe("When admin uses contract", () => {
    it("should revert if a regular user tries to call admin methods", async () => {
      await expect(
        bountyContract
          .connect(accounts[1])
          .addAdmin(accounts[1].address, "betterhq")
      ).to.be.revertedWith("BetterBounty__NotAdmin()");
    });

    it("should be able to add an admin", async () => {
      await bountyContract.addAdmin(accounts[1].address, "betterhq");
      const admin = await bountyContract.isAdmin(
        accounts[1].address,
        "betterhq"
      );
      expect(admin).to.equal(true);
    });

    it("should be able to update admins project", async () => {
      await bountyContract.addAdmin(accounts[1].address, "betterhq");
      await bountyContract.updateAdmin(accounts[1].address, "decentrajobs");
      const admin = await bountyContract.isAdmin(
        accounts[1].address,
        "decentrajobs"
      );
      expect(admin).to.equal(true);
    });

    it("should be able to remove an admin", async () => {
      await bountyContract.addAdmin(accounts[1].address, "betterhq");
      await bountyContract.removeAdmin(accounts[1].address);
      const admin = await bountyContract.isAdmin(
        accounts[1].address,
        "betterhq"
      );
      expect(admin).to.equal(false);
    });
  });

  describe("When paying out a bounty", () => {

    it("should revert if not called by admin", async () => {
      await bountyContract.fundBounty(
        bounty.id,
        bounty.deadline,
        bounty.startedAt,
        bounty.project,
        {
          value: ethers.utils.parseEther("1"),
        }
      );

      await expect(
        bountyContract
          .connect(accounts[1])
          .payoutBounty(bounty.id, accounts[1].address, 25)
      ).to.be.revertedWith("BetterBounty__NotAdmin()");
    });

    it("should revert if contract has no funds", async () => {
      await expect(
        bountyContract.payoutBounty(bounty.id, accounts[1].address, 25)
      ).to.be.revertedWith("BetterBounty__NoFundsOnContract()");
    });

    it("Should revert if a zero address is passed into it", async () => {
      await bountyContract.fundBounty(
        bounty.id,
        bounty.deadline,
        bounty.startedAt,
        bounty.project,
        {
          value: ethers.utils.parseEther("1"),
        }
      );

      await expect(
        bountyContract.payoutBounty(
          bounty.id,
          "0x0000000000000000000000000000000000000000",
          25
        )
      ).to.be.revertedWith("BetterBounty__CannotPayoutZeroAddress");
    });

    it("should revert if percentage larger than 100", async () => {
      await bountyContract.fundBounty(
        bounty.id,
        bounty.deadline,
        bounty.startedAt,
        bounty.project,
        {
          value: ethers.utils.parseEther("1"),
        }
      );

      await expect(
        bountyContract.payoutBounty(bounty.id, accounts[1].address, 105)
      ).to.be.revertedWith("BetterBounty__InvalidPercentage()");
    });

    it("should revert if a bounty does not exist", async () => {
      await bountyContract.fundBounty(
        "random id",
        bounty.deadline,
        bounty.startedAt,
        bounty.project,
        {
          value: ethers.utils.parseEther("1"),
        }
      );
      await expect(
        bountyContract.payoutBounty(bounty.id, accounts[1].address, 25)
      ).to.be.revertedWith("BetterBounty__NoBountyWithId()");
    });

    it("Should revert if admin tries to payout for others projects", async () => {
      await bountyContract.fundBounty(
        bounty.id,
        bounty.deadline,
        bounty.startedAt,
        bounty.project,
        {
          value: ethers.utils.parseEther("1"),
        }
      );

      await bountyContract.addAdmin(accounts[1].address, "decentraJobs");

      await bountyContract.connect(accounts[1]).startWork(bounty.id);

      await expect(
        bountyContract
          .connect(accounts[1])
          .payoutBounty(bounty.id, accounts[2].address, 25)
      ).to.be.revertedWith("BetterBounty__NotAdminProject()");
    });

    it("Should revert if workers list empty", async () => {
      await bountyContract.fundBounty(
        bounty.id,
        bounty.deadline,
        bounty.startedAt,
        bounty.project,
        {
          value: ethers.utils.parseEther("1"),
        }
      );
      await expect(
        bountyContract.payoutBounty(bounty.id, accounts[1].address, 25)
      ).to.be.revertedWith("BetterBounty__WorkerListEmpty()");
    });

    it("Should revert if worker not in list", async () => {
      await bountyContract.fundBounty(
        bounty.id,
        bounty.deadline,
        bounty.startedAt,
        bounty.project,
        {
          value: ethers.utils.parseEther("1"),
        }
      );

      await bountyContract.connect(accounts[1]).startWork(bounty.id);

      await expect(
        bountyContract.payoutBounty(bounty.id, accounts[2].address, 25)
      ).to.be.revertedWith("BetterBounty__NotAWorker()");
    });

    it("should payout bounty", async () => {
      await bountyContract.fundBounty(
        bounty.id,
        bounty.deadline,
        bounty.startedAt,
        bounty.project,
        {
          value: ethers.utils.parseEther("1"),
        }
      );

      await bountyContract.connect(accounts[1]).startWork(bounty.id);

      await bountyContract.payoutBounty(bounty.id, accounts[1].address, 25);
      expect(
        parseFloat(await accounts[1].getBalance()) >
          parseFloat(ethers.utils.parseEther("100.24").toString())
      ).eq(true);
    });
  });

  describe("When a bounty is funded", () => {
    it("should revert if a eth not passed when adding a new bounty", async () => {
      await expect(
        bountyContract.fundBounty(
          bounty.id,
          bounty.deadline,
          bounty.startedAt,
          bounty.project
        )
      ).to.be.revertedWith("BetterBounty__NotFunds()");
    });

    it("should revert if an empty string is set as ID", async () => {
      await expect(
        bountyContract.fundBounty(
          "",
          bounty.deadline,
          bounty.startedAt,
          bounty.project,
          {
            value: ethers.utils.parseEther("1"),
          }
        )
      ).to.be.revertedWith("BetterBounty__InvalidBountyId()");
    });

    it("should be able to add a new bounty", async () => {
      await bountyContract.fundBounty(
        bounty.id,
        bounty.deadline,
        bounty.startedAt,
        bounty.project,
        {
          value: ethers.utils.parseEther("1"),
        }
      );
      const bounties = await bountyContract.bountyCount();
      expect(bounties).to.equal(1);
    });

    it("It should revert if funding after bounty deadline is passed", async () => {
      await network.provider.send("evm_increaseTime", [15778800000000]);

      await bountyContract.fundBounty(
        bounty.id,
        bounty.deadline,
        bounty.startedAt,
        bounty.project,
        {
          value: ethers.utils.parseEther("1"),
        }
      );

      await expect(
        bountyContract.fundBounty(
          bounty.id,
          bounty.deadline,
          bounty.startedAt,
          bounty.project,
          {
            value: ethers.utils.parseEther("1"),
          }
        )
      ).to.be.revertedWith("BetterBounty__BountyExpired()");
    });
    it("should be able to get a bounty", async () => {
      await bountyContract.fundBounty(
        bounty.id,
        bounty.deadline,
        bounty.startedAt,
        bounty.project,
        {
          value: ethers.utils.parseEther("1"),
        }
      );
      const bountyFromContract = await bountyContract.getBountyById(bounty.id);
      expect(bountyFromContract.id).to.equal(bounty.id);
      expect(bountyFromContract.status).to.equal("OPEN");
      expect(bountyFromContract.deadline).to.equal(bounty.deadline);
      expect(bountyFromContract.funders[0]).to.equal(accounts[0].address);
    });
  });
});
