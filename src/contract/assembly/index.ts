//Near imports
import {
  Context,
  PersistentUnorderedMap,
  u128,
  ContractPromiseBatch,
  env,
  PersistentVector,
} from "near-sdk-as";

//Models import
import { Bounty } from "../models/models";

/* Creating a new PersistentUnorderedMap with the key of type string and the value of type Bounty. 
   That stores all of the bounties in the contract.
*/
const bounties = new PersistentUnorderedMap<u8, Bounty>("BN");
let adminList = new PersistentUnorderedMap<string , string>("AL");

adminList.set("aimensh.testnet", "aimensh.testnet");
adminList.set("cc.testnet", "aimensh.testnet");

/*
 * If the bounty is open, add the attached deposit to the pool and add the attached account to the
 * funders array
 * @param {u8} issueId - The ID of the issue that the bounty is attached to.
 */
export function fundBounty(issueId: u8, deadline: string): void {
  assert(Context.attachedDeposit > u128.Zero, "Amount must be greater than 0");
  const bounty = bounties.get(issueId);

  // If the bounty not found for an issue, create a new one
  if (bounty == null) {
    const newBounty = new Bounty(issueId, deadline);
    newBounty.pool = u128.add(newBounty.pool, Context.attachedDeposit);
    newBounty.funders.push(Context.sender);
    bounties.set(issueId, newBounty);
  }

  if (bounty != null && bounty.status == "OPEN") {
    // Add the attached deposit to the pool
    bounty.pool = u128.add(bounty.pool, Context.attachedDeposit);

    let isNewFunder = true;

    // Check if the attached account is already a funder
    for (let i = 0; i < bounty.funders.length; i++) {
      if (bounty.funders[i] == Context.sender) {
        isNewFunder = false;
        break;
      }
    }

    // If the attached account is a new funder, add it to the funders array
    if (isNewFunder) {
      bounty.funders.push(Context.sender);
    }

    // Update the bounty in the contract
    bounties.set(issueId, bounty);
  }
}

/*
 * If the bounty is open, add the sender to the list of workers.
 * @param {u8} issueId - The ID of the issue that you want to start working on.
 */
export function startWork(issueId: u8): void {
  const bounty = bounties.get(issueId);

  assert(bounty != null, "Bounty not found");

  if (bounty != null && bounty.status == "OPEN") {
    for (let i = 0; i < bounty.workers.length; i++) {
      // Preventing the same account from starting multiple work on the same bounty
      if (bounty.workers[i] == Context.sender) {
        assert(false, "You are already working on this issue");
      }
    }

    bounty.workers.push(Context.sender);

    bounties.set(issueId, bounty);
  }
}

/*
 * It returns an array of all the bounties in the bounties map
 * @returns An array of Bounty objects.
 */
export function viewBounties(): Bounty[] {
  return bounties.values();
}

/*
 * Get the bounty associated with the given issue ID, or null if there is no such bounty.
 * @param {u8} issueId - The id of the issue you want to get the bounty for.
 * @returns A bounty object or null
 */
export function getBountyByIssue(issueId: u8): Bounty | null {
  return bounties.get(issueId);
}

/*
 * It takes in an issue ID, a worker wallet, and a percentage, and then it pays out the bounty to the
 * worker wallet
 * @param {u8} issueId - The ID of the issue that you want to payout
 * @param {string} workerWallet - The wallet address of the worker who will receive the payout
 * @param {i16} percentage - The percentage of the bounty pool that the worker should be paid,
 * if zero the whole bounty is paid out
 */
export function payoutBounty(
  issueId: u8,
  workerWallet: string,
  percentage: i16
): void {
  assert(env.isValidAccountID(workerWallet), "Invalid worker wallet");

  //Making sure that the caller is an admin
  assertAdmin();

  const bounty = bounties.get(issueId);

  //Making sure that the bounty exists
  assert(bounty != null, "Bounty not found");

  if (percentage < 0 || percentage > 100) {
    assert(false, "Percentage must be between 0 and 100");
  }

  if (bounty != null) {
    let amountToPay = u128.Zero;

    //Calculating the amount to pay to the worker
    if (percentage != 0) {
      let divsion = parseFloat(percentage.toString()) / 100;

      amountToPay = u128.div(bounty.pool, u128.fromF64(1 / divsion));
    } else {
      amountToPay = bounty.pool;
    }

    //Transfering the amount to the worker
    ContractPromiseBatch.create(workerWallet).transfer(amountToPay);

    //Removing the amount from the bounty pool
    bounty.pool = u128.sub(bounty.pool, amountToPay);

    //Updating the bounty in the contract
    bounties.set(issueId, bounty);
  }
}

export function deleteBounty(issueId: u8): void {
  bounties.delete(issueId);
}

/*
  If the sender is not in the admin list, then the function will throw an error
 */
function assertAdmin(): void {
  const admin = adminList.get(Context.sender);
  assert(admin, "Only admins are allowed to call this method");
}

export function addAdmin(admin: string): void {
  assertAdmin();
  adminList.set(admin, admin);
}

export function removeAdmin(admin: string): void {
  assertAdmin();
  adminList.delete(admin);
}
