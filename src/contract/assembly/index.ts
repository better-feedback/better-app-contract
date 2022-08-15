//Near imports
import {
  Context,
  PersistentUnorderedMap,
  u128,
  ContractPromiseBatch,
  env,
  context,
  logging,
} from "near-sdk-as";

//Models import
import { Bounty } from "../models/models";

/* Creating a new PersistentUnorderedMap with the key of type string and the value of type Bounty. 
   That stores all of the bounties in the contract.
*/
const bounties = new PersistentUnorderedMap<string, Bounty>("BN");
let adminList = new PersistentUnorderedMap<string, string>("AL");

const MAX_WORKERS = 30;

/*
 * If the bounty is open, add the attached deposit to the pool and add the attached account to the
 * funders array
 * @param {string} issueId - The ID of the issue that the bounty is attached to.
 */
export function fundBounty(
  issueId: string,
  deadline: u64,
  startedAt: u64,
  project: string
): void {
  assert(Context.attachedDeposit > u128.Zero, "Amount must be greater than 0");
  assert(issueId != "", "Issue ID cannot be empty");

  const bounty = bounties.get(issueId);

  // If the bounty not found for an issue, create a new one
  if (bounty == null) {
    const newBounty = new Bounty(issueId, deadline, startedAt, project);
    newBounty.pool = u128.add(newBounty.pool, Context.attachedDeposit);
    newBounty.funders.push(Context.sender);
    bounties.set(issueId, newBounty);
  }

  if (bounty != null && bounty.status == "OPEN") {
    assert((context.blockTimestamp / 1000000000) < u64(bounty.deadline) , "Bounty has expired");

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
 * @param {string} issueId - The ID of the issue that you want to start working on.
 */
export function startWork(issueId: string): void {
  const bounty = bounties.get(issueId);

  assert(bounty != null, "Bounty not found");

  if (bounty != null && bounty.status == "OPEN") {

    logging.log((context.blockTimestamp / 1000000000))
    logging.log((u64(bounty.deadline)))


    assert((context.blockTimestamp / 1000000000) < u64(bounty.deadline) , "Bounty has expired");

    assert(
      bounty.workers.length < MAX_WORKERS,
      "Max amount of workers for this bounty reached"
    );

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
 * @param {string} issueId - The id of the issue you want to get the bounty for.
 * @returns A bounty object or null
 */
export function getBountyByIssue(issueId: string): Bounty | null {
  return bounties.get(issueId);
}

/*
 * It takes in an issue ID, a worker wallet, and a percentage, and then it pays out the bounty to the
 * worker wallet
 * @param {string} issueId - The ID of the issue that you want to payout
 * @param {string} workerWallet - The wallet address of the worker who will receive the payout
 * @param {i16} percentage - The percentage of the bounty pool that the worker should be paid,
 * if zero the whole bounty is paid out
 */
export function payoutBounty(
  issueId: string,
  workerWallet: string,
  percentage: u16
): void {
  //Making sure that the caller is an admin
  assertAdmin();

  assert(env.isValidAccountID(workerWallet), "Invalid worker wallet");

  assert(
    context.accountBalance > u128.Zero,
    "You don't have any NEAR to pay out"
  );

  const bounty = bounties.get(issueId);

  //Making sure that the bounty exists
  assert(bounty != null, "Bounty not found");

  if (percentage > 100) {
    assert(false, "Percentage must be between 0 and 100");
  }

  if (bounty != null) {
    assert(
      adminList.get(Context.sender) == bounty.project,
      "Not an admin of this project"
    );

    assert(bounty.pool > u128.Zero, "Bounty pool is empty");

    assert(bounty.workers.length > 0, "There are no workers to payout");

    let isWokerFound = false;

    for (let i = 0; i < bounty.workers.length; i++) {
      if (bounty.workers[i] == workerWallet) {
        isWokerFound = true;
        break;
      }
    }

    assert(isWokerFound, "Worker not found");

    //Calculating the amount to pay to the worker
    let divsion = parseFloat(percentage.toString()) / 100;
    let amountToPay = u128.div(bounty.pool, u128.fromF64(1 / divsion));

    //Transfering the amount to the worker
    ContractPromiseBatch.create(workerWallet).transfer(amountToPay);

    //Removing the amount from the bounty pool
    bounty.pool = u128.sub(bounty.pool, amountToPay);

    //Updating the bounty in the contract
    bounties.set(issueId, bounty);
  }
}

export function deleteBounty(issueId: string): void {
  bounties.delete(issueId);
}

/*
  If the sender is not in the admin list, then the function will throw an error
 */
function assertAdmin(): void {
  const admin = adminList.get(Context.sender);
  assert(admin, "Only admins are allowed to call this method");
}

export function addAdmin(admin: string, project: string): void {
  assertAdmin();
  adminList.set(admin, project);
}

export function removeAdmin(admin: string): void {
  assertAdmin();
  adminList.delete(admin);
}

export function isAdmin(admin: string): boolean {
  return adminList.get(admin) != null;
}

export function updateAdmin(admin: string, project: string): void {
  assertAdmin();

  assert(isAdmin(admin), "Admin not found");

  adminList.set(admin, project);
}

export function viewAdmins(): string[] {
  return adminList.values();
}
