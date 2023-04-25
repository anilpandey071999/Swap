// import "@nomiclabs/hardhat-waffle";
// import "hardhat-gas-reporter";
// import "@typechain/hardhat";
// import "hardhat/types";
// import "@nomiclabs/hardhat-etherscan";
import { HardhatUserConfig } from "hardhat/types";
import dotenv from "dotenv";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
      {
        version: "0.7.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
      {
        version: "0.8.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
      {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
      {
        version: "0.5.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
      {
        version: "0.5.1",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
      {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
      {
        version: "0.4.18",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
    ],
  },
  networks: {
    bsc_testnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      
      accounts: [process.env.PRIVATEKEY1 as string],
    },
    bsc: {
      url: "https://bsc-dataseed.binance.org",
      accounts: [process.env.OWNER_PRIVATE_KEY as string],
    },
    mumbai:{
      url: "https://rpc.ankr.com/polygon_mumbai",
      gasPrice: 1000000000,
      accounts: [process.env.PRIVATEKEY1 as string],
    }
  },
};
export default config;
