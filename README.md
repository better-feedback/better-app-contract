# Better Bounty Solidity Contract
## Deploying the contract
In order to deploy the contract make sure you have the follwing in the ```.env``` fıle

```
MUMBAI_RPC = Polygon Mumbai network RPC link
PRIVATE_KEY = The private key of the wallet used in the deployment
POLYSCAN = Polyscans API key
```

then run the following command:

```
npx hardhat run ./scripts/deploy_BetterBounty_V0.1.ts --network mumbai
```


## Verify Contract
To verify contract make, first get the Contract Address from Polyscan by checking recent transactions

Once you have the address, open ```verify``` script and enter the contract address then run the following command:
To verify the contract after its deployment run:

```
npx hardhat run ./scripts/verify.js --network mumbai
```


## Verify Proxy Contract
Follow this guide
[Guide](https://scribehow.com/shared/Polygonscan_Workflow__hZJYCuBnQnOnsaGD_wg_Mw)