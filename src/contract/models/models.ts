import { u128} from "near-sdk-as";

/* The Bounty class has a constructor that takes in an issueId and a deadline. It has a pool of funds,
a list of funders, a status and a deadline

This is used to track a bounty for a particular issue.
*/

@nearBindgen
export class Bounty {
  issueId: u8;
  pool: u128 = u128.Zero;
  funders: string[] = [];
  workers: string[] = [];
  status: string = "OPEN";
  deadline: string;

  constructor(issueId: u8, deadline: string) {
    this.issueId = issueId;
    this.deadline = deadline;
  }
}

/* It stores a list of accounts that are allowed to call the `addAdmin` and `removeAdmin` methods 
  as well as are allowed to call the `fundBounty` method.
*/
@nearBindgen
export class Auth {
  admins: string[] = ["aimensh.testnet", "cc.testnet"];

  /*
   * If the account is in the admins array, return true, otherwise return false.
   * @param {string} account - The account address of the user to check.
   * @returns A boolean value.
   */
  isAdmin(account: string): boolean {
    for (let i = 0; i < this.admins.length; i++) {
      if (this.admins[i] == account) {
        return true;
      }
    }
    return false;
  }

  addAdmin(account: string): void {
    assert(this.isAdmin(account), "Account is not an admin");

    this.admins.push(account);
  }

  removeAdmin(account: string): void {
    assert(this.isAdmin(account), "Account is not an admin");

    for (let i = 0; i < this.admins.length; i++) {
      if (this.admins[i] == account) {
        this.admins.splice(i, 1);
      }
    }
  }
}
