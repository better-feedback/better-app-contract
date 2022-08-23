// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

// Imports
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

error BetterBounty__NotAdmin();
error BetterBounty__CannotPayoutZeroAddress();
error BetterBounty__InvalidPercentage();
error BetterBounty__NotFunds();
error BetterBounty__NoBountyWithId();
error BetterBounty__AlreadyWorking();
error BetterBounty__MaxWorkersReached();
error BetterBounty__BountyExpired();
error BetterBounty__NotAWorker();
error BetterBounty__WorkerListEmpty();
error BetterBounty__NotAdminProject();
error BetterBounty__InvalidBountyId();
error BetterBounty__NoFundsOnContract();
error BetterBounty__NoFundsOnBounty();

contract BetterBountyV2 is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    PausableUpgradeable
{
    struct Bounty {
        string id;
        uint256 pool;
        address[] funders;
        address[] workers;
        uint256 deadline;
        uint256 startedAt;
        string status;
        string project;
    }

    mapping(string => Bounty) bounties;

    mapping(address => string) adminAuth;

    uint256 public bountyCount;

    uint256 constant MAX_WORKERS = 30;

    function initialize(string memory project) public initializer {
        //Adding contract creator to admins array
        adminAuth[msg.sender] = project;
        __Pausable_init();
        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {}

    /*
     * If the bounty is open, add the attached deposit to the pool and add the attached account to the
     * funders array
     * @param {string} _id - The ID of the issue that the bounty is attached to.
     * @param {string} _deadline - The deadline for the bounty , set by the first funder
     */
    function fundBounty(
        string memory _id,
        uint256 _deadline,
        uint256 _startedAt,
        string memory _project
    ) external payable {
        //Validating sent funds
        if (msg.value == 0) revert BetterBounty__NotFunds();

        if (keccak256(bytes(_id)) == keccak256(bytes("")))
            revert BetterBounty__InvalidBountyId();

        Bounty memory bounty = bounties[_id];

        //If bounty with that id does not exist, create a new bounty
        if (keccak256(bytes(bounty.id)) == keccak256(bytes(""))) {
            Bounty memory newBounty = Bounty({
                id: _id,
                pool: msg.value,
                funders: new address[](0),
                workers: new address[](0),
                deadline: _deadline,
                startedAt: _startedAt,
                status: "OPEN",
                project: _project
            });
            bounties[_id] = newBounty;
            bounties[_id].funders.push(msg.sender);
            bountyCount++;
        }
        //If bounty is open, attach the funds and add funder to funders list
        else {
            if (block.timestamp > bounty.deadline) {
                revert BetterBounty__BountyExpired();
            }

            bounty.pool += msg.value;

            bool isNewFunder = true;

            //Checking if funder already exists on the array
            for (uint256 i; i < bounty.funders.length; ++i) {
                if (bounty.funders[i] == msg.sender) {
                    isNewFunder = false;
                    break;
                }
            }

            bounties[_id] = bounty;

            //Pushing new funder to the funders array
            if (isNewFunder) {
                bounties[_id].funders.push(msg.sender);
            }
        }
    }

    /*
     * If the bounty is open, add the sender to the list of workers.
     * @param {string} _id - The ID of the issue that you want to start working on.
     */
    function startWork(string memory _id) external {
        Bounty memory bounty = bounties[_id];

        if (keccak256(bytes(bounty.id)) == keccak256(bytes("")))
            revert BetterBounty__NoBountyWithId();

        if (block.timestamp > bounty.deadline) {
            revert BetterBounty__BountyExpired();
        }

        if (bounty.workers.length == MAX_WORKERS)
            revert BetterBounty__MaxWorkersReached();

        address[] memory workersFromMemory = bounty.workers;
        uint256 length = workersFromMemory.length;
        if (length != 0) {
            // Preventing the same account from starting multiple work on the same bounty
            for (uint256 i; i < length; ++i) {
                if (workersFromMemory[i] == msg.sender) {
                    revert BetterBounty__AlreadyWorking();
                }
            }
        }
        bounties[_id].workers.push(msg.sender);
    }

    /*
     * It takes in an issue ID, a worker wallet, and a percentage, and then it pays out the bounty to the
     * worker wallet
     * @param {string} _id - The ID of the issue that you want to payout
     * @param {address} workerWallet - The wallet address of the worker who will receive the payout
     * @param {uint256} percentage - The percentage of the bounty pool that the worker should be paid,
     */
    function payoutBounty(
        string memory _id,
        address workerWallet,
        uint256 percentage
    ) external payable onlyAdmin {
        if (address(this).balance == 0)
            revert BetterBounty__NoFundsOnContract();

        if (workerWallet == address(0))
            revert BetterBounty__CannotPayoutZeroAddress();

        if (percentage > 100) revert BetterBounty__InvalidPercentage();

        Bounty memory bounty = bounties[_id];
        if (keccak256(bytes(bounty.id)) == keccak256(bytes("")))
            revert BetterBounty__NoBountyWithId();

        if (
            keccak256((bytes(adminAuth[msg.sender]))) !=
            keccak256((bytes(bounty.project)))
        ) revert BetterBounty__NotAdminProject();

        if (bounty.pool == 0) revert BetterBounty__NoFundsOnBounty();

        address[] memory workersFromMemory = bounty.workers;

        if (workersFromMemory.length == 0)
            revert BetterBounty__WorkerListEmpty();

        bool isWorkerInList;

        for (uint256 i; i < workersFromMemory.length; ++i) {
            if (workersFromMemory[i] == workerWallet) {
                isWorkerInList = true;
                break;
            }
        }

        if (!isWorkerInList) revert BetterBounty__NotAWorker();

        uint256 amountToPayout = calculatePercentage(percentage, bounty.pool);
        bounties[_id].pool -= amountToPayout;

        payable(workerWallet).transfer(amountToPayout);
    }

    /*
     * Get the bounty associated with the given issue ID, or null if there is no such bounty.
     * @param {string} _id - The id of the issue you want to get the bounty for.
     * @returns A bounty object
     */
    function getBountyById(string memory _id)
        external
        view
        returns (Bounty memory)
    {
        return bounties[_id];
    }

    /*
     *This function is used to calculate the payout for a bounty based on percetage
     * worker wallet
     * @param {uint256} percentage - Between 0 to 100
     * @param {uint256} pool - The amount of money stored in the bounty
     * @returns the amount of money to payout
     */
    function calculatePercentage(uint256 percentage, uint256 pool)
        internal
        pure
        returns (uint256)
    {
        uint256 newPercentage = percentage * 100;
        uint256 payout = (pool * newPercentage) / 10000;
        return payout;
    }

    function addAdmin(address _adminWallet, string memory _project)
        external
        onlyAdmin
    {
        adminAuth[_adminWallet] = _project;
    }

    function isAdmin(address _adminWallet, string memory _project)
        external
        view
        returns (bool)
    {
        return
            keccak256(bytes(adminAuth[_adminWallet])) ==
            keccak256(bytes(_project));
    }

    function updateAdmin(address _adminWallet, string memory _project)
        external
        onlyAdmin
    {
        adminAuth[_adminWallet] = _project;
    }

    function removeAdmin(address _adminWallet) external onlyAdmin {
        adminAuth[_adminWallet] = "";
    }

    //Making sure only admins can call a certain function
    modifier onlyAdmin() {
        if (keccak256(bytes(adminAuth[msg.sender])) == keccak256(bytes("")))
            revert BetterBounty__NotAdmin();
        _;
    }
}

pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract MyContract is
    Initializable,
    PausableUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Pausable_init();
        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {}
}
