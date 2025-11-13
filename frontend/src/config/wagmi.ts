import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia, baseSepolia } from 'wagmi/chains';
import { http } from 'wagmi';

// Get from https://cloud.walletconnect.com
// Using a placeholder to avoid 403 errors - you should replace this with your own Project ID
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'c0a685e0eb72eeb05d4a0b0834c933a0';

const localhost = {
  id: 31337,
  name: 'Localhost',
  network: 'localhost',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
    public: { http: ['http://127.0.0.1:8545'] },
  },
  testnet: true,
} as const;

export const config = getDefaultConfig({
  appName: 'Private Pool',
  projectId,
  chains: [localhost, sepolia, baseSepolia],
  transports: {
    [localhost.id]: http('http://127.0.0.1:8545'),
    [sepolia.id]: http(`https://sepolia.infura.io/v3/${import.meta.env.VITE_INFURA_API_KEY || 'b18fb7e6ca7045ac83c41157ab93f990'}`),
    [baseSepolia.id]: http('https://sepolia.base.org'),
  },
  ssr: false,
});

