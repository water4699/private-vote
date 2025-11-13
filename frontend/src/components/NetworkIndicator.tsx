import { useChainId } from 'wagmi';
import { getContractAddress } from '../config/contract';

export function NetworkIndicator() {
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId);

  const getNetworkInfo = () => {
    switch (chainId) {
      case 31337:
        return {
          name: 'Localhost',
          color: 'bg-purple-500',
          icon: '🏠',
        };
      case 11155111:
        return {
          name: 'Sepolia',
          color: 'bg-blue-500',
          icon: '🌐',
        };
      default:
        return {
          name: 'Unknown',
          color: 'bg-gray-500',
          icon: '❓',
        };
    }
  };

  const network = getNetworkInfo();

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-lg max-w-sm">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{network.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold">{network.name}</span>
              <span className={`${network.color} w-2 h-2 rounded-full animate-pulse`}></span>
            </div>
            <div className="text-slate-400 text-xs">Chain ID: {chainId}</div>
          </div>
        </div>
        <div className="text-slate-400 text-xs mt-2 border-t border-slate-700 pt-2">
          <div className="flex items-center justify-between">
            <span>Contract:</span>
            <span className="font-mono text-slate-300 ml-2">
              {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

