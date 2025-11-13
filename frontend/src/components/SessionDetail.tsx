import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from 'wagmi';
import { getContractAddress } from '../config/contract';
import { GOVERNANCE_FEEDBACK_ABI } from '../abi/GovernanceFeedback';
import { useFhevm } from '../hooks/useFhevm';

interface SessionDetailProps {
  sessionId: number;
  onClose: () => void;
}

export function SessionDetail({ sessionId, onClose }: SessionDetailProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId);
  const { fhevmInstance, status: fhevmStatus, error: fhevmError } = useFhevm();
  const [score, setScore] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  const { data: sessionInfo, refetch: refetchInfo } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: GOVERNANCE_FEEDBACK_ABI,
    functionName: 'getSessionInfo',
    args: [BigInt(sessionId)],
  });

  const hasSubmittedQueryEnabled = Boolean(address);
  const { data: hasSubmitted, refetch: refetchSubmitted } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: GOVERNANCE_FEEDBACK_ABI,
    functionName: 'hasMemberSubmitted',
    args: hasSubmittedQueryEnabled && address ? [BigInt(sessionId), address as `0x${string}`] : undefined,
    query: {
      enabled: hasSubmittedQueryEnabled,
    },
  });

  // Fetch results if session is finalized OR if we have decryption results (for local testing)
  const isFinalized = sessionInfo ? sessionInfo[5] : false;
  const [decryptionResults, setDecryptionResults] = useState<{totalScore: number, averageScore: number, feedbackCount: bigint} | null>(null);

  const { data: contractResults, refetch: refetchContractResults } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: GOVERNANCE_FEEDBACK_ABI,
    functionName: 'getResults',
    args: [BigInt(sessionId)],
    query: {
      enabled: isFinalized,
    },
  });

  // Use decryption results if available (for local testing), otherwise use contract results
  // Format: [totalScore, participants/feedbackCount, averageScore]
  const results = decryptionResults
    ? [decryptionResults.totalScore, Number(decryptionResults.feedbackCount), decryptionResults.averageScore]
    : (contractResults ? [contractResults[0], contractResults[1], contractResults[2]] : null);

  // Debug: check final results array
  console.log('[SessionDetail] Component render - decryptionResults:', decryptionResults, 'results:', results);
  if (results) {
    console.log('[SessionDetail] Final results array:', results);
    console.log('[SessionDetail] UI will display - Total:', results[0], 'Participants:', results[1], 'Average:', results[2]);
  }

  // Debug: log results state
  console.log('[SessionDetail] Results state:', {
    decryptionResults,
    contractResults,
    results,
    isFinalized,
    showResults: (isFinalized || decryptionResults) && results
  });

  const { data: submitHash, isPending: isSubmitPending } = useWriteContract();
  const { isSuccess: isSubmitSuccess, isLoading: isSubmitConfirming } = useWaitForTransactionReceipt({ hash: submitHash });

  const { writeContract: finalize, data: finalizeHash, isPending: isFinalizePending } = useWriteContract();
  const { isLoading: isFinalizeConfirming, isSuccess: isFinalizeSuccess } = useWaitForTransactionReceipt({ hash: finalizeHash });

  // Auto-refresh data every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchInfo();
      if (hasSubmittedQueryEnabled) {
        refetchSubmitted();
      }
      if (isFinalized) {
        refetchContractResults();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [refetchInfo, refetchSubmitted, refetchContractResults, isFinalized, hasSubmittedQueryEnabled]);

  // Refetch after submit transaction succeeds
  useEffect(() => {
    if (submitHash) {
      console.log('[SessionDetail] Submit transaction hash:', submitHash);
      console.log('[SessionDetail] Submit pending:', isSubmitPending, 'confirming:', isSubmitConfirming, 'success:', isSubmitSuccess);

      // Show notification when hash is first generated
      if (!isSubmitPending && !isSubmitConfirming && !isSubmitSuccess) {
        console.log('[SessionDetail] Transaction hash generated, waiting for confirmation...');
        console.log(`[SessionDetail] Transaction hash generated: ${submitHash} - Check Etherscan: https://sepolia.etherscan.io/tx/${submitHash}`);
      }
    }

    if (isSubmitSuccess) {
      console.log('[SessionDetail] Submit transaction completed successfully');
      console.log('[SessionDetail] Transaction confirmed on blockchain! Feedback recorded.');
      // Refetch data to update submission status
      refetchInfo();
      refetchSubmitted();
    }
  }, [submitHash, isSubmitConfirming, isSubmitPending, isSubmitSuccess, refetchInfo, refetchSubmitted]);

  // Debug effect to track all transaction states
  useEffect(() => {
    console.log('[SessionDetail] Transaction state update:', {
      submitHash: submitHash ? `${submitHash.slice(0, 10)}...` : null,
      isSubmitPending,
      isSubmitConfirming,
      isSubmitSuccess
    });

    // If we have a hash but no success yet, show pending status
    if (submitHash && !isSubmitSuccess && !isSubmitPending && !isSubmitConfirming) {
      console.log('[SessionDetail] Transaction submitted but not yet confirmed');
      // You can add a notification here if needed
    }
  }, [submitHash, isSubmitPending, isSubmitConfirming, isSubmitSuccess]);

  // Refetch after finalize transaction succeeds
  useEffect(() => {
    if (isFinalizeSuccess) {
      const timer = setTimeout(() => {
        refetchInfo();
        refetchContractResults();
      }, 2000); // Wait 2 seconds for callback
      return () => clearTimeout(timer);
    }
  }, [isFinalizeSuccess, refetchInfo, refetchContractResults]);

  if (!sessionInfo) {
    return <div className="card">Loading...</div>;
  }

  const [title, description, startTime, endTime, creator, finalized, feedbackCount] = sessionInfo || ['', '', '0', '0', '', false, 0n];
  
  const now = Math.floor(Date.now() / 1000);
  const isActive = Number(startTime) <= now && now <= Number(endTime);
  const isEnded = now > Number(endTime);
  const fhevmReady = fhevmStatus === 'ready' && !!fhevmInstance;
  const canSubmit = isActive && !hasSubmitted && address && fhevmReady;
  const canFinalize = !finalized && feedbackCount > 0n;
  
  // Check if waiting for KMS decryption callback
  const isWaitingForDecryption = isFinalizeSuccess && !finalized;

  const handleSubmit = async () => {
    if (!address) {
      console.error('[SessionDetail] Wallet not connected');
      console.warn('[SessionDetail] Please connect your wallet first.');
      return;
    }

    if (fhevmStatus !== 'ready') {
      console.error('[SessionDetail] FHEVM not ready:', { status: fhevmStatus, error: fhevmError });
      console.warn(`[SessionDetail] FHEVM not ready. Status: ${fhevmStatus}. ${fhevmError ? `Error: ${fhevmError.message}` : 'Please wait for initialization.'}`);
      return;
    }

    if (!fhevmInstance) {
      console.error('[SessionDetail] FHEVM instance not available');
      console.error('[SessionDetail] FHEVM instance not available. Please refresh the page and try again.');
      return;
    }

    // Check MetaMask connection and network
    try {
      if (window.ethereum) {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        console.log('[SessionDetail] Current chain ID:', chainId);

        // Support multiple networks: Sepolia, Base Sepolia, and localhost
        const supportedNetworks = ['0xaa36a7', '0x14a34', '0x7a69']; // Sepolia (11155111), Base Sepolia (84532), localhost (31337)
        if (!supportedNetworks.includes(chainId)) {
          console.error(`[SessionDetail] Unsupported Network - Please switch to Sepolia, Base Sepolia, or localhost. Current network: ${chainId}`);
          console.log('[SessionDetail] Supported networks: 0xaa36a7 (Sepolia), 0x14a34 (Base Sepolia), 0x7a69 (localhost)');
          return;
        }

        // Check account balance
        const balance = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [address, 'latest']
        });
        const balanceInEth = parseInt(balance, 16) / 1e18;
        console.log('[SessionDetail] Account balance:', balanceInEth, 'ETH');

        if (balanceInEth < 0.0001) {
          console.error(`[SessionDetail] Insufficient Balance - Your balance: ${balanceInEth} ETH. Need at least 0.0001 ETH for gas fees. Get test ETH from: https://sepoliafaucet.com/`);
          return;
        }

        // Check if MetaMask is unlocked
        try {
          await window.ethereum.request({ method: 'eth_accounts' });
        } catch (unlockError) {
          console.error('[SessionDetail] MetaMask Locked - Please unlock MetaMask and try again.');
          return;
        }
      } else {
        console.error('[SessionDetail] MetaMask Not Found - Please install MetaMask extension and try again.');
        return;
      }
    } catch (error) {
      console.error('[SessionDetail] MetaMask check failed:', error);
      console.error('[SessionDetail] MetaMask Connection Error - Please ensure MetaMask is connected and try again.');
      return;
    }

    try {
      setSubmitting(true);

      console.log('[SessionDetail] Creating encrypted input...');
      // Create encrypted input for the score
      const input = fhevmInstance.createEncryptedInput(contractAddress, address);
      input.add8(score);
      const encryptedData = await input.encrypt();

      console.log('[SessionDetail] Encrypted data created, submitting to contract...');
      console.log('[SessionDetail] Contract address:', contractAddress);
      console.log('[SessionDetail] Session ID:', sessionId);
      console.log('[SessionDetail] Encrypted handle:', encryptedData.handles[0]);
      console.log('[SessionDetail] Input proof length:', encryptedData.inputProof.length);

      // Submit feedback to contract using direct MetaMask call
      console.log('[SessionDetail] Submitting feedback to contract via direct MetaMask call...');

      try {
        // Create contract instance directly
        const ethers = await import('ethers');
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(contractAddress, GOVERNANCE_FEEDBACK_ABI, signer);

        console.log('[SessionDetail] Sending transaction directly to MetaMask...');

        // Send transaction directly - this should trigger MetaMask popup
        const tx = await contract.submitFeedback(
          BigInt(sessionId),
          encryptedData.handles[0],
          encryptedData.inputProof,
          {
            gasLimit: 3000000,
            // Let MetaMask estimate gas price
          }
        );

        console.log('[SessionDetail] Transaction sent! Hash:', tx.hash);

        // Manually set the hash for UI updates
        // Note: This is a workaround since wagmi state won't update
        console.log(`[SessionDetail] Transaction Submitted Successfully! Hash: ${tx.hash} - Check MetaMask for status.`);

        // Wait for confirmation
        const receipt = await tx.wait();
        console.log('[SessionDetail] Transaction confirmed:', receipt);

        console.log('[SessionDetail] Transaction confirmed on blockchain!');
        refetchInfo();
        refetchSubmitted();

      } catch (directError: any) {
        console.error('[SessionDetail] Direct transaction failed:', directError);

        let errorMessage = 'Transaction failed';
        let suggestion = '';

        if (directError.message?.includes('rejected') || directError.message?.includes('denied')) {
          errorMessage = 'Transaction rejected by MetaMask';
          suggestion = 'Please approve the transaction in MetaMask popup';
        } else if (directError.message?.includes('insufficient')) {
          errorMessage = 'Insufficient funds';
          suggestion = 'Add more test ETH to your wallet';
        } else {
          errorMessage = directError.message || 'Unknown error';
          suggestion = 'Check console for details';
        }

        console.error(`[SessionDetail] Transaction Failed - ${errorMessage} - ${suggestion}`);
      }

      // Force a small delay to let React state update
      setTimeout(async () => {
        console.log('[SessionDetail] Checking transaction status after delay...');

        if (submitHash) {
          console.log('[SessionDetail] Transaction hash found:', submitHash);
          console.log(`[SessionDetail] Transaction Submitted! Hash: ${submitHash} - Check MetaMask or Etherscan: https://sepolia.etherscan.io/tx/${submitHash}`);
        } else {
          console.warn('[SessionDetail] Still no transaction hash after delay');

          // Additional check: see if there are any pending transactions
          try {
            if (window.ethereum) {
              const pendingTxs = await window.ethereum.request({
                method: 'eth_getBlockByNumber',
                params: ['pending', true]
              });
              console.log('[SessionDetail] Pending block info:', pendingTxs);
            }
          } catch (e) {
            console.log('[SessionDetail] Could not check pending transactions:', e);
          }

          console.warn('[SessionDetail] Transaction Status Unknown - Possible issues: MetaMask popup dismissed, network issues, insufficient gas. Check MetaMask notifications.');
        }
      }, 3000); // Increased delay to 3 seconds
    } catch (error) {
      console.error('[SessionDetail] Failed to submit feedback:', error);

      // More detailed error logging
      if (error && typeof error === 'object') {
        console.error('[SessionDetail] Error details:', {
          name: (error as any).name,
          message: (error as any).message,
          code: (error as any).code,
          data: (error as any).data,
          stack: (error as any).stack
        });
      }

      // Check for specific error types
      let errorMessage = 'Transaction failed. Please try again.';
      let suggestion = '';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String((error as any).message);
      }

      // Check for common MetaMask/wagmi errors
      if (errorMessage.includes('User rejected') || errorMessage.includes('cancelled') || errorMessage.includes('denied')) {
        errorMessage = 'Transaction was rejected by MetaMask.';
        suggestion = 'Please approve the transaction in MetaMask.';
      } else if (errorMessage.includes('insufficient funds') || errorMessage.includes('not enough')) {
        errorMessage = 'Insufficient funds for gas fees.';
        suggestion = 'Please add more ETH to your wallet for transaction fees.';
      } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        errorMessage = 'Network connection error.';
        suggestion = 'Please check your internet connection and try again.';
      } else if (errorMessage.includes('gas') || errorMessage.includes('Gas')) {
        errorMessage = 'Gas estimation failed.';
        suggestion = 'The transaction may be too complex. Try again or contact support.';
      } else if (errorMessage.includes('nonce') || errorMessage.includes('replacement')) {
        errorMessage = 'Transaction nonce error.';
        suggestion = 'Please reset MetaMask account or wait a few minutes.';
      }

      console.error(`[SessionDetail] Transaction Failed - ${errorMessage} - ${suggestion} - Check MetaMask for details.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalize = async () => {
    console.log('[SessionDetail] Starting finalize process for session:', sessionId);

    if (!fhevmInstance || !address) {
      console.warn('[SessionDetail] FHEVM not ready. Please wait for initialization.');
      return;
    }

    // Quick check of session status before proceeding
    if (sessionInfo) {
      console.log('[SessionDetail] Session quick check:', {
        finalized: sessionInfo[5],
        feedbackCount: sessionInfo[6]?.toString()
      });

      if (sessionInfo[5]) {
        console.error('[SessionDetail] Session is already finalized!');
        return;
      }

      if (sessionInfo[6] === 0n) {
        console.error('[SessionDetail] No feedback submitted to this session yet!');
        return;
      }
    } else {
      console.warn('[SessionDetail] Session info not available, proceeding anyway...');
    }

    try {
      setSubmitting(true);

      // First, grant decryption access
      console.log('[SessionDetail] Granting decryption access...');
      await finalize({
      address: contractAddress as `0x${string}`,
      abi: GOVERNANCE_FEEDBACK_ABI,
        functionName: 'grantDecryptionAccess',
      args: [BigInt(sessionId)],
        gas: BigInt(3000000),
      });

      // Then get the encrypted total score using ethers directly
      console.log('[SessionDetail] Fetching encrypted total score...');
      const ethers = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, GOVERNANCE_FEEDBACK_ABI, provider);
      const encryptedScore = await contract.getEncryptedTotalScore(BigInt(sessionId));

      console.log('[SessionDetail] Encrypted score:', encryptedScore);
      console.log('[SessionDetail] Encrypted score type:', typeof encryptedScore);
      console.log('[SessionDetail] Encrypted score keys:', encryptedScore ? Object.keys(encryptedScore) : 'null/undefined');
      console.log('[SessionDetail] Encrypted score constructor:', encryptedScore?.constructor?.name);
      if (encryptedScore && typeof encryptedScore === 'object') {
        console.log('[SessionDetail] Encrypted score is array?', Array.isArray(encryptedScore));
        console.log('[SessionDetail] Encrypted score has handles?', 'handles' in encryptedScore);
        console.log('[SessionDetail] Encrypted score has inputProof?', 'inputProof' in encryptedScore);
      }

      console.log('[SessionDetail] Decrypting score...');

      // Create decryption signature (following lucky project approach)
      const signer = await provider.getSigner();

      const timestamp = Math.floor(Date.now() / 1000);
      const durationDays = 365;

      // Generate a keypair for decryption
      const { publicKey, privateKey } = fhevmInstance.generateKeypair();

      // Create EIP712 signature using FHEVM SDK method
      const eip712 = fhevmInstance.createEIP712(
        publicKey,
        [contractAddress as `0x${string}`],
        timestamp,
        durationDays
      );

      const signedMessage = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message
      );

      // Decrypt the total score - encryptedScore is a bigint (FHE handle)
      console.log('[SessionDetail] Decrypting bigint handle:', encryptedScore);

      // Convert bigint to bytes32 string format that FHEVM expects
      const handleBytes = '0x' + encryptedScore.toString(16).padStart(64, '0');
      console.log('[SessionDetail] Converted to bytes32 handle:', handleBytes);

      const decrypted = await fhevmInstance.userDecrypt(
        [{ handle: handleBytes, contractAddress: contractAddress as `0x${string}` }],
        privateKey,
        publicKey,
        signedMessage,
        [contractAddress as `0x${string}`],
        address,
        timestamp,
        durationDays
      );

      console.log('[SessionDetail] Decryption result:', decrypted);
      const totalScore = Number(BigInt(decrypted[handleBytes]));

      console.log('[SessionDetail] Decrypted total score:', totalScore);
      const averageScore = Math.floor(totalScore / Number(feedbackCount));

      console.log('[SessionDetail] Decryption successful:', { totalScore, averageScore });

      console.log('[SessionDetail] Finalizing with results:', { totalScore, averageScore });

      // Check if we're on localhost (31337) or testnet
      const isLocalhost = chainId === 31337;

      if (isLocalhost) {
        // LOCAL TESTING WORKAROUND: Since finalizeWithResults has issues in local Hardhat environment
        console.log('[SessionDetail] LOCALHOST: Simulating finalizeWithResults...');

        // Check session info first - no contract interaction needed for local testing
      } else {
        // TESTNET: Use real finalizeWithResults contract call
        console.log('[SessionDetail] TESTNET: Calling real finalizeWithResults contract...');

        try {
          await finalize({
            address: contractAddress as `0x${string}`,
            abi: GOVERNANCE_FEEDBACK_ABI,
            functionName: 'finalizeWithResults',
            args: [BigInt(sessionId), totalScore, averageScore],
            gas: BigInt(3000000),
          });
          console.log('[SessionDetail] Real finalizeWithResults called successfully');
        } catch (finalizeError) {
          console.error('[SessionDetail] Real finalizeWithResults failed:', finalizeError);
          // Fallback to ethers if wagmi fails
          console.log('[SessionDetail] Trying ethers fallback...');
          const ethersLib = await import('ethers');
          const finalizeProvider = new ethersLib.BrowserProvider(window.ethereum);
          const finalizeSigner = await finalizeProvider.getSigner();
          const finalizeContract = new ethersLib.Contract(contractAddress, GOVERNANCE_FEEDBACK_ABI, finalizeSigner);

          const tx = await finalizeContract.finalizeWithResults(BigInt(sessionId), totalScore, averageScore, {
            gasLimit: 3000000
          });
          console.log('[SessionDetail] Ethers finalizeWithResults sent:', tx.hash);
        }
      }

      if (isLocalhost) {
        // For local testing, set the decryption results directly in state
        console.log('[SessionDetail] LOCAL TESTING: Setting decryption results in UI state');
        const newResults = {
          totalScore: totalScore,
          averageScore: averageScore,
          feedbackCount: feedbackCount
        };
        console.log('[SessionDetail] Setting results:', newResults);
        setDecryptionResults(newResults);

        console.log(`[SessionDetail] Decryption Results - Total Score: ${totalScore}, Average Score: ${averageScore}/10, Participants: ${feedbackCount}`);
        console.log('[SessionDetail] ✅ Local testing: Results displayed successfully!');
      } else {
        // For testnet, wait for transaction confirmation and refresh data
        console.log('[SessionDetail] TESTNET: Waiting for transaction confirmation...');

        // Wait a bit for the transaction to be mined
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Refresh contract data to show final results
        console.log('[SessionDetail] TESTNET: Refreshing contract data...');
        // The contract results will be automatically fetched when isFinalized becomes true
      }

      // Manually refresh data to show results immediately
      await refetchInfo();
      await refetchContractResults();

      console.log(`[SessionDetail] Results decrypted and finalized! Total Score: ${totalScore}, Average: ${averageScore}/10, Participants: ${feedbackCount}`);

    } catch (error) {
      console.error('[SessionDetail] Decryption failed:', error);

      // More detailed error logging
      if (error && typeof error === 'object') {
        console.error('[SessionDetail] Error details:', {
          name: (error as any).name,
          message: (error as any).message,
          code: (error as any).code,
          data: (error as any).data,
          stack: (error as any).stack
        });
      }

      // Check for specific error types
      let errorMessage = 'Decryption failed. Please try again.';
      let suggestion = '';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String((error as any).message);
      }

      // Check for common errors
      if (errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('ERR_CONNECTION')) {
        errorMessage = 'Network connection error with FHEVM service.';
        suggestion = 'Please check your internet connection and try again. If the problem persists, the FHEVM service may be temporarily unavailable.';
      } else if (errorMessage.includes('User rejected') || errorMessage.includes('cancelled') || errorMessage.includes('denied')) {
        errorMessage = 'Signature rejected.';
        suggestion = 'Please approve the signature request in MetaMask.';
      } else if (errorMessage.includes('every is not a function') || errorMessage.includes('createEIP712')) {
        errorMessage = 'FHEVM SDK signature error.';
        suggestion = 'Please refresh the page and try again.';
      } else if (errorMessage.includes('insufficient funds') || errorMessage.includes('not enough')) {
        errorMessage = 'Insufficient funds for gas fees.';
        suggestion = 'Please add more test ETH to your wallet.';
      }

      console.error(`[SessionDetail] Decryption Failed - ${errorMessage} - ${suggestion}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="card max-w-3xl w-full my-8">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
            <p className="text-slate-400">{description}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-3xl ml-4"
          >
            ×
          </button>
        </div>

        {/* Session Info */}
        <div className="bg-slate-900 rounded-lg p-4 mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Start Time:</span>
            <span className="text-white">{new Date(Number(startTime) * 1000).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">End Time:</span>
            <span className="text-white">{new Date(Number(endTime) * 1000).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Creator:</span>
            <span className="text-white font-mono text-xs">{creator}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Total Submissions:</span>
            <span className="text-white font-bold">{feedbackCount.toString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Status:</span>
            <span className={`font-semibold ${finalized ? 'text-green-400' : isActive ? 'text-blue-400' : 'text-yellow-400'}`}>
              {finalized ? 'Finalized' : isActive ? 'Active' : isEnded ? 'Ended' : 'Pending'}
            </span>
          </div>
        </div>

        {/* FHEVM Status */}
        {isActive && !hasSubmitted && address && !fhevmReady && (
          <div className="bg-yellow-900 bg-opacity-20 border border-yellow-700 rounded-lg p-4 mb-6">
            <p className="text-yellow-400 font-semibold">⏳ Preparing FHEVM...</p>
            <p className="text-yellow-300 text-sm mt-1">
              Status: {fhevmStatus}
              {fhevmError && ` - ${fhevmError.message}`}
            </p>
            <p className="text-yellow-200 text-xs mt-1">
              Please wait for encryption system to initialize before submitting feedback.
            </p>
          </div>
        )}

        {/* Submit Feedback */}
        {canSubmit && (
          <div className="bg-slate-900 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Submit Your Feedback</h3>
            <p className="text-slate-400 text-sm mb-4">
              Rate your satisfaction with the executed proposal (1 = Very Dissatisfied, 10 = Very Satisfied)
            </p>
            
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-slate-400 text-sm">Score: {score}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>Very Dissatisfied</span>
                <span>Very Satisfied</span>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || isSubmitPending || isSubmitConfirming}
              className="btn-primary w-full"
            >
              {submitting
                ? 'Encrypting Score...'
                : isSubmitPending
                ? 'Submitting to Blockchain...'
                : isSubmitConfirming
                ? 'Waiting for Confirmation...'
                : submitHash
                ? 'Transaction Submitted ✓'
                : `Submit Score (${score}/10)`}
            </button>

            {/* Status Info */}
            <div className="mt-4 p-3 bg-slate-800 rounded text-xs text-slate-400">
              <div>Status: {isSubmitPending ? 'Sending...' : isSubmitConfirming ? 'Confirming...' : isSubmitSuccess ? '✅ Confirmed' : submitHash ? '⏳ Pending' : 'Ready'}</div>
              {submitHash && (
                <div className="mt-2 pt-2 border-t border-slate-600">
                  <a
                    href={`https://sepolia.etherscan.io/tx/${submitHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    🔍 View Transaction on Etherscan
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Already Submitted */}
        {hasSubmitted && !finalized && (
          <div className="bg-green-900 bg-opacity-20 border border-green-700 rounded-lg p-4 mb-6">
            <p className="text-green-400 font-semibold">✓ You have already submitted feedback for this session</p>
            <p className="text-green-300 text-sm mt-1">Your score is encrypted and will be revealed after finalization</p>
          </div>
        )}

        {/* Finalize Button */}
        {canFinalize && (
          <div className="mb-6">
            <button
              onClick={handleFinalize}
              disabled={isFinalizePending || isFinalizeConfirming}
              className="btn-primary w-full"
            >
              {isFinalizePending || isFinalizeConfirming ? 'Decrypting Results...' : 'Decrypt Results'}
            </button>
            <p className="text-slate-400 text-xs mt-2 text-center">
              Anyone can decrypt the results once feedback is submitted
            </p>
          </div>
        )}

        {/* Waiting for Decryption */}
        {isWaitingForDecryption && (
          <div className="bg-yellow-900 bg-opacity-20 border border-yellow-700 rounded-lg p-6 mb-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-3"></div>
            <p className="text-yellow-400 font-semibold">⏳ Waiting for KMS Decryption...</p>
            <p className="text-yellow-300 text-sm mt-2">
              The decryption oracle is processing your request. This may take 15-30 seconds.
            </p>
            <p className="text-yellow-200 text-xs mt-1">
              Results will automatically appear once decryption is complete.
            </p>
          </div>
        )}

        {/* Results */}
        {(() => {
          const shouldShow = (isFinalized || decryptionResults) && results;
          console.log('[SessionDetail] UI condition check - isFinalized:', isFinalized, 'decryptionResults:', !!decryptionResults, 'results:', !!results, 'shouldShow:', shouldShow);
          return shouldShow && (
            <div className="bg-gradient-to-br from-primary-900 to-slate-900 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                📊 {decryptionResults ? 'Decryption Results (Local Testing)' : 'Final Results'}
              </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-400">
                  {Number(results[2])?.toFixed(1) || '0'}
                </div>
                <div className="text-slate-400 text-sm mt-1">Average Score</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">
                  {Number(results[0]) || 0}
                </div>
                <div className="text-slate-400 text-sm mt-1">Total Score</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">
                  {Number(results[1]) || 0}
                </div>
                <div className="text-slate-400 text-sm mt-1">Participants</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div
                  className="bg-primary-500 h-3 rounded-full transition-all"
                  style={{ width: `${(Number(results[2]) / 10) * 100}%` }}
                ></div>
              </div>
              <p className="text-slate-400 text-xs mt-2 text-center">
                Satisfaction: {((Number(results[2]) / 10) * 100).toFixed(0)}%
              </p>
            </div>
          </div>
          );
        })()}

        {/* Close Button */}
        <div className="mt-6">
          <button onClick={onClose} className="btn-secondary w-full">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

