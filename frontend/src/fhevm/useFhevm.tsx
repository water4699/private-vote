import { ethers } from "ethers";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FhevmInstance } from "./fhevmTypes";
import { createFhevmInstance } from "./internal/fhevm";

function _assert(condition: boolean, message?: string): asserts condition {
  if (!condition) {
    const m = message ? `Assertion failed: ${message}` : `Assertion failed.`;
    console.error(m);
    throw new Error(m);
  }
}

export type FhevmStatus = "idle" | "loading" | "ready" | "error";

export function useFhevm(parameters: {
  provider: string | ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  enabled?: boolean;
}): {
  instance: FhevmInstance | undefined;
  refresh: () => void;
  error: Error | undefined;
  status: FhevmStatus;
} {
  const { provider, chainId, enabled = true } = parameters;

  const [instance, _setInstance] = useState<FhevmInstance | undefined>(
    undefined
  );
  const [status, _setStatus] = useState<FhevmStatus>("idle");
  const [error, _setError] = useState<Error | undefined>(undefined);
  const [_isRunning, _setIsRunning] = useState<boolean>(enabled);
  const [_providerChanged, _setProviderChanged] = useState<number>(0);
  const _abortControllerRef = useRef<AbortController | null>(null);
  const _providerRef = useRef<string | ethers.Eip1193Provider | undefined>(
    provider
  );
  const _chainIdRef = useRef<number | undefined>(chainId);

  const refresh = useCallback(() => {
    if (_abortControllerRef.current) {
      _providerRef.current = undefined;
      _chainIdRef.current = undefined;

      _abortControllerRef.current.abort();
      _abortControllerRef.current = null;
    }

    _providerRef.current = provider;
    _chainIdRef.current = chainId;

    _setInstance(undefined);
    _setError(undefined);
    _setStatus("idle");

    if (provider !== undefined) {
      _setProviderChanged((prev) => prev + 1);
    }
  }, [provider, chainId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    _setIsRunning(enabled);
  }, [enabled]);

  useEffect(() => {
    if (_isRunning === false) {
      console.log("FHEVM initialization cancelled");
      if (_abortControllerRef.current) {
        _abortControllerRef.current.abort();
        _abortControllerRef.current = null;
      }
      _setInstance(undefined);
      _setError(undefined);
      _setStatus("idle");
      return;
    }

    if (_isRunning === true) {
      if (_providerRef.current === undefined) {
        _setInstance(undefined);
        _setError(undefined);
        _setStatus("idle");
        return;
      }

      if (!_abortControllerRef.current) {
        _abortControllerRef.current = new AbortController();
      }

      _assert(
        !_abortControllerRef.current.signal.aborted,
        "!controllerRef.current.signal.aborted"
      );

      _setStatus("loading");
      _setError(undefined);

      const thisSignal = _abortControllerRef.current.signal;
      const thisProvider = _providerRef.current;
      const thisChainId = _chainIdRef.current;

      createFhevmInstance({
        signal: thisSignal,
        provider: thisProvider,
        mockChains:
          thisChainId === 31337
            ? {
                31337: "http://127.0.0.1:8545",
              }
            : thisChainId === 11155111 || thisChainId === 84532
            ? {
                // For Sepolia and Base Sepolia, use mainnet-like configuration
                // FHEVM will handle these through the relayer service
              }
            : undefined,
        onStatusChange: (s) =>
          console.log(`[useFhevm] createFhevmInstance status: ${s}`),
      })
        .then((i) => {
          console.log(`[useFhevm] createFhevmInstance created!`);
          if (thisSignal.aborted) return;

          _assert(
            thisProvider === _providerRef.current,
            "thisProvider === _providerRef.current"
          );

          _setInstance(i);
          _setError(undefined);
          _setStatus("ready");
        })
        .catch((e) => {
          console.log(`[useFhevm] Error: ` + e.name);
          if (thisSignal.aborted) {
            console.log(`[useFhevm] Operation was aborted`);
            return;
          }

          _assert(
            thisProvider === _providerRef.current,
            "thisProvider === _providerRef.current"
          );

          console.error(`[useFhevm] FHEVM initialization failed:`, e);
          _setInstance(undefined);
          _setError(e);
          _setStatus("error");
        });
    }
  }, [_isRunning, _providerChanged]);

  return { instance, refresh, error, status };
}

