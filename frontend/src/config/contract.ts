// Contract addresses for different networks
export const CONTRACT_ADDRESSES = {
  localhost: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  sepolia: '0x6D9328420ba85b275FF509655209FDd090c48514',
  baseSepolia: '0x0000000000000000000000000000000000000000', // TODO: Deploy contract to Base Sepolia
} as const;

export const NETWORK_CONFIG = {
  localhost: {
    chainId: 31337,
    rpcUrl: 'http://127.0.0.1:8545',
  },
  sepolia: {
    chainId: 11155111,
    rpcUrl: 'https://1rpc.io/sepolia',
  },
  baseSepolia: {
    chainId: 84532,
    rpcUrl: 'https://sepolia.base.org',
  },
} as const;

// Get contract address based on current chain ID
export function getContractAddress(chainId: number): string {
  switch (chainId) {
    case 31337:
      return CONTRACT_ADDRESSES.localhost;
    case 11155111:
      return CONTRACT_ADDRESSES.sepolia;
    case 84532:
      return CONTRACT_ADDRESSES.baseSepolia;
    default:
      console.warn(`Unknown chain ID: ${chainId}, using Sepolia as default`);
      return CONTRACT_ADDRESSES.sepolia;
  }
}

// Default contract address (Sepolia)
export const CONTRACT_ADDRESS = CONTRACT_ADDRESSES.sepolia;

