# Kyoto Swap DEX Contracts

<img alt="Solidity" src="https://img.shields.io/badge/Solidity-e6e6e6?style=for-the-badge&logo=solidity&logoColor=black"/> <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white"/>

This repository contains the Solidity Smart Contracts for Kyoto Swap.

## Prerequisites

-   git
-   npm
-   hardhat

## Getting started

-   Clone the repository

```sh
git clone https://github.com/anilpandey071999/DEX-smart-contracts.git
```

-   Navigate to `PancakeSwap` directory

```sh
cd PancakeSwap
```
### Configure project

-   Configure the .env

```sh
cp .example.env .env
```
-   Install dependencies

```sh
npm install
```

### Deploy to Blockchain Network

```sh
1. npx hardhat run --network <network-defined-in-hardhat.config> scripts/deployKyotoSwapFactory.ts
```
   * Copy the Factory and WBNB Address from deployment and paste in .env  
   * Copy the INIT_CODE_HASH and paste it at Line 24 [here](contracts/KyotoSwapLibrary.sol)
```sh
2. npx hardhat run --network <network-defined-in-hardhat.config> scripts/deployKyotoSwapRouter.ts
```
* Copy the Router Address from deployment and paste in .env
```sh
3. npx hardhat run --network <network-defined-in-hardhat.config> scripts/deployFeeHandler.ts
```

## Verify smart contracts

```sh
npx hardhat verify --network <network-name-in-hardhat-config> DEPLOYED_CONTRACT_ADDRESS "Constructor arguments"
```

## Run tests

```sh
npm test
```
* Run tests the first time, copy the INIT_CODE_HASH displayed on console and paste it in at Line 24 [here](contracts/KyotoSwapLibrary.sol) and run the tests again
