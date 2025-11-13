import { useState, useEffect, useMemo } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { useFhevm as useFhevmInternal } from '../fhevm/useFhevm';
import type { FhevmInstance } from '../fhevm/fhevmTypes';

export function useFhevm() {
  const { isConnected } = useAccount();
  const chainId = useChainId();

  // Get provider
  const fhevmProvider = useMemo(() => {
    if (chainId === 31337) {
      return "http://127.0.0.1:8545";
    }
    
    if (typeof window !== 'undefined' && window.ethereum) {
      return window.ethereum;
    }
    
    return undefined;
  }, [chainId]);

  const {
    instance: fhevmInstance,
    status: fhevmStatus,
    error: fhevmError,
  } = useFhevmInternal({
    provider: fhevmProvider,
    chainId: chainId,
    enabled: !!fhevmProvider && !!chainId && isConnected,
  });

  const [loading, setLoading] = useState(fhevmStatus === "loading");

  useEffect(() => {
    setLoading(fhevmStatus === "loading");
  }, [fhevmStatus]);

  return { 
    fhevmInstance, 
    loading,
    status: fhevmStatus,
    error: fhevmError
  };
}

export type { FhevmInstance };

