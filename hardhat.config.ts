import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-network-helpers";
import "@nomicfoundation/hardhat-verify";
import "@typechain/hardhat";
import "@fhevm/hardhat-plugin";
import "hardhat-deploy";
import "hardhat-gas-reporter";
import "solidity-coverage";
import type { HardhatUserConfig } from "hardhat/config";
import { vars } from "hardhat/config";
import "./tasks/accounts";
import "./tasks/GovernanceFeedback";
import "./tasks/testDecryption";

const MNEMONIC = vars.get("MNEMONIC", "test test test test test test test test test test test junk");
const PRIVATE_KEY = vars.get("PRIVATE_KEY", "");
const INFURA_API_KEY = vars.get("INFURA_API_KEY", "");
const SEPOLIA_RPC_URL =
  INFURA_API_KEY !== "" ? `https://sepolia.infura.io/v3/${INFURA_API_KEY}` : vars.get("SEPOLIA_RPC_URL", "https://1rpc.io/sepolia");
const ETHERSCAN_API_KEY = vars.get("ETHERSCAN_API_KEY", "");

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: 0,
  },
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : {
        mnemonic: MNEMONIC,
        path: "m/44'/60'/0'/0",
        count: 10,
      },
      chainId: 11155111,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
      accounts: {
        count: 10,
        mnemonic: MNEMONIC,
        path: "m/44'/60'/0'/0",
      },
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  sourcify: {
    enabled: false,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
  mocha: {
    timeout: 500000,
  },
};

export default config;

