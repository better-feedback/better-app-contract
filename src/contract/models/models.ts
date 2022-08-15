import { u128 } from "near-sdk-as";

/* The Bounty class has a constructor that takes in an issueId and a deadline. It has a pool of funds,
a list of funders, a status and a deadline

This is used to track a bounty for a particular issue.
*/

@nearBindgen
export class Bounty {
  issueId: string;
  pool: u128 = u128.Zero;
  funders: string[] = [];
  workers: string[] = [];
  status: string = "OPEN";
  deadline: u64;
  startedAt: u64;
  project: string;

  constructor(
    issueId: string,
    deadline: u64,
    startedAt: u64,
    project: string
  ) {
    this.issueId = issueId;
    this.deadline = deadline;
    this.startedAt = startedAt;
    this.project = project;
  }
}

/* It stores a list of accounts that are allowed to call the `addAdmin` and `removeAdmin` methods 
  as well as are allowed to call the `fundBounty` method.
*/
