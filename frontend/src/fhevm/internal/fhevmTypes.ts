import type { FhevmInstanceConfig } from "../fhevmTypes";

export type FhevmInitSDKOptions = {
  sepoliaPublicKey?: string;
  sepoliaPublicParams?: string;
};

export type FhevmInitSDKType = (
  options?: FhevmInitSDKOptions
) => Promise<boolean>;

export type FhevmLoadSDKType = () => Promise<void>;

export type FhevmRelayerSDKType = {
  initSDK: (options?: FhevmInitSDKOptions) => Promise<boolean>;
  createInstance: (config: FhevmInstanceConfig) => Promise<any>;
  SepoliaConfig: {
    aclContractAddress: string;
    kmsVerifierAddress: string;
    relayerUrl: string;
  };
  __initialized__?: boolean;
};

export type FhevmWindowType = Window & {
  relayerSDK: FhevmRelayerSDKType;
};

